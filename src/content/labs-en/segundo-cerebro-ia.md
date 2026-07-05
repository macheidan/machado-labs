---
title: 'How I''m building My Digital Cortex'
heroTitle: 'How I''m<br/>building <em>My</em><br/><span class="accent">Digital Cortex</span>'
description: 'Every business owner re-explains their own company to each AI, from scratch. I built a system that gives artificial intelligence permanent memory of the business and of how I decide, so I stopped starting over every time.'
pubDate: 'Apr 26 2026'
updatedDate: 'Jul 5 2026'
tags: ['cortex', 'agentes', 'ia-first']
keywords: ['second brain', 'AI memory', 'AI agents', 'context for AI', 'AI with company memory', 'give context to ChatGPT', 'AI first', 'AI for business owners']
---

I run several fronts at once, and for a long time I repeated the same waste: every time I opened an AI to help, it **started from scratch**. It didn't know my businesses, didn't know how I think, didn't remember anything from the previous conversation. I spent half my time re-explaining the context before getting anything useful.

It took me a while to realize the problem wasn't the AI. It was that **my context lived nowhere**. It was scattered in my head, in loose conversations, in lost notes. No tool could know what was never written down.

That's where the idea came from: build an external brain, outside any tool, that would be the **single source of truth about me and the businesses**. Any AI I open reads that first and arrives already knowing. I called it **My Digital Cortex**.

## Why I didn't tie it to a tool

The obvious mistake would be building this inside the trendy product. And AI products change every week.

> Tools die. Context survives.

AI became a commodity: it swaps name, owner, price. What can't swap is the context of my business. So it's **mine**, in a simple format any model can read, today and five years from now. This is what I call thinking **AI first**: it isn't picking the best AI, it's organizing the business so that any AI can work inside it.

## The problems that showed up along the way

Building this wasn't dumping information in a corner. Each layer brought a real problem:

- **AI is a flatterer.** It invents things to look useful, and in a business, deciding on invented data is worse than deciding on no data.
- **I don't decide the way I think I do.** When I went to describe my process, what I *thought* didn't match what I *did*.
- **The automation that feeds the system makes mistakes.** If it overwrites or records what it didn't observe, it poisons the whole base.

Each of those turned into a rule of the system.

## How I solved it

I built it in four layers, and each one only comes in when the one below is solid:

1. **Memory.** I gathered all the scattered context into one place, organized by business. Never deleted an original without approving it first.
2. **Persona.** I captured how I *actually* decide, not how I'd like to. It's descriptive, not aspirational. With it, the AI **flags me when it senses I'm in the wrong mode** for an important decision. An AI that only agrees is worthless; this one corrects me.
3. **Agency.** Here the agents stop advising and start acting. The first was the WhatsApp one, which runs on its own and returns to the system only what is **genuinely new**. I walked through it in [I built an AI agent that takes care of my WhatsApp](/en/labs/bot-whatsapp-inteligencia-pessoal/).
4. **Triggers.** The next step: actions that fire on their own, without me asking.

The principle that holds it all together is distrust:

> Better to record nothing than to record something wrong.

## Where it left me

Today any AI I open already works knowing my business and how I think. I stopped starting from scratch, and on a day of overload the system **knows my context better than I do at that moment**.

It took me months of finding what breaks to get here. Today it's the foundation of everything I do with AI, and it's exactly the kind of project I help other companies build.

**Stack:** simple text files version-controlled in Git and synced through Google Drive, opened in Obsidian; and a cascade of models (Claude, GPT, Gemini) that reads and feeds the base back, with the numbers computed in code and the AI only writing them up.
