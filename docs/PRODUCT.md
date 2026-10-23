# Product — website flow

Source: `D:\work\Material\website flow.pptx` (18 slides). Build **UI first**. AI features are shells until we take over AI later.

Three roles on the site: **Couple**, **Planner**, and **Vendor**. Choosing a role opens that role's public landing page. Auth starts only when the person chooses an account action there.

## Couple

After choosing Couple, people land on `/couple`. Account actions ask for email and password, then confirm new accounts with an email OTP. New accounts complete a short profile with both names, initials, wedding needs, and location before continuing to the couple home. Keep the development bypass available only outside production.

### Couple dashboard feature list

These features existed in the archived couple pages. Keep them visible in the new couple area:

1. **Wedding vision** — choose event, guest count, theme, venue, and colors; add a venue photo; make and edit a vision across budget levels; save images or add them to the cart.
2. **Moodboards** — choose an event, style, mood, and time; add venue and decor photos; make, edit, save, or remove images.
3. **Vendor search** — browse wedding vendors and open their profiles.
4. **Planner requests** — choose services and needs, then ask planners for help.
5. **Cart and orders** — review saved ideas, add wedding details, and send a request.
6. **Quotes and bids** — see planner replies and track accepted, waiting, or closed requests.
7. **Messages** — read and reply to planners.
8. **Credits and plans** — see available credits and manage a subscription.
9. **Wedding profile** — view and edit names, date, place, guest count, budget, and style.
10. **Wedding inspiration** — browse visual ideas and begin a vision or moodboard.

The dashboard should show these feature names and give each working route. Use sample states until Supabase data is ready. Do not imply sample counts or statuses are live data.

## Planner and vendor

Planners and vendors have separate roles and public landing pages at `/planner` and `/vendor`. Planner and vendor accounts use the same profile system but retain role-specific services and tools. Existing `professional` metadata maps to `planner` during migration.

### Profiles and access

- Sign up with email and password, then confirm with a Supabase email one-time code. Sign in with email and password.
- After the code is verified, incomplete accounts finish a short role-specific profile.
- Couples add both names, initials, wedding needs, and a moodboard.
- Planners and vendors add a name, company, service list, and portfolio images.
- Each role has a public profile page at `/profile/[handle]`.
- Couple requirements and planner requests are visible only to approved planner/vendor profiles. New professional accounts need review before they can see real couple requests.
- Demo profiles and requests are seeded for previews; they are marked as examples.

### Legacy tools

The planner workspace landing at `/planner` keeps the shared tool directory. The vendor landing at `/vendor` explains vendor profiles, services, and portfolios.

- **Planner work:** find leads, pitch with AI, find vendors, manage clients, track bids, build quotes, manage deals, messages, pitch library, planner profile, credits and plans.
- **AI design:** venue views, photo angle changes, photo retouching, wedding video, decor design, food planning, venue partners (MasterVenue AI, FairMount Mumbai, Taj Agra, ITC Mughal, Jaypee Palace).
- **Vendor work:** vendor home, portfolio, inventory, requests, service quotes, earnings, messages, and vendor profile.

Show working new-app routes as previews. Mark tools without a new-app route as coming soon; do not suggest those features are already connected.

Home line: `Close more weddings` / `with less work`

Three steps:

1. **Find leads**
2. **Pitch with AI**
3. **Find vendors** to execute

### Pitch with AI (UI now, AI later)

Venue first, then decor on top.

1. Drop **four views** of the venue (front, right, back, left). Optional satellite / lawn photo.
2. Show isometric + panoramic / video for lawn or banquet.
3. Doodle zone by zone, one at a time: entry, mandap, stage, lounge, dining, bar, photobooth.
4. Upload each decor piece, then edit it.
5. Later: lock size into a 2D plan (DWG), production drawings, graphics.

Decor edit list:

- Entry (clean, 360, character / environment sheet)
- Stage and dance floor
- Bar
- Lounge
- Dining
- Photobooth

Compose: venue + decor (entry + background, stage + background).

Also later: **RSVP tools**.

### Vendors (planner step 3)

First screen: **Hiring or looking for work?**

- **I'm hiring** — find vendors. An assistant will ask short questions, then filter by time, place, and budget.
- **I'm looking for work** — list venues with size. People must be able to see the space.

Vendor type (one pick): wedding planner, decorator, caterer, venue, fashion designer, makeup artist, photographer, choreographer, entertainment.

Same one-question screens: name, phone (WhatsApp), company, city, then role.

## Build order

1. Shared shell (nav, type, colors, Greek frame)
2. Couple dashboard + direct auth path
3. Planner home + signup unveiling
4. Vendor hire / looking split
5. Venue four-view upload UI (empty AI)
6. Decor zone editor UI (empty AI)
7. RSVP later
