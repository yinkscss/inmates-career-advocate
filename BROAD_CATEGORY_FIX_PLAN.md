# Broad category search – root cause and fix plan

## Root cause (traced)

1. User: "can you find me a media role".
2. Agent calls `search_jobs` with `query: "media role"`.
3. `buildQueryFromMessage("media role")` → `extractIntent("media role")`.
4. Intent prompt says: "Only extract information that is EXPLICITLY mentioned" and "Do NOT assume or infer".
5. LLM returns `{ searchTerm: "media role" }` (verbatim).
6. Backend uses `searchTerm` as a single regex: `$regex: filters.searchTerm, $options: 'i'` (job-query-builder.service.ts).
7. No job has the phrase "media role" in title/company/description → 0 results.
8. Auto-broadening only drops filters (salary, etc.); `searchTerm` stays "media role" → still 0.

So the failure is: **broad or category phrases are passed through as a single literal search term with no expansion**. Expansion never happens because the intent prompt forbids inferring.

## Backend behavior (confirmed)

- `searchTerm` is used as the regex pattern with no escaping.
- A value like `graphic design|photography|video editor` is valid regex and matches any of those phrases (OR). No backend change needed.

## Minimal fix (career-advocate only)

**Where:** `inmates-career-advocate/src/utils/query-builder.ts` – intent extraction.

**What:**

1. **System prompt**  
   Add an explicit rule and one few-shot example (prompt-engineering skill):
   - When the message describes a **broad job category** (e.g. "media roles", "tech jobs", "creative jobs", "something in healthcare"), **expand** it into specific job titles or keywords that commonly appear in job listings.
   - Put the expanded list in `searchTerm` as a **pipe-separated** list so the search can match any of them (e.g. `graphic design|photography|video editor|social media manager|content creator`).
   - Keep all other rules (explicit extraction, salary/work mode mappings, etc.) unchanged.

2. **Schema**  
   Update the `searchTerm` field description in `IntentExtractionSchema` so the model knows it may output pipe-separated expanded terms for broad categories.

**What we do not do**

- No new LLM call.
- No backend change.
- No agent prompt change (expansion is handled in intent extraction; agent can later be tuned to mention “I searched for roles like X, Y, Z” if desired).
- No regex escaping in career-advocate (backend already uses raw regex; expansion terms are plain words).

## Implementation steps

1. In `query-builder.ts`, extend the intent system prompt with the broad-category rule and one few-shot example (e.g. "media role" → "graphic design|photography|video editor|social media|content creator").
2. Update the Zod `searchTerm` `.describe()` to mention that for broad categories, return a pipe-separated list of specific job titles/keywords.
3. Run a quick test: "can you find me a media role" → expect expanded `searchTerm` and non-zero jobs when such jobs exist in the DB.
