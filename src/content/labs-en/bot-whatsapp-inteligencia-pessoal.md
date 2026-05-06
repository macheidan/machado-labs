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

I was spending **way too much time on WhatsApp**. Supplier groups, forwarding stuff to the manager, replying to quotes, the family group I had already given up on two days earlier.

Every night, the same feeling: **something important slipped through and I have no idea what**.

Sometimes it was paranoia. Sometimes it wasn't. I'd find out on Monday when a supplier was chasing a reply that never came.

## Instead of a bot that talks, a bot that reads

I was already building [My Digital Cortex](/en/labs/segundo-cerebro-ia/). Memory ready, persona ready. What was missing was the part I called *"agency"*: the agent stops just answering and starts **acting in my world**.

WhatsApp was the most obvious place to start. **That's where my attention leaks first.**

> Instead of a bot that talks to customers, a bot that reads me.

What it does, in three lines:

- **Daily, 8pm.** What needs an urgent reply today.
- **Sunday, 8pm.** A summary of every important group and every relevant contact.
- **Monthly, the 1st.** A view of the whole month.

Whatever it observes flows back into the Cortex. Every other AI tool I use afterwards already knows **who I've been talking to, what about, and what's still pending**.

## Built it in one night

Runs on the PC that's already on at home. Plugged into my own number. **Sees everything I see, and talks to nobody.**

The first week paid off. Sunday night the summary hit my phone and there were **two things I hadn't seen**:

1. A supplier chasing a quote I swore I had answered.
2. A reminder from my kid's school. I was about to miss the deadline.

Neither was going to break me. Both were going to give me a headache.

> The problem wasn't WhatsApp. It was attention.

## The part that got me the most

It wasn't the group summaries. **It was the per-contact summaries.**

For each relevant person, it:

- Looks at the last few weeks of conversation.
- Writes two lines on what's going on in the relationship.
- Flags when someone has gone silent.

I used to remember people in a panic, only when something was already chasing me. Now there's something pushing it up to me every week, **before it turns into a problem**.

Bonus: Sunday night it reads **my own messages** from the week and updates my profile inside the Cortex. No invention, just what can be observed from what I actually wrote.

## The invention trap

This is exactly where a loose model **invents the universe**.

The first version handed me a novel. It drew up a psychological profile of people I had traded three messages with. It deduced intentions nobody had stated. It looked deep. It was made up.

I rewrote the prompt forcing a fixed format and forbidding invention. **If there's nothing to say, say nothing.**

> I'd rather have nothing than wrong.

This bot writes into the Cortex. If it makes things up, next week I'm making decisions based on its made-up nonsense. Not worth it.

## Plan B, C, D

To avoid depending on a single model, I built in redundancy. If the first one is down or out of quota, it tries the second. If the second is down, it goes to the third.

It's not a luxury:

- **Models get deprecated** from one week to the next.
- **Quotas run out.**
- **APIs go down on a Sunday night.**

The bot has to run. Cost so far: **zero**. Everything fits inside free tiers at the scale of one person.

## Phase 2: letting it reply

Phase 1 is reading. **Phase 2 is letting it reply to small stuff for me.**

*"On my way"*. *"Got it"*. *"What time did we agree on"*. Confirming a payment finance already passed me.

No end customer. No decision. Just the thank-yous and the confirmations that eat my day without adding anything.

For that to work without turning into a nightmare, I need three things:

1. **Knowing who each contact is.** Phase 1 is already building that inside the Cortex.
2. **Clear rules** on what it answers alone, what it drafts for me to approve with one click, and what it never touches.
3. **Learning the way I write**, so its replies sound like me.

All three come from the same source: the agent reading what I myself write.

---

For now it only reads. And just from reading, it has already changed the way I show up on Monday morning.

## Stack

- Node 24/7 on the home PC.
- `@whiskeysockets/baileys` for the direct WhatsApp connection over QR code. No paid official API, no separate number. The bot stays logged in alongside the phone.
- `@google/genai` (Gemini) for the analysis, with automatic fallback to Groq, Cerebras, and OpenRouter. Inside Gemini, fallback between `gemini-2.5-flash`, `gemini-2.0-flash`, and `gemini-2.0-flash-lite`.
- `node-cron` for scheduling: daily 8pm, weekly Sunday 8pm, monthly on the 1st.
- State as plain JSON in a single file (`.state.json`). No database, no ORM, no container, no queue.
- Retention: 30 days for DMs and for my own messages, 7 days for groups. Anything older is dropped at save time. State never grows unbounded.
- Audio, stickers, documents, and broadcast: ignored. Text only.
- Commands by sending myself a message starting with `/` (`/resumo`, `/resumo grupos`, `/resumo mensal`). The dashboard is WhatsApp itself.
- Reports saved as markdown into the Cortex (synced over Drive) and pushed to me on WhatsApp.
- Conservative prompts wherever the output becomes input to a decision. Fixed format, explicit ban on invention, instruction to return "nothing new" when there's nothing to say.
- Cost so far: zero. Gemini's free tier covers the scale of a single user.
