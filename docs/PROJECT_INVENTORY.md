# LoversAI source and route inventory

Snapshot: 18 October 2026, Git HEAD `7d7e5e1`. Companion to [docs/PROJECT_AUDIT.md](C:/Users/Neksi/Desktop/LoversAi/docs/PROJECT_AUDIT.md).

This is a static inventory, not a runtime guarantee. Only explicit route declarations are listed; nested auth and environment guards must be read in source. No credential values are included.

## Frontend route declarations

| URL | Element | Source |
|---|---|---|
| `/` | `Dashboard` | [frontend/src/App.jsx:137](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:137) |
| `/login` | `Login` | [frontend/src/App.jsx:138](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:138) |
| `/signup` | `Signup` | [frontend/src/App.jsx:139](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:139) |
| `/verify-email` | `VerifyEmail` | [frontend/src/App.jsx:140](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:140) |
| `/terms-and-conditions` | `TermsAndConditions` | [frontend/src/App.jsx:141](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:141) |
| `/privacy` | `PrivacyPolicy` | [frontend/src/App.jsx:142](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:142) |
| `/ourstory` | `OurStory` | [frontend/src/App.jsx:143](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:143) |
| `/planner/signup` | `PlannerSignup` | [frontend/src/App.jsx:144](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:144) |
| `/planner/onboarding` | `PlannerOnboarding` | [frontend/src/App.jsx:145](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:145) |
| `/user-form` | `UserForm` | [frontend/src/App.jsx:155](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:155) |
| `/profile` | `Profile` | [frontend/src/App.jsx:165](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:165) |
| `/planner-ai-tools` | `PlannerAITools` | [frontend/src/App.jsx:175](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:175) |
| `/pricing` | `PricingPage` | [frontend/src/App.jsx:181](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:181) |
| `/admin` | `AdminDashboard` | [frontend/src/App.jsx:200](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:200) |
| `/admin/users` | `AdminUsers` | [frontend/src/App.jsx:201](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:201) |
| `/admin/analytics` | `AdminDashboard` | [frontend/src/App.jsx:202](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:202) |
| `/admin/ai-logs` | `AdminAILogs` | [frontend/src/App.jsx:203](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:203) |
| `/admin/subscriptions` | `AdminSubscriptions` | [frontend/src/App.jsx:204](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:204) |
| `/planner` | `Planner` | [frontend/src/App.jsx:208](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:208) |
| `/vendor` | `Vendor` | [frontend/src/App.jsx:209](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:209) |
| `/planner/dashboard` | `PlannerDashboardPage` | [frontend/src/App.jsx:217](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:217) |
| `/planner/bids` | `PlannerBids` | [frontend/src/App.jsx:218](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:218) |
| `/planner/quotes` | `PlannerQuotes` | [frontend/src/App.jsx:219](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:219) |
| `/planner/messages` | `PlannerMessages` | [frontend/src/App.jsx:220](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:220) |
| `/planner/deals` | `PlannerDeals` | [frontend/src/App.jsx:221](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:221) |
| `/vendor-ai` | `VendorAIHub` | [frontend/src/App.jsx:222](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:222) |
| `/vendor-ai/venue-options` | `PlannerVenueOptions` | [frontend/src/App.jsx:223](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:223) |
| `/vendor-ai/venue` | `PlannerVenueAI` | [frontend/src/App.jsx:224](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:224) |
| `/vendor-ai/taj` | `PlannerTajAI` | [frontend/src/App.jsx:225](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:225) |
| `/vendor-ai/itc-mughal` | `PlannerItcMughalAI` | [frontend/src/App.jsx:226](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:226) |
| `/vendor-ai/jaypee` | `PlannerJaypeeAI` | [frontend/src/App.jsx:227](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:227) |
| `/vendor-ai/base-venue` | `PlannerBaseVenueAI` | [frontend/src/App.jsx:228](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:228) |
| `/vendor-ai/decor` | `PlannerDecorAI` | [frontend/src/App.jsx:229](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:229) |
| `/vendor-ai/catering` | `PlannerCateringAI` | [frontend/src/App.jsx:230](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:230) |
| `/planner/vendors` | `PlannerVendors` | [frontend/src/App.jsx:231](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:231) |
| `/planner/profile` | `PlannerProfile` | [frontend/src/App.jsx:232](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:232) |
| `/planner/library` | `PlannerLibrary` | [frontend/src/App.jsx:233](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:233) |
| `/planner/build-quote/:bidId` | `PlannerBuildQuote` | [frontend/src/App.jsx:234](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:234) |
| `/vendor/onboarding` | `VendorOnboarding` | [frontend/src/App.jsx:241](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:241) |
| `/vendor/dashboard` | `VendorDashboard` | [frontend/src/App.jsx:256](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:256) |
| `/vendor/inventory` | `VendorInventory` | [frontend/src/App.jsx:257](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:257) |
| `/vendor/requests` | `VendorRequests` | [frontend/src/App.jsx:258](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:258) |
| `/vendor/portfolio` | `VendorPortfolio` | [frontend/src/App.jsx:259](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:259) |
| `/vendor/earnings` | `VendorEarnings` | [frontend/src/App.jsx:260](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:260) |
| `/vendor/messages` | `VendorMessages` | [frontend/src/App.jsx:261](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:261) |
| `/vendor/profile` | `VendorProfile` | [frontend/src/App.jsx:262](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:262) |
| `/couples` | `CoupleHome` | [frontend/src/App.jsx:266](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:266) |
| `/couple/profile` | `CoupleProfile` | [frontend/src/App.jsx:267](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:267) |
| `/couple/onboarding` | `CoupleProfileForm` | [frontend/src/App.jsx:275](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:275) |
| `/couple/cart` | `WeddingCart` | [frontend/src/App.jsx:284](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:284) |
| `/couple/bid-placed` | `CoupleBidPlaced` | [frontend/src/App.jsx:292](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:292) |
| `/couple/bid-dashboard/:id` | `CoupleBidProgress` | [frontend/src/App.jsx:300](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:300) |
| `/couple/quote/:id` | `CoupleBidProgress` | [frontend/src/App.jsx:308](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:308) |
| `/love-story` | `CoupleWeddingVision` | [frontend/src/App.jsx:316](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:316) |
| `/couple/studio` | `CoupleWeddingVision` | [frontend/src/App.jsx:324](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:324) |
| `/couple/wedding-vision` | `CoupleWeddingVision` | [frontend/src/App.jsx:332](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:332) |
| `/couple/moodboard` | `CoupleThemeMoodboard` | [frontend/src/App.jsx:340](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:340) |
| `/couple/moodboard/:theme` | `CoupleThemeMoodboard` | [frontend/src/App.jsx:348](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:348) |
| `/couple/moodboard/create` | `CoupleMoodboard` | [frontend/src/App.jsx:356](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:356) |
| `/planner/profile/:id` | `PublicPlannerProfile` | [frontend/src/App.jsx:364](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx:364) |

Role guards are attached to individual routes or enclosing pathless layout routes. `/planner-ai-tools` has internal UI access behavior rather than an enclosing planner ProtectedRoute. No wildcard fallback is declared.

## Backend endpoint declarations

Prefixes below follow server.js registrations. Legacy/unmounted router files are explicitly marked. The four AI routers load dynamically; import failure is logged and does not necessarily stop startup.

### backend/server.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/vendors/public` | [backend/server.js:466](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:466) |
| GET | `/` | [backend/server.js:508](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:508) |
| GET | `/health` | [backend/server.js:536](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:536) |
| GET | `/api/ai/health` | [backend/server.js:545](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:545) |
| GET | `/api/test` | [backend/server.js:589](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:589) |
| GET | `/api/ai/themes` | [backend/server.js:601](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:601) |
| GET | `/api/debug/routes` | [backend/server.js:654](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:654) |
| GET | `/api/test-ai-config` | [backend/server.js:692](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:692) |
| POST | `/api/ai/generate-test` | [backend/server.js:716](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:716) |

### backend/routes/auth.js (unmounted legacy router)

| Method | URL / router-local path | Source |
|---|---|---|
| POST | `/firebase-login` | [backend/routes/auth.js:12](C:/Users/Neksi/Desktop/LoversAi/backend/routes/auth.js:12) |

### backend/routes/authRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| POST | `/api/auth/register` | [backend/routes/authRoutes.js:26](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:26) |
| POST | `/api/auth/login` | [backend/routes/authRoutes.js:145](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:145) |
| POST | `/api/auth/google` | [backend/routes/authRoutes.js:232](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:232) |
| POST | `/api/auth/verify-email` | [backend/routes/authRoutes.js:386](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:386) |
| POST | `/api/auth/resend-otp` | [backend/routes/authRoutes.js:451](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:451) |
| POST | `/api/auth/complete-profile` | [backend/routes/authRoutes.js:501](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:501) |
| GET | `/api/auth/me` | [backend/routes/authRoutes.js:532](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:532) |
| POST | `/api/auth/firebase-login` | [backend/routes/authRoutes.js:549](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:549) |

### backend/routes/bidRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| POST | `/api/bids/` | [backend/routes/bidRoutes.js:10](C:/Users/Neksi/Desktop/LoversAi/backend/routes/bidRoutes.js:10) |
| GET | `/api/bids/` | [backend/routes/bidRoutes.js:44](C:/Users/Neksi/Desktop/LoversAi/backend/routes/bidRoutes.js:44) |
| GET | `/api/bids/:id` | [backend/routes/bidRoutes.js:67](C:/Users/Neksi/Desktop/LoversAi/backend/routes/bidRoutes.js:67) |
| POST | `/api/bids/:id/quote` | [backend/routes/bidRoutes.js:92](C:/Users/Neksi/Desktop/LoversAi/backend/routes/bidRoutes.js:92) |
| PUT | `/api/bids/:id/accept` | [backend/routes/bidRoutes.js:140](C:/Users/Neksi/Desktop/LoversAi/backend/routes/bidRoutes.js:140) |

### backend/routes/cartRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/cart/` | [backend/routes/cartRoutes.js:10](C:/Users/Neksi/Desktop/LoversAi/backend/routes/cartRoutes.js:10) |
| POST | `/api/cart/add` | [backend/routes/cartRoutes.js:28](C:/Users/Neksi/Desktop/LoversAi/backend/routes/cartRoutes.js:28) |
| DELETE | `/api/cart/:itemId` | [backend/routes/cartRoutes.js:51](C:/Users/Neksi/Desktop/LoversAi/backend/routes/cartRoutes.js:51) |
| DELETE | `/api/cart/` | [backend/routes/cartRoutes.js:72](C:/Users/Neksi/Desktop/LoversAi/backend/routes/cartRoutes.js:72) |

### backend/routes/chatRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/chat/rooms` | [backend/routes/chatRoutes.js:15](C:/Users/Neksi/Desktop/LoversAi/backend/routes/chatRoutes.js:15) |
| POST | `/api/chat/rooms` | [backend/routes/chatRoutes.js:43](C:/Users/Neksi/Desktop/LoversAi/backend/routes/chatRoutes.js:43) |
| GET | `/api/chat/rooms/:roomId/messages` | [backend/routes/chatRoutes.js:198](C:/Users/Neksi/Desktop/LoversAi/backend/routes/chatRoutes.js:198) |
| POST | `/api/chat/rooms/:roomId/messages` | [backend/routes/chatRoutes.js:256](C:/Users/Neksi/Desktop/LoversAi/backend/routes/chatRoutes.js:256) |
| GET | `/api/chat/unread` | [backend/routes/chatRoutes.js:369](C:/Users/Neksi/Desktop/LoversAi/backend/routes/chatRoutes.js:369) |

### backend/routes/creditRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/credits/wallet` | [backend/routes/creditRoutes.js:11](C:/Users/Neksi/Desktop/LoversAi/backend/routes/creditRoutes.js:11) |
| GET | `/api/credits/history` | [backend/routes/creditRoutes.js:29](C:/Users/Neksi/Desktop/LoversAi/backend/routes/creditRoutes.js:29) |

### backend/routes/debugRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/debug/user-credits` | [backend/routes/debugRoutes.js:13](C:/Users/Neksi/Desktop/LoversAi/backend/routes/debugRoutes.js:13) |
| POST | `/api/debug/gift-credits` | [backend/routes/debugRoutes.js:50](C:/Users/Neksi/Desktop/LoversAi/backend/routes/debugRoutes.js:50) |
| POST | `/api/debug/initialize-welcome-credits` | [backend/routes/debugRoutes.js:100](C:/Users/Neksi/Desktop/LoversAi/backend/routes/debugRoutes.js:100) |

### backend/routes/lemonRoutes.js (unmounted legacy router)

| Method | URL / router-local path | Source |
|---|---|---|
| POST | `/webhook` | [backend/routes/lemonRoutes.js:11](C:/Users/Neksi/Desktop/LoversAi/backend/routes/lemonRoutes.js:11) |
| GET | `/test-webhook` | [backend/routes/lemonRoutes.js:20](C:/Users/Neksi/Desktop/LoversAi/backend/routes/lemonRoutes.js:20) |

### backend/routes/moodboardRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/moodboard/` | [backend/routes/moodboardRoutes.js:10](C:/Users/Neksi/Desktop/LoversAi/backend/routes/moodboardRoutes.js:10) |
| POST | `/api/moodboard/` | [backend/routes/moodboardRoutes.js:23](C:/Users/Neksi/Desktop/LoversAi/backend/routes/moodboardRoutes.js:23) |
| DELETE | `/api/moodboard/:boardId` | [backend/routes/moodboardRoutes.js:64](C:/Users/Neksi/Desktop/LoversAi/backend/routes/moodboardRoutes.js:64) |

### backend/routes/newUserRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| POST | `/api/newusers/` | [backend/routes/newUserRoutes.js:7](C:/Users/Neksi/Desktop/LoversAi/backend/routes/newUserRoutes.js:7) |

### backend/routes/paymentRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/payment/plans` | [backend/routes/paymentRoutes.js:59](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:59) |
| POST | `/api/payment/create-order` | [backend/routes/paymentRoutes.js:66](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:66) |
| POST | `/api/payment/verify` | [backend/routes/paymentRoutes.js:109](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:109) |
| POST | `/api/payment/library/create-order` | [backend/routes/paymentRoutes.js:188](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:188) |
| POST | `/api/payment/library/verify` | [backend/routes/paymentRoutes.js:229](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:229) |
| POST | `/api/payment/webhook` | [backend/routes/paymentRoutes.js:392](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:392) |
| GET | `/api/payment/credits` | [backend/routes/paymentRoutes.js:460](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:460) |
| GET | `/api/payment/transactions` | [backend/routes/paymentRoutes.js:476](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:476) |
| GET | `/api/payment/payment-status` | [backend/routes/paymentRoutes.js:495](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:495) |
| GET | `/api/payment/payment-history` | [backend/routes/paymentRoutes.js:514](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:514) |

### backend/routes/profileRoutes.js (unmounted legacy router)

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/check-profile` | [backend/routes/profileRoutes.js:14](C:/Users/Neksi/Desktop/LoversAi/backend/routes/profileRoutes.js:14) |
| POST | `/save-form` | [backend/routes/profileRoutes.js:44](C:/Users/Neksi/Desktop/LoversAi/backend/routes/profileRoutes.js:44) |
| GET | `/me` | [backend/routes/profileRoutes.js:74](C:/Users/Neksi/Desktop/LoversAi/backend/routes/profileRoutes.js:74) |
| GET | `/profile` | [backend/routes/profileRoutes.js:95](C:/Users/Neksi/Desktop/LoversAi/backend/routes/profileRoutes.js:95) |

### backend/routes/quoteRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| POST | `/api/quotes/` | [backend/routes/quoteRoutes.js:103](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:103) |
| GET | `/api/quotes/my` | [backend/routes/quoteRoutes.js:174](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:174) |
| GET | `/api/quotes/available` | [backend/routes/quoteRoutes.js:192](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:192) |
| GET | `/api/quotes/my-sent` | [backend/routes/quoteRoutes.js:214](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:214) |
| GET | `/api/quotes/my-deals` | [backend/routes/quoteRoutes.js:229](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:229) |
| GET | `/api/quotes/:id` | [backend/routes/quoteRoutes.js:245](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:245) |
| PATCH | `/api/quotes/:id/respond` | [backend/routes/quoteRoutes.js:292](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:292) |
| PATCH | `/api/quotes/:id/accept` | [backend/routes/quoteRoutes.js:413](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:413) |
| PATCH | `/api/quotes/:id/reject` | [backend/routes/quoteRoutes.js:498](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:498) |

### backend/routes/uploadRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| POST | `/api/upload/image` | [backend/routes/uploadRoutes.js:38](C:/Users/Neksi/Desktop/LoversAi/backend/routes/uploadRoutes.js:38) |
| POST | `/api/upload/images` | [backend/routes/uploadRoutes.js:66](C:/Users/Neksi/Desktop/LoversAi/backend/routes/uploadRoutes.js:66) |
| POST | `/api/upload/video` | [backend/routes/uploadRoutes.js:92](C:/Users/Neksi/Desktop/LoversAi/backend/routes/uploadRoutes.js:92) |
| POST | `/api/upload/file` | [backend/routes/uploadRoutes.js:112](C:/Users/Neksi/Desktop/LoversAi/backend/routes/uploadRoutes.js:112) |
| POST | `/api/upload/videos` | [backend/routes/uploadRoutes.js:138](C:/Users/Neksi/Desktop/LoversAi/backend/routes/uploadRoutes.js:138) |

### backend/routes/userRoutes.js (unmounted legacy router)

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/check-profile` | [backend/routes/userRoutes.js:12](C:/Users/Neksi/Desktop/LoversAi/backend/routes/userRoutes.js:12) |
| POST | `/save-form` | [backend/routes/userRoutes.js:43](C:/Users/Neksi/Desktop/LoversAi/backend/routes/userRoutes.js:43) |
| POST | `/save-wedding-profile` | [backend/routes/userRoutes.js:97](C:/Users/Neksi/Desktop/LoversAi/backend/routes/userRoutes.js:97) |
| GET | `/profile` | [backend/routes/userRoutes.js:160](C:/Users/Neksi/Desktop/LoversAi/backend/routes/userRoutes.js:160) |
| PUT | `/update-credits` | [backend/routes/userRoutes.js:204](C:/Users/Neksi/Desktop/LoversAi/backend/routes/userRoutes.js:204) |
| GET | `/stats` | [backend/routes/userRoutes.js:259](C:/Users/Neksi/Desktop/LoversAi/backend/routes/userRoutes.js:259) |

### backend/routes/users.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/users/check-profile` | [backend/routes/users.js:11](C:/Users/Neksi/Desktop/LoversAi/backend/routes/users.js:11) |
| POST | `/api/users/save-form` | [backend/routes/users.js:42](C:/Users/Neksi/Desktop/LoversAi/backend/routes/users.js:42) |
| POST | `/api/users/save-wedding-profile` | [backend/routes/users.js:96](C:/Users/Neksi/Desktop/LoversAi/backend/routes/users.js:96) |
| GET | `/api/users/profile` | [backend/routes/users.js:158](C:/Users/Neksi/Desktop/LoversAi/backend/routes/users.js:158) |
| PUT | `/api/users/update-credits` | [backend/routes/users.js:202](C:/Users/Neksi/Desktop/LoversAi/backend/routes/users.js:202) |
| GET | `/api/users/stats` | [backend/routes/users.js:257](C:/Users/Neksi/Desktop/LoversAi/backend/routes/users.js:257) |

### backend/routes/vendorRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/vendor/dashboard` | [backend/routes/vendorRoutes.js:16](C:/Users/Neksi/Desktop/LoversAi/backend/routes/vendorRoutes.js:16) |
| GET | `/api/vendor/profile` | [backend/routes/vendorRoutes.js:204](C:/Users/Neksi/Desktop/LoversAi/backend/routes/vendorRoutes.js:204) |
| POST | `/api/vendor/profile` | [backend/routes/vendorRoutes.js:231](C:/Users/Neksi/Desktop/LoversAi/backend/routes/vendorRoutes.js:231) |
| GET | `/api/vendor/portfolio` | [backend/routes/vendorRoutes.js:283](C:/Users/Neksi/Desktop/LoversAi/backend/routes/vendorRoutes.js:283) |
| POST | `/api/vendor/portfolio` | [backend/routes/vendorRoutes.js:299](C:/Users/Neksi/Desktop/LoversAi/backend/routes/vendorRoutes.js:299) |
| DELETE | `/api/vendor/portfolio/:itemId` | [backend/routes/vendorRoutes.js:337](C:/Users/Neksi/Desktop/LoversAi/backend/routes/vendorRoutes.js:337) |
| GET | `/api/vendor/earnings` | [backend/routes/vendorRoutes.js:362](C:/Users/Neksi/Desktop/LoversAi/backend/routes/vendorRoutes.js:362) |

### backend/admin/adminRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/admin/me` | [backend/admin/adminRoutes.js:25](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:25) |
| GET | `/api/admin/stats` | [backend/admin/adminRoutes.js:26](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:26) |
| GET | `/api/admin/users` | [backend/admin/adminRoutes.js:27](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:27) |
| GET | `/api/admin/ai-logs` | [backend/admin/adminRoutes.js:28](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:28) |
| GET | `/api/admin/razorpay-ledger` | [backend/admin/adminRoutes.js:29](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:29) |
| GET | `/api/admin/users/:id` | [backend/admin/adminRoutes.js:30](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:30) |
| PATCH | `/api/admin/users/:id` | [backend/admin/adminRoutes.js:31](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:31) |
| DELETE | `/api/admin/users/:id` | [backend/admin/adminRoutes.js:32](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:32) |
| POST | `/api/admin/users/:id/block` | [backend/admin/adminRoutes.js:33](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:33) |
| POST | `/api/admin/users/:id/unblock` | [backend/admin/adminRoutes.js:34](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:34) |
| POST | `/api/admin/users/:id/credits` | [backend/admin/adminRoutes.js:35](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:35) |
| POST | `/api/admin/vendors/:id/verify` | [backend/admin/adminRoutes.js:36](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:36) |
| POST | `/api/admin/vendors/:id/reject` | [backend/admin/adminRoutes.js:37](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js:37) |

### backend/admin/plannerAdminRoutes.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/admin/planner/users` | [backend/admin/plannerAdminRoutes.js:17](C:/Users/Neksi/Desktop/LoversAi/backend/admin/plannerAdminRoutes.js:17) |
| GET | `/api/admin/planner/users/:id` | [backend/admin/plannerAdminRoutes.js:18](C:/Users/Neksi/Desktop/LoversAi/backend/admin/plannerAdminRoutes.js:18) |
| POST | `/api/admin/planner/users/:id/subscription` | [backend/admin/plannerAdminRoutes.js:19](C:/Users/Neksi/Desktop/LoversAi/backend/admin/plannerAdminRoutes.js:19) |
| PUT | `/api/admin/planner/users/:id/subscription` | [backend/admin/plannerAdminRoutes.js:20](C:/Users/Neksi/Desktop/LoversAi/backend/admin/plannerAdminRoutes.js:20) |
| POST | `/api/admin/planner/users/:id/credits` | [backend/admin/plannerAdminRoutes.js:21](C:/Users/Neksi/Desktop/LoversAi/backend/admin/plannerAdminRoutes.js:21) |

### backend/planner/ai_tools/angle_image.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/ai/angle-cache/:cacheId` | [backend/planner/ai_tools/angle_image.js:455](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:455) |
| POST | `/api/ai/change-angle` | [backend/planner/ai_tools/angle_image.js:482](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:482) |
| GET | `/api/ai/available-angles` | [backend/planner/ai_tools/angle_image.js:612](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:612) |

### backend/planner/ai_tools/couple_moodboard.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/ai/couple-moodboard/health` | [backend/planner/ai_tools/couple_moodboard.js:1382](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:1382) |
| POST | `/api/ai/couple-moodboard/generate` | [backend/planner/ai_tools/couple_moodboard.js:1404](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:1404) |
| POST | `/api/ai/couple-moodboard/edit-image` | [backend/planner/ai_tools/couple_moodboard.js:1737](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:1737) |
| POST | `/api/ai/couple-moodboard/download-image` | [backend/planner/ai_tools/couple_moodboard.js:1857](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:1857) |

### backend/planner/ai_tools/image_to_video.js

| Method | URL / router-local path | Source |
|---|---|---|
| POST | `/api/ai/generate-video` | [backend/planner/ai_tools/image_to_video.js:217](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/image_to_video.js:217) |
| GET | `/api/ai/video-styles` | [backend/planner/ai_tools/image_to_video.js:329](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/image_to_video.js:329) |

### backend/planner/ai_tools/retexturing.js

| Method | URL / router-local path | Source |
|---|---|---|
| GET | `/api/ai/cache/:cacheId` | [backend/planner/ai_tools/retexturing.js:476](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:476) |
| GET | `/api/ai/health` | [backend/planner/ai_tools/retexturing.js:497](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:497) |
| GET | `/api/ai/themes` | [backend/planner/ai_tools/retexturing.js:531](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:531) |
| POST | `/api/ai/check-credits` | [backend/planner/ai_tools/retexturing.js:553](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:553) |
| POST | `/api/ai/generate` | [backend/planner/ai_tools/retexturing.js:647](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:647) |
| POST | `/api/ai/feedback` | [backend/planner/ai_tools/retexturing.js:890](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:890) |
| POST | `/api/ai/download-image` | [backend/planner/ai_tools/retexturing.js:927](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:927) |

Notes: server-level AI health/themes declarations are later fallbacks and can be shadowed by the earlier retexturing router. Some server debug/test declarations are development-only; the separate `/api/debug` router is mounted unconditionally. Lemon routes are not mounted even though server startup text advertises them.

## Data models

| Model | Responsibility | Source |
|---|---|---|
| User | Identity, roles, embedded couple/vendor profiles, legacy credit cache and payment flags | [backend/models/User.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/User.js) |
| PlannerUser | Planner authentication activity mirror, not the main planner identity | [backend/models/PlannerUser.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/PlannerUser.js) |
| Wallet | Balance buckets per user and product; unique user/product index | [backend/models/Wallet.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Wallet.js) |
| CreditTransaction | Credit/debit/refund ledger; reference index is not unique | [backend/models/CreditTransaction.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/CreditTransaction.js) |
| Subscription | Separate entitlement/payment lifecycle record, with Lemon-era fields | [backend/models/Subscription.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Subscription.js) |
| Quote | Main couple wedding request, images, embedded planner proposals and hire state | [backend/models/Quote.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Quote.js) |
| Bid | Second independent request/proposal/hiring model | [backend/models/Bid.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Bid.js) |
| Cart | One server cart per user, selected wedding images | [backend/models/Cart.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Cart.js) |
| Moodboard | Per-user board identifiers, themes, image URLs, edit metadata | [backend/models/Moodboard.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Moodboard.js) |
| ChatRoom | Participants, related quote/bid, last message and active state | [backend/models/ChatRoom.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/ChatRoom.js) |
| Message | Sender, room, text/attachment, read receipts | [backend/models/Message.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Message.js) |
| AdminAuditLog | Planner admin grant/modification audit records | [backend/models/AdminAuditLog.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/AdminAuditLog.js) |
| NewUser | Separate phone capture and submission tracking | [backend/models/NewUser.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/NewUser.js) |

## External AI app handoffs

These are navigation links found in local source. Their availability, internal code, data ownership and authentication have not been tested.

| Local guide | Destination |
|---|---|
| [frontend/src/pages/planner/PlannerBaseVenueAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerBaseVenueAI.jsx) | [https://venue-ai-liart.vercel.app/](https://venue-ai-liart.vercel.app/) |
| [frontend/src/pages/planner/PlannerCateringAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerCateringAI.jsx) | [https://catering-ai.vercel.app/](https://catering-ai.vercel.app/) |
| [frontend/src/pages/planner/PlannerDecorAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerDecorAI.jsx) | [https://wedding-studio2.vercel.app/](https://wedding-studio2.vercel.app/) |
| [frontend/src/pages/planner/PlannerItcMughalAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerItcMughalAI.jsx) | [https://itc-mughal-x-lovers-ai.vercel.app/](https://itc-mughal-x-lovers-ai.vercel.app/) |
| [frontend/src/pages/planner/PlannerJaypeeAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerJaypeeAI.jsx) | [https://jaypee-palace-x-lovers-ai.vercel.app/](https://jaypee-palace-x-lovers-ai.vercel.app/) |
| [frontend/src/pages/planner/PlannerTajAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerTajAI.jsx) | [https://taj-x-lovers-ai.vercel.app/](https://taj-x-lovers-ai.vercel.app/) |
| [frontend/src/pages/planner/PlannerVenueAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerVenueAI.jsx) | [https://fairmont-x-loversai.vercel.app/](https://fairmont-x-loversai.vercel.app/) |

## Environment variable references

Names extracted from source and deployment files. They are not all mandatory: many are legacy aliases, optional overrides or development flags. The production example is incomplete. No values were extracted.

| Variable | References |
|---|---|
| `ADMIN_EMAILS` | [backend/admin/adminMiddleware.js:9](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminMiddleware.js:9) |
| `ANGLE_GEMINI_IMAGE_MODEL` | [backend/planner/ai_tools/angle_image.js:28](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:28) |
| `BFL_API_KEY` | [docker-compose.yml:34](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:34), [backend/server.js:75](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:75), [backend/planner/ai_tools/couple_moodboard.js:43](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:43), [backend/planner/ai_tools/image_to_video.js:22](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/image_to_video.js:22) (additional references) |
| `CLOUDINARY_API_KEY` | [docker-compose.yml:23](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:23), [backend/utils/cloudinary.js:21](C:/Users/Neksi/Desktop/LoversAi/backend/utils/cloudinary.js:21) |
| `CLOUDINARY_API_SECRET` | [docker-compose.yml:24](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:24), [backend/utils/cloudinary.js:22](C:/Users/Neksi/Desktop/LoversAi/backend/utils/cloudinary.js:22) |
| `CLOUDINARY_NAME` | [docker-compose.yml:22](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:22), [backend/routes/chatRoutes.js:298](C:/Users/Neksi/Desktop/LoversAi/backend/routes/chatRoutes.js:298), [backend/utils/cloudinary.js:20](C:/Users/Neksi/Desktop/LoversAi/backend/utils/cloudinary.js:20) |
| `DATABASE_URL` | [backend/config/db.js:5](C:/Users/Neksi/Desktop/LoversAi/backend/config/db.js:5) |
| `ENABLE_CREDIT_SYSTEM` | [backend/planner/ai_tools/retexturing.js:498](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:498) |
| `ENABLE_DEMO_RESPONSES` | [backend/routes/quoteRoutes.js:142](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:142) |
| `FIREBASE_API_KEY` | [docker-compose.yml:13](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:13) |
| `FIREBASE_APP_ID` | [docker-compose.yml:18](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:18) |
| `FIREBASE_AUTH_DOMAIN` | [docker-compose.yml:14](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:14) |
| `FIREBASE_CLIENT_EMAIL` | [backend/firebaseAdmin.js:26](C:/Users/Neksi/Desktop/LoversAi/backend/firebaseAdmin.js:26) |
| `FIREBASE_MESSAGING_SENDER_ID` | [docker-compose.yml:17](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:17) |
| `FIREBASE_PRIVATE_KEY` | [backend/firebaseAdmin.js:26](C:/Users/Neksi/Desktop/LoversAi/backend/firebaseAdmin.js:26) |
| `FIREBASE_PROJECT_ID` | [docker-compose.yml:15](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:15), [backend/firebaseAdmin.js:26](C:/Users/Neksi/Desktop/LoversAi/backend/firebaseAdmin.js:26) |
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | [backend/firebaseAdmin.js:12](C:/Users/Neksi/Desktop/LoversAi/backend/firebaseAdmin.js:12) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | [backend/firebaseAdmin.js:18](C:/Users/Neksi/Desktop/LoversAi/backend/firebaseAdmin.js:18) |
| `FIREBASE_STORAGE_BUCKET` | [docker-compose.yml:16](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:16) |
| `FLUX_API_BASE_URL` | [backend/server.js:709](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:709), [backend/planner/ai_tools/couple_moodboard.js:884](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:884), [backend/planner/ai_tools/image_to_video.js:88](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/image_to_video.js:88), [backend/planner/ai_tools/retexturing.js:185](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:185) |
| `FROM_EMAIL` | [backend/routes/paymentRoutes.js:321](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:321), [backend/utils/emailService.js:7](C:/Users/Neksi/Desktop/LoversAi/backend/utils/emailService.js:7) |
| `FRONTEND_URL` | [docker-compose.yml:19](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:19), [backend/server.js:138](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:138) |
| `GEMINI_API_BASE_URL` | [backend/planner/ai_tools/angle_image.js:25](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:25), [backend/planner/ai_tools/couple_moodboard.js:27](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:27), [backend/planner/ai_tools/retexturing.js:18](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:18) |
| `GEMINI_API_KEY` | [backend/server.js:73](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:73), [backend/planner/ai_tools/angle_image.js:148](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:148), [backend/planner/ai_tools/couple_moodboard.js:41](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:41), [backend/planner/ai_tools/image_to_video.js:20](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/image_to_video.js:20) (additional references) |
| `GEMINI_IMAGE_MODEL` | [backend/planner/ai_tools/angle_image.js:29](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:29), [backend/planner/ai_tools/couple_moodboard.js:30](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:30), [backend/planner/ai_tools/retexturing.js:21](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:21) |
| `GENERATED_ANGLE_IMAGE_CACHE_PREFIX` | [backend/planner/ai_tools/angle_image.js:449](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:449) |
| `GENERATED_IMAGE_CACHE_PREFIX` | [backend/planner/ai_tools/retexturing.js:641](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:641) |
| `GENERATED_IMAGE_CACHE_TTL_MS` | [backend/planner/ai_tools/angle_image.js:22](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:22), [backend/planner/ai_tools/retexturing.js:30](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:30) |
| `GOOGLE_CLIENT_ID` | [backend/routes/authRoutes.js:17](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:17) |
| `GOOGLE_OAUTH_CLIENT_ID` | [backend/routes/authRoutes.js:18](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:18) |
| `GOOGLE_WEB_CLIENT_ID` | [backend/routes/authRoutes.js:19](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:19) |
| `GREEN` | [production-deploy.sh:22](C:/Users/Neksi/Desktop/LoversAi/production-deploy.sh:22) |
| `GROQ_API_KEY` | [backend/planner/ai_tools/couple_moodboard.js:50](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:50) |
| `GROQ_VISION_MODEL` | [backend/planner/ai_tools/couple_moodboard.js:21](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:21) |
| `HERO_HEIGHT` | [frontend/src/components/couple/ScrollShowcase.jsx:318](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/couple/ScrollShowcase.jsx:318) |
| `HERO_WIDTH` | [frontend/src/components/couple/ScrollShowcase.jsx:317](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/couple/ScrollShowcase.jsx:317) |
| `JWT_SECRET` | [docker-compose.yml:21](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:21), [backend/middleware/auth.js:7](C:/Users/Neksi/Desktop/LoversAi/backend/middleware/auth.js:7) |
| `LEGACY_FLUX_ENABLED` | [backend/server.js:75](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:75), [backend/planner/ai_tools/angle_image.js:19](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:19), [backend/planner/ai_tools/image_to_video.js:17](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/image_to_video.js:17) |
| `LEMON_API_KEY` | [docker-compose.yml:20](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:20) |
| `LEMON_WEBHOOK_SECRET` | [docker-compose.yml:33](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:33), [backend/server.js:858](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:858), [backend/controllers/lemonSqueezyController.js:55](C:/Users/Neksi/Desktop/LoversAi/backend/controllers/lemonSqueezyController.js:55) |
| `MAX_FILE_SIZE` | [backend/server.js:710](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:710), [backend/planner/ai_tools/angle_image.js:40](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:40) |
| `MAX_POLL_ATTEMPTS` | [backend/planner/ai_tools/couple_moodboard.js:983](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:983), [backend/planner/ai_tools/retexturing.js:235](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:235) |
| `MONGODB_URI` | [docker-compose.yml:12](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:12) |
| `MONGO_URI` | [docker-compose.yml:32](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:32), [backend/server.js:46](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:46), [backend/test-db.js:5](C:/Users/Neksi/Desktop/LoversAi/backend/test-db.js:5), [backend/config/db.js:5](C:/Users/Neksi/Desktop/LoversAi/backend/config/db.js:5) (additional references) |
| `MOODBOARD_MAX_RETRIES` | [backend/planner/ai_tools/couple_moodboard.js:23](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:23) |
| `MOODBOARD_VALIDATION_ENABLED` | [backend/planner/ai_tools/couple_moodboard.js:25](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:25) |
| `NANNO_BANANA` | [backend/planner/ai_tools/couple_moodboard.js:39](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:39), [backend/planner/ai_tools/retexturing.js:35](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:35) |
| `NC` | [production-deploy.sh:18](C:/Users/Neksi/Desktop/LoversAi/production-deploy.sh:18) |
| `NODE_ENV` | [backend/server.js:38](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:38), [backend/config/db.js:9](C:/Users/Neksi/Desktop/LoversAi/backend/config/db.js:9), [backend/middleware/auth.js:9](C:/Users/Neksi/Desktop/LoversAi/backend/middleware/auth.js:9), [backend/routes/authRoutes.js:243](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:243) (additional references) |
| `POLL_INTERVAL` | [backend/planner/ai_tools/couple_moodboard.js:984](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js:984), [backend/planner/ai_tools/retexturing.js:236](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:236) |
| `PORT` | [backend/server.js:68](C:/Users/Neksi/Desktop/LoversAi/backend/server.js:68) |
| `QUOTE_COST` | [backend/routes/quoteRoutes.js:358](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js:358) |
| `RAZORPAY_KEY_ID` | [backend/routes/paymentRoutes.js:27](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:27) |
| `RAZORPAY_KEY_SECRET` | [backend/routes/paymentRoutes.js:27](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:27) |
| `RAZORPAY_WEBHOOK_SECRET` | [backend/routes/paymentRoutes.js:394](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:394) |
| `REACT_APP_ADMIN_EMAILS` | [frontend/src/components/Navbar.jsx:165](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/Navbar.jsx:165), [frontend/src/pages/planner/PlannerLibrary.jsx:359](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerLibrary.jsx:359) |
| `REACT_APP_API_BASE_URL` | [docker-compose.yml:40](C:/Users/Neksi/Desktop/LoversAi/docker-compose.yml:40), [frontend/src/api/api.js:4](C:/Users/Neksi/Desktop/LoversAi/frontend/src/api/api.js:4), [frontend/src/pages/Feature1.jsx:11](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Feature1.jsx:11) |
| `REACT_APP_RAZORPAY_KEY_ID` | [frontend/src/hooks/useCheckout.js:52](C:/Users/Neksi/Desktop/LoversAi/frontend/src/hooks/useCheckout.js:52) |
| `RED` | [production-deploy.sh:18](C:/Users/Neksi/Desktop/LoversAi/production-deploy.sh:18) |
| `REPLICATE_API_TOKEN` | [backend/planner/ai_tools/angle_image.js:17](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js:17), [backend/planner/ai_tools/retexturing.js:15](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js:15) |
| `RESEND_API_KEY` | [backend/routes/paymentRoutes.js:19](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js:19), [backend/utils/emailService.js:6](C:/Users/Neksi/Desktop/LoversAi/backend/utils/emailService.js:6) |
| `SIDE_HEIGHT` | [frontend/src/components/couple/ScrollShowcase.jsx:325](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/couple/ScrollShowcase.jsx:325) |
| `SIDE_LARGE_HEIGHT` | [frontend/src/components/couple/ScrollShowcase.jsx:334](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/couple/ScrollShowcase.jsx:334) |
| `SIDE_LARGE_WIDTH` | [frontend/src/components/couple/ScrollShowcase.jsx:333](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/couple/ScrollShowcase.jsx:333) |
| `SIDE_WIDTH` | [frontend/src/components/couple/ScrollShowcase.jsx:324](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/couple/ScrollShowcase.jsx:324) |
| `STORAGE_KEY` | [frontend/src/pages/couple/CoupleThemeMoodboard.jsx:222](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/CoupleThemeMoodboard.jsx:222) |
| `WELCOME_CREDITS` | [backend/controllers/authController.js:17](C:/Users/Neksi/Desktop/LoversAi/backend/controllers/authController.js:17), [backend/routes/auth.js:36](C:/Users/Neksi/Desktop/LoversAi/backend/routes/auth.js:36), [backend/routes/authRoutes.js:354](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js:354), [backend/utils/userUtils.js:22](C:/Users/Neksi/Desktop/LoversAi/backend/utils/userUtils.js:22) |
| `YELLOW` | [production-deploy.sh:27](C:/Users/Neksi/Desktop/LoversAi/production-deploy.sh:27) |

## Complete JS/JSX source manifest

Counts include comments and blank lines. This makes large coupled modules visible; it is not a quality score. CSS, public assets, lockfiles, logs and generated PDF review images are not included in this source list.

| File | Lines |
|---|---|
| [backend/admin/adminController.js](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminController.js) | 513 |
| [backend/admin/adminMiddleware.js](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminMiddleware.js) | 21 |
| [backend/admin/adminRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/admin/adminRoutes.js) | 39 |
| [backend/admin/plannerAdminController.js](C:/Users/Neksi/Desktop/LoversAi/backend/admin/plannerAdminController.js) | 548 |
| [backend/admin/plannerAdminRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/admin/plannerAdminRoutes.js) | 23 |
| [backend/config/credits.js](C:/Users/Neksi/Desktop/LoversAi/backend/config/credits.js) | 67 |
| [backend/config/db.js](C:/Users/Neksi/Desktop/LoversAi/backend/config/db.js) | 46 |
| [backend/constants/credits.js](C:/Users/Neksi/Desktop/LoversAi/backend/constants/credits.js) | 1 |
| [backend/controllers/authController.js](C:/Users/Neksi/Desktop/LoversAi/backend/controllers/authController.js) | 21 |
| [backend/controllers/lemonSqueezyController.js](C:/Users/Neksi/Desktop/LoversAi/backend/controllers/lemonSqueezyController.js) | 1220 |
| [backend/firebaseAdmin.js](C:/Users/Neksi/Desktop/LoversAi/backend/firebaseAdmin.js) | 52 |
| [backend/middleware/auth.js](C:/Users/Neksi/Desktop/LoversAi/backend/middleware/auth.js) | 142 |
| [backend/models/AdminAuditLog.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/AdminAuditLog.js) | 60 |
| [backend/models/Bid.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Bid.js) | 86 |
| [backend/models/Cart.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Cart.js) | 33 |
| [backend/models/ChatRoom.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/ChatRoom.js) | 40 |
| [backend/models/CreditTransaction.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/CreditTransaction.js) | 65 |
| [backend/models/Message.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Message.js) | 54 |
| [backend/models/Moodboard.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Moodboard.js) | 27 |
| [backend/models/NewUser.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/NewUser.js) | 34 |
| [backend/models/PlannerUser.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/PlannerUser.js) | 88 |
| [backend/models/Quote.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Quote.js) | 94 |
| [backend/models/Subscription.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Subscription.js) | 147 |
| [backend/models/User.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/User.js) | 246 |
| [backend/models/Wallet.js](C:/Users/Neksi/Desktop/LoversAi/backend/models/Wallet.js) | 37 |
| [backend/planner/ai_tools/angle_image.js](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/angle_image.js) | 636 |
| [backend/planner/ai_tools/couple_moodboard.js](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/couple_moodboard.js) | 1883 |
| [backend/planner/ai_tools/image_to_video.js](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/image_to_video.js) | 352 |
| [backend/planner/ai_tools/retexturing.js](C:/Users/Neksi/Desktop/LoversAi/backend/planner/ai_tools/retexturing.js) | 1011 |
| [backend/routes/auth.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/auth.js) | 72 |
| [backend/routes/authRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/authRoutes.js) | 687 |
| [backend/routes/bidRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/bidRoutes.js) | 168 |
| [backend/routes/cartRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/cartRoutes.js) | 82 |
| [backend/routes/chatRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/chatRoutes.js) | 393 |
| [backend/routes/creditRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/creditRoutes.js) | 58 |
| [backend/routes/debugRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/debugRoutes.js) | 148 |
| [backend/routes/lemonRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/lemonRoutes.js) | 30 |
| [backend/routes/moodboardRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/moodboardRoutes.js) | 75 |
| [backend/routes/newUserRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/newUserRoutes.js) | 42 |
| [backend/routes/paymentRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/paymentRoutes.js) | 537 |
| [backend/routes/profileRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/profileRoutes.js) | 119 |
| [backend/routes/quoteRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/quoteRoutes.js) | 542 |
| [backend/routes/uploadRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/uploadRoutes.js) | 174 |
| [backend/routes/userRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/userRoutes.js) | 282 |
| [backend/routes/users.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/users.js) | 280 |
| [backend/routes/vendorRoutes.js](C:/Users/Neksi/Desktop/LoversAi/backend/routes/vendorRoutes.js) | 391 |
| [backend/scripts/migrateWallets.js](C:/Users/Neksi/Desktop/LoversAi/backend/scripts/migrateWallets.js) | 70 |
| [backend/server.js](C:/Users/Neksi/Desktop/LoversAi/backend/server.js) | 959 |
| [backend/services/creditService.js](C:/Users/Neksi/Desktop/LoversAi/backend/services/creditService.js) | 328 |
| [backend/test-db.js](C:/Users/Neksi/Desktop/LoversAi/backend/test-db.js) | 14 |
| [backend/test-import.js](C:/Users/Neksi/Desktop/LoversAi/backend/test-import.js) | 19 |
| [backend/test-verify.js](C:/Users/Neksi/Desktop/LoversAi/backend/test-verify.js) | 5 |
| [backend/utils/cloudinary.js](C:/Users/Neksi/Desktop/LoversAi/backend/utils/cloudinary.js) | 275 |
| [backend/utils/emailService.js](C:/Users/Neksi/Desktop/LoversAi/backend/utils/emailService.js) | 62 |
| [backend/utils/syncPlannerUser.js](C:/Users/Neksi/Desktop/LoversAi/backend/utils/syncPlannerUser.js) | 53 |
| [backend/utils/userUtils.js](C:/Users/Neksi/Desktop/LoversAi/backend/utils/userUtils.js) | 98 |
| [frontend/src/admin/AdminAILogs.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/admin/AdminAILogs.jsx) | 316 |
| [frontend/src/admin/AdminDashboard.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/admin/AdminDashboard.jsx) | 422 |
| [frontend/src/admin/AdminLayout.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/admin/AdminLayout.jsx) | 132 |
| [frontend/src/admin/AdminProtectedRoute.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/admin/AdminProtectedRoute.jsx) | 50 |
| [frontend/src/admin/AdminSubscriptions.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/admin/AdminSubscriptions.jsx) | 282 |
| [frontend/src/admin/AdminUsers.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/admin/AdminUsers.jsx) | 1111 |
| [frontend/src/admin/PlannerUserModal.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/admin/PlannerUserModal.jsx) | 422 |
| [frontend/src/api/api.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/api/api.js) | 446 |
| [frontend/src/App.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.jsx) | 389 |
| [frontend/src/App.test.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/App.test.js) | 8 |
| [frontend/src/components/About.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/About.jsx) | 64 |
| [frontend/src/components/Carousel.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/Carousel.jsx) | 171 |
| [frontend/src/components/ChatWidget.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/ChatWidget.jsx) | 311 |
| [frontend/src/components/couple/CreditPurchaseModal.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/couple/CreditPurchaseModal.jsx) | 55 |
| [frontend/src/components/couple/CreditWalletBadge.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/couple/CreditWalletBadge.jsx) | 67 |
| [frontend/src/components/couple/ScrollShowcase.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/couple/ScrollShowcase.jsx) | 371 |
| [frontend/src/components/FeedbackCarousel.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/FeedbackCarousel.jsx) | 82 |
| [frontend/src/components/Footer.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/Footer.jsx) | 563 |
| [frontend/src/components/GlobalBackButton.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/GlobalBackButton.jsx) | 90 |
| [frontend/src/components/Hero.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/Hero.jsx) | 79 |
| [frontend/src/components/Lightbox.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/Lightbox.jsx) | 75 |
| [frontend/src/components/LinkCard.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/LinkCard.jsx) | 47 |
| [frontend/src/components/Navbar.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/Navbar.jsx) | 701 |
| [frontend/src/components/OurStoryNavbar.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/OurStoryNavbar.jsx) | 37 |
| [frontend/src/components/PaymentStatus.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/PaymentStatus.jsx) | 105 |
| [frontend/src/components/PlannerQuickMenu.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/PlannerQuickMenu.jsx) | 123 |
| [frontend/src/components/portfolioData.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/portfolioData.js) | 222 |
| [frontend/src/components/PortfolioSection.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/PortfolioSection.jsx) | 63 |
| [frontend/src/components/PricingCards.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/PricingCards.jsx) | 184 |
| [frontend/src/components/ProjectCard.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/ProjectCard.jsx) | 38 |
| [frontend/src/components/ProjectModal.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/ProjectModal.jsx) | 195 |
| [frontend/src/components/ProtectedRoute.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/ProtectedRoute.jsx) | 54 |
| [frontend/src/components/ScrollToTop.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/ScrollToTop.jsx) | 14 |
| [frontend/src/components/TeamSection.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/TeamSection.jsx) | 184 |
| [frontend/src/components/TestimonialSection.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/TestimonialSection.jsx) | 200 |
| [frontend/src/components/VendorAIOnboarding.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/VendorAIOnboarding.jsx) | 141 |
| [frontend/src/components/VendorGuideCarousel.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/components/VendorGuideCarousel.jsx) | 163 |
| [frontend/src/config/pricing.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/config/pricing.js) | 188 |
| [frontend/src/context/AuthContext.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/context/AuthContext.jsx) | 178 |
| [frontend/src/data/vendorGuides.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/data/vendorGuides.js) | 352 |
| [frontend/src/firebase/firebase.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/firebase/firebase.js) | 18 |
| [frontend/src/hooks/useCheckout.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/hooks/useCheckout.js) | 107 |
| [frontend/src/hooks/useLenis.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/hooks/useLenis.js) | 20 |
| [frontend/src/index.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/index.js) | 13 |
| [frontend/src/pages/AIToolsDashboard.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/AIToolsDashboard.jsx) | 65 |
| [frontend/src/pages/couple/CoupleBidPlaced.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/CoupleBidPlaced.jsx) | 523 |
| [frontend/src/pages/couple/CoupleBidProgress.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/CoupleBidProgress.jsx) | 1331 |
| [frontend/src/pages/couple/CoupleHome.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/CoupleHome.jsx) | 607 |
| [frontend/src/pages/couple/CoupleMoodboard.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/CoupleMoodboard.jsx) | 589 |
| [frontend/src/pages/couple/CoupleProfile.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/CoupleProfile.jsx) | 523 |
| [frontend/src/pages/couple/CoupleProfileForm.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/CoupleProfileForm.jsx) | 881 |
| [frontend/src/pages/couple/CoupleThemeMoodboard.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/CoupleThemeMoodboard.jsx) | 1320 |
| [frontend/src/pages/couple/CoupleWeddingVision.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/CoupleWeddingVision.jsx) | 1019 |
| [frontend/src/pages/couple/WeddingCart.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/couple/WeddingCart.jsx) | 525 |
| [frontend/src/pages/Couples.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Couples.jsx) | 51 |
| [frontend/src/pages/Dashboard.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Dashboard.jsx) | 130 |
| [frontend/src/pages/Feature1.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Feature1.jsx) | 26 |
| [frontend/src/pages/Login.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Login.jsx) | 770 |
| [frontend/src/pages/Maintenance.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Maintenance.jsx) | 106 |
| [frontend/src/pages/OurStory.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/OurStory.jsx) | 33 |
| [frontend/src/pages/planner/ai_tools/image_angle.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/ai_tools/image_angle.jsx) | 896 |
| [frontend/src/pages/planner/ai_tools/image_to_video.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/ai_tools/image_to_video.jsx) | 1093 |
| [frontend/src/pages/planner/ai_tools/retexturing.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/ai_tools/retexturing.jsx) | 1043 |
| [frontend/src/pages/planner/PlannerBaseVenueAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerBaseVenueAI.jsx) | 30 |
| [frontend/src/pages/planner/PlannerBids.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerBids.jsx) | 383 |
| [frontend/src/pages/planner/PlannerBuildQuote.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerBuildQuote.jsx) | 307 |
| [frontend/src/pages/planner/PlannerCateringAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerCateringAI.jsx) | 31 |
| [frontend/src/pages/planner/PlannerDashboard.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerDashboard.jsx) | 190 |
| [frontend/src/pages/planner/PlannerDeals.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerDeals.jsx) | 184 |
| [frontend/src/pages/planner/PlannerDecorAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerDecorAI.jsx) | 31 |
| [frontend/src/pages/planner/PlannerItcMughalAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerItcMughalAI.jsx) | 30 |
| [frontend/src/pages/planner/PlannerJaypeeAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerJaypeeAI.jsx) | 30 |
| [frontend/src/pages/planner/PlannerLayout.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerLayout.jsx) | 228 |
| [frontend/src/pages/planner/PlannerLibrary.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerLibrary.jsx) | 1672 |
| [frontend/src/pages/planner/PlannerMessages.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerMessages.jsx) | 465 |
| [frontend/src/pages/planner/PlannerOnboarding.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerOnboarding.jsx) | 320 |
| [frontend/src/pages/planner/PlannerProfile.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerProfile.jsx) | 117 |
| [frontend/src/pages/planner/PlannerQuotes.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerQuotes.jsx) | 194 |
| [frontend/src/pages/planner/PlannerSignup.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerSignup.jsx) | 322 |
| [frontend/src/pages/planner/PlannerSubscriptionModal.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerSubscriptionModal.jsx) | 239 |
| [frontend/src/pages/planner/PlannerTajAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerTajAI.jsx) | 30 |
| [frontend/src/pages/planner/PlannerVendors.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerVendors.jsx) | 243 |
| [frontend/src/pages/planner/PlannerVenueAI.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerVenueAI.jsx) | 31 |
| [frontend/src/pages/planner/PlannerVenueOptions.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerVenueOptions.jsx) | 113 |
| [frontend/src/pages/planner/PlannerWallet.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/PlannerWallet.jsx) | 201 |
| [frontend/src/pages/planner/VendorAIHub.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/planner/VendorAIHub.jsx) | 96 |
| [frontend/src/pages/Planner.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Planner.jsx) | 218 |
| [frontend/src/pages/PlannerAI_Tools.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/PlannerAI_Tools.jsx) | 947 |
| [frontend/src/pages/PricingPage.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/PricingPage.jsx) | 33 |
| [frontend/src/pages/PrivacyPolicy.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/PrivacyPolicy.jsx) | 815 |
| [frontend/src/pages/Profile.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Profile.jsx) | 804 |
| [frontend/src/pages/PublicPlannerProfile.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/PublicPlannerProfile.jsx) | 86 |
| [frontend/src/pages/Signup.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Signup.jsx) | 912 |
| [frontend/src/pages/TermsAndConditions.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/TermsAndConditions.jsx) | 748 |
| [frontend/src/pages/UserForm.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/UserForm.jsx) | 650 |
| [frontend/src/pages/vendor/VendorDashboard.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorDashboard.jsx) | 129 |
| [frontend/src/pages/vendor/VendorEarnings.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorEarnings.jsx) | 92 |
| [frontend/src/pages/vendor/VendorInventory.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorInventory.jsx) | 128 |
| [frontend/src/pages/vendor/VendorLayout.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorLayout.jsx) | 176 |
| [frontend/src/pages/vendor/VendorMessages.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorMessages.jsx) | 162 |
| [frontend/src/pages/vendor/VendorOnboarding.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorOnboarding.jsx) | 210 |
| [frontend/src/pages/vendor/VendorPortfolio.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorPortfolio.jsx) | 65 |
| [frontend/src/pages/vendor/VendorProfile.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorProfile.jsx) | 172 |
| [frontend/src/pages/vendor/VendorRequests.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/vendor/VendorRequests.jsx) | 122 |
| [frontend/src/pages/Vendor.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/Vendor.jsx) | 144 |
| [frontend/src/pages/VerifyEmail.jsx](C:/Users/Neksi/Desktop/LoversAi/frontend/src/pages/VerifyEmail.jsx) | 255 |
| [frontend/src/reportWebVitals.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/reportWebVitals.js) | 13 |
| [frontend/src/setupTests.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/setupTests.js) | 5 |
| [frontend/src/utils/authValidation.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/utils/authValidation.js) | 70 |
| [frontend/src/utils/coupleProfile.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/utils/coupleProfile.js) | 17 |
| [frontend/src/utils/lemonCheckout.js](C:/Users/Neksi/Desktop/LoversAi/frontend/src/utils/lemonCheckout.js) | 82 |

## Verification limits

- 56 backend files passed Node syntax checks; frontend relative imports resolve in the current Windows filesystem.
- This does not prove JSX compilation, Linux case-sensitive import behavior, runtime imports, or application correctness.
- Frontend build fails on the Windows-specific shell incompatibility before the absent dependency installation is reached.
- Neither package has node_modules. No database, payment, email or generation integration was exercised.
- npm audit queried the lockfiles on 18 October 2026: backend 29 affected entries, frontend 102. Reachability must be triaged.
