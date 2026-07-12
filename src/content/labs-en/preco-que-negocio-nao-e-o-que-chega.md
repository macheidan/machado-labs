---
title: 'We cut 2% of purchasing cost without hiring anyone, with this AI'
heroTitle: 'We cut <em>2%</em> of purchasing cost<br/>without hiring anyone, with this <span class="accent">AI</span>'
description: 'I know the real cost of every input and which supplier is cheapest, without calculating anything. I stop buying out of habit and start buying on the best price.'
pubDate: 'Jun 28 2026'
tags: ['operacao', 'compras', 'ia']
keywords: ['real input cost', 'supplier price', 'invoice from tax authority', 'compare supplier prices', 'cost control', 'COGS', 'AI for purchasing']
---

**Challenge:** the price I agree on with the supplier is never the one that hits my cost. Tax, freight, and a value different from the deal land on the invoice, and comparing suppliers turned into a manual rule-of-three nobody does every day.

**Solution:** a bot pulls my invoices straight from the Receita Federal, extracts each item already with tax and freight, normalizes by real unit to make suppliers comparable, and feeds the intranet, which fires an alert the day an input goes up.

**Results:** the real cost of every item in hand, suppliers compared on their own (the rule-of-three is dead), and a price increase flagged the same day, not 30 days later at the month's close.

***

You sit with the supplier, negotiate a price, shake hands. Then the invoice arrives and the number is different. Taxes, freight, a value that came different from the deal, and suddenly the real cost of the input isn't what you wrote down. I was running the operation deciding on top of a price that **didn't really exist.**

## The negotiated price is a fiction

The negotiation price is a promise. The price that matters is the one that **hits your cost**, and that one only shows up later, buried in the invoice, mixed with tax and freight. Whoever controls cost by what they agreed on is controlling a fiction.

And there's a second trap, quieter: even when I had the real price, comparing suppliers was **apples to oranges.** One brand's input doesn't come in the same weight as another's. To know who was actually cheaper, every time it was a manual rule-of-three. Nobody does a rule-of-three every day, so in practice nobody compares. You buy out of habit, not on the best price.

## I pulled the number from the source, not the paper

I solved it by going to the source of truth: my own invoices, straight from the tax authority (Receita Federal). A bot fetches each invoice, already with tax and freight baked in, and **adjusts and categorizes every item** into a comparable format. Real price per unit, normalized, apples to apples.

That killed the rule-of-three. The system already tells me what the same input costs at each supplier, in the same standard, without me calculating anything.

## Cost became something the team sees on the spot

The final leap was taking this off my lap and putting it in the [team hub](/en/labs/operacao-nao-depender-de-mim/). The input-prices section **flags every day when an item goes up.** The admin team sees it right away, not at the month's close, when the damage is already done.

> Cost you discover at the end of the month is cost you can only confirm. Cost you see on the day is cost you can negotiate.

***

Pulling the real cost out of the invoice, making everything comparable, and warning the team the day it changes is exactly the kind of project I help companies build.

**Stack:** a bot that fetches invoices straight from the tax authority, extracts each item already with tax and freight, normalizes by real unit to make suppliers comparable, and feeds an input-prices section in the intranet that fires a daily alert when any item rises.
