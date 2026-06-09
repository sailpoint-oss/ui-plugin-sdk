---
name: shipmate-visual-explainer
description: "Generate beautiful, self-contained HTML pages that visually explain systems, multi-file or cross-cutting code changes, phased plans with dependencies, and structured data. Use when the user asks for a diagram, architecture overview, substantive diff review, plan review, project recap, comparison table, or any visual explanation of technical concepts. Also use proactively when you are about to render a complex ASCII table (4+ rows or 3+ columns) — present it as a styled HTML page instead."
license: "Copyright SailPoint Technologies, Inc; All rights reserved."
metadata:
  version: 1.0.0-beta.17
  category: shipmate:global
  updated: 2026-04-27
  author: @eng-ai-ops
---

# Visual Explainer

Generate self-contained HTML files for technical diagrams, visualizations, and data tables. Always open the result in the browser. Never fall back to ASCII art when this skill is loaded.

**When not to use:** trivial one-line answers, pure chat brainstorming with no deliverable, or requests that only need plain prose or a short inline code snippet (no diagram or table).

**Proactive table rendering.** When you're about to present tabular data as an ASCII box-drawing table in the terminal (comparisons, audits, feature matrices, status reports, any structured rows/columns), generate an HTML page instead. The threshold: if the table has 4+ rows or 3+ columns, it belongs in the browser. Don't wait for the user to ask — render it as HTML automatically and tell them the file path. You can still include a brief text summary in the chat, but the table itself should be the HTML page.

## Workflow

### 1. Think (5 seconds, not 5 minutes)

Before writing HTML, commit to a direction. Don't default to "dark theme with blue accents" every time.

**Who is looking?** A developer understanding a system? A PM seeing the big picture? A team reviewing a proposal? This shapes information density and visual complexity.

**What type of diagram?** Architecture, flowchart, sequence, data flow, schema/ER, state machine, mind map, data table, timeline, or dashboard. Each has distinct layout needs and rendering approaches (see Diagram Types below).

**What aesthetic?** Pick one and commit:

- **Armada (default for SailPoint projects)** — SailPoint's design system: navy `#0033a1` + accent blue `#1d5ade`, Source Sans Pro body, Atkinson Hyperlegible Mono for code, clean cards with 8px radius, pill buttons, `#f3f6f8` gray surfaces. Use Armada when the audience is internal SailPoint or the page accompanies SailPoint UI work. See `./references/armada-tokens.md` for the full token set.
- Monochrome terminal (green/amber on black, monospace everything)
- Editorial (serif headlines, generous whitespace, muted palette)
- Blueprint (technical drawing feel, grid lines, precise)
- Neon dashboard (saturated accents on deep dark, glowing edges)
- Paper/ink (warm cream background, hand-drawn feel, sketchy borders)
- Hand-drawn / sketch (Mermaid `handDrawn` mode, wiggly lines, informal whiteboard feel)
- IDE-inspired (borrow a real color scheme: Dracula, Nord, Catppuccin, Solarized, Gruvbox, One Dark)
- Data-dense (small type, tight spacing, maximum information)
- Gradient mesh (bold gradients, glassmorphism, modern SaaS feel)

Vary the choice each time. If the last diagram was dark and technical, make the next one light and editorial. The swap test: if you replaced your styling with a generic dark theme and nobody would notice the difference, you haven't designed anything.

### 2. Structure

**Read the reference template** before generating. Don't memorize it — read it each time to absorb the patterns.

- For text-heavy architecture overviews (card content matters more than topology): read `./templates/architecture.html`
- For flowcharts, sequence diagrams, ER, state machines, mind maps: read `./templates/mermaid-flowchart.html`
- For data tables, comparisons, audits, feature matrices: read `./templates/data-table.html`
- For feature flag dependency trees (LaunchDarkly): read `./templates/flag-tree.html` — replace the `{}` placeholder inside `<script type="application/json" id="flag-data">` with the Flag Tree Data Object JSON (see feature-flag-visualizer Step 5); no other edits needed

**For the Armada / SailPoint design system** (colors, tokens, component patterns), read `./references/armada-tokens.md`. Use this when building pages for SailPoint internal audiences or when accompanying SailPoint UI work.

**For CSS/layout patterns and SVG connectors**, read `./references/css-patterns.md`.

**For pages with 4+ sections** (reviews, recaps, dashboards), also read `./references/responsive-nav.md` for section navigation with sticky sidebar TOC on desktop and horizontal scrollable bar on mobile.

**Choosing a rendering approach:**

| Diagram type                    | Approach                     | Why                                                                    |
| ------------------------------- | ---------------------------- | ---------------------------------------------------------------------- |
| Architecture (text-heavy)       | CSS Grid cards + flow arrows | Rich card content (descriptions, code, tool lists) needs CSS control   |
| Architecture (topology-focused) | **Mermaid**                  | Visible connections between components need automatic edge routing     |
| Flowchart / pipeline            | **Mermaid**                  | Automatic node positioning and edge routing; hand-drawn mode available |
| Sequence diagram                | **Mermaid**                  | Lifelines, messages, and activation boxes need automatic layout        |
| Data flow                       | **Mermaid** with edge labels | Connections and data descriptions need automatic edge routing          |
| ER / schema diagram             | **Mermaid**                  | Relationship lines between many entities need auto-routing             |
| State machine                   | **Mermaid**                  | State transitions with labeled edges need automatic layout             |
| Tree / hierarchy                | **Mermaid** `graph TD` + ELK | Parent→child structures need routed edges, `classDef` styling, and zoom |
| Mind map                        | **Mermaid** `mindmap`        | Informal radial breakdowns; less control than `graph TD`               |
| Data table                      | HTML `<table>`               | Semantic markup, accessibility, copy-paste behavior                    |
| Timeline                        | CSS (central line + cards)   | Simple linear layout doesn't need a layout engine                      |
| Dashboard                       | CSS Grid + Chart.js          | Card grid with embedded charts                                         |

**Mermaid theming:** Always use `theme: 'base'` with custom `themeVariables` so colors match your page palette. Use `look: 'handDrawn'` for sketch aesthetic or `look: 'classic'` for clean lines. Use `layout: 'elk'` for complex graphs (requires the `@mermaid-js/layout-elk` package — see `./references/libraries.md` for the CDN import). Override Mermaid's SVG classes with CSS for pixel-perfect control. See `./references/libraries.md` for full theming guide.

**Mermaid zoom controls:** Always add zoom controls (+/−/reset buttons) to every `.mermaid-wrap` container. Complex diagrams render at small sizes and need zoom to be readable. Include Ctrl/Cmd+scroll zoom on the container. See the zoom controls pattern in `./references/css-patterns.md` and the reference template at `./templates/mermaid-flowchart.html`.

**AI-generated illustrations (optional).** If [surf-cli](https://github.com/nicobailon/surf-cli) is available, you can generate images via Gemini and embed them in the page for creative, illustrative, explanatory, educational, or decorative purposes. Check availability with `which surf`. If available:

```bash
# Generate to a temp file (use --aspect-ratio for control)
surf gemini "descriptive prompt" --generate-image /tmp/ve-img.png --aspect-ratio 16:9

# Base64 encode for self-containment (macOS)
IMG=$(base64 -i /tmp/ve-img.png)
# Linux: IMG=$(base64 -w 0 /tmp/ve-img.png)

# Embed in HTML and clean up
# <img src="data:image/png;base64,${IMG}" alt="descriptive alt text">
rm /tmp/ve-img.png
```

See `./references/css-patterns.md` for image container styles (hero banners, inline illustrations, captions).

**When to use:** Hero banners that establish the page's visual tone. Conceptual illustrations for abstract systems that Mermaid can't express (physical infrastructure, user journeys, mental models). Educational diagrams that benefit from artistic or photorealistic rendering. Decorative accents that reinforce the aesthetic.

**When to skip:** Anything Mermaid or CSS handles well. Generic decoration that doesn't convey meaning. Data-heavy pages where images would distract. Always degrade gracefully — if surf isn't available, skip images without erroring. The page should stand on its own with CSS and typography alone.

**Prompt craft:** Match the image to the page's palette and aesthetic direction. Specify the style (3D render, technical illustration, watercolor, isometric, flat vector, etc.) and mention dominant colors from your CSS variables. Use `--aspect-ratio 16:9` for hero banners, `--aspect-ratio 1:1` for inline illustrations. Keep prompts specific — "isometric illustration of a message queue with cyan nodes on dark navy background" beats "a diagram of a queue."

### 3. Style

Apply these principles to every diagram:

**Typography is the diagram.** Pick a distinctive font pairing from Google Fonts. A display/heading font with character, plus a mono font for technical labels. Never use Inter, Roboto, Arial, or system-ui as the primary font. Load via `<link>` in `<head>`. Include a system font fallback in the `font-family` stack for offline resilience. When using the Armada aesthetic, use **Source Sans Pro** for body/headings and **Atkinson Hyperlegible Mono** for code/labels (see `./references/armada-tokens.md`).

**Color tells a story.** Use CSS custom properties for the full palette. Define at minimum: `--bg`, `--surface`, `--border`, `--text`, `--text-dim`, and 3-5 accent colors. Each accent should have a full and a dim variant (for backgrounds). Name variables semantically when possible (`--pipeline-step` not `--blue-3`). Support both themes. Put your primary aesthetic in `:root` and the alternate in the media query:

```css
/* Light-first (editorial, paper/ink, blueprint): */
:root {
	/* light values */
}
@media (prefers-color-scheme: dark) {
	:root {
		/* dark values */
	}
}

/* Dark-first (neon, IDE-inspired, terminal): */
:root {
	/* dark values */
}
@media (prefers-color-scheme: light) {
	:root {
		/* light values */
	}
}
```

**Surfaces whisper, they don't shout.** Build depth through subtle lightness shifts (2-4% between levels), not dramatic color changes. Borders should be low-opacity rgba (`rgba(255,255,255,0.08)` in dark mode, `rgba(0,0,0,0.08)` in light) — visible when you look, invisible when you don't.

**Backgrounds create atmosphere.** Don't use flat solid colors for the page background. Subtle gradients, faint grid patterns via CSS, or gentle radial glows behind focal areas. The background should feel like a space, not a void.

**Visual weight signals importance.** Not every section deserves equal visual treatment. Executive summaries and key metrics should dominate the viewport on load (larger type, more padding, subtle accent-tinted background zone). Reference sections (file maps, dependency lists, decision logs) should be compact and stay out of the way. Use `<details>/<summary>` for sections that are useful but not primary — the collapsible pattern is in `./references/css-patterns.md`.

**Surface depth creates hierarchy.** Vary card depth to signal what matters. Hero sections get elevated shadows and accent-tinted backgrounds (`node--hero` pattern). Body content stays flat (default `.node`). Code blocks and secondary content feel recessed (`node--recessed`). See the depth tiers in `./references/css-patterns.md`. Don't make everything elevated — when everything pops, nothing does.

**Animation earns its place.** Staggered fade-ins on page load are almost always worth it — they guide the eye through the diagram's hierarchy. Mix animation types by role: `fadeUp` for cards, `fadeScale` for KPIs and badges, `drawIn` for SVG connectors, `countUp` for hero numbers. Hover transitions on interactive-feeling elements make the diagram feel alive. Always respect `prefers-reduced-motion`. CSS transitions and keyframes handle most cases. For orchestrated multi-element sequences, anime.js via CDN is available (see `./references/libraries.md`).

### 4. Deliver

**Output location:** Write to `~/.agent/diagrams/`. Use a descriptive filename based on content: `modem-architecture.html`, `pipeline-flow.html`, `schema-overview.html`. The directory persists across sessions.

**Open in browser:**

- macOS: `open ~/.agent/diagrams/filename.html`
- Linux: `xdg-open ~/.agent/diagrams/filename.html`

**Tell the user** the file path so they can re-open or share it.

**Footer attribution:** Every page includes a small footer at the bottom: "Generated with Shipmate" linking to `https://armada.sailpoint.com/shipmate/docs/index.html`. Style it as a quiet, centered line in `--text-dim` color with small monospace type — it should feel like a watermark, not a banner. See `./references/css-patterns.md` for the footer pattern.

## Diagram Types

### Architecture / System Diagrams

Two approaches depending on what matters more:

**Text-heavy overviews** (card content matters more than connections): CSS Grid with explicit row/column placement. Sections as rounded cards with colored borders and monospace labels. Vertical flow arrows between sections. Nested grids for subsystems. The reference template at `./templates/architecture.html` demonstrates this pattern. Use when cards need descriptions, code references, tool lists, or other rich content that Mermaid nodes can't hold.

**Topology-focused diagrams** (connections matter more than card content): **Use Mermaid.** A `graph TD` or `graph LR` with custom `themeVariables` produces proper diagrams with automatic edge routing. Use `look: 'handDrawn'` for informal feel or `look: 'classic'` for clean lines. Use when the point is showing how components connect rather than describing what each component does in detail.

### Flowcharts / Pipelines

**Use Mermaid.** Automatic node positioning and edge routing produces proper diagrams with connecting lines, decision diamonds, and parallel branches — dramatically better than CSS flexbox with arrow characters. Use `graph TD` for top-down or `graph LR` for left-right. Use `look: 'handDrawn'` for sketch aesthetic. Color-code node types with Mermaid's `classDef` or rely on `themeVariables` for automatic styling.

### Sequence Diagrams

**Use Mermaid.** Lifelines, messages, activation boxes, notes, and loops all need automatic layout. Use Mermaid's `sequenceDiagram` syntax. Style actors and messages via CSS overrides on `.actor`, `.messageText`, `.activation` classes.

### Data Flow Diagrams

**Use Mermaid.** Data flow diagrams emphasize connections over boxes — exactly what Mermaid excels at. Use `graph LR` or `graph TD` with edge labels for data descriptions. Thicker, colored edges for primary flows. Source/sink nodes styled differently from transform nodes via Mermaid's `classDef`.

### Schema / ER Diagrams

**Use Mermaid.** Relationship lines between entities need automatic routing. Use Mermaid's `erDiagram` syntax with entity attributes. Style via `themeVariables` and CSS overrides on `.er.entityBox` and `.er.relationshipLine`.

### State Machines / Decision Trees

**Use Mermaid.** Use `stateDiagram-v2` for states with labeled transitions. Supports nested states, forks, joins, and notes. Use `look: 'handDrawn'` for informal state diagrams. Decision trees can use `graph TD` with diamond decision nodes.

**`stateDiagram-v2` label caveat:** Transition labels have a strict parser — colons, parentheses, `<br/>`, HTML entities, and most special characters cause silent parse failures ("Syntax error in text"). If your labels need any of these (e.g., `cancel()`, `curate: true`, multi-line labels), use `flowchart LR` instead with rounded nodes and quoted edge labels (`|"label text"|`). Flowcharts handle all special characters and support `<br/>` for line breaks. Reserve `stateDiagram-v2` for simple single-word or plain-text labels.

### Tree / Hierarchy Diagrams

**Use Mermaid `graph TD` with `layout: 'elk'`.** This is the right choice for dependency trees, org charts, prerequisite chains, parent→child relationships, and any directed acyclic graph where connections matter.

Prefer `graph TD` (top-down) or `graph LR` (left-right) over `mindmap` when:

- Nodes need color-coded roles via `classDef`
- Edges need labels or dashed/solid styling to convey relationship type
- The tree has many-to-one or one-to-many fan structures (ELK handles these well)
- Node labels carry multiple lines of metadata
- The diagram needs zoom controls (always required for trees with >6 nodes)

Use `layout: 'elk'` for trees with more than ~5 nodes — ELK positions nodes far better than the default dagre engine for fan-in/fan-out structures. Use `look: 'classic'` for technical/data diagrams; `look: 'handDrawn'` only for informal overviews.

Example pattern:

```
graph TD
  classDef parent fill:#bcd1ff,stroke:#1d5ade,color:#212b36
  classDef root   fill:#ffe5b4,stroke:#ffa719,color:#212b36,font-weight:bold
  classDef child  fill:#b3dbc5,stroke:#00883f,color:#212b36

  A["Parent A\nteam · status"]:::parent
  B["Parent B\nteam · status"]:::parent
  ROOT["Root Node\nmain description"]:::root
  C["Child C"]:::child

  A --> ROOT
  B --> ROOT
  ROOT --> C
```

### Mind Maps / Hierarchical Breakdowns

**Use Mermaid `mindmap`** for informal, radial brainstorming breakdowns from a single root. Mermaid handles the radial layout automatically. Style with `themeVariables` to control node colors at each depth level.

Prefer `mindmap` over `graph TD` only when the structure is a simple one-root breakdown with no edge labels, no role-based node styling, and no fan-in relationships. For anything more structured, use `graph TD` instead (see Tree / Hierarchy above).

### Data Tables / Comparisons / Audits

Use a real `<table>` element — not CSS Grid pretending to be a table. Tables get accessibility, copy-paste behavior, and column alignment for free. The reference template at `./templates/data-table.html` demonstrates all patterns below.

**Use proactively.** Any time you'd render an ASCII box-drawing table in the terminal, generate an HTML table instead. This includes: requirement audits (request vs plan), feature comparisons, status reports, configuration matrices, test result summaries, dependency lists, permission tables, API endpoint inventories — any structured rows and columns.

Layout patterns:

- Sticky `<thead>` so headers stay visible when scrolling long tables
- Alternating row backgrounds via `tr:nth-child(even)` (subtle, 2-3% lightness shift)
- First column optionally sticky for wide tables with horizontal scroll
- Responsive wrapper with `overflow-x: auto` for tables wider than the viewport
- Column width hints via `<colgroup>` or `th` widths — let text-heavy columns breathe
- Row hover highlight for scanability

Status indicators (use styled `<span>` elements, never emoji):

- Match/pass/yes: colored dot or checkmark with green background
- Gap/fail/no: colored dot or cross with red background
- Partial/warning: amber indicator
- Neutral/info: dim text or muted badge

Cell content:

- Wrap long text naturally — don't truncate or force single-line
- Use `<code>` for technical references within cells
- Secondary detail text in `<small>` with dimmed color
- Keep numeric columns right-aligned with `tabular-nums`

### Timeline / Roadmap Views

Vertical or horizontal timeline with a central line (CSS pseudo-element). Phase markers as circles on the line. Content cards branching left/right (alternating) or all to one side. Date labels on the line. Color progression from past (muted) to future (vivid).

### Dashboard / Metrics Overview

Card grid layout. Hero numbers large and prominent. Sparklines via inline SVG `<polyline>`. Progress bars via CSS `linear-gradient` on a div. For real charts (bar, line, pie), use **Chart.js via CDN** (see `./references/libraries.md`). KPI cards with trend indicators (up/down arrows, percentage deltas).

## File Structure

Every diagram is a single self-contained `.html` file. No external assets except CDN links (fonts, optional libraries). Structure:

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Descriptive Title</title>
		<link href="https://fonts.googleapis.com/css2?family=...&display=swap" rel="stylesheet" />
		<style>
			/* CSS custom properties, theme, layout, components — all inline */
		</style>
	</head>
	<body>
		<!-- Semantic HTML: sections, headings, lists, tables, inline SVG -->
		<!-- No script needed for static CSS-only diagrams -->
		<!-- Optional: <script> for Mermaid, Chart.js, or anime.js when used -->
	</body>
</html>
```

## Quality Checks

Before delivering, verify:

- **The squint test**: Blur your eyes. Can you still perceive hierarchy? Are sections visually distinct?
- **The swap test**: Would replacing your fonts and colors with a generic dark theme make this indistinguishable from a template? If yes, push the aesthetic further.
- **Both themes**: Toggle your OS between light and dark mode. Both should look intentional, not broken.
- **Information completeness**: Does the diagram actually convey what the user asked for? Pretty but incomplete is a failure.
- **No overflow**: Resize the browser to different widths. No content should clip or escape its container. Every grid and flex child needs `min-width: 0`. Side-by-side panels need `overflow-wrap: break-word`. Never use `display: flex` on `<li>` for marker characters — it creates anonymous flex items that can't shrink, causing lines with many inline `<code>` badges to overflow. Use absolute positioning for markers instead. See the Overflow Protection section in `./references/css-patterns.md`.
- **Mermaid zoom controls**: Every `.mermaid-wrap` container must have zoom controls (+/−/reset buttons), Ctrl/Cmd+scroll zoom, and click-and-drag panning. Complex diagrams render too small without them. The cursor should change to `grab` when zoomed in and `grabbing` while dragging. See `./references/css-patterns.md` for the full pattern.
- **File opens cleanly**: No console errors, no broken font loads, no layout shifts.
