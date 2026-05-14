# newsletter-subscribe (Cloudflare Worker)

Recebe POST do form de newsletter do site e faz append no arquivo único `data/subscribers.md` (um email por linha). A seção **Emails** do `/admin` mostra o conteúdo desse arquivo num textarea editável.

## Deploy

```bash
cd cloudflare/subscribe-worker
npm install

# 1. Cria um Personal Access Token (PAT) no GitHub com permissão "Contents: Read and write"
#    em https://github.com/settings/tokens/new (classic) ou fine-grained limitado ao repo.

# 2. Salva o token como secret no worker:
npx wrangler secret put GITHUB_TOKEN
# (cola o token e enter)

# 3. Deploy:
npm run deploy
```

Após o deploy, a URL pública vai ser algo como `https://newsletter-subscribe.<sua-conta>.workers.dev`.

## Conectar ao site

Atualize `src/consts.ts` no projeto principal com a URL do worker:

```ts
export const SUBSCRIBE_ENDPOINT = 'https://newsletter-subscribe.<sua-conta>.workers.dev';
```

## Como funciona

1. Form do site faz `POST { email, lang, source }` pro worker.
2. Worker valida email, gera filename `<timestamp>_<email-slug>.json`.
3. Usa GitHub Contents API pra commitar o arquivo na branch `master`.
4. Sveltia CMS lê esses arquivos via Sveltia OAuth (já configurado) e lista no `/admin` em **Emails**.

## Limites

- Plano gratuito do Workers: 100k req/dia.
- Cada submissão = 1 commit no repo. Se virar muito alto, considerar mover pra D1/KV.

## Variáveis (já em wrangler.toml)

- `GITHUB_REPO` — `macheidan/machado-labs`
- `GITHUB_BRANCH` — `master`
- `SUBSCRIBERS_FILE` — `data/subscribers.md`
- `ALLOWED_ORIGINS` — `https://fabiomachado.com.br,https://www.fabiomachado.com.br`

## Secrets (via wrangler)

- `GITHUB_TOKEN` — PAT com permissão `Contents: Read and write` no repo.
