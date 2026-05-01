---
title: 'Criei um agente de IA que cuida do meu WhatsApp'
description: 'Fase 1 do projeto: agente rodando em background no meu próprio WhatsApp, lendo mensagens de contatos e grupos, mandando resumo semanal pra mim e atualizando meu segundo cérebro com o que observou. Node + Baileys + Gemini, sem API oficial, sem servidor. Fase 2: ele começa a responder.'
pubDate: 'May 01 2026'
---

Todo mundo que monta bot de WhatsApp monta bot de atendimento. Recebe pedido, responde menu, fecha venda. Eu virei o jogo: nesta **fase 1**, o agente não fala com ninguém. Ele me lê.

Toco meus negócios e tenho uma rede de contatos pessoais e profissionais que não consigo mais acompanhar com a atenção que mereciam. Grupos de fornecedor, grupo da família, grupo do condomínio, grupo de associados, conversas individuais com contadores, gerentes, amigos. Mensagem importante se perde no meio de cinquenta "bom dias" e onze áudios de 4 minutos.

A pergunta era: e se em vez de eu ler tudo, alguém lesse pra mim e me mandasse o que importa?

> **Onde estamos:** este post documenta a fase 1 — o agente como observador silencioso. A **fase 2**, em desenvolvimento, é dar voz pra ele: deixar o agente responder mensagens no meu WhatsApp por mim, dentro de regras que eu defino. Primeiro a leitura precisa estar madura. Depois a fala.

## O objetivo

Não automatizar atendimento. Automatizar **observação**.

Queria três coisas:

1. Resumo semanal de cada contato relevante — assunto, perfil, como tá o relacionamento.
2. Resumo diário e semanal dos grupos — o que rolou, sem ter que rolar 800 mensagens pra trás. Com indicação se fui citado e qual contexto.
3. Análise do que **eu** mandei — o bot lendo minhas próprias mensagens e atualizando meus arquivos de perfil no vault com o que conseguiu observar.

A última parte é a que mais me interessa. É um agente que melhora a memória que ele mesmo consulta.

## Stack

- **Node.js**
- **Baileys** (`@whiskeysockets/baileys`) — biblioteca que conversa direto com o protocolo do WhatsApp. Sem Chrome headless, sem Selenium, sem API oficial paga.
- **Google Gemini** (`@google/genai`) — análise do conteúdo, com fallback pra Groq, Cerebras e OpenRouter se o Gemini quebrar.
- **node-cron** — agendamento.
- Estado em **JSON puro** num arquivo (`.state.json`). Sem banco. Sem ORM. Sem Docker.

Tudo num PC que já fica ligado em casa.

## Por que Baileys e não a API oficial

A API oficial do WhatsApp Business é cara, pede aprovação de template, e me obrigaria a usar um número separado. Eu queria que o bot vivesse no **meu** WhatsApp pessoal — o mesmo número que eu uso pra falar com fornecedores, gerentes e família.

Baileys faz auth via QR code uma vez, salva as credenciais em `auth_info/` e reconecta sozinho. O bot é literalmente um cliente do WhatsApp logado como eu, em paralelo ao celular.

## A arquitetura

```
WhatsApp (meu número)
   │
   ▼
Baileys (sessão autenticada, 24/7)
   │
   ├── messages.upsert → captura tudo que chega
   │     ├── DM:    .state.json → messages[jid]
   │     ├── grupo: .state.json → groups[jid]
   │     └── eu:    .state.json → myMessages[]
   │
   ▼
Cron schedule
   │
   ├── domingo 19h → varredura: meu vault recebe novos perfis dos contatos
   ├── domingo 19h → varredura: meu próprio perfil é atualizado
   ├── domingo 20h → relatório semanal de contatos
   ├── domingo 20h → relatório semanal dos grupos
   ├── dia 1, 20h  → relatório mensal (inclui "quem sumiu")
   └── todo dia 20h → relatório diário dos grupos
        │
        ▼
   Gemini analisa → markdown formatado
        │
        ▼
   ┌────────────┴────────────┐
   ▼                         ▼
Vault (.md no Drive)    Eu mesmo no WhatsApp
```

Cada relatório é gravado no meu [segundo cérebro](https://fabiomachado.com.br/labs/segundo-cerebro-ia/) (vault em markdown sincronizado pelo Drive) **e** enviado pra mim no WhatsApp. Leio na rua, ele já tá salvo pra qualquer agente de IA consultar depois.

## A captura

A parte mais simples de descrever e a mais delicada de acertar:

```js
sock.ev.on('messages.upsert', async ({ messages, type }) => {
  if (type !== 'notify') return;

  for (const msg of messages) {
    const jid = msg.key.remoteJid;
    const text = getMessageText(msg);
    if (!text) continue;

    if (msg.key.fromMe) {
      // mensagem que EU mandei → vai pra myMessages
    } else if (jid.endsWith('@g.us')) {
      // mensagem de grupo → groups[jid].messages
    } else {
      // DM → messages[jid]
    }
  }
});
```

Filtro broadcast e newsletter. Guardo só texto (`conversation`, `extendedTextMessage`, legenda de imagem). Áudio, figurinha e documento eu ignoro — não compensa o custo de transcrever pra inteligência que eu quero.

Cada bucket tem janela:
- DMs: 30 dias
- Grupos: 7 dias
- Minhas mensagens: 30 dias

Acima da janela, descarto na hora de salvar. Estado nunca cresce sem limite.

## A sacada — prompts conservadores

Aqui está o que eu mais aprendi.

A primeira versão do prompt do relatório semanal pedia "resumo do que rolou". O Gemini retornava romance. Inventava contexto, traçava perfil psicológico de gente com quem troquei três mensagens, deduzia intenção que não tinha sido dita. Inútil.

Reescrevi o prompt impondo formato fixo e proibindo invenção:

```
Para cada contato, retorne EXATAMENTE neste formato:

*[nome]*:
[assunto 1]: uma frase resumindo.
[assunto 2]: uma frase resumindo.
Perfil: 1 a 2 frases sobre personalidade observadas nas mensagens.
Tendência relacionamento: uma frase.

Não inclua nada fora deste formato.
Não invente. Baseie-se apenas nas mensagens.
```

Isso resolveu 80%. O modelo passou a ser conservador, formato consistente, fácil de comparar relatório com relatório.

Mas a peça mais importante é o prompt da análise das **minhas próprias mensagens**. Esse roda contra arquivos do vault que descrevem quem eu sou:

```
Analise as mensagens enviadas por Fábio na última semana e
compare com o conteúdo atual dos arquivos abaixo.

Para cada arquivo, retorne APENAS informações NOVAS que podem
ser adicionadas com base nas mensagens. Se não houver nada novo,
retorne "nada novo". Seja conservador — só adicione o que é
claramente observável. Não repita o que já está no arquivo.
Não invente.
```

A regra é: **prefiro nada do que errado**. O bot tem permissão de escrever no meu segundo cérebro. Se ele escrever bobagem, eu vou estar tomando decisão semana que vem com base em bobagem. O custo de uma alucinação no contexto do agente é alto demais pra valer a pena correr o risco de pedir mais.

## Multi-provider com fallback

LLM cai. Quota acaba. Modelo é deprecado de uma semana pra outra. O bot precisa rodar todo domingo independente disso.

```js
async function callLLM(prompt) {
  const providers = [];
  if (process.env.GEMINI_API_KEY)     providers.push(gemini);
  if (process.env.GROQ_API_KEY)       providers.push(groq);
  if (process.env.CEREBRAS_API_KEY)   providers.push(cerebras);
  if (process.env.OPENROUTER_API_KEY) providers.push(openrouter);

  for (const p of providers) {
    try {
      const out = await p.fn();
      if (out) return out;
    } catch (e) {
      // tenta o próximo
    }
  }
  throw new Error('todos os providers falharam');
}
```

Dentro do Gemini, mesma lógica entre `gemini-2.5-flash`, `gemini-2.0-flash` e `gemini-2.0-flash-lite`. O bot precisa só de **algum** modelo respondendo, não do melhor.

Custo médio até agora: zero. Tier gratuito do Gemini cobre tudo o que eu preciso na escala de uma pessoa.

## Comandos no próprio WhatsApp

Mandei pra mim mesmo um `/resumo` e o bot responde com o relatório semanal sob demanda. `/resumo grupos` traz os grupos do dia. `/resumo mensal` força o mensal fora da janela.

```js
if (msg.key.fromMe && text?.startsWith('/')) {
  await handleCommand(text.trim(), sock);
}
```

Trato qualquer mensagem que **eu** mando começando com `/` como comando. Sem painel, sem app, sem login. O painel é o próprio WhatsApp.

## O loop completo

O que faz esse projeto valer a pena não é o bot isolado. É o loop:

1. Eu converso normalmente no WhatsApp.
2. Bot captura tudo silenciosamente.
3. Toda semana, ele escreve resumos no vault.
4. Toda semana, ele lê meu próprio perfil no vault e adiciona o que observou de novo sobre mim.
5. Próxima vez que **qualquer agente de IA** (Claude Code, Cursor, ChatGPT) abre meu vault pra me ajudar com qualquer coisa, ele já sabe quem eu sou, com quem ando falando, do que ando reclamando.

O bot não é o produto. O produto é um segundo cérebro que se atualiza sozinho.

## O que aprendi até agora

Bot de leitura é mais útil do que bot de resposta pra quem não escala atendimento. Atendimento eu já tenho otimizado. O que eu não tenho é alguém olhando pelo lado de fora pra padrões que eu deixo passar.

Prompt conservador vence prompt criativo quando o output vira insumo de decisão. Em todo lugar que pude trocar liberdade por formato fixo, troquei.

Estado em JSON num arquivo é mais que suficiente pra quem é único usuário. Adicionei zero infraestrutura. Sem banco, sem fila, sem container. Roda no PC que já estava ligado.

Multi-provider não é luxo, é higiene. Um único provider é uma promessa quebrada esperando acontecer.

## Fase 2: o agente responde

A fase 1 é leitura. A fase 2 — que já tô começando a montar — é **resposta**.

A ideia: o mesmo agente que hoje me lê passa a falar por mim em situações controladas. Não atendimento de cliente final, e sim a parte chata do meu WhatsApp pessoal/profissional que consome tempo sem agregar — confirmar recebimento, agradecer, mandar "tô a caminho", responder "que horas?", fechar combinado de horário com fornecedor, dar status de pagamento que o financeiro já me passou.

Pra isso funcionar sem virar pesadelo, três coisas precisam estar resolvidas:

1. **Perfil de quem é cada contato** — o agente já tá construindo isso na fase 1. Ele precisa saber se o Joaquim é fornecedor de embalagem ou tio do interior antes de responder qualquer coisa por mim.
2. **Regras de quando agir e quando ficar quieto** — lista clara do que o agente pode responder sozinho, do que ele pode rascunhar pra eu aprovar com um clique, e do que ele nunca toca.
3. **Voz** — o agente lendo minhas próprias mensagens (que já roda na fase 1) é justamente pra ele aprender o jeito que eu escrevo.

A diferença entre observador e agente é só uma camada de "quando isso, faz aquilo". A fase 1 já tá capturando dado suficiente pra essa camada começar a fazer sentido. A fase 2 é o que eu vou postar aqui na sequência.
