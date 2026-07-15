---
title: 'How I update the menu across six iFood stores at once'
heroTitle: 'How I update the <em>menu</em><br/>across six <span class="accent">iFood</span> stores'
description: 'Adjusting one item looks like a click. With six iFood stores it turns into dozens of manual edits, one per store, and one difference sits live for weeks. I made the menu come from a single source, in one pass.'
pubDate: 'Apr 12 2026'
tags: ['operacao', 'automacao', 'ia']
keywords: ['update menu on iFood', 'sync menu', 'multi-store menu', 'iFood menu management', 'automate repetitive task', 'managing multiple stores', 'AI for operations']
---

<div class="case-summary">

**Challenge:** six stores on iFood, each carrying the whole menu, over 2,000 items in total. Adjusting one item turns into dozens of manual edits, one per store, and whatever slips through stays charged wrong for weeks with nobody noticing.

**Solution:** the menu now lives in one place, my source of truth. When it changes there, an automation opens each iFood store and applies the same adjustment to all of them, in the same pass, with a preview of what will change before writing.

**Results:** over 2,000 items coming from a single source, no item charged wrong out of carelessness, and half an afternoon of manual work became one checked pass.

</div>

## Adjusting one item looks like a click

It looks like the dumbest task in the world. Except I don't have one iFood store, I have six. And each store carries the whole menu, item by item. So the click becomes something else: **opening the six stores, finding the same item in each, changing it, saving, checking.** Repeat for every item that changed. What looked like a minute becomes half an afternoon, and it's the kind of work nobody wants to do, so it gets left for later.

And the problem isn't the time. It's the difference that sits live: manual, repetitive work **fails silently.** You adjust dozens of items across six stores by hand and, somewhere, a value comes out different, an item keeps the old version, a store gets skipped. It doesn't shout. The menu stays out of sync for weeks, until a customer or the monthly close tells you. In a multi-store operation, that becomes the rule, not the exception.

## One source of truth, one pass

The obvious route would be putting someone on it, or setting up a weekly check store by store. But that doesn't solve it, it just moves it: the person will fail silently all the same, and checking 2,000 items by hand is more manual work, not less. The mistake wasn't in whoever was typing. **It was in having six menus to keep identical.**

I solved it by flipping the problem inside out. Instead of me going store by store on iFood, the menu now lives in **one place**, my source of truth. When it changes there, an automation opens each store and applies the same adjustment to all of them, in the same pass. There stopped being six menus: there's one, replicated.

## The manual work goes, the control stays

In practice, it works like this: I change the item at the source, the automation shows me **a preview of what will change in each store**, I check it and it writes. Add it all up and it's over 2,000 items coming from a single place. I gain time and I gain accuracy: no item ends up charged wrong because it slipped. When it was done by hand, there was always one.

> A repetitive task doesn't wake you up at night. It bleeds slowly, and you only find out at the close.

***

Taking the boring, repetitive task off the owner's plate, the one that only breeds mistakes, without them losing control of what changes, is the kind of project I help companies build. Same spirit as [putting the monthly close on autopilot](/en/labs/dre-no-automatico/): the manual work goes, the control stays.

**Stack:** a single menu as the source of truth and a browser automation that goes into each iFood store and applies the adjustment in batch, with a preview of what will change in each one before writing.
