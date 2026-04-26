---
title: 'Como estou construindo meu segundo cérebro com IA — do vault ao assistente pessoal'
description: 'Um sistema em markdown puro, versionado no git, sincronizado pelo Google Drive e lido por qualquer modelo. A solução que encontrei para compensar as limitações da minha memória de trabalho.'
pubDate: 'Apr 26 2026'
---

Sou dono de duas pizzarias em Porto Alegre e estou em transição para consultoria em IA aplicada a restaurantes. Tenho TEA nível 1 e TDAH desatento — o que significa que minha memória de trabalho é um gargalo real. Perco contexto, esqueço decisões que já tomei, não consigo manter o histórico de relacionamentos e projetos na cabeça ao mesmo tempo.

A solução que encontrei: construir um "cérebro externo" em markdown que serve como fonte única de verdade para qualquer agente de IA.

## A ideia central

Não quero depender de uma ferramenta específica. Quero arquivos `.md` simples, versionados no git, sincronizados pelo Google Drive e lidos por qualquer modelo — Claude, ChatGPT, Gemini, Cursor, o que for.

O vault vive em `G:\Meu Drive\01 AI\Vault\` e já está aberto no Obsidian. Qualquer agente que precisar de contexto sobre mim lê os arquivos de lá.

## Arquitetura em 4 camadas

```
┌─────────────────────────────┐
│ 4. GATILHOS (cron, webhook) │
├─────────────────────────────┤
│ 3. AGÊNCIA (Gmail, Cal, WA) │  ← estou aqui
├─────────────────────────────┤
│ 2. PERSONA (como eu decido) │  ← concluído
├─────────────────────────────┤
│ 1. MEMÓRIA (o que eu sei)   │  ← concluído
└─────────────────────────────┘
```

## Fase 1 — Memória

Varri todas as fontes: pastas do Google Drive, projetos de desenvolvimento, memórias geradas automaticamente pelo Claude Code, arquivos de contexto espalhados. Classifiquei tudo em categorias e copiei para a estrutura do vault — nunca movi originais sem aprovação.

A estrutura ficou assim:

```
Vault/
├── 00-meta/           # instruções para qualquer agente
├── 01-pizzarias/      # Dáme e Lov — marketing, ops, financeiro
├── 02-projetos-dev/   # todos os projetos de código
├── 03-pessoal/        # família, saúde, finanças, perfil
├── 04-consultoria/    # transição para IA aplicada
├── 08-secretaria-log/ # logs operacionais (gitignored)
```

Cada arquivo tem frontmatter YAML com `project`, `status`, `updated` e `tags`. Isso permite que qualquer agente entenda o contexto sem precisar ler o arquivo inteiro.

## Fase 2 — Persona

Capturei como eu tomo decisões — não como eu acho que tomo, mas como eu realmente tomo. Isso virou `persona-decisao.md`:

- Decido sozinho, raramente peço opinião antes
- Prefiro dados e números, mas o impulso consegue contornar a análise
- Dois modos: rápido/impulsivo (TDAH) e analítico (quando forço)
- Histórico financeiro tem lacunas que distorcem minha percepção de risco

O arquivo não é aspiracional. É descritivo. O agente usa isso para me dar alertas quando percebe que estou no modo errado para uma decisão importante.

## Fase 3 — Agência (em andamento)

Aqui os agentes deixam de ser consultivos e passam a agir. Primeiro integrei o WhatsApp.

O bot roda em background via PM2, sem Chrome, sem janela aberta. Toda semana recebo no meu próprio WhatsApp:

- Perfis comportamentais dos contatos com quem mais conversei
- Resumo dos debates dos grupos
- Análise das minhas próprias mensagens — o que o bot observou sobre mim que pode enriquecer o vault

O mais interessante: todo domingo o bot lê meus arquivos `perfil-fabio.md`, `persona-decisao.md` e `familia.md` e adiciona apenas o que for genuinamente novo — sem sobrescrever, sem inventar, só o que conseguiu observar nas mensagens da semana.

## O que aprendi até agora

O vault só funciona se for fácil de manter. Arquivos complicados não são lidos, não são atualizados e morrem. Markdown puro, frontmatter simples, sem plugin proprietário.

A automação que alimenta o vault precisa ser conservadora — melhor não escrever nada do que escrever errado. Por isso o bot usa um prompt que instrui o Gemini a retornar "nada novo" se não houver observações claras baseadas nas mensagens.

## Próximos passos

Gmail e Google Calendar entram na Fase 3 — resumo de emails importantes, alertas de compromissos, integração com o vault. Depois vem a Fase 4: gatilhos automáticos que disparam ações sem eu precisar pedir.

O objetivo final é um sistema que conhece meu contexto melhor do que eu mesmo num dia ruim de TDAH.
