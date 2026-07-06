---
title: 'How I update the menu across six iFood stores at once'
heroTitle: 'How I update the <em>menu</em><br/>across six <span class="accent">iFood</span> stores'
description: 'Adjusting one item looks like a click. With six iFood stores it turns into dozens of manual edits, one per store, and one difference sits live for weeks. I made the menu come from a single source, in one pass.'
pubDate: 'Apr 12 2026'
tags: ['operacao', 'automacao', 'ia']
keywords: ['update menu on iFood', 'sync menu', 'multi-store menu', 'iFood menu management', 'automate repetitive task', 'managing multiple stores', 'AI for operations']
---

It looks like the dumbest task in the world: adjusting one item on the menu. A click. Except I don't have one iFood store, I have six. And each store carries the whole menu, item by item.

So the click becomes something else. Adjusting the menu for real means opening the six iFood stores, finding the same item in each, changing it, saving, checking. Repeat for every item that changed. What looked like a minute becomes half an afternoon, and it's the kind of work nobody wants to do, so it gets left for later.

## The problem isn't the time. It's the difference that sits live.

Manual, repetitive work has a cost the clock doesn't show: **it fails silently.** You adjust dozens of items across six stores by hand and, somewhere, a value comes out different, an item keeps the old version, a store gets skipped. And it doesn't shout. The menu stays out of sync for weeks, until a customer or the monthly close tells you.

> A mismatched menu on iFood doesn't wake you up at night. It just bleeds slowly.

In a multi-store operation, that becomes the rule, not the exception. The menu is never 100% the same everywhere.

## One source of truth, one pass

I solved it by flipping the problem inside out. Instead of me going store by store on iFood, the menu now lives in **one place**, my source of truth. When it changes there, an automation opens each store and applies the same adjustment to all of them, in the same pass.

Add it all up and it's over 2,000 items. I gain time and accuracy: no item ends up charged wrong. When it was done by hand, there was always one that slipped through.

***

Taking the boring, repetitive task off the owner's plate, the one that only breeds mistakes, without them losing control of what changes, is the kind of project I help companies build. Same spirit as [putting the monthly close on autopilot](/en/labs/dre-no-automatico/): the manual work goes, the control stays.

**Stack:** a single menu as the source of truth and a browser automation that goes into each iFood store and applies the adjustment in batch, with a preview of what will change in each one before writing.
