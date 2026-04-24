## Multi-language support for STEMind

Auto-detect the user's device language on first visit. Translate the UI and have the AI tutor reply in the same language. The user can override the choice anywhere from a quick globe dropdown, or from a new Settings page.

### Supported languages
- English (en) — default fallback
- Español (es)
- Français (fr)
- Deutsch (de)
- 中文 (zh)
- 日本語 (ja)

### How language is chosen
1. On first load, read `navigator.language` (e.g. `es-MX` → `es`). If it matches a supported language, use it; otherwise fall back to English.
2. Save the choice to `localStorage` under `stemind_lang` so it persists across sessions and devices.
3. Manual override from either the sidebar globe dropdown or the Settings page updates `localStorage` and re-renders instantly.

### What gets translated

**UI (static text)**
- Sidebar nav: Dashboard, Sessions, Knowledge, Settings, Sign out, Light/Dark mode
- Dashboard: title, stat labels, "Strong topics", "Needs review", loading/empty states
- Sessions list page: title, "New session" button, empty state
- Session detail: header, input placeholder, send button, loading messages
- Knowledge page: title, mastery labels, empty state
- Auth page: tab labels, button text, "Continue as guest", toasts
- Landing page navbar + section headers (best-effort, lower priority)

**AI tutor**
- The system prompt sent to the `stem-solver` edge function gets a line appended:
  `Always respond to the student in {languageName} ({languageCode}). Keep math notation in standard LaTeX.`
- The frontend passes the current language with each chat request; the edge function injects it into the prompt.

### UI placement (both)

**Quick switcher** — globe icon next to the theme toggle in the sidebar (and in the mobile top bar). Opens a dropdown with the 6 languages, current one checked.

**Settings page** — new route `/app/settings`:
- Language section (radio list of 6 options, shows native name + English name)
- Appearance section (light/dark/system — moves the existing theme toggle here too)
- Account section (email, sign out)

A "Settings" entry is added to the sidebar nav under Knowledge.

### Layout sketch

```text
Sidebar                 Settings page
─────────────           ─────────────────────────────
 Dashboard               Language
 Sessions                ( ) English
 Knowledge               (•) Español
 Settings   ←new         ( ) Français
                         ( ) Deutsch
 [🌐 ES ▾] ←new          ( ) 中文
 [🌙 Dark]               ( ) 日本語
 [↪ Sign out]
                         Appearance
                         [Light] [Dark] [System]
```

### Technical details

**i18n library**: `react-i18next` + `i18next` + `i18next-browser-languagedetector`. Battle-tested, tiny, supports lazy-loaded JSON dictionaries.

**File structure**
```
src/
  i18n/
    index.ts                  # i18next init, detector config, language list
    locales/
      en.json
      es.json
      fr.json
      de.json
      zh.json
      ja.json
  hooks/
    useLanguage.ts            # thin wrapper: { lang, setLang, languages }
  components/
    LanguageSwitcher.tsx      # globe dropdown used in sidebar + mobile bar
  pages/app/
    Settings.tsx              # new page
```

**i18n init (`src/i18n/index.ts`)**
- Registers the 6 resources, sets `fallbackLng: "en"`.
- LanguageDetector order: `localStorage` → `navigator` → fallback. Cache to `localStorage` key `stemind_lang`.
- Imported once from `src/main.tsx` so it's ready before React renders.

**Translation keys** — flat namespaces per page, e.g.:
```json
{
  "nav": { "dashboard": "Dashboard", "sessions": "Sessions", ... },
  "dashboard": { "title": "Dashboard", "subtitle": "Your learning, verified.", ... },
  "auth": { "signin": "Sign in", "guest": "Continue as guest", ... }
}
```
Components call `const { t } = useTranslation(); t("dashboard.title")`.

**Routing** — add `<Route path="settings" element={<Settings />} />` inside the `/app` layout in `src/App.tsx`.

**AI tutor language wiring**
- `SessionDetail.tsx` reads `i18n.language`, passes `language: i18n.language` in the JSON body of the `stem-solver` request.
- `supabase/functions/stem-solver/index.ts` reads `language` from the body, looks up the human-readable name from a small map, and appends to `SYSTEM_PROMPT`:
  `\n\nIMPORTANT: Respond entirely in ${name} (${code}). Math/LaTeX stays unchanged.`

**No DB changes** — language is a client preference only. (If we later want it synced across devices, we add a `language` column on `profiles` — out of scope for now.)

### Files to create
- `src/i18n/index.ts`
- `src/i18n/locales/{en,es,fr,de,zh,ja}.json`
- `src/hooks/useLanguage.ts`
- `src/components/LanguageSwitcher.tsx`
- `src/pages/app/Settings.tsx`

### Files to modify
- `src/main.tsx` — import `./i18n`
- `src/App.tsx` — add `/app/settings` route
- `src/pages/app/AppLayout.tsx` — add Settings nav item, mount `LanguageSwitcher` in sidebar + mobile bar, replace hardcoded labels with `t(...)`
- `src/pages/app/Dashboard.tsx`, `Sessions.tsx`, `SessionDetail.tsx`, `Knowledge.tsx` — replace strings with `t(...)`
- `src/pages/Auth.tsx` — replace strings with `t(...)`
- `src/pages/app/SessionDetail.tsx` — pass `language` to edge function
- `supabase/functions/stem-solver/index.ts` — accept `language`, append directive to system prompt
- `package.json` — add `i18next`, `react-i18next`, `i18next-browser-languagedetector`

### Out of scope (can add later)
- Translating the marketing landing page beyond the navbar
- Syncing language to the `profiles` table for cross-device persistence
- RTL languages (Arabic, Hebrew) — not in the 6 chosen
- Translating user-generated content (session titles, problem text)