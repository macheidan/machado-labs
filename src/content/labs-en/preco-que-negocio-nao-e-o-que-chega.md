---
title: 'We cut 2% of purchasing cost with this AI'
heroTitle: 'We cut <em>2%</em> of purchasing cost<br/>with this <span class="accent">AI</span>'
description: 'We know the real cost of every input and which supplier is cheapest, without calculating anything. My team stops buying out of habit and starts buying on the best price.'
pubDate: 'Jun 28 2026'
tags: ['operacao', 'compras', 'ia']
keywords: ['real input cost', 'supplier price', 'invoice from tax authority', 'compare supplier prices', 'cost control', 'COGS', 'AI for purchasing']
---

<div class="case-summary">

**Challenge:** more than 130 inputs per store, bought every week. The negotiated price is almost never what lands on the invoice (tax, freight, and off-deal amounts pile on), and comparing suppliers meant a manual rule-of-three.

**Solution:** a bot pulls the invoices straight from the Receita Federal, tax and freight already baked in, and normalizes everything by real unit (per kg/unit) to compare suppliers. The intranet flags the day an input goes up.

**Results:** with the alert in hand, the purchasing team negotiates with the supplier on the spot and uses the same number as leverage with the others. In the end, 2% less on purchasing cost, without hiring anyone.

</div>

## The negotiated price is a fiction

The negotiation price is a promise. The price that matters is the one that **hits your cost**, and that one only shows up later, buried in the invoice, mixed with tax and freight. Whoever controls cost by what they agreed on is controlling a fiction.

And there's a second trap, quieter: even when I had the real price, comparing suppliers was **apples to oranges.** One brand's input doesn't come in the same weight as another's. To know who was actually cheaper, every time it was a manual rule-of-three. Nobody does a rule-of-three every day, so in practice nobody compares. You buy out of habit, not on the best price.

## I pulled the number from the source, not the paper

The obvious route would be to solve this inside my own ordering system, which also records purchases. But **the system only sees what someone types into it.** The price that goes in is the negotiated one, tax and freight stay out of the math, and every supplier describes the same input with a different name and weight. I'd be paying someone to type the same fiction into a tidier place, every week, for more than 130 inputs.

I solved it by going to the source of truth: my own invoices, straight from the tax authority (Receita Federal). A bot fetches each invoice, already with tax and freight baked in, and **adjusts and categorizes every item** into a comparable format. Real price per unit, normalized, apples to apples.

That killed the rule-of-three. The system already tells me what the same input costs at each supplier, in the same standard, without me calculating anything.

## Cost became something the team sees on the spot

The final leap was taking this off my lap and putting it in the [team hub](/en/labs/operacao-nao-depender-de-mim/). The input-prices section **flags every day when an item goes up.** The admin team sees it right away, not at the month's close, when the damage is already done.

In practice, it works like this: the alert shows up in the intranet with the input, the supplier, and the size of the increase. The purchasing team **reaches out the same day**, invoice in hand, and negotiates a rebate on what came in above the deal. And since the subject is already on the table, they use the same conversation to lock in the price of the next order. The increase that used to slip by became a negotiation on the day it happened.

> Cost you discover at the end of the month is cost you can only confirm. Cost you see on the day is cost you can negotiate.

***

Pulling the real cost out of the invoice, making everything comparable, and warning the team the day it changes is exactly the kind of project I help companies build.

**Stack:** a bot that fetches invoices straight from the tax authority, extracts each item already with tax and freight, normalizes by real unit to make suppliers comparable, and feeds an input-prices section in the intranet that fires a daily alert when any item rises.
