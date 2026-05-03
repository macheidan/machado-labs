---
title: 'Criei um agente de IA que cuida do meu WhatsApp'
heroTitle: 'Criei um <em>agente</em> de IA<br/>que cuida do meu <span class="accent">WhatsApp</span>'
description: 'Tava perdendo coisa importante nos grupos toda semana. Coloquei um agente pra ler meu WhatsApp por mim, mandar o que precisa de resposta urgente no fim do dia, e um resumo de cada contato e cada grupo no domingo. Roda no PC de casa, custo zero, plugado no meu próprio número.'
pubDate: 'May 01 2026'
heroImage: '../imgs/260501.jpeg'
heroAlt: 'Agente de IA lendo as mensagens do meu WhatsApp em segundo plano'
tags: ['cortex', 'agentes', 'whatsapp']
keywords: ['agente de IA WhatsApp', 'automação WhatsApp empresa', 'IA para WhatsApp', 'resumo de grupos WhatsApp', 'ganhar tempo no WhatsApp', 'IA para dono de empresa']
---

Tava gastando **tempo demais no WhatsApp**. Lendo grupo de fornecedor, repassando coisa pro gerente, respondendo cotação, lendo o grupo da família que eu já tinha deixado de ler dois dias antes.

Toda noite a mesma sensação: passou coisa importante e eu não sei o quê.

Algumas vezes era só sensação. Outras não. Descobria na segunda quando o fornecedor cobrava uma resposta que **nunca chegou**.

## Em vez de bot que fala, bot que lê

Eu já tava montando o [Meu Cortex Digital](/labs/segundo-cerebro-ia/) faz um tempo. Memória pronta, persona pronta, faltava a parte que eu chamei lá de *"agência"*: o agente parar de só responder e começar a **agir no meu mundo**.

Numa dessas noites caiu a ficha. O WhatsApp era o lugar mais óbvio pra começar. É lá que minha atenção vaza primeiro.

> Em vez de bot que fala com cliente, bot que me lê.

Lê os grupos por mim. Lê as conversas por mim. Me manda no fim do dia o que precisa de resposta urgente, e no fim da semana um resumo de cada contato relevante e de cada grupo importante.

Tudo o que ele observa volta pro Cortex. Toda outra ferramenta de IA que eu uso depois já sabe quem andou falando comigo, do que andou falando, e o que ficou pendente.

## Montei numa noite

Tá rodando no PC que já fica ligado em casa. Plugado no meu próprio número. **Ele fica olhando junto comigo, vê tudo que eu vejo, e não fala com ninguém.**

Primeira semana já valeu.

Domingo de noite chegou o resumo no meu celular e tinham **dois assuntos que eu não tinha visto**:

1. Um fornecedor cobrando cotação que eu jurava ter respondido.
2. Um lembrete da escola do meu filho — eu ia perder o prazo.

Nenhum dos dois ia me quebrar. Os dois iam me dar dor de cabeça.

> O problema não era WhatsApp. Era atenção.

WhatsApp só era o lugar onde ela vazava primeiro.

## O resumo dos contatos

A parte que mais me interessou não foi nem o resumo dos grupos. **Foi o resumo dos contatos individuais.**

O bot olha as últimas semanas com cada pessoa relevante, escreve em duas linhas o que tá rolando no relacionamento, marca quando alguém sumiu.

Eu lembrava de pessoas no automático. No susto. Quando algo já me cobrava.

Agora tem alguém me empurrando isso pra cima toda semana, **antes de virar problema**.

Outra coisa que ele faz é ler as **minhas próprias mensagens**. Domingo de noite ele compara o que eu falei na semana com o que ele já sabia sobre mim e atualiza meu perfil dentro do Cortex. Sem inventar. Só o que dá pra observar do que eu mesmo escrevi.

## A pegadinha da invenção

Aqui tem uma pegadinha que demorei pra entender.

Esse é justamente o ponto onde um modelo solto **inventa o universo**. A primeira versão me devolveu romance. Traçou perfil psicológico de gente com quem troquei três mensagens. Deduziu intenção que ninguém disse.

Pareceu profundo. Era invenção.

Reescrevi o prompt obrigando formato fixo e proibindo invenção. Se não tem o que dizer, não diz.

> Prefiro nada do que errado.

Esse bot escreve no Cortex. Se ele inventar, eu vou tomar decisão na próxima semana baseado em invenção dele. O custo de uma alucinação aqui **não compensa** a graça de um relatório mais "rico".

## Plano B, C, D

Pra não depender de um único modelo de IA, montei redundância: se o primeiro cair ou estourar quota, ele tenta o segundo. Se o segundo cair, vai pro terceiro.

Não é luxo. **Modelo é depreciado de uma semana pra outra**, quota acaba, API cai num domingo de noite.

O bot precisa rodar.

Custo até hoje: **zero**. Tudo cabe nos planos gratuitos pra escala de uma pessoa.

## Fase 2: deixar ele responder

Tem uma coisa que ainda tô amassando.

A fase 1 é leitura. **A fase 2 é deixar ele responder coisa pequena por mim**, dentro de regra clara. *"Tô a caminho"*, *"recebi sim"*, *"que horas a gente combinou"*, confirmação de pagamento que o financeiro já tinha me passado.

Nada de cliente final. Nada de decisão. Só o agradecimento e a confirmação que comem o meu dia sem agregar nada.

Pra isso funcionar sem virar pesadelo, preciso de três coisas no lugar:

1. **Saber quem é cada contato.** A fase 1 já tá construindo isso no Cortex.
2. **Regra clara** do que ele responde sozinho, do que ele rascunha pra eu aprovar com um clique, e do que ele nunca toca.
3. **Aprender o jeito que eu escrevo**, pra resposta dele parecer comigo.

Os três caminhos saem da mesma fonte: o agente lendo o que eu mesmo escrevo.

---

Por enquanto ele só lê. E só de ler já mudou a forma como eu chego em segunda de manhã.

## Stack

- Node rodando 24/7 no PC de casa.
- `@whiskeysockets/baileys` pra conexão direta com o WhatsApp via QR code, sem API oficial paga, sem número separado. O bot fica logado em paralelo ao celular.
- `@google/genai` (Gemini) pra análise, com fallback automático pra Groq, Cerebras e OpenRouter quando o Gemini cai ou estoura quota. Dentro do Gemini, fallback entre `gemini-2.5-flash`, `gemini-2.0-flash` e `gemini-2.0-flash-lite`.
- `node-cron` pra agendar: relatório diário às 20h, semanal domingo 20h, mensal dia 1.
- Estado em JSON puro num arquivo único (`.state.json`). Sem banco, sem ORM, sem container, sem fila.
- Janela de retenção: 30 dias pras DMs e pras minhas próprias mensagens, 7 dias pros grupos. Acima disso, descarta no momento de salvar. Estado nunca cresce sem limite.
- Áudio, figurinha, documento e broadcast: ignorados. Só texto (`conversation`, `extendedTextMessage`, legenda de imagem).
- Comandos via mensagem que eu mando pra mim mesmo começando com `/` (`/resumo`, `/resumo grupos`, `/resumo mensal`). O painel é o próprio WhatsApp.
- Os relatórios são salvos como markdown no Cortex (sincronizado pelo Drive) e mandados pra mim no WhatsApp.
- Prompts conservadores em todos os pontos onde o output vira insumo de decisão. Formato fixo, proibição explícita de inventar, instrução pra retornar "nada novo" quando não houver o que dizer.
- Custo até hoje: zero. Tier gratuito do Gemini cobre a escala de um usuário só.
