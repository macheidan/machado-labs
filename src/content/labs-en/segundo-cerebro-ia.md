---
title: 'How I''m building My Digital Cortex'
heroTitle: 'How I''m<br/>building <em>My</em><br/><span class="accent">Digital Cortex</span>'
description: 'Every business owner re-explains their own company to each AI, from scratch. I built a markdown system, version-controlled in git and readable by any model, that gives AI permanent memory of the business and of how I decide.'
pubDate: 'Apr 26 2026'
updatedDate: 'Jul 5 2026'
tags: ['cortex', 'agentes', 'ia-first']
keywords: ['second brain', 'AI memory', 'AI agents', 'context for AI', 'AI with company memory', 'give context to ChatGPT', 'AI first', 'AI for business owners']
---

A business owner runs on many fronts at once and decides in different contexts. When I open any AI to help, it **starts from scratch, knowing nothing about the business or how I think**. Same re-explanation every time.

The fix I built was an external brain in markdown that serves as *the single source of truth for any agent*. I called it **My Digital Cortex**. Any model I open already arrives knowing who I am, how the companies run, and how I decide.

## The core idea

I don't want to depend on a specific tool. I want simple `.md` files, readable by any model: Claude, ChatGPT, Gemini, Cursor, whatever. AI is a commodity and swaps out constantly. **Context is the asset, and the asset has to be mine.**

> Tools die. Markdown survives.

This is what I call thinking **AI first**: it isn't picking the trendy AI, it's organizing the business so that any AI can work inside it. The Cortex is that layer.

## Architecture in 4 layers

```
┌─────────────────────────────┐
│ 4. TRIGGERS (cron, webhook) │
├─────────────────────────────┤
│ 3. AGENCY (Gmail, Cal, WA)  │  ← I'm here
├─────────────────────────────┤
│ 2. PERSONA (how I decide)   │  ← done
├─────────────────────────────┤
│ 1. MEMORY (what I know)     │  ← done
└─────────────────────────────┘
```

Each layer only exists once the one below it works. Without memory, the rest is guesswork.

## Phase 1: Memory

I scanned every source: Drive folders, projects, context scattered across a thousand places. Classified everything into categories and copied it into the Cortex structure. **Never moved originals without approval.**

The structure:

```
Cortex/
├── 00-meta/           # instructions for any agent
├── 01-pizzarias/      # the companies: marketing, ops, finance
├── 02-projetos-dev/   # all code projects
├── 03-pessoal/        # profile and how I decide
├── 04-consultoria/    # projects and clients
├── 08-secretaria-log/ # operational logs (out of git)
```

Every file has a simple header with `project`, `status`, `updated`, and `tags`. That lets any agent grasp the context **without reading the whole file**, and without burning processing for nothing.

## Phase 2: Persona

This is the trick almost nobody does: I captured how I *actually* decide, not how I think I do.

- I decide alone, rarely asking for input first
- I prefer data and numbers, but impulse can override the analysis
- I tend to overestimate how well I know a problem and underestimate the real effort

The file isn't aspirational. **It's descriptive.** With it, the AI flags me when it senses I'm in the wrong mode for an important decision. An AI that only flatters is worthless. This one corrects me.

## Phase 3: Agency (in progress)

Here the agents stop giving advice and start *acting*. The automation reads my profile files from time to time and adds **only what is genuinely new**, no overwriting, no invention.

That's how I connected WhatsApp to the Cortex: the first agent that runs on its own in the background and feeds the system back. I walked through it step by step in [I built an AI agent that takes care of my WhatsApp](/en/labs/bot-whatsapp-inteligencia-pessoal/).

## What I've learned so far

The Cortex only works if it's easy to maintain. A complicated file doesn't get read, doesn't get updated, **it dies**. And the automation that feeds it has to be conservative.

> Better to write nothing than to write something wrong.

An AI that invents to look useful poisons the whole base. That's why the prompt tells the model to return "nothing new" when there's no clear observation. In a business, deciding on wrong data is worse than deciding on no data.

---

Next up is Gmail and Calendar entering the same logic, then the automatic triggers: actions that fire without me asking. The end goal is a system that **knows my context better than I do** on a day of overload, and that any business owner could build for their own company.

**Stack:** pure markdown version-controlled in git, synced through Google Drive and open in Obsidian; a `YAML` header in each file for selective reading; and a cascade of models (Claude, GPT, Gemini) that reads and feeds the Cortex back, with facts computed in code and the AI only writing them up.
