# 🧬 Operator Terminal v13.6 — Biohacking & Toxin Scanner

A highly advanced, purely client-side web terminal designed for the optical capture, translation, and toxicological evaluation of consumer goods (food & cosmetics). Specially optimized for mobile usage on iOS (Safari/GitHub Pages) to enable rapid scanning directly in supermarkets.

> [!NOTE]  
> **Language Indicator:** The application's user interface is currently in German, as it is the creator's native language. Full multi-language support (localization) is planned for future updates.

---

## 👁️ Core Mission
The **Operator Terminal** is built for biological optimization by identifying hidden environmental and industrial toxins (neurotoxins, carcinogens, endocrine disruptors, and inflammatory fillers). It empowers users to break through the chemical matrix and discover clean, hormonally advantageous alternatives.

---

## ⚡ Key Features

### 1. Hybrid Ingredient Extraction (Optical Sensor & OCR)
*   **Hardware Sensor:** Integrated barcode scanner (`html5-qrcode`) with a zuschaltbar flashlight (camera flash) toggle for capturing EAN/UPC codes.
*   **Offline OCR (Tesseract.js):** Client-side optical character recognition to digitize printed ingredient lists via photo upload or camera snap directly in the browser.
*   **Web Search Cascade (Zero-Config):** If a product is not listed in the primary databases, the app initiates an automated web search via a CORS proxy cascade (`allorigins.win` with automatic fallback to `corsproxy.io`) to extract ingredients.
*   **Google Custom Search (CSE):** Optional configuration of the official Google Search API via JSONP (completely CORS-free and resilient).

### 2. Global AI Translation Pipeline
*   **Automatic Language Detection:** Identifies foreign ingredients (e.g. Turkish, English, or French on vacation) and translates both the product name and the ingredient list fully into German before evaluation.
*   **OCR Error Correction:** Typical optical scanner typos and recognition errors are automatically cleaned up via AI prior to toxicological analysis.
*   **Transparent Raw Data:** The terminal displays both the translated German text and the original input data in the "Zutaten-Rohdaten" view for full transparency.

### 3. Intelligent Scoring & Dynamic Capping
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

### 4. AI Product Summaries & Archiving
*   **Biological Evaluations:** The AI (Gemini or DeepSeek) writes a concise, 2-3 sentence summary explaining the biological and cellular impact of the product on the human body.
*   **Local Archive:** Summaries are stored persistently in the browser history under the `kiSummary` property. When loaded from the archive, the summary is displayed instantly without consuming API quotas.
*   **Backup & Restore:** The export feature packages both your scan history and custom toxins into a single JSON file.

### 5. Premium User Interface (Obsidian Glassmorphism)
*   **Cyberpunk Aesthetic:** Deep, dark obsidian theme with translucent glassmorphic components, tailored HSL color palettes, and fluid transitions.
*   **iOS Safe-Area Support:** Optimized padding (`env(safe-area-inset-bottom)`) for iPhone displays and native Safari browser overlays.
*   **Visual Modal Upgrades:** Toxin details in the bottom-sheet modal feature a glowing, color-coded hazard rating scale (Red/Yellow/Green).
*   **Core Status Badge:** A live header badge indicating whether the app is running offline or with an active AI engine (`KI-CORE ACTIVE` in indigo vs. `OFFLINE-CORE ACTIVE` in emerald).

---

## 🛠️ Technology Stack
*   **Frontend:** Pure HTML5, CSS3 (Vanilla CSS with custom properties), Javascript (ES6+, structured in `app.js`, `api.js`, and `rules.js`).
*   **Libraries:**
    *   [Html5-Qrcode](https://github.com/mebjas/html5-qrcode) (Camera barcode scanning)
    *   [Tesseract.js](https://github.com/naptha/tesseract.js) (Offline client-side OCR)
*   **API Integrations:**
    *   **Gemini 3 Flash (AI Studio API):** Primary model used for web search grounding and ingredient extraction (free tier / zero billing method configuration).
    *   **DeepSeek V4 API:** Alternative engine for chat completions.
    *   **OpenFoodFacts & OpenBeautyFacts APIs:** Primary product information databases.

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
*   **No Backend Servers:** All personal data (history, custom toxins, preferences) is stored locally within the browser (`localStorage` and `sessionStorage`).
*   **Secure Keys:** API keys for Gemini, DeepSeek, or Google CSE are handled strictly in-browser. If "Remember keys" is disabled, they are stored only in memory and disappear once you close the tab. Keys are never sent to third-party servers or uploaded to GitHub.