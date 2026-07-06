---
title: 'I built an AI agent that takes care of my WhatsApp'
heroTitle: 'I built an <em>agent</em><br/>that runs my <span class="accent">WhatsApp</span>'
description: 'I was missing important business stuff on WhatsApp every week. So I put an agent to read it for me and flag what needs a reply, without it inventing anything and without depending on a single API. Runs on the home PC, costs zero.'
pubDate: 'May 01 2026'
updatedDate: 'Jul 5 2026'
heroImage: '../imgs/260501.jpeg'
heroAlt: 'AI agent reading my WhatsApp messages in the background'
tags: ['cortex', 'agentes', 'whatsapp']
keywords: ['WhatsApp AI agent', 'WhatsApp automation for business', 'AI for WhatsApp', 'WhatsApp group summaries', 'save time on WhatsApp', 'AI for business owners']
---

Monday morning is different now. I show up knowing what's still pending from the weekend, what needs a reply, and what can wait. Before, I showed up in the dark and found out what had slipped only when it was too late: a supplier chasing a quote I swore I had answered.

The problem was never WhatsApp. It was attention: **keeping up by hand doesn't scale**, and the answer was never to try harder.

## A bot that reads, not one that talks

Everyone pictures a WhatsApp bot as customer service: a robot that talks to clients. I did the opposite.

> Instead of a bot that talks, a bot that reads me.

It follows the groups and conversations that matter to the business and hands me three things: at the end of the day, what needs an urgent reply; on Sunday, a summary of what happened and what's still open; on the 1st, the whole month. It runs on the PC that's already on at home, plugged into my own number. Sees what I see, and talks to nobody.

It's the "agency" layer of [My Digital Cortex](/en/labs/segundo-cerebro-ia/): the agent stops just answering questions and starts acting where my attention leaks first.

## The hard part isn't reading. It's trusting.

Any model can read. The problem showed up in the first version: it handed me a **novel**. It deduced intentions nobody wrote, stated conclusions about a thread that barely had three messages. It looked deep. It was made up.

And this isn't decoration. **This bot writes inside my Cortex.** If it invents, next week I'm deciding on top of its invention.

> I'd rather have nothing than wrong.

So the rule became the opposite of what most people do with AI: fixed format, an explicit ban on deducing, and an order to return "nothing new" when there's nothing to say. The system's intelligence isn't in speaking well. It's in **knowing to stay quiet when it observed nothing.**

## Why it never stops

Looks like a technical detail, but it's an owner's concern: I built redundancy. If the main model is down or out of quota, it tries the second, then the third. Models get deprecated from one week to the next, quotas run out, APIs go down on a Sunday night, and the summary still has to arrive. Cost so far: zero, it fits inside free tiers at the scale of one person.

***

Just from reading, it already changed how I show up on Monday. Building an agent that acts in the real world, without inventing and without becoming hostage to a single API, is exactly the kind of project I help companies build.

**Stack:** runs on Node 24/7 on the home PC, connected to WhatsApp directly over QR code (no paid API, no separate number); the analysis goes through a cascade of models (Gemini with fallback to Groq, Cerebras, and OpenRouter) scheduled by cron (daily, Sunday, the 1st); state in a single file with short retention, text only, commands I send to myself, and conservative prompts wherever the output becomes a decision. Cost: zero.
