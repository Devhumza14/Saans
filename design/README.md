# Saans design reference

Source of truth for the UI. Open the `.dc.html` files for markup, copy, colours and spacing; rebuild them as Next.js + Tailwind components.

Live canvas: https://claude.ai/artifact/1vjFgNjFvBGQpdBHkKKRYg

| File | Route |
|---|---|
| canvas/Main.dc.html | `/` landing |
| canvas/Dashboard.dc.html | `/dashboard` |
| canvas/Compare.dc.html | `/compare` (demo page) |
| canvas/Member.dc.html | `/member/[id]` (mobile) |
| canvas/Chat.dc.html | `/chat` (mobile) |
| canvas/Onboarding.dc.html | `/onboarding` (mobile) |
| canvas/System.dc.html | tokens: colours, AQI bands, type |

`DESIGN.md` is the claude design system the look is based on. Fonts: Source Serif 4 (display), Inter (body), Noto Nastaliq Urdu, JetBrains Mono.

Images in `assets/` map to the `/_blob/<id>` URLs in the canvas: dc2f364e… = badshahi-mosque, ccb5e291… = smog-city, 81ebed2d… = smog-haze, e8166f98… = punjab-road. Copy them to `public/images/` when building.
Photos: Unsplash (Shazaf Zafar and others), Unsplash License.
