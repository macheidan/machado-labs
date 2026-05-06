---
title: Criei um agente de IA que cuida do meu WhatsApp
heroTitle: Criei um <em>agente</em> de IA<br/>que cuida do meu <span class="accent">WhatsApp</span>
description: Tava perdendo coisa importante nos grupos toda semana. Coloquei um agente pra ler meu WhatsApp por mim, mandar o que precisa de resposta urgente no fim do dia, e um resumo de cada contato e cada grupo no domingo. Roda no PC de casa, custo zero, plugado no meu próprio número.
pubDate: May 01 2026
updatedDate: ''
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

Tava gastando **tempo demais no WhatsApp**. Grupo de fornecedor, repasse pro gerente, cotação, grupo da família que eu já tinha largado dois dias antes.

Toda noite a mesma sensação: **passou coisa importante e eu não sei o quê**.

Às vezes era paranoia. Às vezes não. Descobria na segunda, quando o fornecedor cobrava resposta que nunca chegou.

## Em vez de bot que fala, bot que lê

Eu já tava montando o [Meu Cortex Digital](/labs/segundo-cerebro-ia/). Memória pronta, persona pronta. Faltava o que eu chamei de _"agência"_: o agente parar de só responder e começar a **agir no meu mundo**.

WhatsApp era o lugar mais óbvio pra começar. **É lá que minha atenção vaza primeiro.**

> Em vez de bot que fala com cliente, bot que me lê.

O que ele faz, em três linhas:

- **Diário, 20h.** O que precisa de resposta urgente hoje.
- **Domingo, 20h.** Resumo de cada grupo importante e de cada contato relevante.
- **Mensal, dia 1.** Panorama do mês inteiro.

Tudo o que ele observa volta pro Cortex. Toda outra IA que eu uso depois já sabe **com quem andei falando, do que, e o que ficou pendente**.

## Montei numa noite

Roda no PC que já fica ligado em casa. Plugado no meu próprio número. **Vê tudo que eu vejo, e não fala com ninguém.**

Primeira semana já valeu. Domingo de noite chegou o resumo e tinham **dois assuntos que eu não tinha visto**:

1. Fornecedor cobrando cotação que eu jurava ter respondido.
2. Lembrete da escola do meu filho. Eu ia perder o prazo.

Nenhum dos dois ia me quebrar. Os dois iam me dar dor de cabeça.

> O problema não era WhatsApp. Era atenção.

## A parte que mais me interessou

Não foi o resumo dos grupos. **Foi o resumo dos contatos individuais.**

Pra cada pessoa relevante, ele:

- Olha as últimas semanas de conversa.
- Escreve em duas linhas o que tá rolando no relacionamento.
- Marca quando alguém sumiu.

Eu lembrava de pessoas no susto, quando algo já me cobrava. Agora tem alguém me empurrando isso pra cima toda semana, **antes de virar problema**.

Bonus: domingo de noite ele lê **as minhas próprias mensagens** da semana e atualiza meu perfil dentro do Cortex. Sem inventar, só o que dá pra observar do que eu mesmo escrevi.

## A pegadinha da invenção

Esse é o ponto onde um modelo solto **inventa o universo**.

A primeira versão me devolveu romance. Traçou perfil psicológico de gente com quem troquei três mensagens. Deduziu intenção que ninguém disse. Pareceu profundo. Era invenção.

Reescrevi o prompt obrigando formato fixo e proibindo invenção. **Se não tem o que dizer, não diz.**

> Prefiro nada do que errado.

Esse bot escreve no Cortex. Se ele inventar, eu tomo decisão na semana seguinte baseado em invenção dele. Não compensa.

## Plano B, C, D

Pra não depender de um único modelo, montei redundância. Se o primeiro cair ou estourar quota, tenta o segundo. Cai o segundo, vai pro terceiro.

Não é luxo:

- **Modelo é depreciado** de uma semana pra outra.
- **Quota acaba.**
- **API cai num domingo de noite.**

O bot precisa rodar. Custo até hoje: **zero**. Cabe nos planos gratuitos pra escala de uma pessoa.

## Fase 2: deixar ele responder

Fase 1 é leitura. **Fase 2 é deixar ele responder coisa pequena por mim**, dentro de regra clara. _"Tô a caminho"_, _"recebi sim"_, _"que horas a gente combinou"_, confirmação de pagamento que o financeiro já tinha me passado.

Nada de cliente final. Nada de decisão. Só o agradecimento e a confirmação que comem o meu dia sem agregar nada.

Pra isso funcionar sem virar pesadelo, preciso de três coisas:

1. **Saber quem é cada contato.** A fase 1 já tá construindo isso no Cortex.
2. **Regra clara** do que ele responde sozinho, do que ele rascunha pra eu aprovar com um clique, e do que ele nunca toca.
3. **Aprender o jeito que eu escrevo**, pra resposta dele parecer comigo.

Os três saem da mesma fonte: o agente lendo o que eu mesmo escrevo.

***

Por enquanto ele só lê. E só de ler já mudou a forma como eu chego em segunda de manhã.

## Stack

- Node 24/7 no PC de casa.
- `@whiskeysockets/baileys` pra conexão direta com o WhatsApp via QR code. Sem API oficial paga, sem número separado. O bot fica logado em paralelo ao celular.
- `@google/genai` (Gemini) pra análise, com fallback automático pra Groq, Cerebras e OpenRouter. Dentro do Gemini, fallback entre `gemini-2.5-flash`, `gemini-2.0-flash` e `gemini-2.0-flash-lite`.
- `node-cron` pra agendar: diário 20h, semanal domingo 20h, mensal dia 1.
- Estado em JSON puro num arquivo único (`.state.json`). Sem banco, sem ORM, sem container, sem fila.
- Retenção: 30 dias pras DMs e pras minhas próprias mensagens, 7 dias pros grupos. Acima disso, descarta no save. Estado nunca cresce sem limite.
- Áudio, figurinha, documento e broadcast: ignorados. Só texto.
- Comandos via mensagem que eu mando pra mim mesmo começando com `/` (`/resumo`, `/resumo grupos`, `/resumo mensal`). O painel é o próprio WhatsApp.
- Relatórios salvos como markdown no Cortex (sincronizado pelo Drive) e mandados pra mim no WhatsApp.
- Prompts conservadores onde o output vira insumo de decisão. Formato fixo, proibição explícita de inventar, instrução pra retornar "nada novo" quando não houver o que dizer.
- Custo até hoje: zero. Tier gratuito do Gemini cobre a escala de um usuário só.
