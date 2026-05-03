---
title: 'I built an AI agent that takes care of my WhatsApp'
heroTitle: 'I built an <em>agent</em><br/>that runs my <span class="accent">WhatsApp</span>'
description: 'I was missing important stuff in the groups every week. So I put an agent to read my WhatsApp for me, send me what needs an urgent reply at the end of the day, and a summary of every contact and every group on Sunday. Runs on the home PC, costs zero, plugged into my own number.'
pubDate: 'May 01 2026'
heroImage: '../imgs/260501.jpeg'
heroAlt: 'AI agent reading my WhatsApp messages in the background'
tags: ['cortex', 'agentes', 'whatsapp']
keywords: ['WhatsApp AI agent', 'WhatsApp automation for business', 'AI for WhatsApp', 'WhatsApp group summaries', 'save time on WhatsApp', 'AI for business owners']
---

I was spending **too much time on WhatsApp**. Reading the supplier groups, forwarding stuff to the manager, replying to quotes, reading the family group I had already given up on two days earlier.

Every night, the same feeling: something important slipped through and I have no idea what.

Sometimes it was just a feeling. Sometimes it wasn't. I'd find out on Monday when a supplier was chasing a reply that **never came**.

## Instead of a bot that talks, a bot that reads

I had already been building [My Digital Cortex](/en/labs/segundo-cerebro-ia/) for a while. Memory ready, persona ready, and what was missing was the part I called *"agency"*: the agent stops just answering and starts **acting in my world**.

One of those nights it hit me. WhatsApp was the most obvious place to start. That's where my attention leaks first.

> Instead of a bot that talks to customers, a bot that reads me.

Reads the groups for me. Reads the chats for me. Sends me at the end of the day what needs an urgent reply, and at the end of the week a summary of every relevant contact and every important group.

Whatever it observes flows back into the Cortex. Every other AI tool I use afterwards already knows who I've been talking to, what we've been talking about, and what's still pending.

## Built it in one night

Runs on the PC that's already on at home all day. Plugged into my own number. **It sits there watching alongside me, sees everything I see, and talks to nobody.**

The first week paid off.

Sunday night the summary hit my phone and there were **two things I hadn't seen**:

1. A supplier chasing a quote I swore I had answered.
2. A reminder from my kid's school — I was about to miss a deadline.

Neither was going to break me. Both were going to give me a headache.

> The problem wasn't WhatsApp. It was attention.

WhatsApp was just the place where it leaked first.

## The contact summary

The part that got me the most wasn't even the group summaries. **It was the per-contact summaries.**

The bot looks at the last few weeks with each relevant person, writes two lines on what's going on in the relationship, and flags when someone has gone silent.

I used to remember people on autopilot. In a panic. Only when something was already chasing me.

Now there's something pushing it up to me every week, **before it turns into a problem**.

Another thing it does is read **my own messages**. Sunday night it compares what I said over the week with what it already knew about me, and updates my profile inside the Cortex. No invention. Just what can be observed from what I actually wrote.

## The invention trap

There's a trap here that took me a while to get.

This is exactly where a loose model **invents the universe**. The first version handed me a novel. It drew up a psychological profile of people I had traded three messages with. It deduced intentions nobody had stated.

It looked deep. It was made up.

I rewrote the prompt forcing a fixed format and forbidding invention. If there's nothing to say, say nothing.

> I'd rather have nothing than wrong.

This bot writes into the Cortex. If it makes things up, I'm going to be making decisions next week based on its made-up nonsense. The cost of a hallucination here **doesn't make up for** the upside of a "richer" report.

## Plan B, C, D

To avoid depending on a single AI model, I built in redundancy: if the first one is down or out of quota, it tries the second. If the second is down, it goes to the third.

It's not a luxury. **Models get deprecated from one week to the next**, quotas run out, APIs go down on a Sunday night.

The bot has to run.

Cost so far: **zero**. Everything fits inside free tiers at the scale of one person.

## Phase 2: letting it reply

There's something I'm still chewing on.

Phase 1 is reading. **Phase 2 is letting it reply to small stuff for me**, within clear rules. *"On my way"*, *"got it"*, *"what time did we agree on"*, confirming a payment that the finance side already passed me.

No end customer. No decision. Just the thank-yous and the confirmations that eat my day without adding anything.

For that to work without becoming a nightmare, I need three things in place:

1. **Knowing who each contact is.** Phase 1 is already building that inside the Cortex.
2. **Clear rules** on what it answers alone, what it drafts for me to approve with one click, and what it never touches.
3. **Learning the way I write**, so the reply sounds like me.

The three paths come from the same source: the agent reading what I myself write.

---

For now it only reads. And just from reading, it has already changed the way I show up on Monday morning.

## Stack

- Node running 24/7 on the home PC.
- `@whiskeysockets/baileys` for the direct WhatsApp connection over QR code, no paid official API, no separate number. The bot stays logged in alongside the phone.
- `@google/genai` (Gemini) for the analysis, with automatic fallback to Groq, Cerebras, and OpenRouter when Gemini is down or out of quota. Inside Gemini, fallback between `gemini-2.5-flash`, `gemini-2.0-flash`, and `gemini-2.0-flash-lite`.
- `node-cron` for scheduling: daily report at 8pm, weekly Sunday at 8pm, monthly on the 1st.
- State as plain JSON in a single file (`.state.json`). No database, no ORM, no container, no queue.
- Retention windows: 30 days for DMs and for my own messages, 7 days for groups. Anything older is dropped at save time. State never grows unbounded.
- Audio, stickers, documents, and broadcast: ignored. Text only (`conversation`, `extendedTextMessage`, image captions).
- Commands by sending myself a message starting with `/` (`/resumo`, `/resumo grupos`, `/resumo mensal`). The dashboard is WhatsApp itself.
- Reports are saved as markdown into the Cortex (synced over Drive) and pushed to me on WhatsApp.
- Conservative prompts at every point where the output becomes input to a decision. Fixed format, explicit ban on invention, instruction to return "nothing new" when there's nothing to say.
- Cost so far: zero. Gemini's free tier covers the scale of a single user.
