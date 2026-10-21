# LoversAI: project map and recovery assessment

Reviewed: 18 October 2026. Checkout: `7d7e5e1`.

## Assessment

**This is a recoverable prototype with substantial implementation, broken core journeys, and critical production security issues. It is not ready for customers or payments in its present form.**

There is useful work to retain: role-based application shells, user/profile models, JWT middleware, a separate wallet/ledger service, moodboard persistence, quote and chat REST APIs, upload utilities, and real Gemini request code. However, important screens use samples, several integrations disagree about their contracts, and newer UI changes do not consistently connect to older backend behavior. A polished screen is not evidence that its workflow works.

The local history's latest commit is 11 September 2026. That establishes the age of this checkout, not the owners' current production deployment or database state. Claims in `BACKEND_FIXES_SUMMARY.md` are historical notes, not proof that the current code is fixed.

Scope: repository architecture, frontend journeys, mounted API routes, models, AI prompts/providers, auth/security, billing/credits, deployment configuration, tests, and all 18 PDF pages. This is a source audit with limited local verification. No production database, cloud account, external linked app, real payment, email, or paid generation was accessed. No application implementation was changed.

## 1. What the product is trying to be

An AI-assisted wedding planning marketplace:

- Couples design a wedding vision, collect images, publish a planning request, compare proposals, and hire a planner; the PDF also offers planning directly with vendors.
- Planners find leads, create AI pitches and venue/decor visuals, and source vendors to execute weddings.
- Vendors create profiles and portfolios and receive work requests.
- Administrators manage users, vendor verification, credits, subscriptions, and reporting.

The PDF is a concept/workflow deck, with screenshots and example outputs. It is not a complete requirements specification: RSVP has only a heading, and availability matching, drawing accuracy, approval rules, and transaction semantics are not fully specified.

## 2. Technical map

```text
Browser
  |
  +-- React 19 + React Router 7 + Tailwind + CRA/react-scripts 5
  |     |
  |     +-- Public / authentication / onboarding
  |     +-- Couple workspace
  |     +-- Planner workspace
  |     +-- Vendor workspace
  |     +-- Admin workspace
  |     |
  |     +-- AuthContext + JWT in localStorage
  |     +-- Axios API facade + direct fetch calls
  |     +-- Socket.IO client
  |     +-- browser storage for drafts, boards, shortlist, cart variants
  |
  +-- Express 5 + Socket.IO / backend/server.js
        |
        +-- JWT protect + role authorization + admin middleware
        +-- users / profiles / phone capture
        +-- moodboards / cart
        +-- quotes AND a separate legacy-style bids system
        +-- chat rooms / messages
        +-- wallets / credit ledger
        +-- Razorpay checkout / template purchases / webhook
        +-- admin APIs
        +-- four AI router modules
        |
        +-- MongoDB via Mongoose: 13 model files
        +-- Gemini: image generation and editing
        +-- Groq: reference-image analysis and prompt writing
        +-- BFL / Replicate: alternate image paths
        +-- BFL-configured video path
        +-- Cloudinary OR local uploads / in-process image caches
        +-- Firebase: Google login / legacy token bridge
        +-- Resend: verification OTP and purchase email code

Separate navigation destinations:
  Venue / hotel / decor / catering AI onboarding pages
      --> seven externally hosted Vercel apps
          [source, login, persistence and availability not verified here]
```

Inventory: 167 JS/JSX files, 46,475 lines including comments/blank lines; 56 backend JS files (13,549 lines), 111 frontend JS/JSX files (32,926 lines), 60 explicit frontend route paths, and 360 public files. These counts describe size, not completion. The companion inventory lists files, route registrations, and environment-variable names.

### Main code ownership boundaries

| Area | Main locations | Condition |
|---|---|---|
| Routing and application shells | `frontend/src/App.jsx`, `pages/{couple,planner,vendor}`, `admin` | Broad coverage; no catch-all route; some navigation targets do not exist |
| API client / identity | `frontend/src/api/api.js`, `context/AuthContext.jsx`, `components/ProtectedRoute.jsx` | JWT bridge exists; mixed legacy user IDs and browser state remain |
| Application server | `backend/server.js` | Bootstrap, sockets, routes, health, public directory, debug, and admin initialization combined |
| Authentication | `backend/routes/authRoutes.js`, `middleware/auth.js`, `models/User.js` | Password hashing, email OTP, Google/Firebase bridge and role checks exist; review issues below |
| Couples | `pages/couple`, `routes/{moodboardRoutes,cartRoutes,quoteRoutes}.js` | Persistence exists, but the main studio's cart does not use it |
| Planner commerce | `pages/planner/Planner{Bids,BuildQuote,Quotes,Deals}.jsx`, `routes/quoteRoutes.js` | Lead UI disabled; submitting a proposal calls a removed model method |
| Vendors | `pages/vendor`, `routes/vendorRoutes.js` | Profile and portfolio APIs exist; inventory and request UI remain samples |
| Credits | `services/creditService.js`, `models/{Wallet,CreditTransaction}.js`, `config/credits.js` | CAS debit protection exists; ledger and balance writes lack a shared transaction/idempotency boundary |
| Billing | `routes/paymentRoutes.js`, `hooks/useCheckout.js`, frontend pricing config | Signature check exists; fulfillment, product mapping, and displayed prices disagree |
| AI | `backend/planner/ai_tools` | Real provider code, but duplicated clients, contradictory prompts and uneven recovery |
| Media | `utils/cloudinary.js`, `routes/uploadRoutes.js`, AI cache/persistence helpers | Mix of cloud, disk and expiring RAM assets; access and retention are inconsistent |
| Administration | `backend/admin`, `frontend/src/admin` | Real user/credit/subscription interfaces; AI logs are derived from debits, not a complete generation lifecycle |
| Deployment | Dockerfiles, Compose, Nginx, Vercel rewrite, Azure workflow, AWS scripts | Multiple deployment approaches have drifted apart |

## 3. Actual user flow today

Legend: `[API]` = implementation exists; `[BROKEN]` = a concrete code-level break; `[SAMPLE]` = mock/placeholder behavior; `[EXTERNAL]` = separate app; `[MISSING]` = no implementation found in this checkout. `[API]` does not mean end-to-end tested.

```text
LANDING / ROLE SELECTION
  |
  +-- COUPLE
  |    signup/login -> verify email -> wedding onboarding [API]
  |      -> Wedding Vision studio [API, misleading tier output]
  |          +-> save to moodboard -> browse/edit boards [API]
  |          +-> Add to Cart -> localStorage "loversai_cart"
  |               X Wedding Cart reads MongoDB /api/cart [BROKEN]
  |          |
  |          +-> other moodboard screens -> /api/cart/add [API]
  |                 -> Wedding Cart -> POST /api/quotes [API]
  |                     -> proposals / accept planner [API]
  |                     -> conversation [REST API; socket security broken]
  |    plan directly with vendors [MISSING dedicated couple journey]
  |
  +-- PLANNER
  |    signup/login -> onboarding -> dashboard [API + sample fallback]
  |      +-> Leads: UNDER_MAINTENANCE = true [DISABLED]
  |      +-> Build Quote -> /quotes/:id/respond
  |      |      -> planner.deductCredits(...) [BROKEN: method absent]
  |      +-> Quotes / Deals [API + sample fallbacks]
  |      +-> Messages [REST API + sockets]
  |      +-> AI Tools
  |      |      +-> Retexture -> Gemini / BFL / Replicate
  |      |      +-> Change angle -> Gemini / optional Replicate
  |      |      +-> Video -> BFL-configured video path
  |      +-> Venue / Decor / Catering guides -> other apps [EXTERNAL]
  |      +-> Vendors -> directory / browser shortlist [API + SAMPLE]
  |      +-> Pitch library -> template purchase / downloads [PARTIAL]
  |
  +-- VENDOR
  |    signup/login -> onboarding -> profile/portfolio [API]
  |      +-> Dashboard [derived statistics]
  |      +-> Inventory [SAMPLE, browser state]
  |      +-> Work requests [SAMPLE, browser state]
  |      +-> Earnings [API + sample transaction display]
  |      +-> Messages [API; legacy identity assumptions remain]
  |
  +-- ADMIN
       login -> user / credit / subscription / AI-debit views [API]
       server startup can seed a fixed-credential admin [CRITICAL]

Shared: pricing -> Razorpay order -> client checkout -> verification
          -> wallet credit + user subscription mutation [BROKEN/UNSAFE]
```

### Data relationships

```text
User
  +-- weddingProfile / vendorProfile (embedded)
  +-- PlannerUser (planner authentication activity mirror)
  +-- Wallet[] keyed by (userId, productType)
  |     +-- CreditTransaction[] (credits, debits, refunds)
  +-- Subscription[] (separate record + overlapping User flags)
  +-- Moodboard[] -> image URLs + edit metadata
  +-- Cart -> selected images
  +-- Quote[] -> embedded planner responses -> hiredPlanner
  |     +-- ChatRoom -> Message[]
  +-- Bid[] -> another embedded response/hiring model
  +-- AdminAuditLog[]

NewUser: separate phone-capture collection

Missing as first-class records:
  GenerationJob / versioned PromptTemplate / Asset ownership
  PaymentOrder + unique fulfillment event
  WeddingProject + approved design revisions
  Venue geometry / measurements / placed decor objects
  Vendor inventory / dated availability / bookings / payouts / RSVP
```

The main couple hiring flow uses `Quote`; `Bid` is a second independent system, and the planner dashboard reads both. Do not consolidate these by deleting one until existing data and consumers are identified.

## 4. PDF intent versus the checkout

| PDF pages | Intended behavior | Existing implementation / gap |
|---|---|---|
| 1-2 | Brand direction; couples and planners/vendors | Public landing and role-specific shells exist |
| 3-5 | Couple homepage, signup, three-step journey | Signup, OTP and couple onboarding are implemented |
| 6 | Function, guest count, venue, palette; low/medium/high concepts for decor, styling and entertainment | Studio resembles this screen, but maps four unrelated moodboard outputs into budget tiers by array index; no per-tier budget generation contract |
| 7 | Plan myself -> vendors OR hire planner -> market order/dashboard | Quote/hiring APIs exist, with breaks; no connected couple self-planning vendor branch found |
| 8-10 | Planner homepage -> leads -> pitch -> vendors | UI structure exists; leads page explicitly under maintenance |
| 11 | Four venue views plus satellite reference -> isometric; edit decor elements; sketch element placement | Local tools accept single images, or one venue plus one decor image; no multi-view scene assembly or sketch/placement editor found locally |
| 12 | Scaled 2D plan / DWG, production drawings and graphics | No measured scene model, CAD exporter or production-drawing pipeline found locally |
| 13-14 | Venue panorama/video; consistent decor front/top/360 views; combine decor with venue | Single-image angle/video tools and external app links are partial building blocks, not the complete sequence |
| 15 | RSVP tools | Heading only in PDF; no RSVP system found locally |
| 16 | Professional details and "hiring" / "looking for work" modes | Vendor/planner profiles exist; no unified intent-mode workflow |
| 17 | Assistant asks questions; matches vendors by availability, location and budget | Basic directory/filtering exists with sample fallback; no connected conversational matching/availability engine |
| 18 | Looking for work; venues listed with sizes and visualization | Partial profiles/portfolios; no measured venue catalog or availability marketplace found locally |

```text
PDF TARGET
  Couple signup -> choose/design wedding
      +-> plan myself -> vendor assistant -> shortlist -> booking/execution
      +-> hire planner -> market request -> proposals -> hire -> collaboration

  Planner signup -> leads -> AI pitch -> vendors -> execution
                         |
                         +-> venue photos (4 views + satellite)
                         +-> shared venue representation
                         +-> decor element references and consistent views
                         +-> sketch/place elements one by one
                         +-> approve visualization
                         +-> measured 2D plan / drawings / DWG

  Professional onboarding -> hiring OR looking for work
      -> matching by category + location + date + budget

  RSVP / guest coordination [requirements need definition]
```

External apps may contain additional implementation, but their source is absent from this checkout. Their capabilities cannot be counted as implemented here without inspecting those projects and defining their integration contracts.

## 5. Critical and high-priority findings

These are source-confirmed defects or directly inferred outcomes from the cited control flow, not claims that a live exploit or real payment was performed. Private credential values are deliberately omitted.

### A. Security and revenue blockers

1. **Critical: fixed-credential administrator seeded during ordinary startup.** `initializeAdminCredits` creates an administrator with a hardcoded password if no `isAdmin` user is found; it runs without a development-only guard. Remove automatic credential seeding, inspect actual deployed accounts, and provision an owner-controlled administrator. [Creation](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:794), [startup call](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:848).

2. **Critical: users can grant themselves arbitrary bonus credits.** `/api/debug` is mounted in production; `/gift-credits` requires login but no admin role or environment restriction, and accepts a positive amount and product wallet. Repeated welcome-credit initialization also becomes possible after a wallet is emptied. Remove these routes from production; keep controlled grants behind admin authorization. [Mount](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:458), [gift handler](C:/Users/Neksi/Desktop/LoversAi/backend/routes/debugRoutes.js:50), [welcome reset](C:/Users/Neksi/Desktop/LoversAi/backend/routes/debugRoutes.js:100).

3. **Critical: payment fulfillment is replayable and not bound to the purchased product/user.** Signature verification covers the submitted payment/order IDs, but fulfillment trusts client `planId` and current user without checking a persisted server-owned order, actual captured amount/currency, intended purchaser, or prior fulfillment. The ledger reference is indexed, not unique. Library verification similarly trusts submitted template IDs. Use stored orders and a unique payment/event fulfillment key, with one shared fulfillment service. [Plan verification](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:109), [library verification](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:229), [reference schema](C:/Users/Neksi/Desktop/LoversAi/backend/models/CreditTransaction.js:37).

4. **High: public vendor directory can disclose bank/tax details.** `/api/vendors/public` selects the entire embedded `vendorProfile`, which includes bank account, IFSC and GST fields. It also includes pending vendors while UI copy says verified vendors. Return an explicit public field allowlist and enforce the intended verification rule. [Public projection](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:466), [sensitive fields](C:/Users/Neksi/Desktop/LoversAi/backend/models/User.js:31).

5. **High: Socket.IO rooms have no identity or membership checks.** Clients choose arbitrary user/room IDs in `join` and `join_chat`; messages emitted to those rooms contain message content. REST chat does check membership, but that does not secure subscriptions. Authenticate the handshake and derive user rooms from the token; verify membership before joining chat rooms. Restrict global lead broadcasts too. [Socket setup](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:171), [joins](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:190), [message broadcasts](C:/Users/Neksi/Desktop/LoversAi/backend/routes/chatRoutes.js:340).

6. **High: unauthenticated server-side URL fetching.** Couple image download accepts a caller-supplied URL and fetches it without auth or host/IP validation. Planner download uses substring checks, including `localhost`, rather than a safe asset lookup. Replace arbitrary URL proxies with authorized asset IDs and controlled storage origins; protect redirects and private-network targets. [Couple proxy](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:1857), [planner proxy](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:927).

### B. Core workflow and data integrity breaks

7. **Payment can grant credits and then return an error.** Plan verification and webhook set `lastPaymentStatus = 'paid'`, but `User` only permits `success`, `failed`, `pending`, `refunded` or null. Credit insertion occurs before `user.save()`, so this creates a partial success and makes retries especially dangerous. Razorpay fulfillment also does not create the matching `Subscription` record or consistently set `subscriptionStatus = active`. [Mutation](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:142), [enum](C:/Users/Neksi/Desktop/LoversAi/backend/models/User.js:164).

8. **Main studio "Add to Cart" is disconnected.** It writes `loversai_cart` using `imageUrl`/`title`; the cart reads `/api/cart` and only falls back to `weddingCart_${currentUser.uid}` with a different shape. This is not simply a display bug: it breaks the primary design-to-planner handoff. Other moodboard screens already use the server cart. [Studio](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/CoupleWeddingVision.jsx:284), [cart](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/WeddingCart.jsx:56).

9. **Planner lead and proposal flow is blocked twice.** `PlannerBids` returns maintenance UI before fetching leads. Independently, `/quotes/:id/respond` calls `planner.deductCredits`, but `User` defines no such method; the current API is `creditService.deductCredits`. It also checks legacy `User.credits` rather than the planner wallet. [Maintenance](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerBids.jsx:22), [stale method](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:364).

10. **Displayed planner offers differ from checkout.** The frontend Basic offer shows 30 credits / INR 9,999 per month; backend `planner_basic` charges INR 32,999 and grants 100. Other planner tiers also differ. Legacy `basic` is described as a planner plan but routes credits to the couple wallet because fulfillment uses a `planner` prefix test. Define one server-owned catalog and render it in every checkout. [UI catalog](C:/Users/Neksi/Desktop/LoversAi/frontend/src/config/pricing.js:3), [backend catalog](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:37), [wallet selection](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:138).

11. **Wallet initialization and bookkeeping disagree.** `getWallet` initializes a new couple wallet with four credits; registration then calls `addCredits` for another four. A fresh signup therefore follows a path to eight credits with only the explicit grant recorded as a transaction. `WELCOME_CREDITS` still says 101 elsewhere. Wallet balance and ledger inserts are separate database writes, so a ledger failure can follow a completed balance update. Refund references are neither unique nor reliably tied to a single successful debit. [Initialization](C:/Users/Neksi/Desktop/LoversAi/backend/services/creditService.js:41), [signup grant](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:87), [credit write](C:/Users/Neksi/Desktop/LoversAi/backend/services/creditService.js:87).

12. **Charging/output/recovery contracts vary across AI tools.** Retexturing charges `imageCount` of one or four, but generates and returns one selected image. It deducts before validating that theme/custom prompt is usable, then returns 400 without refund on that branch. Angle change also scales charge by count while returning a single image. Moodboard crash recovery can attempt refunds without a confirmed successful debit; some early model/auth error branches return before refund. Exact outcomes need isolated failure/concurrency tests. [Retexture](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:699), [angle](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:512), [moodboard recovery](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:1580).

13. **Webhook handling does not preserve exact signed bytes.** The global JSON parser runs before the Razorpay router. Its later raw parser cannot restore the original body; validation hashes `JSON.stringify(req.body)`. Signature validity may then depend on byte formatting. Verification and webhook also use different references and can both fulfill the same payment. Register raw-body middleware first and reconcile through the same idempotent fulfillment service. [Parser order](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:294), [webhook](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:392). Razorpay specifies using the [raw request body](https://razorpay.com/docs/webhooks/validate-test/).

### C. Product completeness and reliability

14. **Mock data is used as normal product data.** Vendor inventory/requests are local samples; earnings transactions start as samples; quotes/deals/portfolio/directory/dashboard have sample fallback paths. Directory review counts are randomized. An API failure must show an error, and an empty market must show an empty state. [Vendor inventory](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorInventory.jsx:3), [requests](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorRequests.jsx:5), [directory fallback](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerVendors.jsx:31).

15. **Several frontend contracts are stale.** `Profile` calls unexported `paymentAPI.syncPayment` and `addTestCredits`. Public planner profile calls the admin-only user endpoint. Login links to `/forgot-password`, and successful couple checkout redirects to `/dashboard`; neither route exists in `App.jsx`. No catch-all handles unknown paths. [Profile calls](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Profile.jsx:116), [planner profile](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/PublicPlannerProfile.jsx:18), [checkout redirect](C:/Users/Neksi/Desktop/LoversAi/frontend/src/hooks/useCheckout.js:72).

16. **Auth and upload hardening remain incomplete.** OTP attempts are counted but not enforced as an attempt limit; API rate limiting is broad and exempts localhost, with proxy behavior undefined. Development JWT secret fallback exists. Upload filters largely trust MIME metadata, AI uploads allow 50 MB, and local uploaded media is served publicly. Cloudinary chat URL validation tests whether the *hostname* contains the cloud name, which normally lives in the URL path, potentially dropping valid attachments. CORS uses substring-based origin acceptance. These need explicit contracts and tests, not blanket removal of the useful auth middleware.

17. **Admin AI success reporting is not generation reporting.** It treats completed credit debit rows as successful generations. A provider failure/refund does not make the debit row a reliable job-success record. Persist job status, actual model/provider, prompt version, output asset and validation result, and derive reports from that lifecycle. [AI logs](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminController.js:360).

## 6. Existing AI/prompt system

There is already a large prompt system; the main issue is that its output contract does not match the current product UI.

```text
COUPLE MOODBOARD
  style / function / atmosphere / timing / free text
  + optional venue image + optional decor reference
       |
       +-> deduct one credit from selected product wallet
       +-> optional Groq vision analysis
       |     -> long system prompt: element placement OR full decoration
       |     -> venue preservation, decor extraction, lighting, realism
       +-> fallback prose if analysis is unavailable
       +-> append style / lighting / photographic-language suffix
       +-> append FOUR fixed scene prompts:
       |     portrait / grand ceremony / sacred details / celebration
       +-> four parallel Gemini image requests
       |     [only decor OR venue is passed to each image request]
       |     [Gemini error can silently switch to BFL]
       +-> collect partial successes
       +-> Cloudinary or local disk persistence
       +-> response -> UI assigns array indexes to budget tiers

RETEXTURE
  one image + theme / free text
    -> palette-preservation instructions + transformation instructions
    -> Gemini -> BFL fallback -> Replicate fallback
    -> expiring in-process image cache

ANGLE
  one image + angle preset
    -> fixed angle prompt -> Gemini model attempts
    -> optional Replicate -> cache

VIDEO
  one image + style -> BFL-configured video request/polling
    -> Cloudinary persistence; no Gemini video client here
```

Concrete prompt problems:

- PDF page 6 asks for three budget levels across decor, styling and entertainment. Backend variations instead ask for four photographic scene types. UI relabeling cannot produce genuine budget-conditioned options.
- With both references supplied, Groq sees both, but the image generation call uses `decorFile?.buffer || venueFile?.buffer`. The venue image is omitted when a decor reference exists. The image model therefore cannot directly compare both originals.
- The Groq system prompt requires "no people" for venue visualization, while later variations explicitly request couples, family and guests. These should be separate task templates.
- Venue preservation is freeform prose. `validateGeneration` exists but has no call in the generation route, even though health advertises validation enabled. Retry/validation flags are not evidence that QA is active.
- `hardenPrompt` largely adds aesthetic prose; it does not enforce a structured preservation contract or distinguish generation from constrained edits.
- Retexturing simultaneously asks to preserve decorations/layout and to transform the venue using new stage, furniture and decor content. Define whether an operation is recoloring, restyling, or rebuilding the decoration.
- Seeds in Gemini results are application timestamps, not a demonstrated reproducibility mechanism. Provider/model/version must be recorded instead of implying deterministic replay.
- Couple generation labels input bytes as JPEG without normalizing them first. PNG/WebP uploads need decoded validation and truthful MIME or conversion.
- Provider checks, defaults, fallback flags, model lists and response parsing are duplicated. Retexture can report `provider: gemini` even if its nested call fell back to BFL.
- No persistent generation-job record ties input assets, prompt version, provider request, validation, cost, debit and refund together.

### Foundation for the next Gemini prompt-system phase

This is a proposed architecture, not implemented in this audit.

```text
Validated task request + owned reference assets
    -> task-specific schema / role / entitlement checks
    -> normalize images, MIME, orientation and dimensions
    -> explicit reference roles and ordered view labels
    -> structured scene brief + measured facts + unknowns
    -> server constraint resolver / conflict check
    -> versioned task prompt compiler
    -> persisted job + credit reservation + provider/model selection
    -> Gemini image request(s), all required references included
    -> file checks + semantic QA + reviewable constraint failures
         +-> bounded retry/review using the same job identity
         +-> fail -> release/refund once
    -> store owned output assets + design version/provenance
    -> settle credits once -> moodboard / proposal / revision
```

Use different task templates for: budget concept boards, venue decoration, one-element placement, recoloring, decor reference sheets, alternate views and localized revisions. Build a separate video adapter if video is retained. Start with a shared service inside this application; a microservice split is not required to fix these contracts.

Proposed request dimensions:

| Input | Required meaning |
|---|---|
| task + templateVersion | Explicit operation; no auto-mixing portraits with architecture |
| projectId + inputAssetIds | Ownership and stable source assets |
| reference role/view | Venue front/right/back/left/satellite, decor inspiration, layout mask, approved prior revision |
| ceremony + cultural preferences | User-selected and explicit, rather than inferred only from photographs |
| palette + style + time | Approved colors, materials, lighting and time-of-day intent |
| budgetTier + scope | A real per-output brief; estimates require catalog/quantity assumptions |
| geometry locks | Boundaries, facade, doors, columns, exits, fixed structures |
| camera/edit scope | Preserve camera or request a new view; preserve everything outside a selected region |
| placement + dimensions | Region/object ID, coordinates, measured dimensions or clearly marked unknowns |
| output plan | Explicit required shots, categories, aspect ratio and number of assets |
| operationId + priorVersion | Idempotency, editing ancestry and billing correlation |

Priority: validated site facts/constraints -> approved reference/design decisions -> task-specific styling -> free-text embellishment. Conflicts should produce a reviewable error or a revised brief. A user asking for a new wall must not silently override a venue-preservation task.

Constraint enforcement has two levels: server-side checks can enforce enum values, input ownership, image count, provider selection and billing; preservation/realism in generated pixels needs output evaluation and sometimes human review. A prompt alone cannot make those guarantees.

For the PDF's DWG/production-plan requirement, establish a measured coordinate model, scale, element footprints and editable layout objects, then use a deterministic drawing/export pipeline. A generated isometric image is useful concept art, but is not sufficient evidence for measured construction geometry. This is an engineering boundary inferred from the required deliverable, not a claim that Gemini is a CAD engine.

Google documents multi-reference composition and conversational edits, which support the visualization portion. The repository's hardcoded preview model names and Generate Content payloads should be revalidated for the chosen account, current API and model before implementation. No paid availability test was made. [Official Gemini image generation documentation](https://ai.google.dev/gemini-api/docs/image-generation).

Minimum evaluation set for the prompt phase: venue+decor reference retained together; structural landmarks preserved; one-element edits preserve unrelated objects; cultural/palette constraints respected; genuinely distinct budget briefs; stable object identity across requested views; unsupported views clearly marked as inferred; refusals/empty outputs/provider failures cause one financial settlement; PNG/WebP input handled; prompt-injection text in references cannot alter server policies.

## 7. Build, deployment and test condition

Verified in this checkout:

| Check | Result / limit |
|---|---|
| Backend JS syntax | All 56 files pass `node --check`; does not establish runtime correctness |
| Frontend relative import resolution | No unresolved local relative imports in JS/JSX were found; not a JSX compilation or bundle check |
| Package/lock dependency declarations | Root dependency declarations match their lockfiles |
| Frontend `npm run build` on Windows | Fails immediately: `'CI' is not recognized...` from `CI=false react-scripts build` |
| Installed dependencies | Neither frontend nor backend has `node_modules`; runtime, JSX compilation and functional tests remain unverified |
| Backend test harness | No `test` script; diagnostic DB/import/token scripts are not a product test suite |
| Frontend test | Original "learn react" scaffold assertion remains; no meaningful journey coverage found |
| Live npm backend lockfile audit | 29 affected package entries: 2 critical, 15 high, 11 moderate, 1 low |
| Live npm frontend lockfile audit | 102 affected package entries: 3 critical, 82 high, 13 moderate, 4 low |
| Paid integrations / external linked apps | Not exercised |

Audit counts include transitive and tooling dependencies and are not counts of independently exploitable production defects. The frontend manifest places the build tooling in `dependencies`, so npm's prod/dev classification is not a runtime reachability assessment. Triage actual dependency paths; do not apply `npm audit fix --force` indiscriminately.

Additional configuration defects:

- Compose repeats the backend `environment` mapping. A strict loader may reject it; a permissive loader may discard the first block. This makes deployment configuration unreliable.
- Backend Dockerfile uses Node 18; locked Mongoose 9.6.3 and MongoDB 7.2.0 declare Node >=20.19.0. The Azure workflow instead uses Node 22.
- Nginx `location /api/` uses `proxy_pass http://backend:5000/`, stripping `/api/` even though backend routes expect that prefix. It also lacks explicit Socket.IO and `/uploads` proxy locations for that topology.
- Backend defaults to 5000 and can move ports; frontend defaults to 5001 and probes multiple ports. `/health` returns 200 without checking database readiness or AI module availability.
- In development the database layer can start an ephemeral MongoDB or continue without a connection. That is useful for experiments but must be explicit so test data is not mistaken for persistent data.
- AI router import failures are logged and startup continues, so server health alone does not show that generation routes loaded.
- AWS documentation/scripts, Azure CI, Vercel routing and Compose describe different deployment approaches. Choose and test one intended deployment topology.
- `.env.production.example` only documents a small subset of required configuration. Compose does not supply a coherent Gemini/Groq/Razorpay/Resend/Firebase setup.
- Ordinary JSON body limit is 50 MB; Nginx has no matching explicit upload limit. Public image/disk paths, asset retention and backup/restore are not designed as one system.
- Retexture and angle outputs can expire in an in-process cache after an hour or on restart. Persisted moodboards/proposals must not point at ephemeral results.
- Legacy Lemon controller/routes exist but the router is not mounted. It should not be counted as working billing just because startup text advertises it.
- Azure CI runs backend build/test with `--if-present`, allowing those checks to be skipped entirely. There is no demonstrated frontend or journey gate in that workflow.

The Firebase browser configuration is public client configuration, not by itself a privileged server secret. The confirmed dangerous credential issue is startup admin seeding. No claim is made that all historical secrets have been cleared; a separate redacted Git-history/owner-account review is still needed.

## 8. Recovery sequence

1. **Contain security and financial defects.** Remove production debug grants and fixed admin seeding; narrow public projections; secure socket joins and asset proxies; stop replayable fulfillment. Verify deployed account/config state with owner access.
2. **Establish a reproducible local baseline.** Pick supported Node, fix Windows build command and Compose/Nginx configuration, document env variables, install from lockfiles and resolve dependency advisories. Add startup readiness and real CI gates.
3. **Complete one wedding journey.** Couple signup -> profile -> generate -> persist -> cart -> market request -> planner proposal -> accept -> chat. Fix the cart contract and quote debit, remove maintenance only after verifying it, and replace sample fallbacks with honest states. Reconcile `Quote`/`Bid` and user identity fields using actual data before migration.
4. **Unify commercial state.** Single catalog, explicit product wallets, durable payment orders, unique fulfillment, atomic ledger/balance changes, correct subscription lifecycle, and exactly-once refund settlement. Test retry, concurrency and partial failure.
5. **Build the Gemini prompt/constraint foundation.** Task schemas, multi-reference roles, versioned templates, durable jobs/assets, output QA and a small evaluation set. Align the budget-tier output plan with PDF page 6 first.
6. **Implement the missing product systems in order.** Vendor availability/inventory/requests and conversational matching; then multi-view venue/decor workspace and placement; then measured drawing export. Scope RSVP with owners before building it.

Suggested acceptance gates: no known critical security issue exposed; clean supported-runtime builds; one real-data end-to-end wedding journey; catalog equals checkout; duplicate payment/webhook cannot duplicate entitlement; generated assets survive restart; failed jobs settle credits once; private media cannot cross users; AI outputs meet task-specific evaluations.

## 9. Decisions still needed from owners, after the baseline

- Which deployment and database contain the current source of truth, and what data must be preserved?
- Are the seven linked AI apps part of this product, and can their source and authentication contracts be reviewed?
- What are the actual prices, wallet products, subscription durations, included generations and refund rules?
- What do low/medium/high budgets include, and what catalog/quantity data supports estimates?
- Does multi-view mean approximate visualization, consistent scene editing, or an actual editable 3D deliverable?
- What accuracy, measurement source, formats and sign-off apply to DWG and production drawings?
- What constitutes vendor approval, availability, booking and completed work?
- What should RSVP cover beyond the PDF heading?

These questions do not block the repository map. They become necessary before committing the corresponding product and commercial behavior.
