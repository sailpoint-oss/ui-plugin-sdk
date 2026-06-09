# WebVTT (.vtt) from Microsoft Teams

Typical cue shape:

```text
00:00:00.000 --> 00:00:02.000
<v Pat Lee>Spoken line here.
```

**For this skill**

1. Drop cue IDs and timestamps; keep spoken text.
2. **Attendees:** Collect **display names** from every `<v Name>` tag (and from `NOTE` / roster lines if present). **Deduplicate** (case-insensitive); **sort** for the **Attendees** list in `PROJECT_LOG.md`.
3. **Decisions:** Use utterance content **without** attaching it to a speaker. Do **not** write “Pat said…” or quote individuals. Explain outcomes in **as much detail** as helps a later reader, using **simple** language.
4. Deduplicate repeated cues; normalize whitespace.

If there are no speaker tags, use roster text only, or state *Attendees: not identifiable from file*.
