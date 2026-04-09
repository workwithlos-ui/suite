# SUITE CLIENT SETUP GUIDE

## Overview
One codebase. Infinite client deployments. Each client gets a fully configured SUITE instance that knows their business from day one.

## Time to deploy: Under 1 hour

## Step 1 — Context Extraction (45 min with client)
Run this interview:

**Business:**
- Company name, what you do, who you serve
- Current monthly revenue, target, mode (pipeline_now / growth / optimize)
- 3-5 core operating principles

**ICPs (up to 4):**
- Name, revenue range, top 3 pains, desired outcomes, buying triggers, objections

**Proof Bank (minimum 5):**
- Named client + specific result + number (e.g., "Acme Corp: 4hr → 58sec speed-to-lead")

**Voice:**
- Tone descriptors, words to use, words to never use
- 3 samples of their best writing

**Offers:**
- Product names, prices, what's included, who it's for

## Step 2 — Fill semantic.json (30 min)
Copy `clients/template/semantic.json`
Rename to `clients/{client-slug}/semantic.json`
Fill every field. No placeholders in production.

## Step 3 — Load to Supabase (5 min)
```sql
INSERT INTO shared_context (context_key, business, audiences, proof_bank, voice, offers)
VALUES ('{client-slug}', '{...}', '[...]', '[...]', '{...}', '[...]');
```

## Step 4 — Deploy (10 min)
```bash
# In the suite repo
vercel deploy --scope los-projects-43728f1d --prod
# Set env var: NEXT_PUBLIC_CLIENT={client-slug}
# Set env var: ANTHROPIC_API_KEY={key}
# Set env var: NEXT_PUBLIC_SUPABASE_URL={url}
# Set env var: NEXT_PUBLIC_SUPABASE_ANON_KEY={key}
```

## Step 5 — Test (15 min)
Open the deployed URL.
Ask the board: "Give me a 7-day plan to hit our revenue target."
Verify Rex references their specific numbers.
Verify Priya runs their actual LTV:CAC.
If responses are generic → semantic.json didn't load → check env var.

## Pricing
- Setup: $5,000 (one-time)
- Monthly: $497-$2,000 depending on agents + usage
- Enterprise: $4,997/month (unlimited sessions, custom agents, dedicated instance)

## What the client gets
- 5 AI executives who know their business, clients, proof, and offers
- Board briefing mode: ask one question, all 5 respond with genuine tension
- Individual agent chat: deep-dive with the right expert
- Session memory: board remembers previous decisions (roadmap)
- Available 24/7, no scheduling, no retainer conversations
