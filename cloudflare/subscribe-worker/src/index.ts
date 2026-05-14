/**
 * newsletter-subscribe — Cloudflare Worker
 *
 * Recebe POST { email } e faz append numa única linha do arquivo
 * data/subscribers.md no repositório. Sveltia CMS mostra o conteúdo
 * inteiro como textarea em /admin → Emails.
 */

interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  SUBSCRIBERS_FILE: string;
  ALLOWED_ORIGINS: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FRONTMATTER = '---\n---\n';

function corsHeaders(origin: string, allowed: string): Record<string, string> {
  const list = allowed.split(',').map((s) => s.trim()).filter(Boolean);
  const ok = list.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : list[0] ?? '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function jsonResponse(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(s: string): string {
  const clean = s.replace(/\n/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function ghHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'newsletter-subscribe-worker',
    'Content-Type': 'application/json',
  };
}

async function appendOnce(env: Env, email: string): Promise<{ ok: boolean; status: number; detail?: string }> {
  const ghBase = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${env.SUBSCRIBERS_FILE}`;

  // 1) GET current file (404 ok — vai criar)
  const getRes = await fetch(`${ghBase}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`, {
    headers: ghHeaders(env.GITHUB_TOKEN),
  });

  let sha: string | undefined;
  let currentText = '';
  if (getRes.status === 200) {
    const data: any = await getRes.json();
    sha = data.sha;
    currentText = fromBase64(data.content);
  } else if (getRes.status !== 404) {
    return { ok: false, status: 502, detail: `github_get_${getRes.status}` };
  }

  // 2) Garante frontmatter no topo + append do email
  let body = currentText;
  if (!body.startsWith('---')) body = FRONTMATTER + body;
  if (!body.endsWith('\n')) body += '\n';

  // Skip se email já existe (dedup case-insensitive)
  const lines = body.split('\n').map((l) => l.trim().toLowerCase());
  if (lines.includes(email.toLowerCase())) {
    return { ok: true, status: 200, detail: 'already_subscribed' };
  }

  const newText = body + email + '\n';

  // 3) PUT
  const putRes = await fetch(ghBase, {
    method: 'PUT',
    headers: ghHeaders(env.GITHUB_TOKEN),
    body: JSON.stringify({
      message: `subscribe: ${email}`,
      content: toBase64(newText),
      branch: env.GITHUB_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (putRes.status === 409) {
    // Conflict — outro commit aconteceu entre o GET e o PUT. Retry.
    return { ok: false, status: 409, detail: 'conflict' };
  }
  if (!putRes.ok) {
    const txt = await putRes.text();
    return { ok: false, status: 502, detail: `github_put_${putRes.status}: ${txt.slice(0, 200)}` };
  }

  return { ok: true, status: 200 };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405, cors);

    let body: { email?: unknown };
    try { body = await request.json(); }
    catch { return jsonResponse({ error: 'invalid_json' }, 400, cors); }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return jsonResponse({ error: 'invalid_email' }, 400, cors);
    }

    // Retry até 3x em caso de conflito (race entre GET → PUT)
    let last: Awaited<ReturnType<typeof appendOnce>> = { ok: false, status: 500 };
    for (let i = 0; i < 3; i++) {
      last = await appendOnce(env, email);
      if (last.ok || last.status !== 409) break;
      await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }

    if (!last.ok) return jsonResponse({ error: last.detail ?? 'unknown' }, last.status, cors);
    return jsonResponse({ ok: true, ...(last.detail ? { detail: last.detail } : {}) }, 200, cors);
  },
};
