# Operator Terminal V14.4 - Product, Toxin, Packaging & Local Map Scanner

A local-first web terminal for barcode capture, guided product photography, ingredient analysis and separate packaging assessment. The interface is optimized for mobile Safari and static deployment through GitHub Pages.

> [!NOTE]  
> **Language Indicator:** The application's user interface is currently in German, as it is the creator's native language. Full multi-language support (localization) is planned for future updates.

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

### 4. Intelligent Scoring & Dynamic Capping
*   **Points Formula:** Every product starts at **100 points**. Toxins subtract points, biological amplifiers (whitelists) add points.
*   **Toxin Severity Ratings:** Toxins in `blacklist.json` are weighted by severity:
    *   `high` (-30 points, e.g., fluoride, parabens, phenoxyethanol)
    *   `medium` (-20 points, e.g., soy lecithin, carrageenan, SLS)
    *   `low` (-10 points, e.g., sugar, cellulose)
*   **Whitelist Benefit Ratings:** Health-optimizing ingredients in `whitelist.json` are weighted by benefit:
    *   `high` (+20 points, e.g., cold-pressed olive oil, raw cocoa, grass-fed butter, shilajit, bone broth)
    *   `medium` (+10 points, e.g., shea butter, aloe vera, niacinamide, ceramides)
    *   `low` (+5 points, e.g., spelt, beeswax)
*   **Dynamic Capping Compensation:**
    *   If a toxin with `severity === 'high'` (e.g., neurotoxins) is detected, the product is **strictly capped at a maximum of 50 points**.
    *   Lighter toxins (e.g., fillers or sugar) can be compensated by positive ingredients: each whitelisted ingredient increases the dynamic score cap by its benefit value (up to a limit of **75 points**).

### 5. Persistent AI Summaries & V14.4 Archive
*   **Biological Evaluations:** The AI (Gemini or DeepSeek) writes a concise, 2-3 sentence summary explaining the biological and cellular impact of the product on the human body.
*   **Generate once:** Older archive entries without a summary expose an explicit action. A successful result is saved and reused without another API request.
*   **Versioned records:** Legacy history objects are normalized into the V14.4 schema while preserving existing products, images and summaries.
*   **Backup & Restore:** The export feature packages both your scan history and custom toxins into a single JSON file.

### 6. Packaging Core
*   **Independent score:** Packaging receives its own 0-100 score and never silently modifies the product score.
*   **Material assessment:** The result stores material, risk, confidence, reasoning and disposal guidance.
*   **Honest fallback:** Unknown packaging is labeled as not verified rather than guessed.

### 7. Premium User Interface (Obsidian Glassmorphism)
*   **Cyberpunk Aesthetic:** Deep, dark obsidian theme with translucent glassmorphic components, tailored HSL color palettes, and fluid transitions.
*   **iOS Safe-Area Support:** Optimized padding (`env(safe-area-inset-bottom)`) for iPhone displays and native Safari browser overlays.
*   **Visual Modal Upgrades:** Toxin details in the bottom-sheet modal feature a glowing, color-coded hazard rating scale (Red/Yellow/Green).
*   **Core Status Badge:** A live header badge indicating whether the app is running offline or with an active AI engine (`KI-CORE ACTIVE` in indigo vs. `OFFLINE-CORE ACTIVE` in emerald).

### 8. Multi-Category Material Core
*   **Dedicated profiles:** Clothing, household goods and furniture use separate hazard and benefit rules instead of the food ingredient database.
*   **Category-aware capture:** Guided Vision and manual quick scans can classify and archive food, cosmetics, clothing, household goods and furniture.
*   **Material summaries:** AI summaries switch to material contact, emissions, synthetic abrasion, durability and missing manufacturer data for non-food products.

### 9. Fair Alternatives
*   **Curated first:** Local entries provide a concrete product type, purchase criteria, reasoning and an optional certification directory.
*   **Unconfirmed web layer:** On-demand web suggestions are stored separately and remain visibly marked as unconfirmed.
*   **No invented certainty:** Web suggestions may not claim verified prices, certificates, links or local availability.

### 10. Phase 3 Archive AI Chat
*   **Archive-aware assistant:** A separate AI chat can answer questions using locally saved products, categories, scores, detected toxins, positive signatures, packaging data and stored summaries.
*   **Controlled context:** The prompt sends compact text metadata only; archived product images are not included in chat requests.
*   **Source chips:** When the answer references archived products, the chat can show quick links back to the relevant local entries.

### 10.1 Phase 4 Archive & Chat UI
*   **Vault archive:** The archive now includes summary metrics, category counts, text search, sorting and denser product cards with score state, top signals, packaging risk and data previews.
*   **AI chat interface:** The chat view uses an iOS-style assistant header, message bubbles, quick prompts and a compact composer inspired by modern AI chat apps.
*   **Performance focus:** Archive filtering is local and bounded; AI chat context is relevance-sorted and trimmed before provider calls to reduce prompt size.

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
*   **Flash fallback chain:** Gemini calls try the configured stable Flash model first and then compatible fallback aliases/models when temporary demand or rate-limit errors occur.
*   **Retry handling:** Temporary provider overload is reported as capacity pressure instead of a misleading API-key failure.
*   **JSON recovery:** AI responses are parsed more defensively when providers wrap JSON in Markdown or extra text.

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
