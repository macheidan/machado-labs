---
title: 'Como estou construindo o Meu Cortex Digital'
description: 'Um sistema em markdown puro, versionado no git, sincronizado pelo Google Drive e lido por qualquer modelo. Contexto persistente para trabalhar com múltiplos projetos e agentes ao mesmo tempo.'
pubDate: 'Apr 26 2026'
---

O problema: São muitos projetos simultâneos, decisões tomadas em contextos diferentes, e cada agente de IA começa do zero sem saber nada sobre mim.

A solução que encontrei: construir um "cérebro externo" em markdown que serve como **fonte única de verdade para qualquer agente de IA**. Chamei esse sistema de **Meu Cortex Digital**.

## A ideia central

Não quero depender de uma ferramenta específica. Quero arquivos `.md` simples, versionados no git, sincronizados pelo Google Drive e lidos por qualquer modelo, seja Claude, ChatGPT, Gemini, Cursor, o que for.

O Cortex vive em `G:\Meu Drive\01 AI\Vault\` e já está aberto no Obsidian. Qualquer agente que precisar de contexto sobre mim lê os arquivos de lá.

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

## Fase 1, Memória

Varri todas as fontes: pastas do Google Drive, projetos de desenvolvimento, memórias geradas automaticamente pelo Claude Code, arquivos de contexto espalhados. Classifiquei tudo em categorias e copiei para a estrutura do Cortex, nunca movi originais sem aprovação.

A estrutura ficou assim:

```
Cortex/
├── 00-meta/           # instruções para qualquer agente
├── 01-pizzarias/      # Dáme e Lov, marketing, ops, financeiro
├── 02-projetos-dev/   # todos os projetos de código
├── 03-pessoal/        # família, saúde, finanças, perfil
├── 04-consultoria/    # projetos e clientes
├── 08-secretaria-log/ # logs operacionais (gitignored)
```

Cada arquivo tem frontmatter YAML com `project`, `status`, `updated` e `tags`. Isso permite que qualquer agente entenda o contexto sem precisar ler o arquivo inteiro.

## Fase 2, Persona

Capturei como eu tomo decisões, não como eu acho que tomo, mas como eu realmente tomo. Isso virou `persona-decisao.md`:

- Decido sozinho, raramente peço opinião antes
- Prefiro dados e números, mas o impulso consegue contornar a análise
- Dois modos: rápido/reativo e analítico (quando forço)
- Tendência a superestimar familiaridade com um problema e subestimar o esforço real

O arquivo não é aspiracional. É descritivo. O agente usa isso para me dar alertas quando percebe que estou no modo errado para uma decisão importante.

## Fase 3, Agência (em andamento)

Aqui os agentes deixam de ser consultivos e passam a agir. Primeiro integrei o WhatsApp.

O bot roda em background, sem Chrome, sem janela aberta. Toda semana recebo no meu próprio WhatsApp:

- Perfis comportamentais dos contatos com quem mais conversei
- Resumo dos debates dos grupos
- Análise das minhas próprias mensagens, o que o bot observou sobre mim que pode enriquecer o Cortex

O mais interessante: todo domingo o bot lê meus arquivos `perfil-fabio.md`, `persona-decisao.md` e `familia.md` e adiciona apenas o que for genuinamente novo, sem sobrescrever, sem inventar, só o que conseguiu observar nas mensagens da semana.

Detalhes desse bot e de como ele se conecta com o Cortex estão em [Criei um agente de IA que cuida do meu WhatsApp](https://fabiomachado.com.br/labs/bot-whatsapp-inteligencia-pessoal/).

## O que aprendi até agora

O Cortex só funciona se for fácil de manter. Arquivos complicados não são lidos, não são atualizados e morrem. Markdown puro, frontmatter simples, sem plugin proprietário.

A automação que alimenta o Cortex precisa ser conservadora. **Melhor não escrever nada do que escrever errado**. Por isso o bot usa um prompt que instrui o modelo a retornar "nada novo" se não houver observações claras baseadas nas mensagens.

## Próximos passos

Gmail e Google Calendar entram na Fase 3, resumo de emails importantes, alertas de compromissos, integração com o Cortex. Depois vem a Fase 4: gatilhos automáticos que disparam ações sem eu precisar pedir.

O objetivo final é um sistema que **conhece meu contexto melhor do que eu mesmo** em qualquer dia de sobrecarga.
