# Seed the initial training plan from code

BFitLog will load the existing 4-day beginner workout plan through a seed script into Postgres, rather than hardcoding the plan in the frontend or building a Markdown importer for v1. This keeps the UI data-driven while avoiding importer complexity before plan authoring/import workflows are needed.
