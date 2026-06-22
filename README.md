# Operator Terminal V14 - Product, Toxin & Packaging Scanner

A local-first web terminal for barcode capture, guided product photography, ingredient analysis and separate packaging assessment. The interface is optimized for mobile Safari and static deployment through GitHub Pages.

> [!NOTE]  
> **Language Indicator:** The application's user interface is currently in German, as it is the creator's native language. Full multi-language support (localization) is planned for future updates.

---

## 👁️ Core Mission
The **Operator Terminal** is built for biological optimization by identifying hidden environmental and industrial toxins (neurotoxins, carcinogens, endocrine disruptors, and inflammatory fillers). It empowers users to break through the chemical matrix and discover clean, hormonally advantageous alternatives.

---

## ⚡ Key Features

### 1. V14 Guided Scanner
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

### 5. Persistent AI Summaries & V14 Archive
*   **Biological Evaluations:** The AI (Gemini or DeepSeek) writes a concise, 2-3 sentence summary explaining the biological and cellular impact of the product on the human body.
*   **Generate once:** Older archive entries without a summary expose an explicit action. A successful result is saved and reused without another API request.
*   **Versioned records:** Legacy history objects are normalized into the V14 schema while preserving existing products, images and summaries.
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

---

## 🛠️ Technology Stack
*   **Frontend:** Pure HTML5, CSS3 (Vanilla CSS with custom properties), Javascript (ES6+, structured in `app.js`, `api.js`, and `rules.js`).
*   **Libraries:**
    *   [Html5-Qrcode](https://github.com/mebjas/html5-qrcode) (Camera barcode scanning)
    *   [Tesseract.js](https://github.com/naptha/tesseract.js) (Offline client-side OCR)
*   **API Integrations:**
*   **Gemini Vision (AI Studio API):** Primary engine for guided photo extraction, OCR cleanup, translation, packaging and product summaries. The exact configured model endpoint and provider quota must be checked before deployment.
    *   **DeepSeek V4 API:** Alternative engine for chat completions.
*   **OpenFoodFacts & OpenBeautyFacts APIs:** Primary product information databases.
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

---

## 🔒 Security and Privacy
*   **No Backend Servers:** History, custom toxins, and preferences are stored locally within the browser (`localStorage` and `sessionStorage`).
*   **API Keys:** If "Remember keys" is disabled, keys are kept only for the current tab/session. If persistent key storage is enabled, keys are encrypted in the browser with WebCrypto AES-GCM and a PBKDF2-derived key from your Master-Passphrase. This is safer than plaintext storage, but it is not equivalent to a backend secret store because a static web app must still use API keys in browser requests.
*   **External Requests:** Gemini, DeepSeek, Google CSE, OpenFoodFacts, OpenBeautyFacts, and optional CORS proxy requests receive the data required for the selected operation. Google CSE uses JSONP, so the Google key is part of the browser request URL. Proxy fallback providers can see the product/search query routed through them.
*   **No Repository Uploads:** The app does not upload your keys, archive, custom toxins, or preferences to GitHub.

---

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
