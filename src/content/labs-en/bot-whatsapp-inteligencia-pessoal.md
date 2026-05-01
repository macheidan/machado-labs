---
title: 'How I built a WhatsApp bot that reads me instead of replying'
description: 'A bot running in the background on my own WhatsApp: reads messages from contacts and groups, sends a weekly summary to me, and updates my second brain with what it observed. Node + Baileys + Gemini, no official API, no server.'
pubDate: 'Apr 30 2026'
---

Everyone who builds a WhatsApp bot builds a customer-service bot. Takes the order, sends the menu, closes the sale. I flipped it: my bot doesn't talk to anyone. It reads me.

I run my businesses and have a network of personal and professional contacts I can no longer keep up with the way they deserve. Supplier groups, family group, building group, partner groups, individual chats with accountants, managers, friends. An important message gets buried under fifty "good mornings" and eleven 4-minute voice notes.

The question was: what if instead of me reading everything, someone read it for me and sent me what mattered?

## The goal

Not to automate customer service. To automate **observation**.

I wanted three things:

1. A weekly summary of each relevant contact — topics, profile, how the relationship is going.
2. A daily and weekly summary of groups — what happened, without scrolling 800 messages back. With a flag if I was mentioned and in what context.
3. Analysis of what **I** sent — the bot reading my own messages and updating my profile files in the vault with what it observed.

The last part is the one I care about most. It's an agent that improves the memory it itself reads from.

## Stack

- **Node.js**
- **Baileys** (`@whiskeysockets/baileys`) — a library that talks directly to the WhatsApp protocol. No headless Chrome, no Selenium, no paid official API.
- **Google Gemini** (`@google/genai`) — content analysis, with fallback to Groq, Cerebras, and OpenRouter if Gemini breaks.
- **node-cron** — scheduling.
- State as **plain JSON** in a file (`.state.json`). No database. No ORM. No Docker.

All on a PC that's already on at home.

## Why Baileys and not the official API

The official WhatsApp Business API is expensive, requires template approval, and would force me to use a separate number. I wanted the bot to live on **my** personal WhatsApp — the same number I use to talk to suppliers, managers, and family.

Baileys does QR code auth once, saves credentials in `auth_info/`, and reconnects on its own. The bot is literally a WhatsApp client logged in as me, in parallel with my phone.

## The architecture

```
WhatsApp (my number)
   │
   ▼
Baileys (authenticated session, 24/7)
   │
   ├── messages.upsert → captures everything that comes in
   │     ├── DM:    .state.json → messages[jid]
   │     ├── group: .state.json → groups[jid]
   │     └── me:    .state.json → myMessages[]
   │
   ▼
Cron schedule
   │
   ├── Sunday 7pm → sweep: my vault gets new contact profiles
   ├── Sunday 7pm → sweep: my own profile is updated
   ├── Sunday 8pm → weekly contacts report
   ├── Sunday 8pm → weekly groups report
   ├── 1st of the month, 8pm → monthly report (includes "who went silent")
   └── Every day 8pm → daily groups report
        │
        ▼
   Gemini analyzes → formatted markdown
        │
        ▼
   ┌────────────┴────────────┐
   ▼                         ▼
Vault (.md on Drive)     Me on WhatsApp
```

Each report is written to my [second brain](https://fabiomachado.com.br/labs/segundo-cerebro-ia/) (markdown vault synced through Drive) **and** sent to me on WhatsApp. I read it on the go, it's already saved for any AI agent to consult later.

## The capture

The simplest part to describe and the most delicate to get right:

```js
sock.ev.on('messages.upsert', async ({ messages, type }) => {
  if (type !== 'notify') return;

  for (const msg of messages) {
    const jid = msg.key.remoteJid;
    const text = getMessageText(msg);
    if (!text) continue;

    if (msg.key.fromMe) {
      // message I sent → goes to myMessages
    } else if (jid.endsWith('@g.us')) {
      // group message → groups[jid].messages
    } else {
      // DM → messages[jid]
    }
  }
});
```

I filter out broadcast and newsletter. I keep only text (`conversation`, `extendedTextMessage`, image caption). Audio, stickers, and documents I ignore — not worth the cost of transcribing for the kind of intelligence I want.

Each bucket has a window:
- DMs: 30 days
- Groups: 7 days
- My messages: 30 days

Beyond the window, I drop it on save. State never grows unbounded.

## The lesson — conservative prompts

Here's what I learned the most.

The first version of the weekly report prompt asked for "a summary of what happened." Gemini returned a novel. It made up context, drew psychological profiles of people I'd exchanged three messages with, inferred intent that had never been stated. Useless.

I rewrote the prompt enforcing a fixed format and forbidding invention:

```
For each contact, return EXACTLY in this format:

*[name]*:
[topic 1]: one sentence summary.
[topic 2]: one sentence summary.
Profile: 1 to 2 sentences on personality observed in the messages.
Relationship trend: one sentence.

Don't include anything outside this format.
Don't make things up. Base everything on the messages.
```

That solved 80%. The model became conservative, the format consistent, and reports easy to compare week to week.

But the most important piece is the prompt that analyzes **my own messages**. That one runs against vault files describing who I am:

```
Analyze the messages sent by Fábio in the last week and
compare them with the current content of the files below.

For each file, return ONLY NEW information that can be added
based on the messages. If there's nothing new, return
"nothing new". Be conservative — only add what is clearly
observable. Don't repeat what's already in the file.
Don't make things up.
```

The rule is: **I prefer nothing over wrong**. The bot has permission to write into my second brain. If it writes nonsense, I'll be making decisions next week based on nonsense. The cost of a hallucination in the agent's context is too high to risk asking for more.

## Multi-provider with fallback

LLMs go down. Quotas run out. Models get deprecated from one week to the next. The bot has to run every Sunday regardless.

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
      // try the next one
    }
  }
  throw new Error('all providers failed');
}
```

Inside Gemini, same logic across `gemini-2.5-flash`, `gemini-2.0-flash`, and `gemini-2.0-flash-lite`. The bot only needs **some** model responding, not the best one.

Average cost so far: zero. Gemini's free tier covers everything I need at a single-person scale.

## Commands inside WhatsApp itself

I send myself `/resumo` and the bot replies with the weekly report on demand. `/resumo grupos` brings the day's groups. `/resumo mensal` forces the monthly outside its window.

```js
if (msg.key.fromMe && text?.startsWith('/')) {
  await handleCommand(text.trim(), sock);
}
```

Any message **I** send starting with `/` is treated as a command. No dashboard, no app, no login. The dashboard is WhatsApp itself.

## The full loop

What makes this project worth it isn't the bot in isolation. It's the loop:

1. I chat normally on WhatsApp.
2. The bot silently captures everything.
3. Every week, it writes summaries to the vault.
4. Every week, it reads my own profile in the vault and adds what it newly observed about me.
5. The next time **any AI agent** (Claude Code, Cursor, ChatGPT) opens my vault to help me with anything, it already knows who I am, who I've been talking to, and what I've been complaining about.

The bot isn't the product. The product is a second brain that updates itself.

## What I've learned so far

A reading bot is more useful than a replying bot for someone who doesn't scale customer service. I already have customer service optimized. What I don't have is someone watching from the outside for patterns I let slip.

Conservative prompts beat creative prompts when the output becomes input for a decision. Anywhere I could trade freedom for fixed format, I did.

State as JSON in a file is more than enough for a single-user system. I added zero infrastructure. No database, no queue, no container. Runs on the PC that was already on.

Multi-provider isn't a luxury, it's hygiene. A single provider is a broken promise waiting to happen.

## Next steps

The reading is done. What's missing is an active trigger: the bot detecting that an important contact has gone silent for 30 days and nudging me with a suggested message. The bot detecting that a supplier group has shifted in tone (a price hike on the way) and warning me before the order goes out.

The difference between an observer and an agent is just one layer of "when this, do that." Enough data is being captured for that layer to start making sense.
