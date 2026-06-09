# Armada Design System — Tokens & Visual Language

SailPoint's Armada design system reference for the visual-explainer skill. Use these tokens and patterns when building pages for SailPoint internal audiences or when the Armada aesthetic is chosen.

Source: `libs/published/armada-angular/src/sailpoint/theme/styles/design-tokens.scss` and component SCSS files.

## Color Palette

### Primary Colors

| Token         | Hex       | Use                                                       |
| ------------- | --------- | --------------------------------------------------------- |
| `--color-p1`  | `#0033a1` | **Navy** — primary brand, dark headers, prominent accents |
| `--color-p1l` | `#bfcce7` | Navy light — subtle backgrounds tinted with brand         |
| `--color-p2`  | `#0074d9` | **Blue** — interactive elements, focus states, links      |
| `--color-p2l` | `#adceef` | Blue light — focus tint backgrounds                       |
| `--color-p3`  | `#1d5ade` | **Accent blue** — primary buttons, active states, links   |
| `--color-p3l` | `#bcd1ff` | Accent blue light — button hover tint                     |
| `--color-p4`  | `#cc27b0` | **Fuchsia** — decorative accent, charts, special badges   |
| `--color-p4l` | `#e17fd2` | Fuchsia light                                             |

### Status Colors

| Token         | Hex       | Use                                                   |
| ------------- | --------- | ----------------------------------------------------- |
| `--color-s2`  | `#00883f` | **Success green** — positive status, match indicators |
| `--color-s2l` | `#b3dbc5` | Success light background                              |
| `--color-s3`  | `#fed500` | **Yellow** — caution, informational                   |
| `--color-s3l` | `#fff3ab` | Yellow light background                               |
| `--color-s4`  | `#e21848` | **Error red** — critical, gap indicators, errors      |
| `--color-s4l` | `#ffbdcd` | Error light background                                |
| `--color-s5`  | `#ffa719` | **Warning orange** — partial, degraded states         |
| `--color-s5l` | `#ffe5b4` | Warning light background                              |

### Accent Colors (Charts, Badges, Decorative)

| Token         | Hex       | Use                             |
| ------------- | --------- | ------------------------------- |
| `--color-a1`  | `#00b5e2` | **Cyan** — diagrams, charts     |
| `--color-a1l` | `#a4ebf8` | Cyan light                      |
| `--color-a2`  | `#753bbd` | **Purple** — charts, categories |
| `--color-a2l` | `#dac2ee` | Purple light                    |
| `--color-a3`  | `#93d500` | **Lime** — charts               |
| `--color-a3l` | `#e4f4bf` | Lime light                      |
| `--color-a4`  | `#26c8a1` | **Mint** — charts               |
| `--color-a4l` | `#a1f2de` | Mint light                      |

### Neutrals

| Token        | Hex       | Use                                                       |
| ------------ | --------- | --------------------------------------------------------- |
| `--color-w1` | `#ffffff` | White — page background, card surface                     |
| `--color-g1` | `#f3f6f8` | Gray 1 — medium background, table headers, alternate rows |
| `--color-g2` | `#dfe3e7` | Gray 2 — borders, dividers                                |
| `--color-g3` | `#637381` | Gray 3 — secondary text, placeholder, subtle borders      |
| `--color-g4` | `#212b36` | Gray 4 — primary text, dark backgrounds                   |
| `--color-b1` | `#000000` | Black                                                     |

### Semantic Mappings

| Token                         | Hex       | Description                  |
| ----------------------------- | --------- | ---------------------------- |
| `--color-text`                | `#212b36` | Default text color           |
| `--color-text-secondary`      | `#637381` | Secondary/dim text           |
| `--color-text-link`           | `#1d5ade` | Link text                    |
| `--color-text-linkhover`      | `#0033a1` | Link hover                   |
| `--color-text-light`          | `#ffffff` | Text on dark backgrounds     |
| `--color-text-status-success` | `#00883f` | Success status text          |
| `--color-text-status-warning` | `#ffa719` | Warning status text          |
| `--color-text-status-error`   | `#e21848` | Error status text            |
| `--color-border`              | `#637381` | Default border               |
| `--color-border-focus`        | `#0074d9` | Focus ring                   |
| `--color-border-accent`       | `#1d5ade` | Accent border                |
| `--color-border-error`        | `#e21848` | Error border                 |
| `--color-background`          | `#ffffff` | Page background              |
| `--color-background-medium`   | `#f3f6f8` | Section/card background      |
| `--color-background-dark`     | `#212b36` | Dark mode/section background |

## Typography

### Font Families

- **Primary:** `'Source Sans Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`
- **Monospace:** `'Atkinson Hyperlegible Mono', monospace`
- **Secondary/Display:** `'Poppins'` (headings where more visual weight is needed)

### Font Loading

Armada expects fonts from the host. For standalone HTML pages, load from Google Fonts:

```html
<link
	href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&family=Poppins:wght@400;600;700&display=swap"
	rel="stylesheet"
/>
```

For Atkinson Hyperlegible Mono, use:

```html
<link
	href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@400;700&display=swap"
	rel="stylesheet"
/>
```

### Type Scale

| Token                     | Value           | Font                       |
| ------------------------- | --------------- | -------------------------- |
| `--font-heading-xxxlarge` | `700 40px/60px` | Source Sans Pro            |
| `--font-heading-xxlarge`  | `700 32px/48px` | Source Sans Pro            |
| `--font-heading-xlarge`   | `700 28px/42px` | Source Sans Pro            |
| `--font-heading-large`    | `700 24px/36px` | Source Sans Pro            |
| `--font-heading-medium`   | `700 20px/30px` | Source Sans Pro            |
| `--font-heading-small`    | `700 18px/27px` | Source Sans Pro            |
| `--font-heading-xsmall`   | `700 16px/24px` | Source Sans Pro            |
| `--font-body`             | `400 16px/24px` | Source Sans Pro            |
| `--font-body-small`       | `400 14px/21px` | Source Sans Pro            |
| `--font-code`             | `400 20px/30px` | Atkinson Hyperlegible Mono |

### Font Weights

- Normal: `400`
- Semibold: `600`
- Bold: `700`

## Shadows

| Token             | Value                         | Use                     |
| ----------------- | ----------------------------- | ----------------------- |
| `--shadow-small`  | `0 2px 2px 0 #212b361f`       | Subtle lift on hover    |
| `--shadow-medium` | `0 2px 6px 0 #212b361f`       | Cards, dropdowns        |
| `--shadow-large`  | `0 4px 10px 0 #212b361f`      | Modals, elevated panels |
| `--shadow-xlarge` | `0 6px 14px 0 #212b361f`      | Large overlays          |
| Card shadow       | `0 3px 6px 0 rgba(0,0,0,0.1)` | Standard card elevation |
| Button hover      | `0 3px 6px rgba(0,0,0,0.16)`  | Hover state lift        |
| Focus ring        | `0 0 3px 2px #3b99fc`         | Focus indicator         |

## Spacing Scale

| Variable     | Value  |
| ------------ | ------ |
| `$spacer-0`  | `0`    |
| `$spacer-4`  | `4px`  |
| `$spacer-8`  | `8px`  |
| `$spacer-16` | `16px` |
| `$spacer-24` | `24px` |
| `$spacer-32` | `32px` |
| `$spacer-40` | `40px` |
| `$spacer-48` | `48px` |
| `$spacer-64` | `64px` |
| `$spacer-96` | `96px` |

## Border Radius

| Context                     | Value                              |
| --------------------------- | ---------------------------------- |
| Buttons (primary/secondary) | `9999px` (pill)                    |
| Cards                       | `8px`                              |
| Form inputs, textarea       | `4px`                              |
| Checkbox                    | `3px`                              |
| Radio                       | `50%` (circle)                     |
| Icon button (36px)          | `18px`                             |
| Icon button large (56px)    | `30px`                             |
| Navbar items                | `6px`                              |
| Badges                      | `4px` (squared) or `9999px` (pill) |

## Breakpoints

| Name                   | Value    |
| ---------------------- | -------- |
| `$screen-width-xsmall` | `366px`  |
| `$screen-width-small`  | `768px`  |
| `$screen-width-medium` | `960px`  |
| `$screen-width-large`  | `1280px` |
| `$screen-width-xlarge` | `1960px` |

## Transitions

- Button hover: `color, fill, background-color, box-shadow 0.2s linear`
- Navbar menu: `0.2s ease`
- General fade: `0.5s ease-in-out`

## Armada Aesthetic — CSS Variable Template

Use this when the Armada aesthetic is chosen. This maps Armada tokens into the visual-explainer's standard variable names:

```css
:root {
	--font-body: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
	--font-mono: 'Atkinson Hyperlegible Mono', 'SF Mono', Consolas, monospace;
	--font-display: 'Poppins', 'Source Sans 3', sans-serif;

	/* Surfaces — Armada light palette */
	--bg: #f3f6f8; /* g1 — medium background */
	--surface: #ffffff; /* w1 — card surface */
	--surface2: #f3f6f8; /* g1 — alternate rows, secondary surface */
	--surface-elevated: #ffffff;
	--border: rgba(99, 115, 129, 0.2); /* g3-based, subtle */
	--border-bright: rgba(99, 115, 129, 0.35); /* g3-based, stronger */
	--text: #212b36; /* g4 — primary text */
	--text-dim: #637381; /* g3 — secondary text */

	/* Accents — Armada primary & status */
	--accent: #1d5ade; /* p3 — accent blue (primary interactive) */
	--accent-dim: rgba(29, 90, 222, 0.08);
	--accent-dark: #0033a1; /* p1 — navy (headings, hero sections) */

	/* Status */
	--green: #00883f; /* s2 — success */
	--green-dim: rgba(0, 136, 63, 0.08);
	--red: #e21848; /* s4 — error / critical */
	--red-dim: rgba(226, 24, 72, 0.08);
	--orange: #ffa719; /* s5 — warning */
	--orange-dim: rgba(255, 167, 25, 0.08);

	/* Chart accents */
	--cyan: #00b5e2; /* a1 */
	--purple: #753bbd; /* a2 */
	--lime: #93d500; /* a3 */
	--mint: #26c8a1; /* a4 */
	--fuchsia: #cc27b0; /* p4 */

	/* Node semantic colors (for diagrams) */
	--node-a: #1d5ade; /* p3 */
	--node-a-dim: rgba(29, 90, 222, 0.08);
	--node-b: #00883f; /* s2 */
	--node-b-dim: rgba(0, 136, 63, 0.08);
	--node-c: #ffa719; /* s5 */
	--node-c-dim: rgba(255, 167, 25, 0.08);
}
```

### Dark Variant

Armada does not ship an official dark mode, but the ISC product has dark surfaces in the Identity Graph and admin views. The dark palette is **warm navy-slate** (not cold charcoal or pure black). Surfaces are navy-tinted, and borders are very subtle.

Observed values from the ISC Identity Graph and admin UI:

- Page background: warm navy-slate `~#1a2030`
- Surface (cards, panels): `~#242c3d`
- Elevated surface: `~#2c3548`
- Borders: very low-opacity, nearly invisible (`rgba(255,255,255,0.06)`)
- Text: off-white `~#e4e8ef` (not pure `#fff`)
- Dim text: muted slate `~#7e8da6`
- Accent colors are brighter/more saturated against dark to maintain contrast

```css
[data-theme='dark'] {
	--bg: #1a2030;
	--surface: #242c3d;
	--surface2: #2c3548;
	--surface-elevated: #303a4e;
	--border: rgba(255, 255, 255, 0.06);
	--border-bright: rgba(255, 255, 255, 0.1);
	--text: #e4e8ef;
	--text-dim: #7e8da6;

	--accent: #5b8def;
	--accent-dim: rgba(91, 141, 239, 0.1);
	--accent-dark: #6ea0ff;

	--green: #34d399;
	--green-dim: rgba(52, 211, 153, 0.1);
	--red: #fb7185;
	--red-dim: rgba(251, 113, 133, 0.1);
	--orange: #fbbf24;
	--orange-dim: rgba(251, 191, 36, 0.1);

	--cyan: #38d9f5;
	--purple: #a78bfa;
	--lime: #bef264;
	--mint: #5eead4;
	--fuchsia: #e879f9;

	--node-a: #5b8def;
	--node-a-dim: rgba(91, 141, 239, 0.1);
	--node-b: #34d399;
	--node-b-dim: rgba(52, 211, 153, 0.1);
	--node-c: #fbbf24;
	--node-c-dim: rgba(251, 191, 36, 0.1);
}
```

Use `[data-theme="dark"]` with an explicit toggle button rather than `prefers-color-scheme` — this gives users control and avoids the OS-dependent flash. Persist the choice to `localStorage`.

## ISC UI Patterns

These patterns are observed from the live ISC product and should be followed when building Armada-styled visualizer pages.

### Two-Tier Navigation

The ISC product uses a distinctive two-tier nav. In visual-explainer pages, this translates to a top bar with optional sub-navigation.

**Tier 1 — Navy gradient bar:** `linear-gradient(135deg, #011e69 0%, #0071ce 100%)` (from `$slpt-gr1`). White text, IDN logo on the left, action items on the right. Height: 40–48px. In dark mode, this bar becomes the surface color (`#242c3d`) with a subtle bottom border — it does NOT keep the gradient.

**Tier 2 — Sub-nav strip:** Deep navy `~#0a2050` background. Tab items in white text. Active tab is slightly highlighted or underlined. This tier is optional — only use for pages that have distinct view modes.

### Light/Dark Toggle

Always provide an explicit toggle rather than relying on `prefers-color-scheme`. Use a pill-shaped button (`border-radius: 9999px`) in the top bar. On light backgrounds, use a semi-transparent white pill (`rgba(255,255,255,0.15)`). On dark backgrounds, use the surface-elevated color. Persist choice to `localStorage`.

### Cards (Light Mode)

In the real product, cards are very clean — almost borderless, relying on shadow for separation from the `#f3f6f8` background:

```css
.armada-card {
	background: #ffffff;
	border: 1px solid rgba(223, 227, 231, 0.6); /* very subtle, not heavy */
	border-radius: 12px;
	padding: 16px;
	box-shadow:
		0 1px 3px 0 rgba(33, 43, 54, 0.06),
		0 1px 2px 0 rgba(33, 43, 54, 0.04);
}
```

In dark mode, cards get a subtle border instead of shadow:

```css
[data-theme='dark'] .armada-card {
	background: #242c3d;
	border: 1px solid rgba(255, 255, 255, 0.06);
	box-shadow: none;
}
```

### KPI Strip

The admin dashboard uses a horizontal KPI strip with vertical dividers, not separated cards. Numbers are large (32–40px, Poppins 700), labels are small mono. Alert triangles are `#e21848` red. The strip sits in a single white surface band.

### Buttons

Armada buttons are **pill-shaped** (`border-radius: 9999px`), 36px height, 600 weight, 0.5px letter-spacing.

- **Primary:** `background: #1d5ade; color: #ffffff;` hover → `#0074d9`
- **Secondary:** `background: #ffffff; border: 1px solid #637381; color: #212b36;` hover → `background: #f3f6f8`
- **Tertiary:** `background: transparent; color: #1d5ade;` no border
- **Pill toggle:** Active segment uses `background: #1d5ade; color: #fff; border-radius: 9999px`. Inactive segment uses `background: transparent; color: #212b36; border: 1px solid #dfe3e7`. Seen in the Launchpad "Cards | Table" switcher.
- **Disabled:** `opacity: 0.5;`
- **Focus:** `outline: 1px solid #0074d9;`

### Badges

Armada badges: 14px font, 700 weight, 5px 10px padding, 24px height. Text color depends on background contrast:

- Navy/Blue/Green/Red badges → white text
- Yellow/Orange badges → `#212b36` dark text

### Tables

ISC tables are clean and minimal:

- Cell padding: `12px`
- Header: `background: transparent; color: #637381; font-weight: 700; border-bottom: 1px solid #dfe3e7;`
- Row hover: `rgba(0,0,0,0.03)` (very subtle)
- Active row: `#f3f6f8`
- Row borders: `1px solid rgba(223,227,231,0.5)` (not heavy)
- No alternating row colors in most views — use only when scanning long tables

### Left Sidebar

In the Launchpad view, the sidebar is simple text links — not boxed cards. Active item is bold with accent color. Sections have a small chevron collapse control. Width: 170–200px.

### Form Inputs

- Height: `36px`
- Border: `1px solid #637381`
- Border radius: `4px`
- Focus: `1px solid #0074d9`
- Error: `1px solid #e21848`
- Placeholder: `color: #637381`

## Mermaid Integration

When using Mermaid with Armada aesthetic, use these `themeVariables`:

```javascript
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
mermaid.initialize({
	theme: 'base',
	look: 'classic',
	themeVariables: {
		primaryColor: isDark ? '#1e3a5f' : '#bcd1ff',
		primaryBorderColor: isDark ? '#5b8def' : '#1d5ade',
		primaryTextColor: isDark ? '#e6edf3' : '#212b36',
		secondaryColor: isDark ? '#1a2e1a' : '#b3dbc5',
		secondaryBorderColor: isDark ? '#4ade80' : '#00883f',
		secondaryTextColor: isDark ? '#e6edf3' : '#212b36',
		tertiaryColor: isDark ? '#2e2510' : '#ffe5b4',
		tertiaryBorderColor: isDark ? '#fbbf24' : '#ffa719',
		tertiaryTextColor: isDark ? '#e6edf3' : '#212b36',
		lineColor: isDark ? '#8b9bb3' : '#637381',
		fontSize: '16px',
		fontFamily: "'Source Sans 3', sans-serif",
		noteBkgColor: isDark ? '#252d3a' : '#fff3ab',
		noteTextColor: isDark ? '#e6edf3' : '#212b36',
		noteBorderColor: isDark ? '#fbbf24' : '#ffa719'
	}
});
```
