# UI-1: "Atelier" theme

A warm ivory / espresso visual system in the style of an architecture studio portfolio, applied to every
HomeVal screen. Page structure, JS hooks and API calls are unchanged.

## How it is built

| File | Role |
| --- | --- |
| `frontend/css/luxe.css` | Loaded **last** on every page. Re-points the shared tokens (`--c-*`), sets the type pair (Cormorant Garamond display + Be Vietnam Pro body, both with Vietnamese glyphs, system fallbacks offline), and restyles header, buttons, forms, cards, footer, page heroes, charts and the new Home sections. |
| `frontend/css/luxe-remap.css` | **Generated** by `python scripts/build_luxe_remap.py`. The older stylesheets hard-code 321 green colours; the script re-emits those declarations with the same selectors (and the same `@media`), re-hued warm with the same lightness/alpha. No legacy CSS file is edited, so open PRs touching them still merge. Re-run it after changing a legacy stylesheet. |
| `frontend/js/luxe.js` | Home-only motion: hero photos follow the existing slider in `home.js`, autoplay (7 s) with a pause button, paused on hover/focus and when the tab is hidden, never with `prefers-reduced-motion`; scroll reveal; drag / arrow-key horizontal gallery. Everything is visible and usable without it. |
| `frontend/credits.html`, `frontend/img/photos/credits.json` | Author, licence, source and changes for every photo (linked from the footer and the Home gallery). |

`home.js` changes by one line (the swipe target), so the Home model-accuracy PR (#97) merges cleanly.

## Home
- **Full-bleed slider, half frosted / half clear:** the left half is blurred glass carrying the copy, the
  right half shows the photograph sharp. Three photographs cross-fade with the three existing slides.
- Quick estimate card floats over the hero edge.
- Editorial split rows (image / text, alternating) for estimate → market → compare, each photo with a
  frosted plate carrying a real number (90% target interval, 23 districts, 2–3 options).
- Horizontal snap gallery ("Bộ sưu tập không gian"), swipe on touch, drag with a mouse, arrow keys or buttons.
- Premium as a photo band with a frosted right half; closing CTA with a frosted left half.

Other pages: the About / Premium / How it works / Data sources heroes become a photograph with the same
frosted-half treatment (`data-photo` picks the image), login/register use a warm veil.

## Photographs and licences
Nine photographs from **Wikimedia Commons**, licence read from the Commons API at download time:
1 × CC0, 7 × CC BY 2.0, 1 × CC BY 4.0. CC BY requires credit, the licence link and a note of changes;
`credits.html` lists all three for each image. Changes made: resized, warm colour grade (lower saturation,
lifted shadows, 10% cream wash) so the set reads as one series. Photos are labelled as illustrations of
living spaces, not listings, and are unrelated to any price shown.

Pinterest images were **not** used: pins are mostly other people's copyrighted photos.

## Accessibility and checks
- Text contrast on ivory: ink 13.8:1, taupe 4.7:1, bronze accent 5.6:1; buttons ivory-on-espresso 11.8:1.
- Chart colours re-validated with the dataviz checks on paper `#fffdf9`: single series `#9c5a26`
  (L .534, C .109, 5.29:1); up/down `#2f6aa8` / `#b8572e` (CVD ΔE 18.6, normal ΔE 25.1).
- Status colours (success badge) intentionally keep their own hue.
- Verified in Edge at 1366 px and 390 px on 9 pages: no horizontal overflow, no broken images, no 4xx, no
  console errors; reveal leaves nothing hidden after scrolling; autoplay advances, pause and hover stop it,
  reduced motion disables it; gallery buttons scroll one photo.
- A computed-style scan of 19 pages (guest, user, admin) finds no remaining green except the success badge.

| Before | After |
| --- | --- |
| ![Before](before-home-full.jpg) | ![After](home-full.jpg) |

![First screen](home-first-screen.jpg)

| About | Premium | Insights |
| --- | --- | --- |
| ![](about-model-desktop.jpg) | ![](premium-desktop.jpg) | ![](insights-desktop.jpg) |
| ![](login-desktop.jpg) | ![](predict-desktop.jpg) | ![](credits-desktop.jpg) |

| Mobile home | Mobile about |
| --- | --- |
| ![](home-mobile.jpg) | ![](about-model-mobile.jpg) |
