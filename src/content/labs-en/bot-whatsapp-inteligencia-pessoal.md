---
title: 'A personal secretary inside my WhatsApp'
heroTitle: 'A personal <em>secretary</em><br/>inside my <span class="accent">WhatsApp</span>'
description: 'It is connected to the number and could reply to customers, blast messages, handle chats in my place. It does not, and that was a decision. We built an AI secretary that only reads, summarizes, and flags what needs me. Runs on our server, costs zero.'
pubDate: 'May 01 2026'
updatedDate: 'Jul 19 2026'
heroImage: '../imgs/260501.jpeg'
heroAlt: 'AI secretary reading my WhatsApp messages in the background'
tags: ['cortex', 'agentes', 'whatsapp']
keywords: ['WhatsApp AI agent', 'WhatsApp virtual secretary', 'WhatsApp automation for business', 'WhatsApp group summaries', 'save time on WhatsApp', 'AI for business owners']
---

<div class="case-summary">

**Challenge:** important business matters slipped through WhatsApp every single day.

**Solution:** a secretary that reads and summarizes for me, without inventing anything and without depending on a single API:

- Follows the supplier-promotion groups and delivers a report at 4pm every day to my admin team.
- At 2pm it flags the important matters that hinge on my decision and that I still haven't answered.
- Summarizes the group conversations since the last time I stopped reading.

**Results:** I stay on top of the important matters that, without it, would surely have slipped. Cost so far: zero.

</div>

## Something sank every day

The problem wasn't once a week. It was every day. A supplier promotion I needed to see, a question sitting there waiting on my decision, a group I had stopped reading. In an operation that runs on messages, the important thing doesn't shout. **It just sinks under the others.**

And keeping up by hand doesn't scale. The answer was never to try harder to read more. It was to stop reading in the dark.

## A secretary, not an attendant

The obvious route would be a customer-service bot, a robot that talks to clients pretending to be us. But our problem was never talking to clients, it was what slipped past us. So we did the opposite: **we hired a secretary, not an attendant.** A good secretary doesn't answer in your place. She reads everything and tells you what needs you.

And here's the part almost everyone would do differently. She's plugged into the number, the same way any customer-service bot would be. **She could reply to customers, blast messages, handle chats in my place.** The plumbing for that is ready. She doesn't. **It was a decision, not a limitation.**

Turning an AI loose to talk to my customers, in my name, is a risk I chose not to take. The value was never in her talking. It was in her reading. So she talks to one person only: me. It's the "agency" layer of [our digital second brain](/en/labs/segundo-cerebro-ia/): the agent stops just answering questions and starts acting where my attention leaks first, without ever touching what it shouldn't.

## She knows to stay quiet when she saw nothing

There's another hard part, and it isn't reading. **It's trusting.** The first version handed me a novel: it deduced intentions nobody wrote and stated conclusions about a thread that barely had three messages. It looked deep. It was made up. And this secretary **writes inside our second brain**: if she invents, we decide on top of her invention.

So the rule became the opposite of what most people do with AI: fixed format, an explicit ban on deducing, and an order to return "nothing new" when there's nothing to say. If the main model is down or out of quota, she tries the second, then the third. An API goes down on a Sunday night and the report arrives all the same. Cost so far: **zero.**

> I'd rather have nothing than wrong.

***

Just from reading, it already changed how I show up midday. Building an agent that acts in the real world, without inventing, without becoming hostage to a single API, and that knows where it shouldn't reach, is exactly the kind of project we help other companies build.

**Stack:** runs on Node 24/7 on our server, connected to WhatsApp directly over QR code (no paid API, no separate number), with the auto-reply function deliberately switched off; the analysis goes through a cascade of models (Gemini with fallback to Groq, Cerebras, and OpenRouter) scheduled by cron; state in a single file with short retention, text only, and conservative prompts wherever the output becomes a decision. Cost: zero.
