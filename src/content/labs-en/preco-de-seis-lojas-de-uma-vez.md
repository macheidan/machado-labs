---
title: 'How I fix prices across six stores at once'
heroTitle: 'How I fix prices across<br/><em>six stores</em> <span class="accent">at once</span>'
description: 'Changing one price looks like a click. With several stores it turns into dozens of manual edits, one per item per store, and one mistake sits live for weeks. I made it all come from a single source, in one pass.'
pubDate: 'Apr 12 2026'
tags: ['operacao', 'automacao', 'ia']
keywords: ['update iFood prices', 'sync menu', 'multi-store pricing', 'automate repetitive task', 'managing multiple stores', 'AI for operations', 'AI for business owners']
---

It looks like the dumbest task in the world: changing the price of one flavor. A click. Except I don't have one store, I have six on the delivery portals. And each store carries the whole menu, flavor by flavor.

So the click becomes something else. Changing one price for real means opening six stores, finding the same item in each, editing, saving, checking. Repeat for every flavor that changed. What looked like a minute becomes half an afternoon, and it's the kind of work nobody wants to do, so it gets left for later.

## The problem isn't the time. It's the mistake that sits live.

Manual, repetitive work has a cost the clock doesn't show: **it fails silently.** You change dozens of flavors across six stores by hand and, somewhere, a cent comes out wrong, an item keeps the old price, a store gets skipped. And that mistake doesn't shout. It keeps selling wrong for weeks, until a customer or the monthly close tells you.

> A wrong price on a portal doesn't wake you up at night. It just bleeds slowly.

In a multi-store operation, that becomes the rule, not the exception. The menu is never 100% the same everywhere.

## One source of truth, one pass

I solved it by flipping the problem inside out. Instead of me going store by store, the price now lives in **one place**, my source of truth. When it changes there, an automation opens each store and applies the same fix to all of them, in the same pass.

Six stores, dozens of flavors, one run. And, as always, with a review step first: it shows me what will change in each store so I can approve. I trust, but I verify.

The obvious gain is time. What matters is that the menu **stays the same everywhere, always**, and the silent mistake stops existing.

***

Taking the boring, repetitive task off the owner's plate, the one that only breeds mistakes, without them losing control of what changes, is the kind of project I help companies build. Same spirit as [putting the monthly close on autopilot](/en/labs/dre-no-automatico/): the manual work goes, the control stays.

**Stack:** a single price table as the source of truth and a browser automation that goes into each store and applies the fix in batch, with a preview of what will change in each one before writing.
