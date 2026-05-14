/**
 * newsletter-subscribe — Cloudflare Worker
 *
 * Recebe POST { email, lang?, source? }, valida e commita um JSON em
 * data/subscribers/<timestamp>_<slug>.json no repositório via GitHub API.
 *
 * Sveltia CMS lê esses arquivos na seção "Emails" do /admin.
 */

interface Env {
  GITHUB_TOKEN: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;
  SUBSCRIBERS_PATH: string;
  ALLOWED_ORIGINS: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

function slugifyEmail(email: string): string {
  return email
    .toLowerCase()
    .replace(/@/g, '-at-')
    .replace(/\./g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function fileStamp(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}_${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}`;
}

async function toBase64(s: string): Promise<string> {
  // Cloudflare Workers expose btoa for ASCII; encode UTF-8 first
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get('Origin') ?? '';
    const cors = corsHeaders(origin, env.ALLOWED_ORIGINS);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'method_not_allowed' }, 405, cors);
    }

    let body: { email?: unknown; lang?: unknown; source?: unknown };
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: 'invalid_json' }, 400, cors);
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || !EMAIL_RE.test(email) || email.length > 254) {
      return jsonResponse({ error: 'invalid_email' }, 400, cors);
    }

    const lang = typeof body.lang === 'string' ? body.lang.slice(0, 8) : '';
    const source = typeof body.source === 'string' ? body.source.slice(0, 80) : '';
    const now = new Date();
    const subscribedAt = now.toISOString();
    const filename = `${fileStamp(now)}_${slugifyEmail(email)}.json`.slice(0, 120);
    const filepath = `${env.SUBSCRIBERS_PATH.replace(/\/$/, '')}/${filename}`;

    const record = {
      email,
      subscribedAt,
      ...(source ? { source } : {}),
      ...(lang ? { lang } : {}),
    };
    const content = await toBase64(JSON.stringify(record, null, 2) + '\n');

    const ghUrl = `https://api.github.com/repos/${env.GITHUB_REPO}/contents/${filepath}`;
    const ghRes = await fetch(ghUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'newsletter-subscribe-worker',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `subscribe: ${email}`,
        content,
        branch: env.GITHUB_BRANCH,
      }),
    });

    if (!ghRes.ok) {
      // 422 normalmente é arquivo duplicado — trata como "já inscrito"
      if (ghRes.status === 422) {
        return jsonResponse({ ok: true, alreadySubscribed: true }, 200, cors);
      }
      const errText = await ghRes.text();
      return jsonResponse({ error: 'github_failed', detail: errText }, 502, cors);
    }

    return jsonResponse({ ok: true }, 200, cors);
  },
};
