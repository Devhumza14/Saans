# Saans (سانس) — a smog health guardian for Lahore

Minhaj University Lahore AI Hackathon · SDG 3, Good Health & Well-Being.

Saans turns live Lahore air quality into a personal daily plan for each person at home (Urdu, Roman Urdu, English). A deterministic risk engine decides who is at risk and when; an AI model only writes the words. Saans is a health-awareness tool, not a medical device.

> Work in progress. Sections below are filled in as the build lands.

## Problem
## Target users
## Solution & user journey
## Architecture
## Why hybrid
## Models & why
## Safety & ethics
## Startup model
## Impact metrics
## Roadmap
## Tech stack

Next.js (App Router, TypeScript), Tailwind CSS, Supabase (Auth, Postgres, RLS), OpenRouter, zod, Recharts, Vitest. Air data: Open-Meteo.

## Local setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill it in.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Create the demo user in Supabase Auth and put its credentials in `DEMO_EMAIL` / `DEMO_PASSWORD`.
5. `npm run dev`

## Environment variables

See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` and `OPENROUTER_API_KEY` are server-only and are never sent to the browser.

## Team
