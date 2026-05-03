
## Goal

Address the chat layout bug (highest priority — visible right now) and work through the 7 follow-ups in the same pass. Mode toggle (#2) is already shipped, so this plan focuses on the remaining items plus the explicit layout fix.

---

## 1. Fix chat sizing on mobile (the visible bug)

`SessionDetail.tsx` and `Demo.tsx` both use `h-screen`, but `AppLayout` adds a fixed mobile top bar (`pt-24 md:pt-0` on `<main>`). On phones the chat is taller than the visible area, so the input bar sits below the fold and the header gets clipped.

Changes:
- `AppLayout.tsx`: change main wrapper to use `h-dvh` (or `min-h-screen` + `h-screen md:h-screen` flex column) so children can `flex-1 min-h-0`. Use `h-dvh` (dynamic viewport) so iOS Safari URL bar doesn't break it.
- `SessionDetail.tsx` + `Demo.tsx`: replace `h-screen` with `h-full min-h-0 flex flex-col`. Make the `ScrollArea` `flex-1 min-h-0`. Account for mobile top bar height (currently ~6rem) by removing the `pt-24` padding on the chat route only — instead make the chat content a flex child of a viewport-bounded container.
- Verify the sticky composer stays inside the viewport on 360px–414px widths.

## 2. Remove the Lovable badge

Call `publish_settings--set_badge_visibility` with `hide_badge: true` so the production deployment no longer shows the "Edit with Lovable" pill.

## 3. Final Answer block with verification status

Currently the solver is instructed to end with `**Final answer:** …` but the UI just renders it inline.

- Add `src/components/FinalAnswerCard.tsx`: parses the assistant message, extracts the substring after `**Final answer:**` up to the next blank line, and renders a prominent card under the message:
  - Big result line (LaTeX-aware via `RenderMath`)
  - Verification chip: `passed` (green) / `failed` (red) / `uncertain` (amber)
- Heuristic verification (no extra LLM call): mark `passed` if the answer text contains a `**Final answer:**` line and no hedging tokens (`I'm not sure`, `cannot`, `unable`); `uncertain` if hedging is present; `failed` if the stream errored. Persist this to `solutions.verification_passed` (column already exists) and `solutions.confidence_score`.
- Render the card in both `SessionDetail` and `Demo` for the latest assistant message.

## 4. First-run onboarding flow

- Add `src/components/FirstRunTour.tsx` — a dismissible 3-step panel shown once (flag in `localStorage` key `stemind_tour_done`):
  1. "Pick Tutor or Answer mode" (points at the toggle)
  2. "Try the example session" (CTA reuses existing prefill flow)
  3. "Track mastery in Knowledge"
- Show on `Dashboard` the first time a signed-in user lands there with no sessions. `OnboardingCard` stays for the example-session CTA; the tour is the bigger explainer panel above it.

## 5. Session history + summary + export

- `Sessions.tsx`: already lists sessions; add a small "Last activity" timestamp and problem count per row (one extra count query grouped by `session_id`).
- `SessionDetail.tsx`: add an "Export" button in the header that builds a Markdown transcript (title, subject, each Q/A pair, final answer) and triggers a client-side download via a `Blob`. No backend needed.
- Dashboard: add a compact "This week" summary card — problems solved, current streak (already in `useStreak`), top topic by mastery delta.

## 6. Failure & loading polish

- `SessionDetail`: when `sessionRecord` query fails (bad id, RLS), show a dedicated error card with "Back to sessions" instead of an empty header.
- Wrap initial chat-history load in a skeleton (3 message placeholders) instead of an empty `ScrollArea`.
- Demo: keep current error card, add an offline banner when `navigator.onLine === false`.
- Sessions list: skeleton rows while loading (already partial — extend to match the new row layout).

## 7. Visual identity polish

- `HeroSection`: tighten copy, add a subtle animated gradient orb behind the headline (CSS only, no extra deps), and surface the "Try the demo" + "Sign up" CTAs with clearer hierarchy.
- Empty states across `Sessions`, `Knowledge`, `Dashboard`: replace generic icons with branded illustrations using the existing `bg-gradient-stemind` token + a topic-specific icon.
- Footer: add a tagline line ("Triple-verified AI tutor for STEM") and a small build/version stamp for trust.

---

## Technical notes

- No schema changes needed. `solutions.verification_passed` and `confidence_score` already exist; we just start writing them with meaningful values.
- Markdown export is fully client-side, no edge function.
- All new strings go through `react-i18next` and are added to the 6 locale files.
- `h-dvh` requires Tailwind v3.4+. If the project is on an older 3.x, fall back to a custom utility `h-[100dvh]` (Tailwind supports arbitrary values).

## Out of scope for this pass

- Real triple-agent verification (still single-model — keep current MVP scope).
- Sharing via public URL (export-only for now; sharing would need a `public_shares` table + RLS).
- Mobile slide-out sidebar (current top-bar nav is fine).
