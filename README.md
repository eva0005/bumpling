# Bumpling · 小芽孕期 — Pregnancy Health Companion (MVP v1.3)

> Brand: **Bumpling** (EN) / **小芽孕期** (ZH) — companion character 「小芽 / Bumpling」. Project folder and storage key keep the original codename `pregjourney`.

> Science-backed care, week by week · 每一周，都有科学陪伴

A mobile-first, offline-capable **PWA** implementing the PRD v1.1 MVP scope (global, 中英双语) plus the v1.2 「小芽 AI」 layer.
No build step, no backend: plain HTML/CSS/JS, data stored locally on-device. AI features call the provider you configure (Gemini or any OpenAI-compatible endpoint) directly from the browser with your own key.

## New in v1.3 — correctness & real-device polish

| # | Change | Where |
|---|---|---|
| P0 | AI / imported meals now carry **folate, iron, calcium, iodine, DHA and caffeine** (model-estimated, back-filled from the local food DB when the name matches) — micronutrient bars, the caffeine alert and the weekly report include them | `js/ai.js` (`normItems`, `normImport`, `matchFood`) |
| P0 | Weekly report lists **fibre** and the **energy split** | `js/views/me.js` |
| P0 | Import de-dup: punctuation/whitespace-insensitive names, "similar name + energy within 10 %", DB-food names, ±10 % workout minutes, and a per-image fingerprint so re-importing the same screenshot is flagged | `js/views/ai.js` |
| P1 | **Keyboard-aware layout**: app height and sheets follow `visualViewport`, so the chat composer and sheet inputs stay above the iOS keyboard | `js/app.js`, `css/index.css` |
| P1 | **Storage quota**: thumbnails capped (40 photo messages), automatic thumbnail eviction on `QuotaExceeded`, visible toast when a save fails, storage usage shown in AI settings | `js/store.js`, `js/views/ai.js` |
| P1 | **Timeout + cancel**: 60 s timeout on every AI call, "Stop" in the chat, "Cancel" in both sheets; leaving a screen aborts in-flight requests | `js/ai.js`, `js/views/ai.js` |
| P1 | **Streaming**: Gemini `streamGenerateContent` (SSE) and OpenAI `stream:true`; the partial answer renders live in the typing bubble | `js/ai.js` (`httpSSE`, `partialAnswer`) |
| P1 | **CORS detection** for OpenAI-compatible endpoints with an actionable message and a hint in settings | `js/ai.js` (`fetchError`) |
| P1 | **Offline notice** in the chat; sending is blocked until back online (demo mode still works) | `js/views/ai.js` |
| P1 | Hero week number no longer wraps on narrow phones | `css/index.css` |

## New in v1.2 — 小芽 AI

| Feature | What it does | Where |
|---|---|---|
| **小芽 AI 问答** (`#/ai`) | Chat with text, **photos** (food, product labels, ingredient lists) and **voice** (Web Speech live transcription, or a recorded clip sent to Gemini). Structured answers: verdict (可以 / 谨慎 / 避免 / 说明), headline, key points, tips, guideline sources, red-flag "seek care" banner. Conversation stored locally; clear anytime. | `js/ai.js`, `js/views/ai.js` |
| **拍照算营养** (Diet) | One meal photo → recognised foods with estimated **weight (g)**, **kcal**, **protein / carbs / fat / fibre**; edit portions, see energy split vs. the 50–65 / 20–30 / 10–20 % reference, log into any meal. | `js/views/ai.js` → `AISheets.photoMeal` |
| **导入历史记录** (Diet & Exercise) | Upload screenshots from other apps, handwritten diaries or watch summaries → entries with date / meal / grams / kcal or type / minutes; duplicates flagged; tick to import. | `AISheets.importHistory` |
| **膳食纤维 + 供能比** | Fibre target per region pack (DRIs 2023 / IOM / SACN), fibre column in the food DB, macro energy-ratio bar on the Diet tab and in reports. | `js/content.js`, `js/standards.js`, `js/engine.js` |
| **AI 设置** (`#/me/ai`) | Provider (Gemini / OpenAI-compatible incl. Qwen, DeepSeek, Doubao), API key (device-only, stripped from exports), model picker, base URL, explicit consent switch, context sharing, **offline demo mode**, connection test. | `js/views/me.js` |
| **Fixed tab bar** | The app shell is a fixed-height flex column: only the page scrolls, the tab bar is a real footer — content can never hide behind it and the bar never moves. | `css/index.css` |

> [!NOTE]
> Keys are stored in `localStorage` on the device only, never exported, and nothing is sent unless you ask a question or run an analysis. Demo mode lets you try every AI flow with built-in samples and no network.

## Run

```bash
cd pregjourney
python3 -m http.server 8787
# open http://127.0.0.1:8787/
```

Install it to a phone/desktop home screen from the browser menu (PWA manifest + service worker included).

## What's implemented (PRD mapping)

| PRD | Feature | Where |
|---|---|---|
| §5 | **Regional standards engine** — language ⟂ standard region; packs for 🇨🇳 CN (WS/T 801-2022, DRIs 2023), 🇺🇸 US (ACOG/IOM), 🇬🇧 UK (NICE/NHS, IOM ranges w/ caveat), 🌍 INTL (WHO/IOM); BMI cut-points 24/28 vs 25/30; GWG bands; nutrition targets; prenatal calendar templates; thresholds; emergency numbers; units | `js/standards.js` |
| §6.1 | Onboarding: language → country (sets standard) → LMP/EDD → height/weight/age/multiples → history & doctor's orders → **one-page privacy note** (US sensitivity) → personal plan | `js/views/onboarding.js` |
| §6.2 | Weight: log, gain curve with recommended band (SVG), "in / slightly above / slightly below" wording, hide-numbers mode, weekly reminder day, deviation (2 consecutive weeks) & surge (>1 kg/wk) alerts | `js/views/weight.js`, `js/engine.js` |
| §6.3 / §6.9 | Diet: energy & nutrient targets per region/trimester, bilingual food search (CN + Western + supplements), macro & micronutrient completion, caffeine limit, **food traffic light** (regional variants), **myth check** (说法辨析), scenario recipes, GDM mode | `js/views/diet.js`, `js/content.js` |
| §6.4 | Exercise: safety screen → module lock, doctor's-orders lock, 150 min/week goal, trimester courses, talk test, stop signals | `js/views/exercise.js` |
| §6.5 | Week-by-week guide (baby size/milestone, mom tip, stage issues & actions), **prenatal calendar** from regional template (editable, done/removed/custom, 3-day reminder chip), **kick counter** (≥28w), **contraction timer** with 5-1-1 detection (≥36w) | `js/views/guide.js` |
| §6.6 | Alert engine: surge (+edema ⇒ urgent), deviation, BP ≥140/90, reduced kicks, repeated high post-meal glucose, bleeding/fluid, caffeine; prompts only, never diagnoses | `js/engine.js` → `alerts()` |
| §5.5 | Health tools: BP, glucose (mmol/L ⇄ mg/dL by region), symptoms, regional emergency call + hospital number | `js/views/tools.js` |
| §6.7 | Family sharing (invite code + permission toggles + "how to help her today") — preview | `js/views/me.js` |
| §6.8 | Weekly health report, print-to-PDF, JSON export/import | `js/views/me.js` (`report`) |
| §6.10 | **Care mode** for pregnancy loss: stops all week content, shows support resources & regional hotlines | `js/views/home.js`, `js/views/me.js` |
| §7.3 | Local-only storage (default on), no analytics by default, one-tap permanent delete, transparency note | `js/store.js`, `js/views/me.js` |
| §7.5 | Text-size setting, one-tap kicks / help, calm wording | `css/index.css`, settings |
| §8 | All copy keyed (`js/i18n.js`), zh "13⁺⁶ 周" / en "13w 6d", metric storage with display-time conversion, region × language content | `js/i18n.js`, `js/ui.js` |

## Project layout

```
pregjourney/
├── index.html              app shell (loads scripts, no bundler)
├── manifest.webmanifest    PWA manifest
├── sw.js                   offline cache (network-first)
├── css/index.css           design system + components
└── js/
    ├── i18n.js             zh / en dictionaries, t()
    ├── standards.js        regional standard packs & unit conversion
    ├── content.js          weekly content, foods, traffic light, myths, recipes, courses
    ├── store.js            localStorage persistence, export / import / wipe
    ├── engine.js           gestational age, BMI, GWG band, nutrition, alerts, calendar, 5-1-1
    ├── ui.js               helpers, icons, formatters, sheets, toasts, hash router
    ├── ai.js               小芽 AI provider layer (Gemini / OpenAI-compatible / demo), prompts, JSON schemas
    └── views/              onboarding, home, weight, diet, exercise, guide, tools, me(+report), ai(+AISheets)
```

## Not in this MVP (per PRD roadmap)

Barcode scanning (v1.5), cloud sync / real cross-device family sharing (v1.5), video courses, wearable/scale integrations, Traditional Chinese & CA/AU local packs (v2.0), online consultation.

> [!IMPORTANT]
> All clinical values (IOM 2009, WS/T 801-2022, DRIs 2023, ACOG, NICE, thresholds) must be verified item-by-item by locally licensed medical reviewers before any release (PRD §12.1). The app only surfaces information and never diagnoses.

## Tests & design assets

```bash
gjs tests/test_harness.js      # headless checks (SpiderMonkey via gjs; no browser needed)
python3 build_single_file.py   # → dist/pregjourney.html (single-file build, works from file://)
```

- `design/mascot-preview.png` — companion character 小芽 / Bumpling, five moods
- `design/app-icon-preview.png` — app icon at 180 / 60 / 29 px + maskable
- `design/naming-research.md` — competitor survey, ASO rationale and store metadata (EN/ZH)
