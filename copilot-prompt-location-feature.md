# GitHub Copilot Prompt — Location-Based Grouping Feature
# CelinaISP Study (internetstudyph.github.io)
# Paste this entire prompt into GitHub Copilot Chat

---

## CONTEXT

I have a static research website hosted on GitHub Pages for an ISP performance study
in the Philippines. It is called the Celina Plains ISP Connectivity Performance Study.

The site has two key pages:
- `hosted.html` — where users run a speed test and submit results
- `results.html` — where community-submitted results are shown as charts and a table

The site uses:
- **Firestore REST API** (no Firebase SDK, just plain `fetch()` calls) to read/write data
- **Vanilla JavaScript** (no frameworks — no React, no Vue)
- **Chart.js** for charts
- **Leaflet.js** for the map
- The site already has light/dark mode via CSS variables (--card-bg, --border, --accent, --text, --muted)
- The site already supports bilingual toggle (EN / TL) via `data-en` and `data-tl` attributes

---

## EXISTING FIRESTORE DOCUMENT STRUCTURE

Each submission document in the `submissions` collection currently has these fields:

```
{
  isp:          string,      // e.g. "PLDT", "Globe", "Converge"
  connection:   string,      // e.g. "Fiber", "DSL", "Cable"
  timeOfDay:    string,      // "peak" or "offpeak"
  download:     number,      // Mbps
  upload:       number,      // Mbps
  ping:         number,      // ms
  jitter:       number,      // ms
  latitude:     number,      // GPS latitude — already saved automatically
  longitude:    number,      // GPS longitude — already saved automatically
  timestamp:    string       // ISO 8601 datetime string
}
```

**Important:** `latitude` and `longitude` are already being saved for every submission
where the user granted location access. Some submissions have 0 or null for both if the
user declined GPS. These should be excluded from location grouping but kept in all other
charts and tables.

---

## WHAT I WANT YOU TO IMPLEMENT

### FEATURE 1 — Reverse Geocoding on Submission (hosted.html)

When a user submits their speed test result in `hosted.html`, and their `latitude` and
`longitude` are available (non-zero, non-null), call the **OpenCage Geocoding API** to
convert the coordinates into human-readable location fields BEFORE saving to Firestore.

**OpenCage API details:**
- Endpoint: `https://api.opencagedata.com/geocode/v1/json`
- Query params: `q={latitude}+{longitude}&key=${OPENCAGE_API_KEY}&language=en&no_annotations=1&countrycode=ph`
- Free tier: 2,500 requests/day — sufficient for this study
- **API key security: use the exact placeholder string `__OPENCAGE_KEY__` as the key value**
  - The real key is stored as a GitHub Actions secret named `OPENCAGE_API_KEY`
  - A GitHub Actions workflow (`/.github/workflows/deploy.yml`) replaces `__OPENCAGE_KEY__`
    with the real key at deploy time before pushing to the `gh-pages` branch
  - The placeholder must NEVER be replaced with the actual key in any committed file
  - Write it exactly like this: `const OPENCAGE_API_KEY = '__OPENCAGE_KEY__';`

**Extract these fields from the OpenCage response (`data.results[0].components`):**

| Field to store | OpenCage source (in priority order) |
|---|---|
| `city` | `components.city` → `components.town` → `components.village` |
| `municipality` | `components.municipality` → `components.city_district` → `components.county` |
| `barangay` | `components.suburb` → `components.neighbourhood` → `components.quarter` |
| `province` | `components.state` → `components.province` |
| `region` | `components.region` → `components.state_district` |

**Store all 5 as string fields in the Firestore document alongside the existing fields.**
If geocoding fails or coordinates are unavailable, store all 5 as empty strings `""`.
Do NOT block the form submission if geocoding fails — use try/catch and fallback to `""`.

**The Firestore save uses the REST API like this (match this exact pattern):**
```js
await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/submissions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ fields: { /* Firestore field objects */ } })
});
```

Each field in the Firestore body uses typed value objects:
- String: `{ stringValue: "text" }`
- Number: `{ doubleValue: 123.4 }`
- Timestamp: `{ timestampValue: "2026-01-01T00:00:00Z" }`

---

### FEATURE 2 — Location Summary Section (results.html)

Add a new section to `results.html` titled **"🌏 Results by Location"** that:

1. **Groups all loaded submissions by location** using the `city`, `municipality`,
   `barangay`, and `province` fields now stored in Firestore.
   - Use `city` as the primary group label
   - Fall back to `municipality` → `barangay` → `province` if `city` is empty
   - Skip submissions where all location fields are empty (no GPS)

2. **For each location group, calculate and display:**
   - Total number of submissions from that location
   - Average download speed (Mbps)
   - Average upload speed (Mbps)
   - Average ping (ms)
   - Average jitter (ms)
   - The top-performing ISP (highest average download) for that location
   - An expandable per-ISP breakdown table (ISP name, count, avg download, avg upload, avg ping)

3. **Render the groups as cards** in a responsive CSS grid
   (`grid-template-columns: repeat(auto-fill, minmax(290px, 1fr))`)

4. **Each card must show:**
   - Location name (city/municipality) as heading with a 📍 pin icon
   - Province as a small pill/badge next to the name
   - Submission count badge (e.g. "14 tests")
   - A ⚠️ low-data warning if fewer than 5 submissions
   - Three stat blocks: Avg Download, Avg Ping, Top ISP
   - A `<details>/<summary>` expandable ISP breakdown table
   - Barangay and region as smaller subtitle lines if available

5. **Add a search input** above the grid that filters cards in real-time by typing
   any part of the city, barangay, municipality, province, or region name.
   Show a count of how many locations are currently shown.

6. **Show a meta line** above the search input:
   `"X of Y submissions have location data · Z without GPS (not shown here)"`

7. **Cards with fewer than 5 submissions** should have a distinct border style
   (e.g. yellow/amber border) and display the low-data warning inside the card.

8. **The top ISP row** in the expandable breakdown table should be visually highlighted
   and show a 🏆 trophy emoji next to the ISP name.

9. **Place this section** in `results.html` after the Leaflet map section and before
   the sortable submissions table.

10. **All CSS must use the existing CSS variables** (--card-bg, --border, --accent,
    --text, --muted) so light/dark mode works automatically. Do not use hardcoded
    hex colors for any element that needs to adapt to dark mode.

11. **Bilingual support:** any new visible text labels (section title, search placeholder,
    stat labels, warning text) should use `data-en="..."` and `data-tl="..."` attributes
    on the relevant elements. The existing language toggle will handle switching.
    Filipino (Tagalog) translations to use:
    - "Results by Location" → "Mga Resulta ayon sa Lokasyon"
    - "Search city, barangay, province..." → "Hanapin ang lungsod, barangay, probinsya..."
    - "submissions" → "mga submission"
    - "Low data — results may not be representative" → "Mababang datos — maaaring hindi kinatawan ang mga resulta"
    - "ISP Breakdown" → "Breakdown ng ISP"
    - "without GPS" → "walang GPS"

---

### FEATURE 3 — Backward Compatibility for Old Submissions

Old submissions in Firestore do NOT have the `city`, `municipality`, `barangay`,
`province`, or `region` fields — they only have `latitude` and `longitude`.

In `results.html`, when loading submissions, handle this gracefully:

- If a submission has `latitude` and `longitude` but no `city`/`municipality`/etc.,
  attempt a **client-side reverse geocode** using OpenCage for that submission.
- To avoid hammering the API, **cache geocode results** in a JS object keyed by
  a rounded coordinate string (round to 3 decimal places): `"14.479_121.019"`
- If the submission has no GPS at all (lat/lng are 0 or missing), skip it for
  location grouping entirely.
- Batch old submissions: geocode a maximum of **20 old submissions per page load**
  to stay within the free API rate limit.

---

## CODING STANDARDS TO FOLLOW

- **Vanilla JS only** — no npm packages, no imports, no bundler
- **No inline event handlers** in HTML (use `addEventListener` in JS)
- **All new functions must be named** (no anonymous functions for major logic blocks)
- **Use `async/await`** for all fetch calls, wrapped in `try/catch`
- **Use `const` and `let`** — never `var`
- **Add a JS comment block** at the top of each new function explaining what it does,
  its parameters, and its return value
- **Do not modify existing chart rendering functions** — only add new functions
- **The location summary render must be called** after the existing data load completes,
  passing the same submissions array already used by charts and the table

---

## API KEY SECURITY — GITHUB ACTIONS SECRET INJECTION

The OpenCage API key is protected using GitHub Actions secret injection. Do NOT write
the real key anywhere in the source files. The workflow works as follows:

1. The real key is stored in GitHub repo **Settings → Secrets → `OPENCAGE_API_KEY`**
2. The file `.github/workflows/deploy.yml` runs on every push to `main`
3. It copies all files to a staging folder, runs `sed` to replace `__OPENCAGE_KEY__`
   with the real key from the secret, then deploys the result to the `gh-pages` branch
4. GitHub Pages serves from `gh-pages` — the real key is injected only at deploy time
   and never exists in the `main` branch

**The workflow file already exists at `.github/workflows/deploy.yml` — do not create or
modify it. Just use `__OPENCAGE_KEY__` as the placeholder string in the JS code.**

**For local development:** temporarily swap `__OPENCAGE_KEY__` with the real key to test,
then swap it back before committing. Never commit the real key to `main`.

---

## FILES TO MODIFY

1. **`hosted.html`**
   - Add `const OPENCAGE_API_KEY = '__OPENCAGE_KEY__';` near the top of the script
   - Add `reverseGeocode(latitude, longitude)` async function
   - Call it in the existing form submission handler before the Firestore POST
   - Add the 5 new location fields to the Firestore document body

2. **`results.html`**
   - Add `const OPENCAGE_API_KEY = '__OPENCAGE_KEY__';` near the top of the script
   - Add `buildLocationGroups(submissions)` function
   - Add `renderLocationSummary(submissions)` function
   - Add CSS for `.loc-card`, `.loc-grid`, `.loc-stats`, `.loc-breakdown`,
     `.loc-table`, `.loc-search-input`, `.loc-badge`, `.loc-low-data-warn`
   - Add the HTML section with `<div id="location-summary-root">` in the right place
   - Call `renderLocationSummary(submissions)` after existing data load

3. **`.github/workflows/deploy.yml`** — ALREADY EXISTS, DO NOT MODIFY
   - This file handles secret injection and deployment automatically

---

## DO NOT CHANGE

- The existing Firestore collection name or project ID references (leave as-is, I'll fill them in)
- The existing chart rendering code (Chart.js charts for ISP averages)
- The existing Leaflet map code
- The existing filter dropdowns (ISP, Connection, Time)
- The existing sortable submissions table
- The existing light/dark mode toggle logic
- The existing bilingual toggle logic
- The existing navigation, header, or footer HTML

---

## EXAMPLE CARD OUTPUT (for reference, not exact HTML required)

```
┌─────────────────────────────────────────┐
│ 📍 Las Piñas City  [Metro Manila]  [14 tests] │
│ Municipality: Las Piñas                 │
│ Region: NCR                             │
│─────────────────────────────────────────│
│  Avg Download    Avg Ping    Top ISP    │
│  87.3 Mbps       12 ms      Converge   │
│─────────────────────────────────────────│
│ ▶ ISP Breakdown (3 providers)           │
│   ISP        Tests  ↓Down  ↑Up   Ping  │
│   🏆 Converge  6    102.1  55.3  10ms  │
│   PLDT         5     78.4  41.2  13ms  │
│   Globe         3     62.1  30.8  18ms  │
└─────────────────────────────────────────┘
```

---

## DELIVERABLE

Provide the complete modified code for both `hosted.html` and `results.html`,
clearly marked with `// --- NEW CODE START ---` and `// --- NEW CODE END ---`
comments around every block you add, so I can find and apply the changes easily.

Do NOT generate or modify `.github/workflows/deploy.yml` — it already exists and
handles API key injection automatically. Just use `__OPENCAGE_KEY__` as the
placeholder in all JS code and the workflow will handle the rest at deploy time.
