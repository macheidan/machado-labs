---
title: 'Como estou construindo o Meu Cortex Digital'
heroTitle: 'Como estou<br/>construindo o <em>Meu</em><br/><span class="accent">Cortex Digital</span>'
description: 'Todo empresário reexplica o próprio negócio pra cada IA, do zero. Montei um sistema em markdown, versionado no git e lido por qualquer modelo, que dá à IA memória permanente do negócio e de como eu decido.'
pubDate: 'Apr 26 2026'
updatedDate: 'Jul 5 2026'
tags: ['cortex', 'agentes', 'ia-first']
keywords: ['segundo cérebro', 'memória de IA', 'agentes de IA', 'contexto para IA', 'IA com memória da empresa', 'dar contexto pro ChatGPT', 'IA first', 'IA para empresários']
---

Todo empresário toca muitas frentes ao mesmo tempo e decide em contextos diferentes. Quando abro qualquer IA pra ajudar, ela **começa do zero, sem saber nada do negócio nem de como eu penso**. Toda vez a mesma reexplicação.

A solução que montei foi um cérebro externo em markdown que serve como *fonte única de verdade pra qualquer agente*. Chamei de **Meu Cortex Digital**. Qualquer modelo que eu abrir já chega sabendo quem eu sou, como as empresas funcionam e como eu decido.

## A ideia central

Não quero depender de uma ferramenta específica. Quero arquivos `.md` simples, lidos por qualquer modelo, seja Claude, ChatGPT, Gemini, Cursor, o que for. A IA é commodity e troca toda hora. **O contexto é o ativo, e o ativo tem que ser meu.**

> Ferramenta morre. Markdown sobrevive.

Isso é o que eu chamo de pensar **AI first**: não é escolher a IA da moda, é organizar o negócio pra que qualquer IA consiga trabalhar nele. O Cortex é essa camada.

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

Cada camada só existe depois que a de baixo funciona. Sem memória, o resto é achismo.

## Fase 1: Memória

Varri todas as fontes: pastas do Drive, projetos, contexto espalhado em mil lugares. Classifiquei tudo em categorias e copiei pra estrutura do Cortex. **Nunca movi originais sem aprovação.**

A estrutura ficou assim:

```
Cortex/
├── 00-meta/           # instruções para qualquer agente
├── 01-pizzarias/      # as empresas: marketing, operação, financeiro
├── 02-projetos-dev/   # todos os projetos de código
├── 03-pessoal/        # perfil e como eu decido
├── 04-consultoria/    # projetos e clientes
├── 08-secretaria-log/ # logs operacionais (fora do git)
```

Cada arquivo tem um cabeçalho simples com `project`, `status`, `updated` e `tags`. Isso deixa qualquer agente entender o contexto **sem ler o arquivo inteiro**, e sem gastar processamento à toa.

## Fase 2: Persona

Aqui é o pulo do gato que quase ninguém faz: capturei como eu *realmente* decido, não como eu acho que decido.

- Decido sozinho, raramente peço opinião antes
- Prefiro dado e número, mas o impulso às vezes contorna a análise
- Tendo a superestimar o quanto conheço um problema e subestimar o esforço real

O arquivo não é aspiracional. **É descritivo.** Com isso a IA me dá um alerta quando percebe que tô no modo errado pra uma decisão importante. Uma IA que só puxa saco não vale nada. Essa me corrige.

## Fase 3: Agência (em andamento)

Aqui os agentes deixam de dar conselho e passam a *agir*. A automação lê meus arquivos de perfil de tempo em tempo e adiciona **só o que for genuinamente novo**, sem sobrescrever, sem inventar.

Foi assim que conectei o WhatsApp ao Cortex: o primeiro agente que roda sozinho em background e realimenta o sistema. Contei o passo a passo em [Criei um agente de IA que cuida do meu WhatsApp](/labs/bot-whatsapp-inteligencia-pessoal/).

## O que aprendi até agora

O Cortex só funciona se for fácil de manter. Arquivo complicado não é lido, não é atualizado, **morre**. E a automação que alimenta ele precisa ser conservadora.

> Melhor não escrever nada do que escrever errado.

Uma IA que inventa pra parecer útil suja a base inteira. Por isso o prompt manda o modelo devolver "nada novo" quando não há observação clara. Num negócio, decidir com dado errado é pior do que decidir com dado nenhum.

---

O próximo passo é Gmail e Calendar entrando na mesma lógica, e depois os gatilhos automáticos: ações que disparam sem eu pedir. O objetivo final é um sistema que **conhece meu contexto melhor do que eu mesmo** num dia de sobrecarga, e que qualquer dono de empresa poderia montar pro próprio negócio.

**Stack:** markdown puro versionado no git, sincronizado pelo Google Drive e aberto no Obsidian; um cabeçalho `YAML` em cada arquivo pra leitura seletiva; e uma cascata de modelos (Claude, GPT, Gemini) que lê e realimenta o Cortex, com os fatos apurados em código e a IA só redigindo.
