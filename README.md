# Operator Scanner — Product, Toxin, Packaging & Local Shopping Map

> **Repository scope:** This repository contains the browser-only web app. A related native iOS app is a private, unpublished prototype, is not included here, and has no scheduled store release.

A local-first web terminal for barcode capture, guided product photography, ingredient analysis and separate packaging assessment. The interface is optimized for mobile Safari and static deployment through GitHub Pages.

> [!NOTE]  
> **Language Indicator:** The application's user interface is currently in German, as it is the creator's native language. Full multi-language support (localization) is planned for future updates.

## 🧭 Project & Development Note

Operator Scanner was developed with **AI assistance**, including **Antigravity / Gemini 3.5 Flash**, **Codex / GPT-5.5** and **GPT-5.6 Sol**. The project creator is responsible for the idea, domain and source research, the blacklist/whitelist rules and scoring design, validation, and code review. Implementation was developed iteratively with these tools, with parts also written directly by the creator. AI assistance does not replace testing, review, or responsibility for the application.

---

## 👁️ Core Mission
Operator Scanner helps inspect product ingredients and materials using local rule catalogs, a deterministic 0–100 product score, and a separate packaging assessment. It is an informational project, not a medical product, and does not provide diagnoses.

---

## ⚡ Key Features

### 1. V16 Guided Scanner
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
*   **Local deterministic formula:** Every product starts at **100 points**. The browser app calculates the score from the rule catalogs and scoring facts; an AI model does not choose the score.
*   **Base hazard impact:** `high`, `medium` and `low` rules subtract 30, 20 and 10 points by default. A rule may declare a bounded `scoreImpact` and a `scoreGroup` in `blacklist.json`; related detections remain visible but are not counted twice.
*   **Evidence-aware weighting:** A verified ingredient order increases the impact of a matching substance in positions 1–3 by 1.5 and positions 4–8 by 1.2. For food, a verified sugar value per 100 g or 100 ml adds a bounded quantity impact. Untrusted low-confidence AI facts cannot activate either multiplier.
*   **Accumulation without unlimited stacking:** Independent hazard groups are weighted 100%, 85%, 70% and then 55%. A detected `high`, `medium` or `low` rule also limits the final result to 49, 69 or 89.
*   **Small positive bonus:** `high`, `medium` and `low` whitelist signals add 5, 3 and 1 point, with the complete positive bonus capped at 5. A single positive ingredient therefore cannot outweigh several relevant hazards.
*   **Transparent breakdown:** Archive records persist the individual contributions, ingredient position, quantity impact, accumulation factor, positive bonus and ceiling. Packaging keeps its independent score and never changes the product score.

### 5. Persistent AI Summaries & V16 Archive
*   **Catalog-grounded category evaluations:** The AI (Gemini or DeepSeek) starts with actual detections and effects from `blacklist.json`, category material profiles and local custom rules. Only then may it add clearly distinguishable general or web context. It explains why a product appears harmful, comparatively unproblematic or not sufficiently verifiable across food, cosmetics, clothing, household goods and furniture without inventing undeclared ingredients or making a medical diagnosis.
*   **Actionable alternatives:** The same analysis proposes several category-appropriate alternatives and states the property that should make each option preferable. Web-backed hints remain visibly unconfirmed; generic AI fallback suggestions explicitly tell the user which properties to verify.
*   **Generate once:** Older archive entries without a summary expose an explicit action. A successful result is saved and reused without another API request.
*   **Versioned records:** Legacy history objects are normalized into the V16 schema while preserving existing products, images and summaries.
*   **Backup & Restore:** The export feature packages both your scan history and custom toxins into a single JSON file.

### 6. Packaging Core
*   **Independent score:** Packaging receives its own 0-100 score and never silently modifies the product score.
*   **Material assessment:** The result stores material, risk, confidence, reasoning and disposal guidance.
*   **Web evidence first:** Product research asks specifically for packaging material, recycling and disposal evidence and converts it into the structured packaging detail shown by the app.
*   **Honest AI fallback:** If web evidence is missing, AI may only provide a cautious low-confidence fallback marked as not web-verified; unknown materials are not silently invented.

### 7. Premium User Interface (Obsidian Glassmorphism)
*   **Native-parity information architecture:** The public web app mirrors the native app's five primary areas — Home, Sensor, Search, Chat and Archive — while Map, Compare, Alternatives and AI Core remain focused tools and subviews.
*   **Obsidian glass design:** Deep obsidian surfaces, restrained translucent layers, the native green/indigo/rose/amber signal palette and continuous rounded geometry translate the SwiftUI hierarchy to HTML and CSS without claiming to reproduce Apple's proprietary Liquid Glass rendering.
*   **iOS Safe-Area Support:** Optimized padding (`env(safe-area-inset-bottom)`) for iPhone displays and native Safari browser overlays.
*   **Responsive shell:** Mobile Safari and Android receive the five-item bottom tab bar; desktop and ultrawide layouts use a navigation rail and a centered, bounded workspace.
*   **Accessible presentation:** System/Light/Dark appearance, reduced motion, stronger contrast and reduced-transparency modes complement keyboard focus states and non-color score labels.

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

### 10.3 V16 Web Parity & Readiness Core
*   **Desktop and Android responsive layer:** The mobile-first interface now has tablet, desktop and wide-monitor breakpoints instead of only scaling the iOS layout.
*   **Native-style Home:** Direct barcode/photo/search/chat actions, local archive metrics, the latest analysis and the same secondary tool hierarchy as the native app.
*   **Database-first search:** Name searches query OpenFoodFacts and OpenBeautyFacts in parallel, rank results by useful data quality and preserve explicit local/manual continuations.
*   **Two-mode Operator Chat:** Archive and General modes keep separate histories, use the same local rule basis and provide bounded local answers when no provider key is configured.
*   **Transparent product detail:** V16 quick facts, provisional evidence status, score contributions, packaging and original/evaluated text are presented as distinct sections.
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
*   **Gemini Vision (AI Studio API):** Primary engine for guided photo extraction, OCR cleanup, translation, packaging, product summaries and Operator Chat. V16 uses a Flash fallback chain plus JSON recovery to reduce failures from temporary model demand or malformed model output.
    *   **DeepSeek V4 API:** Alternative engine for chat completions.
*   **OpenFoodFacts & OpenBeautyFacts APIs:** Primary product information databases.
*   **OpenStreetMap / Overpass API:** Optional local POI lookup for the Clean Shopping Map after user-triggered geolocation.
*   **Local rule data:** `category_profiles.json` contains category-specific material rules; `curated_alternatives.json` contains the reviewed alternative directory.

---

## 💾 Installation & Deployment

### Related private prototype

A related native app built with Swift and SwiftUI exists as a private, unpublished test prototype. Its source code is not part of this repository. There is no scheduled store release; this repository documents and distributes the browser-only web app.

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

## Known limitations

- This is a static browser app with no backend secret store. Configured provider keys must be used in browser requests; Google CSE puts its API key in a JSONP request URL. Optional encrypted local storage does not hide keys while they are being used.
- The web-search fallback depends on third-party CORS proxies (`allorigins.win` and `corsproxy.io`). These providers can see routed queries, and their availability affects search.
- Barcode databases, web search and optional AI features depend on external services. The local rule score depends on the supplied ingredient/material text and scoring facts; incomplete or incorrect input can affect results.

## License

The project is released under the [MIT License](LICENSE).

## V16 Web Parity Changes

* Rebuilt the public web shell around the native five-tab structure and added the native-style Home hierarchy, latest-analysis card and tool hub.
* Added an Alternatives Catalog and a visible AI Analysis Core within the browser-only web app.
* Added parallel OFF/OBF name search, universal OpenFoodFacts V3 barcode lookup with safe fallbacks, separate local OCR and full AI photo actions, and 2/5/10/20 km map radii.
* Added Archive and General chat modes with local catalog/archive fallback answers, improved comparison sections and transparent V16 score contributions.
* Added System/Light/Dark appearance, reduced motion, stronger contrast, reduced transparency and responsive verification at mobile, desktop and ultrawide widths.

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
