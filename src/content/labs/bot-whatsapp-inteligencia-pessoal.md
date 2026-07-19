---
title: Uma secretária pessoal no meu WhatsApp
heroTitle: Uma <em>secretária</em> pessoal<br/>no meu <span class="accent">WhatsApp</span>
description: Ela está conectada ao número e poderia responder cliente, disparar mensagem, atender no meu lugar. Não faz, e isso foi decisão. Montamos uma secretária de IA que só lê, resume e me avisa o que precisa de mim. Roda no nosso Servidor, custo zero.
pubDate: May 01 2026
updatedDate: 'Jul 19 2026'
heroImage: ''
heroAlt: Secretária de IA lendo as mensagens do meu WhatsApp em segundo plano
tags:
  - agentes
  - ia
  - whatsapp
keywords:
  - agente de IA WhatsApp
  - secretária virtual WhatsApp
  - automação WhatsApp empresa
  - resumo de grupos WhatsApp
  - ganhar tempo no WhatsApp
  - IA para dono de empresa
---

<div class="case-summary">

**Desafio:** assuntos importantes do negócio escapavam no WhatsApp todos os dias.

**Solução:** uma secretária que lê e resume por mim, sem inventar nada e sem depender de uma só API:

- Acompanha os grupos de promoções de insumos e entrega um relatório às 16h todos os dias pro meu setor administrativo.
- Às 14h me notifica os assuntos importantes que dependem da minha decisão e que eu ainda não respondi.
- Resume as conversas de grupo desde a última vez que parei de ler.

**Resultados:** fico sempre atualizado dos assuntos importantes que, sem ela, certamente teriam escapado. Custo até hoje: zero.

</div>

## Todo dia alguma coisa afundava

O problema não era uma vez por semana. Era todo dia. Uma promoção de insumo que eu precisava ver, uma pergunta parada esperando a minha decisão, um grupo que eu tinha deixado de ler. Numa operação que vive de mensagem, a coisa importante não grita. **Ela só afunda no meio das outras.**

E acompanhar tudo no braço não escala. A saída nunca foi eu me esforçar mais pra ler mais. Era parar de ler no escuro.

## Uma secretária, não um atendente

O caminho óbvio seria um bot de atendimento, um robô que fala com cliente fingindo ser a gente. Mas o nosso problema nunca foi falar com cliente, era o que escapava de nós. Então fizemos o contrário: **contratamos uma secretária, não um atendente.** Uma boa secretária não responde no seu lugar. Ela lê tudo e te diz o que precisa de você.

E aqui está a parte que quase todo mundo faria diferente. Ela está plugada no número, do mesmo jeito que qualquer robô de atendimento estaria. **Poderia responder cliente, disparar mensagem em massa, atender no meu lugar.** A estrutura pra isso está pronta. Ela não faz. **Foi decisão, não limitação.**

Soltar uma IA pra falar com os meus clientes, no meu nome, é um risco que eu não quis correr. O valor nunca esteve em ela falar. Esteve em ela ler. Então ela só fala com uma pessoa: comigo. É a camada de "agência" do [nosso segundo cérebro digital](/labs/segundo-cerebro-ia/): o agente para de só responder pergunta e começa a agir onde a minha atenção escapa primeiro, sem nunca botar a mão onde não devia.

## Ela sabe calar quando não viu nada

Tem outra parte difícil, que não é ler. **É confiar.** A primeira versão me devolveu romance: deduziu intenção que ninguém escreveu e cravou conclusão sobre assunto que mal tinha três mensagens. Pareceu profundo. Era invenção. E essa secretária **escreve dentro do nosso segundo cérebro**: se ela inventa, a gente decide em cima da invenção dela.

Então a regra virou o contrário do que a maioria faz com IA: formato fixo, proibição explícita de deduzir, e ordem pra devolver "nada novo" quando não há o que dizer. Se o modelo principal cai ou estoura a cota, ela tenta o segundo, depois o terceiro. API cai numa noite de domingo e o relatório chega igual. Custo até hoje: **zero.**

> Prefiro nada do que errado.

***

Só de ler, já mudou como eu chego no meio do dia. Montar um agente que age no mundo real, sem inventar, sem virar refém de uma única API, e que sabe onde não deve mexer, é exatamente o tipo de projeto que a gente ajuda outras empresas a montar.

**Stack:** roda em Node 24/7 no nosso Servidor, conectada ao WhatsApp direto pelo QR code (sem API paga, sem número separado), com a função de resposta automática deliberadamente desligada; a análise passa por uma cascata de modelos (Gemini com fallback pra Groq, Cerebras e OpenRouter) agendada por cron; estado em arquivo único com retenção curta, só texto, e prompts conservadores onde a saída vira decisão. Custo: zero.
