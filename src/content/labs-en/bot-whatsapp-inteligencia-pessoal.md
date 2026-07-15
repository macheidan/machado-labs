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

<div class="case-summary">

**Challenge:** important business stuff slipped through WhatsApp every week: a supplier chasing a quote I swore I had answered, a pending item buried in a group. Keeping up by hand doesn't scale.

**Solution:** an agent that reads me, instead of talking to customers: it follows the groups and conversations that matter and hands me what needs a reply at the end of the day, the week's summary on Sunday, and the month on the 1st. With an explicit ban on inventing and backup models so it never stops.

**Results:** I show up on Monday knowing what's pending and what needs a reply. Nothing important slips, the summary has never failed to arrive, and the cost so far is zero.

</div>

## I used to show up on Monday in the dark

Before, I found out what had slipped over the weekend only when it was too late: a supplier chasing a quote I swore I had answered. Today I show up knowing **what's still pending, what needs a reply, and what can wait.**

And the problem was never WhatsApp. It was attention: **keeping up by hand doesn't scale**, and the answer was never to try harder. In an operation that runs on messages, the important thing doesn't shout. It just sinks under the others.

## A bot that reads me, not one that talks

The obvious route would be a customer-service bot, a robot that talks to clients. But my problem wasn't talking to clients, it was what slipped past me. So I did the opposite: **instead of a bot that talks, a bot that reads me.**

It follows the groups and conversations that matter to the business, runs on the PC that's already on at home, plugged into my own number. Sees what I see, and talks to nobody. It's the "agency" layer of [My Digital Cortex](/en/labs/segundo-cerebro-ia/): the agent stops just answering questions and starts acting where my attention leaks first.

And here came the hard part, which isn't reading. **It's trusting.** The first version handed me a novel: it deduced intentions nobody wrote and stated conclusions about a thread that barely had three messages. It looked deep. It was made up.

## It knows to stay quiet when it observed nothing

This isn't decoration: this bot **writes inside my Cortex.** If it invents, next week I'm deciding on top of its invention. So the rule became the opposite of what most people do with AI: fixed format, an explicit ban on deducing, and an order to return "nothing new" when there's nothing to say.

In practice, it works like this: at the end of the day it hands me what needs an urgent reply, on Sunday a summary of what's still open, on the 1st the whole month. If the main model is down or out of quota, it tries the second, then the third. An API goes down on a Sunday night and the summary arrives all the same. Cost so far: **zero.**

> I'd rather have nothing than wrong.

***

Just from reading, it already changed how I show up on Monday. Building an agent that acts in the real world, without inventing and without becoming hostage to a single API, is exactly the kind of project I help companies build.

**Stack:** runs on Node 24/7 on the home PC, connected to WhatsApp directly over QR code (no paid API, no separate number); the analysis goes through a cascade of models (Gemini with fallback to Groq, Cerebras, and OpenRouter) scheduled by cron (daily, Sunday, the 1st); state in a single file with short retention, text only, commands I send to myself, and conservative prompts wherever the output becomes a decision. Cost: zero.
