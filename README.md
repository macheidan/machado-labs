# machado-labs

Site pessoal do Fábio Machado em **fabiomachado.com.br** — documentação pública (labs) do processo de construir um time de agentes de IA dentro das pizzerias Dáme e Lov.

## Stack

- [Astro](https://astro.build) (estático, SSG)
- Markdown / MDX para os posts
- Hospedagem: HostGator
- Deploy: GitHub Actions → FTP

## Rodar local

```sh
npm install
npm run dev
```

Servidor em `http://localhost:4321`.

## Build

```sh
npm run build
```

Saída em `./dist/`.

## Estrutura

```
src/
  components/    # Header, Footer, BaseHead
  content/labs/  # posts (.md / .mdx)
  layouts/       # BlogPost.astro
  pages/         # rotas (index, about, labs, rss.xml)
  consts.ts      # SITE_TITLE e SITE_DESCRIPTION
astro.config.mjs # site URL e integrations
```

## Escrever um post novo

Cria `src/content/labs/<slug>.md`:

```md
---
title: 'Título do post'
description: 'Descrição curta — vira meta description.'
pubDate: 'Apr 25 2026'
heroImage: '../../assets/<imagem>.jpg'
---

Conteúdo em markdown.
```

A imagem `heroImage` precisa existir em `src/assets/`.

## Deploy

Push em `main` dispara o workflow `.github/workflows/deploy.yml`, que builda e sobe `dist/` no HostGator via FTP.

Secrets necessários no repositório (Settings → Secrets and variables → Actions):

- `FTP_SERVER` — host FTP do HostGator (ex: `ftp.fabiomachado.com.br`)
- `FTP_USERNAME` — usuário FTP do cPanel
- `FTP_PASSWORD` — senha FTP
- `FTP_SERVER_DIR` — caminho remoto (ex: `/public_html/`)
