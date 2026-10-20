# Build prompt: ChairFill

## The brief

**The product.** ChairFill turns a cancelled appointment into a filled one without a phone call. It keeps a prioritized waitlist and, when a slot opens, texts the right patients in order; the first yes gets the chair.

**Client persona:** Maple Family Dental, two dentists and a hygienist, five chairs, a front desk of two people who are on the phone all day. They use a practice management system for the schedule and a paper waitlist in a drawer.

**The problem we're solving for them.** Three or four cancellations a week become empty chairs because nobody has twenty minutes to work the list, and the patients who'd happily come in earlier never hear about it. **What it's worth:** a hygiene slot is $150–$250, a crown slot $1,000+; filling even three slots a week is $2,000–$4,000 a month the practice already paid staff to be there for.

**What it does (in priority order):** schedule with fill buttons; ranked waitlist with procedure, urgency and preferred windows; automated text offers with first-yes-wins and polite declines; move-up offers for already-booked patients; patient yes/no page; reports in dollars recovered; templates and quiet hours.

**Style, in one line:** Calm clinical: white, teal, IBM Plex, dense but airy tables, a fill timeline. Belongs next to the practice software.

**Leeway:** everything below the brief is a strong default, not a cage. If you see a better architecture, a better flow, or a feature the client would obviously want, do it and note it in the README. Don't ask; decide, build, document.

## Original one-paragraph summary (kept)
Build **ChairFill**, a web app for a dental or medical practice front desk. Problem: a cancelled appointment is an empty chair and the front desk doesn't have time to call a waitlist. The app keeps a prioritized waitlist, and when a slot opens it texts candidates in order, first "YES" wins, everyone else is told politely, and the schedule updates, with no human on the phone. Demo mode, Vercel, setup wizard, 25-second Remotion explainer.

## Default stack and conventions (change it if you have a strong reason; say why in the README)
Next.js 15 App Router, TypeScript, Tailwind, Framer Motion. Mock data in `/data`. A **simulated SMS conversation engine** in `/lib/sms-sim.ts` that plays out candidate replies over seconds in demo mode so the fill is visible live. Role switcher: **Front desk / Patient**. Adapters: SMS (Twilio), practice management system sync (mocked with a CSV import).

## Design direction: calm clinical
Quiet, precise, reassuring. Should look like it belongs next to the practice software.
- Palette: white, surface `#F7F9FA`, ink `#17202A`, **teal `#0F8B8D`**, soft teal `#DFF3F3`, amber `#E7A33E` for "offered," green `#2E9E5B` for "filled," slate `#6B7A8C` for secondary text.
- Type: **IBM Plex Sans**; **IBM Plex Mono** for times and phone numbers.
- Components: dense but airy tables, 8px radius, 1px borders, status chips, a timeline component for the fill sequence. No decorative imagery.
- Motion: the fill timeline reveals step by step (offer sent → reply → confirmed) with 300ms fades; the empty slot on the schedule turns from dashed grey to filled teal with a single soft pulse. Reduced-motion safe.

## Screens
1. **Schedule (front desk):** week view by provider and chair; cancelled slots show a dashed outline and a "Fill this slot" button; filled-by-ChairFill slots show a small bolt icon.
2. **Fill sequence (modal + timeline):** the app lists candidates ranked (priority rules below), sends the first N offers (setting: 1 at a time or 3 at once), shows the simulated replies arriving, confirms the winner, sends "sorry, it's taken" to the rest, and writes the appointment. Shows minutes-to-fill.
3. **Waitlist:** patients with preferred days, time windows, procedure type, urgency, how long they've waited, last offer; add/edit; bulk import CSV.
4. **Patient view (from the text link):** the offer: provider, time, procedure, two big buttons YES / NO, and a confirmation card with directions and prep instructions.
5. **Reports:** chairs filled this month, revenue recovered (slot value × fills), average minutes to fill, offers per fill, best hours.

## Priority rules (implement, explain in the UI)
Procedure match first (a cleaning slot goes to cleaning waitlisters), then urgency, then preferred window match, then longest waiting, with a cooldown so the same patient isn't offered twice in 24 hours. Configurable in settings.

## Setup wizard
Practice name and providers/chairs → appointment types and durations with a value each → waitlist import (CSV, sample provided) → offer strategy (one at a time with a 10-minute timer, or three at once) → message templates (offer, confirm, taken) with merge fields → quiet hours → done, with a test fill on a sample slot.

## Mock data
- `providers.json`: 3 providers, 5 chairs.
- `schedule.json`: 2 weeks of appointments with 6 cancellations sprinkled in.
- `waitlist.json`: 40 patients with the fields above; make sure every cancelled slot has 3+ plausible candidates.
- `templates.json`: the three SMS templates.
- `sim-replies.json`: scripted reply behavior per patient (yes after 20s, no after 45s, no reply) so demo fills look real.

## Explainer video (Remotion)
25 seconds, horizontal first. (0–3s) a schedule with one slot going dashed, "ChairFill"; (3–10s) the fill timeline: three offers fly out as phone bubbles; (10–17s) one phone taps YES, the slot turns teal, the other two get "it's taken, we'll text you next time"; (17–22s) report counter: "Chairs filled this month: 14 · Recovered: $3,920"; (22–25s) end card "An empty chair fills itself." Plex, teal on white, one soft chime.

## Things to think of
- Slot value by procedure so the report speaks in dollars.
- "Move-up" offers: patients already booked later in the week get offered the earlier slot first (they're the easiest yes).
- Insurance/eligibility flag on the waitlist so the desk isn't surprised.
- Quiet hours and a daily offer cap per patient.
- A manual override: the desk can pick a specific patient and still use the text flow.
- Audit log per fill for the office manager.

## What keeps this from looking like a template
- **Signature moment:** the fill timeline where the text offers fly out and the first YES turns the slot teal while you watch. Build this first and make it perfect; it's the thing people will remember and screenshot.
- **Layout grammar:** dense desktop table-and-timeline layout like practice software, a left rail of providers, no hero sections, no marketing chrome; the patient page is a single centered card with two giant buttons. Do not default to the "header + sidebar + card grid" dashboard shape; this app has its own skeleton.
- **No stock look:** no unstyled shadcn/Tailwind defaults, no generic hero with a centered headline and two buttons, no lorem ipsum, no placeholder avatars with initials unless the design direction says so. Use the palette and type above exactly; pick one or two custom details (a texture, an icon style, a transition) and use them everywhere.
- **Copy voice:** write every string as the client persona would say it (their words for their customers), not as a SaaS would. Error states, empty states and confirmations included.
- **Real-feeling data:** names, addresses, prices and timestamps that look like one real town and one real month; vary the data so lists don't repeat; include a few messy records (a typo'd name, an overdue job) because real data is messy.
- **Finish details:** favicon, OG image, page titles, loading skeletons in the app's own style, a 404 in character, and the explainer video embedded where a new user would actually be confused.

## Decisions already made (so you don't have to stop and ask)
- **Audience for this build:** a prospect demo, not a production tenant. Optimize for the 90-second wow and for being obviously real; leave clean seams for the production pieces.
- **Auth:** none. The role switcher in the header stands in for login. Mark where real auth would gate things.
- **Persistence:** in-memory + localStorage, seeded from `/data/*.json`; "Reset demo data" restores the seed. Put every external call behind `/lib/adapters/*` with a mock implementation and a one-line TODO naming the real service.
- **Hosting and domain:** Vercel, default `*.vercel.app` subdomain; no custom domain yet.
- **Brand assets:** none exist. Generate a simple wordmark and favicon in the chosen style; don't ask for a logo.
- **Payments, SMS, email, maps, calendars:** mocked, with realistic fake confirmations and a visible "simulated" tag in demo mode.
- **Locale:** US English, USD, 12-hour times, America/Los_Angeles unless the client persona says otherwise. Phone numbers in `(805) 555-01xx` format.
- **Browsers:** current Chrome, Safari (incl. iOS), Firefox; no IE. Test at 390px and 1440px.
- **Accessibility:** WCAG AA contrast, keyboard navigable, labels on every input, reduced-motion variants of every animation.
- **Testing:** one Playwright smoke test that runs the 90-second demo script end to end, plus unit tests for any pricing/dosing/cadence math.
- **Repo layout:** one Next.js app at the root; Remotion project in `/video`; mock data in `/data`; adapters in `/lib/adapters`; a `DEMO.md` with the click-by-click demo script.
- **Scope control:** if a feature below would take more than an hour, stub it beautifully (UI present, action simulated) and list it under "Stubbed" in the README rather than skipping it silently.
- **Secrets and env:** none required to run. If you add a real integration behind a flag, read keys from env and ship with the flag off.
- **When in doubt:** make the choice that makes the demo feel more like a finished product, write it in the README, and keep going.

## Done checklist
Vercel link, a cancelled slot can be filled live via the simulation in under 60 seconds of demo time, priority rules visible, patient YES page works on a phone, wizard completes, reports populated, explainer embedded, README demo script, OG image.
