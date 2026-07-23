---
title: 'The system went down two Fridays in a row. We built our own in 2 hours'
heroTitle: 'The system went down <em>two Fridays in a row</em>.<br/>We built our own in <span class="accent">2 hours</span>'
description: 'Two Fridays in a row with the ordering system down, on the busiest night of the pizzeria. We sent the AI a photo of the menu and the delivery fee table. Two hours later we had our own system, which even calculates the fee by radius.'
pubDate: 'Jul 23 2026'
tags: ['operacao', 'automacao', 'ia']
keywords: ['ordering system down', 'own ordering system', 'delivery plan B', 'delivery fee by radius', 'pizzeria POS', 'build a system with AI', 'AI for operations']
---

<div class="case-summary">

**Challenge:** two Fridays in a row with the ordering system down, on the busiest night of the pizzeria. It's a good system, but when it goes down there is no button of ours to press: phone ringing, counter full, and the whole operation waiting for it to come back.

**Solution:** we built our own ordering system. We sent the AI a photo of the menu and the delivery fee table, and it put together the rest: customer lookup by phone number, the real menu rules, delivery fee calculated by radius, and the receipt printing on the thermal printer.

**Results:** 2 hours from idea to the system running in the store, $0 in monthly fees, and a Friday night that no longer stops when the main system goes down.

</div>

## Two Fridays in a row, the same scene

Friday is the day that pays a pizzeria's week. And we had two Fridays in a row with the ordering system down: phone ringing, counter full, and the team refreshing the page waiting for it to come back. It's a good system, we use it and we'll keep using it. But when it goes down, we become hostages. There is no button of ours to press, no one to call who fixes it right away. Just waiting.

And there is a quieter trap than the sales lost that night. The whole operation lives inside a system that isn't ours: the customer records, the prices, the receipt printing, all on their side. When it shuts its door, we're locked outside without reaching even our own data. We realized we didn't have a plan B. We had a cheering section.

## A photo of the menu, two hours later

The obvious path would be subscribing to a second system, from another company, just as a backup. But that means paying one more monthly fee to keep depending on someone else's infrastructure, and training the team on a second screen it almost never uses. A plan B that costs money every month and nobody remembers how to use isn't a plan B, it's a bill.

We decided to build our own. We sent the AI a photo of the menu and the delivery fee table, and described how we take orders on the phone and at the counter. Two hours later, the system was running on the store's own computer. No monthly fee, no contract, no depending on anyone's infrastructure: if the internet drops, it keeps taking orders.

And it didn't come out as a spreadsheet dressed up as a system. It came out with the real rules of the house: how many flavors each size takes, half-and-half, crusts, drinks, prices matching the website. The part that surprised us most was the delivery fee: it measures the radius from the store to the customer's house and selects the right fee bracket on its own, with nobody memorizing a neighborhood map.

## In practice, the night no longer stops

In practice, it works like this: the attendant types the phone number and, if the customer has ordered before, name and address fill in on their own. Build the pizza, start typing the street and the system suggests the neighborhood, measures the distance and selects the right delivery fee. On checkout, it shows the receipt for review and prints straight to the thermal printer. Project cost: **2 hours** of one day and **$0 in monthly fees** forever.

The next Friday, the main system could go down again and orders would keep coming out. And both brands run side by side on the same counter, each with its own screen and its own numbering. It's the same logic as when we made the [menu of all six stores flow from a single source](/labs/cardapio-de-seis-lojas-no-ifood/): the information is ours, and it's the information that has to live in our hands.

> Depending on a good system isn't the problem. The problem is having no way out when it closes its door.

***

Building, in hours, a plan B that keeps the operation standing when the main system goes down is exactly the kind of project I help companies put together.

**Stack:** a local system running on the store's own computer, with customer lookup by phone number (name and address fill in on their own), a menu with the real rules of the house (flavors per size, half-and-half, crusts and drinks), street and neighborhood suggestions while typing, delivery fee calculated by the radius between the store and the customer's house, receipt review before printing, printing on up to two thermal printers at once, reprint of any order, two brands running side by side with their own numbering, password protection over customer data, full order history and automatic backup.
