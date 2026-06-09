---
name: shipmate-update-project-log
description: "Update an append-only Confluence Project Log from meeting transcripts (.vtt) or Slack channels. Uses confluence CLI as primary path. Deduplicates decisions, manages glossary, and ensures HTML formatting."
license: "Copyright SailPoint Technologies, Inc; All rights reserved."
metadata:
  version: 1.0.0-beta.17
  category: shipmate:global
  updated: 2026-05-28
  author: @cole-beckwith-sp
---

# Update Confluence Project Log

Turn **Teams WebVTT transcripts** or **Slack channel history** into an **append-only** update to a **Confluence Project Log** page.

**Meeting order:** Dated sections (`<h2>YYYY-MM-DD</h2>`) are **reverse chronological**—**newest date first** after the preamble, **oldest date last** before `<h2>Glossary</h2>`. Do not add new dates at the bottom of the history.

**Voice:** Simple language first; add length when it helps. Avoid jargon in decisions unless the team uses it—then **glossary** entries explain it for newcomers.

**Audience:** Someone later reading the log to see **why** the project looks the way it does—not minute-by-minute chatter, a transcript dump, or **short-term planning**.

## 1. Input Sources & Handling

This skill accepts two types of inputs:

### A. Meeting Transcripts (`.vtt`)
- **Input:** `.vtt` (WebVTT) files. See `./references/webvtt-teams.md` for formatting details.
- **Date Inference:** If you cannot confidently infer the date of the meeting from the transcript text or file metadata, you **MUST** ask the user for the correct date(s) before proceeding.
- **Handling Massive Transcripts:** If the simplified transcript exceeds 1,500 lines or 50,000 characters, you **MUST** split the file into chunks and use parallel subagents (via the `Task` tool) to process each chunk independently. Do not attempt to extract decisions from a massive transcript in a single pass, as it will lead to dropped details.
- **Attendees:** Extract full names from `<v Speaker>` tags and deduplicate. If names are incomplete, use `user-slack` MCP to resolve them. Include attendees in the final output.

### B. Slack Channels
- **Input:** A Slack channel name (e.g., `#my-channel`) or a request to run all mapped channels.
- **Mapping & Watermarking:** Relies on a long-lived mapping stored locally in **`slack-project-log-mapping.json`** alongside this skill.
  ```json
  {
    "mappings": [
      {
        "slackChannelId": "C12345678",
        "slackChannelName": "#my-channel",
        "confluencePageId": "123456789",
        "lastProcessedTimestamp": 1715990400
      }
    ]
  }
  ```
- **Timeframe:** Read messages from `lastProcessedTimestamp` up to the current time. If no timestamp exists, default to the past 7 days. The user may override this. **After a successful run, update the `lastProcessedTimestamp` in the JSON file.**
- **Slack Links:** For every decision extracted from Slack, capture the direct permalink to the specific message or thread.
- **Thread Date Resolution:** Log decisions under the date of the message that *finalized* the decision.
- **Timezone Enforcement:** Convert Slack timestamps (UTC) to the user's local timezone.
- **Attendees:** Omit the Attendees section for Slack-sourced logs.

## 2. What belongs (long-term bar)

Architecture, standards, CI/security policy, durable tooling, reversals of earlier logged decisions.

### Examples: Raw Input to Log Entry

**Example 1: Decision - Neutrality & Durability**
*   **Raw Input:** "I think we should use Redis for the new caching layer, it's way faster than Postgres for this." / "Yeah, let's do that for sprint 3."
*   **Bad Log Entry:** "John decided to use Redis for caching because it's faster. We will do this in sprint 3." *(Mentions people, short-term planning)*
*   **Good Log Entry (Transcript):** "Adopted Redis for the new caching layer to improve response times."
*   **Good Log Entry (Slack):** "Adopted Redis for the new caching layer to improve response times. <a href=\"https://sailpoint.slack.com/archives/C123/p456\">View in Slack</a>"

### Exclude (trim—do not put in the log)

**Short-term planning does not belong** in the Project Log. **Omit** topics such as:
- **Sprint, weekly, or near-term scheduling:** Pulling work forward/back, filling the sprint.
- **Prioritization at sprint/weekly granularity.**
- **Ownership and assignment:** Who will implement, review, pair, own a ticket, or run ceremonies.
- **Estimation and sizing:** Story points, planning poker, velocity.
- **Lightweight logistics:** Standup updates, calendar moves.
- **Meta-Conversations:** Exclude meta-conversations about Shipmate, Cursor, Claude, or this skill itself.

## 3. Glossary research: internal wiki + GitHub

For every run that adds or updates **`<h2>Glossary</h2>`**, **do not** invent definitions from the input alone when authoritative sources exist. 

1. Use the **confluence CLI** to search or read pages for product/program terms.
2. If the CLI cannot reach Confluence, use `gh search code` to find wiki URLs in repo markdown, then `WebFetch` them.
3. Fold **neutral** phrasing into the glossary line; optional trailing **See:** `https://sailpoint.atlassian.net/wiki/...` when the page is stable and safe to cite.
4. Keep glossary entries **short**, **alphabetical by term**, and **neutral**.

## 4. Mandatory "Dry Run" / Preview Step

**CRITICAL:** Before executing any Confluence updates, you MUST present the extracted decisions and glossary updates to the user in a markdown code block for approval. 

1. **Chain-of-Thought for Deduplication:** Explicitly list the existing decisions from the Confluence page (briefly), compare them to your new candidates, and justify why a new candidate is *not* a duplicate before including it.
2. Draft the extracted decisions grouped by date in a clean format.
3. Ask the user: "Please review these extracted decisions. Should I proceed with updating the Confluence page?"
4. **Do not** proceed to step 5 until the user confirms.

## 5. Confluence Integration via Merge Script

**Only after** user approval and semantic deduplication.

Do not attempt to manipulate the raw HTML directly. Instead, use the provided Node.js script to safely merge the new entries into the existing Confluence HTML.

**Strict JSON Schema & HTML Constraints:**
The `new_entries.json` file must contain valid JSON. The strings inside the arrays must be valid HTML. **Do not use Markdown syntax (like `**bold**` or `[link](url)`) inside the JSON strings.** Only use HTML tags (`<p>`, `<a>`, `<code>`, `<strong>`, `<em>`).

1. Fetch the existing HTML from Confluence using the **confluence CLI** (e.g., `confluence read <pageId> --format html`). Save it to a temporary file (e.g., `existing.html`).
2. Create a JSON file (e.g., `new_entries.json`) with the extracted decisions in this format:
   ```json
   {
     "entries": [
       {
         "date": "2026-05-18",
         "attendees": ["John Doe", "Sarah Smith"], 
         "decisions": ["<p>Adopted <code>Redis</code> for the new caching layer.</p>"],
         "questions": [],
         "reversals": []
       }
     ],
     "glossary": [
       { "term": "Redis", "definition": "An in-memory data structure store used as a database, cache, and message broker." }
     ]
   }
   ```
   *(Note: Omit the `attendees` array entirely if the source is Slack).*
3. Run the merge script: `node core/global/skills/update-project-log/scripts/merge-project-log.mjs existing.html new_entries.json updated.html`
4. Use the **confluence CLI** to push the `updated.html` file back to Confluence (e.g., `confluence update <pageId> --file updated.html --format html`).
5. Clean up the temporary files.

**MCP Fallback (CRITICAL):**
The `confluence` CLI is the primary and preferred tool. If the `confluence` CLI is unavailable or fails, you may fall back to the Atlassian MCP tools (`getConfluencePage` and `updateConfluencePage`). 
When using the MCP tools, you **MUST** explicitly set the `contentFormat: "html"` argument for BOTH reading and updating. If you omit `contentFormat: "html"`, it will default to Markdown and permanently corrupt the Confluence page's formatting.
