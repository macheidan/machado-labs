---
title: Criei um agente de IA que cuida do meu WhatsApp
heroTitle: Criei um <em>agente</em> de IA<br/>que cuida do meu <span class="accent">WhatsApp</span>
description: Tava perdendo coisa importante do negócio no WhatsApp toda semana. Coloquei um agente pra ler por mim e me avisar o que precisa de resposta, sem ele inventar nada e sem depender de uma só API. Roda no PC de casa, custo zero.
pubDate: May 01 2026
updatedDate: 'Jul 5 2026'
heroImage: ''
heroAlt: Agente de IA lendo as mensagens do meu WhatsApp em segundo plano
tags:
  - agentes
  - ia
  - whatsapp
keywords:
  - agente de IA WhatsApp
  - automação WhatsApp empresa
  - IA para WhatsApp
  - resumo de grupos WhatsApp
  - ganhar tempo no WhatsApp
  - IA para dono de empresa
---

Segunda de manhã hoje é diferente. Eu chego sabendo o que ficou pendente no fim de semana, o que precisa de resposta e o que pode esperar. Antes eu chegava no escuro e descobria o que tinha escapado quando já era tarde: o fornecedor cobrando uma cotação que eu jurava ter respondido.

O problema nunca foi o WhatsApp. **Era a minha atenção vazando** por um buraco que eu não tapava no braço.

## Um bot que lê, não que fala

Todo mundo pensa em bot de WhatsApp como atendimento: um robô que fala com cliente. Eu fiz o contrário.

> Em vez de um bot que fala, um bot que me lê.

Ele acompanha os grupos e as conversas que importam pro negócio e me entrega três coisas: no fim do dia, o que precisa de resposta urgente; no domingo, o resumo do que rolou e do que ficou pendente; no dia 1, o mês inteiro. Roda no PC que já fica ligado em casa, plugado no meu próprio número. Vê o que eu vejo, e não fala com ninguém.

É a camada de "agência" do [Meu Cortex Digital](/labs/segundo-cerebro-ia/): o agente para de só responder pergunta e começa a agir onde a minha atenção escapa primeiro.

## A parte difícil não é ler. É confiar.

Ler, qualquer modelo lê. O problema apareceu na primeira versão: ela me devolveu **romance**. Deduziu intenção que ninguém escreveu, cravou conclusão sobre assunto que mal tinha três mensagens. Pareceu profundo. Era invenção.

E aqui não é enfeite. **Esse bot escreve dentro do meu Cortex.** Se ele inventa, eu decido a semana seguinte em cima da invenção dele.

> Prefiro nada do que errado.

Então a regra virou o contrário do que a maioria faz com IA: formato fixo, proibição explícita de deduzir, e ordem pra devolver "nada novo" quando não há o que dizer. A inteligência do sistema não está em falar bonito. Está em **saber calar quando não observou nada.**

## Por que ele nunca para

Parece detalhe técnico, mas é de dono: montei redundância. Se o modelo principal cai ou estoura a cota, ele tenta o segundo, depois o terceiro. Modelo é depreciado de uma semana pra outra, cota acaba, API cai num domingo de noite, e mesmo assim o resumo tem que chegar. Custo até hoje: zero, cabe nos planos gratuitos pra escala de uma pessoa.

***

Só de ler, já mudou como eu chego na segunda. Montar um agente que age no mundo real, sem inventar e sem virar refém de uma única API, é exatamente o tipo de projeto que eu ajudo empresa a montar.

**Stack:** roda em Node 24/7 no PC de casa, conectado ao WhatsApp direto pelo QR code (sem API paga, sem número separado); a análise passa por uma cascata de modelos (Gemini com fallback pra Groq, Cerebras e OpenRouter) agendada por cron (diário, domingo, dia 1); estado em arquivo único com retenção curta, só texto, comandos que eu mando pra mim mesmo, e prompts conservadores onde a saída vira decisão. Custo: zero.
