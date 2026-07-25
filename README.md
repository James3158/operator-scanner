# Operator Scanner — Product, Toxin, Packaging & Local Shopping Map

<p align="center">
  <a href="#-native-ios-app--app-store-coming-soon-closed-source">
    <img src="https://img.shields.io/badge/Native%20iOS%20App-App%20Store%20Coming%20Soon-0A84FF?style=for-the-badge&logo=apple&logoColor=white" alt="Native iOS app coming soon to the App Store">
  </a>
</p>

> [!IMPORTANT]
> **📱 Native iOS App — Coming Soon to the App Store**<br>
> The native SwiftUI app is in its engineering, device-QA and store-preparation phase. TestFlight and App Store availability will follow after signing, production backend, privacy and release checks are complete.

A local-first web terminal for barcode capture, guided product photography, ingredient analysis and separate packaging assessment. The interface is optimized for mobile Safari and static deployment through GitHub Pages.

> [!NOTE]  
> **Language Indicator:** The application's user interface is currently in German, as it is the creator's native language. Full multi-language support (localization) is planned for future updates.

## 🧭 Project & Development Note

Operator Scanner is largely a **Vibe-Coded project and application**. A substantial part of the implementation was developed iteratively with **Antigravity / Gemini 3.5 Flash**, **Codex / GPT-5.5** and **GPT-5.6 Sol**. The product idea, domain research, source research and validation are my own work as the project creator; parts of the code were also written by me directly and reviewed throughout development. AI-assisted development does not replace the underlying research, product decisions or responsibility for the application.

---

## 👁️ Core Mission
The **Operator Terminal** is built for biological optimization by identifying hidden environmental and industrial toxins (neurotoxins, carcinogens, endocrine disruptors, and inflammatory fillers). It empowers users to break through the chemical matrix and discover clean, hormonally advantageous alternatives.

---

## ⚡ Key Features

### 1. V14.4 Guided Scanner
*   **Two explicit modes:** Live barcode scanning and guided product photography are separated to reduce camera errors and unclear workflows.
*   **Guided capture:** The photo flow requests a product front, an ingredient/material label and an optional packaging image.
*   **Optimized local image:** The archived front image is compressed before local storage to reduce quota pressure.

### 2. Hybrid Ingredient Extraction (Optical Sensor & OCR)
*   **Hardware Sensor:** Integrated barcode scanner (`html5-qrcode`) with a zuschaltbar flashlight (camera flash) toggle for capturing EAN/UPC codes.
*   **Offline OCR (Tesseract.js):** Client-side optical character recognition to digitize printed ingredient lists via photo upload or camera snap directly in the browser.
*   **Web Search Cascade (Zero-Config):** If a product is not listed in the primary databases, the app initiates an automated web search via a CORS proxy cascade (`allorigins.win` with automatic fallback to `corsproxy.io`) to extract ingredients.
*   **Google Custom Search (CSE):** Optional configuration of the official Google Search API via JSONP. This is resilient for static hosting, but the API key is necessarily used in the browser request.

### 3. Global AI Translation Pipeline
*   **Automatic Language Detection:** Identifies foreign ingredients (e.g. Turkish, English, or French on vacation) and translates both the product name and the ingredient list fully into German before evaluation.
*   **OCR Error Correction:** Typical optical scanner typos and recognition errors are automatically cleaned up via AI prior to toxicological analysis.
*   **Transparent Raw Data:** The terminal displays both the translated German text and the original input data in the "Zutaten-Rohdaten" view for full transparency.

### 4. V16 Deterministic Scoring
*   **One formula in web and native:** Every product starts at **100 points**. The framework-free web app and Swift rule engine use the same parity fixtures and never let an AI model choose the score.
*   **Base hazard impact:** `high`, `medium` and `low` rules subtract 30, 20 and 10 points by default. A rule may declare a bounded `scoreImpact` and a `scoreGroup` in `blacklist.json`; related detections remain visible but are not counted twice.
*   **Evidence-aware weighting:** A verified ingredient order increases the impact of a matching substance in positions 1–3 by 1.5 and positions 4–8 by 1.2. For food, a verified sugar value per 100 g or 100 ml adds a bounded quantity impact. Untrusted low-confidence AI facts cannot activate either multiplier.
*   **Accumulation without unlimited stacking:** Independent hazard groups are weighted 100%, 85%, 70% and then 55%. A detected `high`, `medium` or `low` rule also limits the final result to 49, 69 or 89.
*   **Small positive bonus:** `high`, `medium` and `low` whitelist signals add 5, 3 and 1 point, with the complete positive bonus capped at 5. A single positive ingredient therefore cannot outweigh several relevant hazards.
*   **Transparent breakdown:** Native records persist the individual contributions, ingredient position, quantity impact, accumulation factor, positive bonus, ceiling and fact source. Packaging keeps its independent score and never changes the product score.

### 5. Persistent AI Summaries & V14.4 Archive
*   **Catalog-grounded category evaluations:** The AI (Gemini or DeepSeek) starts with actual detections and effects from `blacklist.json`, category material profiles and local custom rules. Only then may it add clearly distinguishable general or web context. It explains why a product appears harmful, comparatively unproblematic or not sufficiently verifiable across food, cosmetics, clothing, household goods and furniture without inventing undeclared ingredients or making a medical diagnosis.
*   **Actionable alternatives:** The same analysis proposes several category-appropriate alternatives and states the property that should make each option preferable. Web-backed hints remain visibly unconfirmed; generic AI fallback suggestions explicitly tell the user which properties to verify.
*   **Generate once:** Older archive entries without a summary expose an explicit action. A successful result is saved and reused without another API request.
*   **Versioned records:** Legacy history objects are normalized into the V14.4 schema while preserving existing products, images and summaries.
*   **Backup & Restore:** The export feature packages both your scan history and custom toxins into a single JSON file.

### 6. Packaging Core
*   **Independent score:** Packaging receives its own 0-100 score and never silently modifies the product score.
*   **Material assessment:** The result stores material, risk, confidence, reasoning and disposal guidance.
*   **Web evidence first:** Product research asks specifically for packaging material, recycling and disposal evidence and converts it into the structured packaging detail shown by the app.
*   **Honest AI fallback:** If web evidence is missing, AI may only provide a cautious low-confidence fallback marked as not web-verified; unknown materials are not silently invented.

### 7. Premium User Interface (Obsidian Glassmorphism)
*   **Cyberpunk Aesthetic:** Deep, dark obsidian theme with translucent glassmorphic components, tailored HSL color palettes, and fluid transitions.
*   **iOS Safe-Area Support:** Optimized padding (`env(safe-area-inset-bottom)`) for iPhone displays and native Safari browser overlays.
*   **Visual Modal Upgrades:** Toxin details in the bottom-sheet modal feature a glowing, color-coded hazard rating scale (Red/Yellow/Green).
*   **Core Status Badge:** A live header badge indicating whether the app is running offline or with an active AI engine (`KI-CORE ACTIVE` in indigo vs. `OFFLINE-CORE ACTIVE` in emerald).

### 8. Multi-Category Material Core
*   **Layered profiles:** Clothing, household goods and furniture add dedicated hazard and benefit rules to the shared `blacklist.json`/whitelist basis. Category rules override same-named shared rules, but they no longer suppress declared cross-category substances such as preservatives in a household skin-contact product.
*   **Category-aware capture:** Guided Vision and manual quick scans can classify and archive food, cosmetics, clothing, household goods and furniture.
*   **Material summaries:** AI summaries switch to material contact, emissions, synthetic abrasion, durability and missing manufacturer data for non-food products.

### 9. Fair Alternatives
*   **Curated first:** Local entries provide a concrete product type, purchase criteria, reasoning and an optional certification directory.
*   **Unconfirmed web layer:** On-demand web suggestions are stored separately and remain visibly marked as unconfirmed.
*   **No invented certainty:** Web suggestions may not claim verified prices, certificates, links or local availability.

### 10. Phase 3 Operator AI Chat
*   **Two deliberate modes:** Archive Chat answers with locally saved products, categories, scores, detected toxins, positive signatures, packaging data and stored summaries. General Chat accepts independent questions even when the archive is empty.
*   **Shared rule basis:** Both modes receive `blacklist.json`, household/furniture/clothing profiles and custom local rules as their primary context. The provider must label catalog-only assertions and may use outside knowledge only as supplementary context.
*   **Controlled context:** The prompt sends compact text metadata only; archived product images are not included in chat requests.
*   **Visual source cards:** Archive products, internal catalog alternatives and HTTPS product results can appear as persistent image-backed cards. The model references bounded search-result indices and never creates arbitrary URLs itself.

### 10.1 Phase 4 Archive & Chat UI
*   **Vault archive:** The archive now includes summary metrics, category counts, text search, sorting and denser product cards with score state, top signals, packaging risk and data previews. Database thumbnails are loaded lazily from their small-image URLs while all prior row details remain visible.
*   **AI chat interface:** The chat view uses an iOS-style assistant header, separate Archive/General controls, mode-local message history, quick prompts and a compact composer inspired by modern AI chat apps.
*   **Performance focus:** Archive filtering is local and bounded, thumbnails load only for visible lazy rows, and AI archive context is relevance-sorted and trimmed before provider calls to reduce prompt size.

### 10.2 Phase 5 Local Shopping Map
*   **Clean Shopping Map:** A dedicated map view helps find nearby markets, organic/health-food shops, pharmacies, cosmetics stores, second-hand clothing, furniture and household alternatives.
*   **User-controlled location:** Geolocation is requested only after tapping the map action; the app does not auto-track on boot.
*   **Lightweight rendering:** The app renders a local pin map and POI list without adding a heavy map tile library.
*   **Performance guardrails:** Overpass results are cached for 20 minutes per rough location, category and radius, capped at 30 visible POIs, and have external OpenStreetMap fallback links.

### 10.3 V14.4 Readiness Core
*   **Desktop and Android responsive layer:** The mobile-first interface now has tablet, desktop and wide-monitor breakpoints instead of only scaling the iOS layout.
*   **Gemini JSON resilience:** Model responses are parsed through a stronger JSON recovery path, and parse failures no longer block the interface with system alerts.
*   **Search-before-AI guarantee:** Vision and manual KI extraction keep the web-search pipeline first: Google CSE when configured, DuckDuckGo fallback otherwise, then AI analysis.
*   **Security pass:** Dynamic render paths and external URLs received additional escaping and URL sanitation.

### 11. Gemini Resilience
*   **Bounded Flash fallback chain:** Direct calls start with the low-latency stable Gemini 3.1 Flash-Lite model and fall back once to Gemini 3.5 Flash for model availability, temporary demand or connection loss instead of multiplying slow retries across aliases.
*   **Retry handling:** Temporary provider overload is reported as capacity pressure instead of a misleading API-key failure.
*   **JSON recovery:** AI responses are parsed more defensively when providers wrap JSON in Markdown or extra text.
*   **Bundled research response:** Product extraction, the general assessment, alternatives and packaging metadata share one structured response. Guided Vision also runs independent OCR and packaging work in parallel and avoids a redundant second translation call.

---

## 🛠️ Technology Stack
*   **Frontend:** Pure HTML5, CSS3 (Vanilla CSS with custom properties), Javascript (ES6+, structured in `app.js`, `api.js`, and `rules.js`).
*   **Libraries:**
    *   [Html5-Qrcode](https://github.com/mebjas/html5-qrcode) (Camera barcode scanning)
    *   [Tesseract.js](https://github.com/naptha/tesseract.js) (Offline client-side OCR)
*   **API Integrations:**
*   **Gemini Vision (AI Studio API):** Primary engine for guided photo extraction, OCR cleanup, translation, packaging, product summaries and archive chat. V14.4 uses a Flash fallback chain plus JSON recovery to reduce failures from temporary model demand or malformed model output.
    *   **DeepSeek V4 API:** Alternative engine for chat completions.
*   **OpenFoodFacts & OpenBeautyFacts APIs:** Primary product information databases.
*   **OpenStreetMap / Overpass API:** Optional local POI lookup for the Clean Shopping Map after user-triggered geolocation.
*   **Local rule data:** `category_profiles.json` contains category-specific material rules; `curated_alternatives.json` contains the reviewed alternative directory.

---

## 💾 Installation & Deployment

### 📱 Native iOS App — App Store Coming Soon (Closed Source)

The native Swift 6 / SwiftUI app is being developed as a separate, proprietary product alongside this public web repository. Its iOS source code and production backend are intentionally **closed source** and are not included in this repository. The public repository remains the home of the local-first web app, its public rule/research data and its browser deployment path.

The native app already has a broad local engineering baseline. The following scope is documented here to show what is coming to iPhone and iPad; it does not publish the private implementation.

Current native foundation:

* SwiftUI tab shell for Home, Scanner, Search, AI Chat and Archive; the Map remains available from Home and the feature hub.
* SwiftData archive with V14.4 JSON import and web-compatible export.
* Live barcode scanning plus barcode recognition from a selected photo, local Vision OCR and Guided Vision for front, label and packaging images.
* Unified database-first search: exact barcodes first use the current OpenFoodFacts universal V3 lookup (`product_type=all`) so food and cosmetics resolve to the correct project; name searches query OpenFoodFacts and OpenBeautyFacts, rank multiple matches for selection and run local rule evaluation immediately.
* Incomplete database entries stay tied to their original barcode and product. A Web+AI supplement action can add missing ingredient, material and packaging information while preserving the original primary-database text for provenance; incomplete barcode scans use this automatically when AI is configured.
* Product images share a memory/disk cache and off-main-thread downsampling across Search, Archive and Details. The Archive lazily backfills a small, rate-limited batch of missing database thumbnails instead of refetching every visible row.
* When databases and completed web/AI research still provide no reliable product image, Product Details offers a local camera follow-up and a one-time reminder that can be suppressed per product. The captured photo uses the existing bounded JPEG/data-URL compression and does not trigger another search or consume AI tokens.
* If both databases miss, Search offers three explicit continuations instead of silently guessing: web + AI analysis, guided product photos or ordered manual entry. Google CSE is preferred when configured and DuckDuckGo is the zero-configuration fallback.
* Custom toxin management whose rules participate in new local analyses and remain compatible with web archive import/export.
* Transparent preservation of the original OCR/input text when optional AI translation or cleanup changes the evaluated text.
* Native archive metrics, lazy database thumbnails, category counts, search, sorting, clearing, comparison and local-first archive chat with clickable AI source chips.
* A persistent Alternatives Catalog combines curated entries and the alternatives already saved with archive products. It shows which scanned products an alternative belongs to, enriches details lazily from OpenFoodFacts/OpenBeautyFacts and optional Web+AI research, caches images and separates verified product pages from clearly labeled retailer-search fallbacks.
* Product Details uses compact image-backed alternative cards and links into the same catalog, so catalog state and product state cannot drift into separate implementations.
* User-triggered MapKit shopping search with category and 2/5/10/20 km radius controls.
* Sign in with Apple session handling plus a Cloudflare Worker boundary for Gemini, DeepSeek and Google CSE secrets.
* A visible native KI Analysis Core for photo identification, search-before-AI product analysis, label/material extraction, automatic German translation and OCR cleanup, packaging assessment, persistent summaries, web-backed alternatives and archive chat.
* General AI assessments explain the category-specific reasons for or against a product and return multiple practical alternatives. Web packaging evidence is preferred, with a visibly low-confidence AI fallback when no packaging source is available.
* Product research returns ingredients/materials, assessment, alternatives and packaging together; local OCR and independent visual packaging work run concurrently. Animated, accessibility-aware progress cards rotate short product and app facts during unavoidable network waits.
* Dual AI execution: recommended authenticated Worker mode or an optional personal direct mode with user-entered Gemini, DeepSeek and Google CSE credentials stored only in the iOS Keychain.
* The direct text pipeline mirrors the web provider behavior: Gemini with a compatible model fallback chain and optional DeepSeek fallback, or explicit DeepSeek selection. Vision always uses Gemini.
* Product-name AI analysis follows the web order: Google CSE when configured, direct DuckDuckGo fallback, structured AI extraction, then the local deterministic rule engine.
* Product scores are never selected freely by AI. Database text, web evidence and structured AI supplements are merged without replacing the product identity; the deterministic V16 `blacklist.json`/whitelist rule engine then recomputes score, critical signals and positive signals from that same merged text. AI may return only structured scoring facts such as a sourced ingredient order or measured sugar value; low-confidence values cannot amplify the score.
* Score presentation uses one continuous red–orange–amber–yellow-green–green scale from 0 to 100 across Home, Archive, Search, Compare and Product Details. Exact numeric scores and labels remain visible so color is never the sole accessibility signal.
* Native rule version 16.0 layers household/clothing/furniture profiles onto the shared catalogs, treats a rule key as an additional safe alias, normalizes hyphenated ingredient spellings and adds position-, quantity-, grouping- and accumulation-aware scoring with a maximum five-point positive bonus.
* On the first launch after this rule update, every archived record below rule version 16.0 that has evaluable text is reanalyzed locally without an API request. Score, critical/positive signals and the deterministic catalog preface are updated in place while barcode, image, original text, evidence, creation order and saved AI narrative are preserved. New scoring metadata survives native and web-compatible archive round trips.
* Each native record carries analysis confidence, source labels and whether web research actually ran. Database-only or otherwise low-confidence scores are visibly marked as provisional in Product Details and are treated as provisional in Compare rather than as final clearance.
* Configured AI is now used automatically to web-check selected database matches and barcode results. Missing ingredients/materials and packaging evidence are added to the existing barcode record; original primary-database text remains available for provenance.
* Settings includes a local AI usage panel for attempts, recent request pace, provider-reported token counts, model and observed rate-limit responses. These are device-local estimates, not invented free-tier quotas; the authoritative per-project/model limits remain linked to Google AI Studio, and a 429 response stops Gemini model retries for that operation.
* Adaptive light/dark app icon, system appearance, native iOS 26 Liquid Glass surfaces with graceful older-iOS fallbacks, explicit privacy manifest, Keychain-backed rotating refresh sessions, remote logout and in-app account deletion with Apple token revocation.
* A dedicated animated Chat tab with first-use onboarding, full-width Archive/General controls, horizontal swipe switching, quick prompts, a shared `blacklist.json`/material-profile basis and clickable archive product source chips.
* General and Archive chat answers can persist safe visual cards for local products, Alternatives Catalog entries and bounded HTTPS web results; duplicate cards are removed before rendering.
* A full-screen native camera workspace with a top mode switch between live barcode capture and guided front/label/packaging photography. Live scanning is constrained to the visible reticle and tuned for responsiveness.
* The Scanner workspace also switches between barcode and product-photo modes with a directionally filtered horizontal swipe, while vertical scrolling and loading states remain protected from accidental mode changes.
* A modern animated Home dashboard with direct scanner, product-photo, search and chat actions while continuous effects remain isolated from archive-driven content.
* A redesigned native archive with animated overview metrics, accessible category filters, stable lazy rows, richer product previews and native import/export, sorting and swipe deletion.
* Interactive product details expose score methodology, capture/data provenance, rule-catalog signal explanations, packaging evidence and full selectable source text in dedicated sheets.
* Compare has a modern image-backed product picker, animated score bars, separate critical/positive/packaging sections, data-quality comparison, Dynamic Type layouts and a provisional verdict whenever evidence or rule versions are not comparable.
* Appearance now switches consistently between System, Light and Dark across root content and modal settings. Accessibility controls add app-level reduced motion, stronger contrast, reduced-transparency fallbacks and more explicit action labels while continuing to respect iOS Dynamic Type and system accessibility settings.
* Database records whose source name is empty, unknown or unnamed must be renamed before first save. The original database value remains stored as provenance, and any archive entry can be renamed later without changing its barcode or analysis.

Intentional native differences from the static web app:

* Production can keep Gemini, DeepSeek and Google CSE exclusively as Worker secrets. For personal development and simulator testing, the optional direct mode accepts the user's own keys and stores them in the device-only iOS Keychain; no key is embedded in the app bundle or repository.
* Native product lookup does not need browser JSONP or public CORS proxies. Public product databases and the DuckDuckGo fallback are called directly by iOS; Worker mode keeps Google CSE server-side.
* The native map uses MapKit rather than browser-rendered Overpass/OpenStreetMap results.
* VisionKit supplies live barcode recognition. The native flow favors a bounded reticle and reduced scanner guidance/highlighting for speed; a manual torch control is not currently exposed.

Still external or device-bound:

* A unique production bundle ID, Apple Development Team and Sign in with Apple key.
* Cloudflare D1/KV resource IDs, production secrets, Worker deployment and final HTTPS API URL.
* Physical-device validation of camera, barcode, permissions, Apple authentication and every authenticated AI action.

The current internal milestone is a verified local engineering baseline: simulator Debug/Release builds, local scoring parity and the main archive, comparison, assistant, map and scanner flows have been exercised. TestFlight and App Store submission still require final Apple signing, real-device camera and Sign in with Apple QA, a deployed production Worker, privacy review and store metadata.

**Release signal:** 🚧 engineering baseline complete · 🧪 TestFlight preparation next · 🚀 App Store coming soon · 🔒 native source remains private.

### Existing Web App

Since the web application runs entirely client-side, no build process is required. You can host this repository directly using GitHub Pages:

1.  Clone or download the repository.
2.  Go to your GitHub Repository Settings under **Pages** and select the `main` branch.
3.  The app will be live at `https://<your-username>.github.io/<repo-name>/`.

### Running Locally
To test locally, start a simple web server in the project directory:
```bash
# Start a local python web server
python -m http.server 8000
```
Then navigate to `http://localhost:8000` in your web browser.

### Local Checks
```bash
node check_elements.js .
node test_v14_4.js
node test_rules.js
```

---

## 🔒 Security and Privacy
*   **No Backend Servers:** History, custom toxins, and preferences are stored locally within the browser (`localStorage` and `sessionStorage`).
*   **API Keys:** If "Remember keys" is disabled, keys are kept only for the current tab/session. If persistent key storage is enabled, keys are encrypted in the browser with WebCrypto AES-GCM and a PBKDF2-derived key from your Master-Passphrase. This is safer than plaintext storage, but it is not equivalent to a backend secret store because a static web app must still use API keys in browser requests.
*   **External Requests:** Gemini, DeepSeek, Google CSE, OpenFoodFacts, OpenBeautyFacts, Overpass, and optional CORS proxy requests receive the data required for the selected operation. Google CSE uses JSONP, so the Google key is part of the browser request URL. Proxy fallback providers can see the product/search query routed through them. The map sends approximate latitude/longitude only after the user taps the location action.
*   **No Repository Uploads:** The app does not upload your keys, archive, custom toxins, or preferences to GitHub.

---

## V14.4 Changes

*   Added a readiness hardening pass based on the VibeDoctor findings: safer render paths, URL sanitation and non-blocking provider errors.
*   Added robust Gemini/DeepSeek JSON extraction for Markdown-wrapped, prefixed or partially noisy model responses.
*   Preserved and tested the intended web-search flow: Google CSE first when configured, DuckDuckGo fallback, then KI analysis.
*   Added desktop, tablet, Android landscape and wide-monitor responsive layouts.
*   Added local V14.4 tests for JSON parser recovery, search provider order and XSS-safe rendering helpers.

## V14.3 Changes

*   Added the Clean Shopping Map with local categories for clean food, markets, cosmetics, clothing and home/furniture.
*   Added explicit geolocation flow, radius selector, category chips, local map pins and sorted POI cards with route links.
*   Added Overpass result caching, 30-result rendering cap and fallback OpenStreetMap search links for network or provider outages.
*   Added map entry points to the bottom navigation and Home dashboard.

## V14.2 Changes

*   Redesigned the archive as a readable Vault UI with metrics, search, sorting and category count chips.
*   Rebuilt archive product cards with clearer hierarchy, score state, packaging metadata and top signal chips.
*   Redesigned the Archive AI Chat into a modern iOS-style AI chat surface.
*   Reduced chat prompt payload by relevance-sorting and trimming archive context.

## V14.1 Changes

*   Added a separate Archive AI Chat with access to saved product metadata, categories, scores, packaging and summaries.
*   Added Gemini Flash fallback and retry handling for temporary high-demand / rate-limit errors.
*   Reworked the in-app changelog into a card-based release timeline for better readability on mobile.
*   Updated system labels, schema marker and documentation to V14.1.

## V14 Changes

*   Reworked the scanner into dedicated barcode and guided photo modes.
*   Added front, label and packaging capture stages with Gemini Vision processing and OCR fallback.
*   Added a separate packaging score with confidence and disposal metadata.
*   Added backward-compatible V14 archive normalization.
*   Added on-demand, single-generation summaries for legacy archive entries.
*   Preserved existing summaries and images during later re-analysis.
*   Added dedicated Clothing, Household and Furniture material profiles.
*   Added category filters and category selection for manual scans.
*   Added curated fair alternatives with certification and purchase checks.
*   Added separately labeled, cached and unconfirmed web alternatives.

## v13.8.3 Fixes
*   Replaced weak custom XOR/PIN key storage with WebCrypto AES-GCM plus PBKDF2-derived passphrase keys while keeping legacy unlock compatibility.
*   Fixed OCR/QuickScan analysis so extracted data can still receive AI cleanup, translation, and summaries.
*   Hardened toxin matching against negated phrases such as "ohne Zucker", "zuckerfrei", and "ohne Parfum".
*   Changed system reset to remove only app-owned `op_` storage keys instead of clearing the whole browser origin.
*   Corrected privacy documentation for API providers, Google CSE JSONP, and CORS proxy fallback behavior.
