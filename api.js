function checkApiCounter() {
    let date = new Date().toISOString().slice(0, 10);
    let usageObj = readJsonStorage('op_api_usage', { date: date, count: 0 });
    if(usageObj.date !== date) usageObj = { date: date, count: 0 };
    if(document.getElementById('apiUsageCount')) document.getElementById('apiUsageCount').innerText = usageObj.count;
    writeJsonStorage('op_api_usage', usageObj);
    return usageObj.count;
}

function incrementApiCounter() {
    let date = new Date().toISOString().slice(0, 10);
    let usageObj = readJsonStorage('op_api_usage', { date: date, count: 0 });
    if(usageObj.date !== date) usageObj = { date: date, count: 0 };
    usageObj.count += 1;
    writeJsonStorage('op_api_usage', usageObj);
    if (document.getElementById('apiUsageCount')) document.getElementById('apiUsageCount').innerText = usageObj.count;
}

function resetApiCounter() {
    let date = new Date().toISOString().slice(0, 10);
    writeJsonStorage('op_api_usage', { date: date, count: 0 });
    writeJsonStorage('op_deepseek_usage', { date: date, count: 0 });
    checkApiCounter();
    checkDeepSeekCounter();
}

function checkDeepSeekCounter() {
    let date = new Date().toISOString().slice(0, 10);
    let usageObj = readJsonStorage('op_deepseek_usage', { date: date, count: 0 });
    if(usageObj.date !== date) usageObj = { date: date, count: 0 };
    if(document.getElementById('deepseekUsageCount')) document.getElementById('deepseekUsageCount').innerText = usageObj.count;
    writeJsonStorage('op_deepseek_usage', usageObj);
    return usageObj.count;
}

function incrementDeepSeekCounter() {
    let date = new Date().toISOString().slice(0, 10);
    let usageObj = readJsonStorage('op_deepseek_usage', { date: date, count: 0 });
    if(usageObj.date !== date) usageObj = { date: date, count: 0 };
    usageObj.count += 1;
    writeJsonStorage('op_deepseek_usage', usageObj);
    if (document.getElementById('deepseekUsageCount')) document.getElementById('deepseekUsageCount').innerText = usageObj.count;
}

// Zentraler Lade-Spinner
function showLoading(message) {
    let el = document.getElementById('result-content');
    if (el) el.innerHTML = `<div class="res-card"><div class="res-body" style="text-align:center;">
        <div class="spinner"></div>
        <p style="margin-top:15px; color:var(--text-muted); font-size:14px;">${escapeHTML(message)}</p>
    </div></div>`;
}

// Modales Eingabefeld als prompt()-Ersatz
let _kiModalResolve = null;

function showKIInputModal(barcode, prefilledTerm) {
    return new Promise((resolve) => {
        _kiModalResolve = resolve;
        document.getElementById('kiModalInput').value = prefilledTerm || '';
        document.getElementById('kiModalOverlay').style.display = 'block';
        document.getElementById('kiModalBox').classList.add('active');
        document.getElementById('kiModalInput').focus();
    });
}

function confirmKIInputModal() {
    let val = document.getElementById('kiModalInput').value.trim();
    document.getElementById('kiModalOverlay').style.display = 'none';
    document.getElementById('kiModalBox').classList.remove('active');
    if (_kiModalResolve) { _kiModalResolve(val); _kiModalResolve = null; }
}

function cancelKIInputModal() {
    document.getElementById('kiModalOverlay').style.display = 'none';
    document.getElementById('kiModalBox').classList.remove('active');
    if (_kiModalResolve) { _kiModalResolve(''); _kiModalResolve = null; }
}

let runtimeGeminiKey = "";
let runtimeDeepSeekKey = "";
let runtimeGoogleSearchKey = "";
let runtimeGoogleSearchCx = "";

function shouldKeepKeyForSession() {
    return Boolean(document.getElementById('sessionKeyToggle')?.checked);
}

function getSecretKey(provider) {
    if (provider === 'gemini') return runtimeGeminiKey || sessionStorage.getItem('op_gemini_key_session') || '';
    if (provider === 'deepseek') return runtimeDeepSeekKey || sessionStorage.getItem('op_deepseek_key_session') || '';
    if (provider === 'google') return runtimeGoogleSearchKey || sessionStorage.getItem('op_google_key_session') || '';
    return '';
}

function getGoogleCx() {
    return runtimeGoogleSearchCx || localStorage.getItem('op_google_cx') || '';
}

function setSecretKey(provider, key) {
    let sessionKey = provider === 'gemini' ? 'op_gemini_key_session' : 
                     (provider === 'deepseek' ? 'op_deepseek_key_session' : 'op_google_key_session');
    
    if (provider === 'gemini') runtimeGeminiKey = key;
    else if (provider === 'deepseek') runtimeDeepSeekKey = key;
    else runtimeGoogleSearchKey = key;
    
    sessionStorage.removeItem(sessionKey);
    if (shouldKeepKeyForSession()) sessionStorage.setItem(sessionKey, key);
}

function setGoogleCx(cx) {
    runtimeGoogleSearchCx = cx;
    localStorage.setItem('op_google_cx', cx);
}

function clearLegacyStoredKeys() {
    localStorage.removeItem('op_gemini_key');
    localStorage.removeItem('op_deepseek_key');
}

function saveApiKey() {
    let key = document.getElementById('geminiApiKey').value.trim();
    if(key) { 
        setSecretKey('gemini', key);
        clearLegacyStoredKeys();
        document.getElementById('geminiApiKey').value = '';
        document.getElementById('keyWarningGemini').style.display = 'block';
        setTimeout(() => { document.getElementById('keyWarningGemini').style.display = 'none'; }, 4000);
    }
}

function saveDeepSeekKey() {
    let key = document.getElementById('deepseekApiKey').value.trim();
    if(key) { 
        setSecretKey('deepseek', key);
        clearLegacyStoredKeys();
        document.getElementById('deepseekApiKey').value = '';
        document.getElementById('keyWarningDeepSeek').style.display = 'block';
        setTimeout(() => { document.getElementById('keyWarningDeepSeek').style.display = 'none'; }, 4000);
    }
}

function saveGoogleSearchKey() {
    let key = document.getElementById('googleSearchApiKey').value.trim();
    let cx = document.getElementById('googleSearchCx').value.trim();
    if(key) { 
        setSecretKey('google', key);
        document.getElementById('googleSearchApiKey').value = '';
        document.getElementById('keyWarningGoogle').style.display = 'block';
        setTimeout(() => { document.getElementById('keyWarningGoogle').style.display = 'none'; }, 4000);
    }
    if(cx) {
        setGoogleCx(cx);
        document.getElementById('googleSearchCx').value = '';
    }
}

function clearGeminiKey() {
    runtimeGeminiKey = '';
    sessionStorage.removeItem('op_gemini_key_session');
    localStorage.removeItem('op_gemini_key');
    document.getElementById('geminiApiKey').value = '';
}

function clearDeepSeekKey() {
    runtimeDeepSeekKey = '';
    sessionStorage.removeItem('op_deepseek_key_session');
    localStorage.removeItem('op_deepseek_key');
    document.getElementById('deepseekApiKey').value = '';
}

function clearGoogleSearchKey() {
    runtimeGoogleSearchKey = '';
    runtimeGoogleSearchCx = '';
    sessionStorage.removeItem('op_google_key_session');
    localStorage.removeItem('op_google_cx');
    document.getElementById('googleSearchApiKey').value = '';
    document.getElementById('googleSearchCx').value = '';
}

function loadSettings() {
    clearLegacyStoredKeys();
    document.getElementById('geminiApiKey').value = "";
    document.getElementById('deepseekApiKey').value = "";
    document.getElementById('googleSearchApiKey').value = "";
    document.getElementById('googleSearchCx').value = getGoogleCx();
    if (document.getElementById('sessionKeyToggle')) {
        document.getElementById('sessionKeyToggle').checked = localStorage.getItem('op_key_session_mode') === '1';
    }
    if(localStorage.getItem('op_active_model')) {
        document.getElementById('activeModelSelect').value = localStorage.getItem('op_active_model');
    }
    checkApiCounter();
    checkDeepSeekCounter();
}

// Nativer Core-Wechsler für KI-Abfragen
async function executeKIEngine(prompt, base64Image = null) {
    let selectedModel = document.getElementById('activeModelSelect').value;
    
    if (selectedModel === 'gemini') {
        return await callGeminiAPI(prompt, base64Image);
    } else {
        return await callDeepSeekAPI(prompt, base64Image);
    }
}

async function callGeminiAPI(prompt, base64Image = null) {
    let key = getSecretKey('gemini');
    if(!key) { alert("Gemini API Key fehlt."); return null; }
    let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent`;
    let parts = [{ text: prompt }];
    if(base64Image) {
        let mimeMatch = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/);
        if (!mimeMatch) { alert('Ungültiges Bildformat.'); return null; }
        let mime = mimeMatch[1];
        let b64Data = base64Image.split(',')[1];
        parts.push({ inline_data: { mime_type: mime, data: b64Data } });
    }
    try {
        incrementApiCounter();
        let response = await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, 
            body: JSON.stringify({ contents: [{ parts }], tools: [{ "googleSearch": {} }] }) 
        });
        let data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
        if(data.error) throw new Error(data.error.message);
        let rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!rawText) throw new Error('Leere oder unerwartete Gemini-Antwort.');
        let jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (err) { alert("Gemini-Fehler: " + err.message); return null; }
}

async function callDeepSeekAPI(prompt, base64Image = null) {
    let key = getSecretKey('deepseek');
    if(!key) { alert("DeepSeek API Key fehlt."); return null; }
    if (base64Image) {
        alert("DeepSeek Vision ist in dieser Web-App nicht zuverlässig verfügbar. Bitte Gemini für Bildanalyse nutzen.");
        return null;
    }
    
    let messages = [];
    if(base64Image) {
        messages = [{
            role: "user",
            content: [
                { type: "text", text: prompt },
                { type: "image_url", image_url: { url: base64Image } }
            ]
        }];
    } else {
        messages = [{ role: "user", content: prompt }];
    }

    try {
        incrementDeepSeekCounter();
        let response = await fetch("https://api.deepseek.com/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: messages,
                response_format: { type: "json_object" }
            })
        });
        let data = await response.json();
        if (!response.ok) throw new Error(data?.error?.message || `HTTP ${response.status}`);
        if(data.error) throw new Error(data.error.message);
        let rawText = data?.choices?.[0]?.message?.content;
        if (!rawText) throw new Error('Leere oder unerwartete DeepSeek-Antwort.');
        let jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (err) { alert("DeepSeek-Fehler: " + err.message); return null; }
}

async function triggerKIExtraktion(barcode, prefilledTerm = "") {
    let name = prefilledTerm || await showKIInputModal(barcode, '');
    if(!name) return;
    let actualBarcode = barcode || ("MANUAL-" + Date.now().toString().slice(-6));
    openView('result');
    showLoading('Führe Websuche für Produktzutaten durch...');
    let snippets = await fetchWebSearchSnippets(name);
    
    showLoading('KI Pipeline gestartet. Analysiere Spezifikationen...');
    let searchContext = snippets.length > 0
        ? `Websuch-Ergebnisse:\n${snippets.join("\n\n")}`
        : "Nutze dein internes Wissen zur Ermittlung der Zutaten.";
        
    let promptText = `Du bist ein toxikologisches Analyse-Terminal. Ermittle die präzisen Inhaltsstoffe für das Produkt: "${name}" anhand der folgenden Suchergebnisse. 
    Übersetze alle gefundenen Zutaten und den Produktnamen immer vollständig und präzise ins Deutsche (z.B. "şeker" -> "Zucker", "ayçiçek yağı" -> "Sonnenblumenöl").
    
    ${searchContext}
    
    Antworte AUSSCHLIESSLICH in diesem JSON-Format: {"product_name": "Name", "ingredients_text": "Zutat 1, Zutat 2...", "category": "Nahrung"}. Setze category strikt auf "Nahrung" oder "Kosmetik".`;
    
    let resultJson = await executeKIEngine(promptText);
    if(resultJson) {
        let cat = resultJson.category === "Kosmetik" ? "Kosmetik (KI)" : "Nahrung (KI)";
        analyzeProduct({ product: { product_name: resultJson.product_name, ingredients_text: resultJson.ingredients_text, image_url: "" } }, cat, actualBarcode, true);
    } else {
        renderFallbackUI(actualBarcode, name, name);
    }
}

function processKIVision(file, barcode) {
    showLoading('Verarbeite Bildmatrix über aktive KI...');
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async function () {
        let promptText = `Analysiere dieses Bild. Erkenne das Produkt und ermittle die exakten Inhaltsstoffe. 
        Übersetze alle Zutaten und den Produktnamen immer vollständig und präzise ins Deutsche (z.B. "şeker" -> "Zucker", "ayçiçek yağı" -> "Sonnenblumenöl").
        Antworte AUSSCHLIESSLICH im JSON-Format: {"product_name": "Name", "ingredients_text": "Zutat 1, Zutat 2...", "category": "Nahrung"}. Setze category auf "Nahrung" oder "Kosmetik".`;
        let resultJson = await executeKIEngine(promptText, reader.result);
        if(resultJson) {
            let cat = resultJson.category === "Kosmetik" ? "Kosmetik (KI)" : "Nahrung (KI)";
            analyzeProduct({ product: { product_name: resultJson.product_name, ingredients_text: resultJson.ingredients_text, image_url: reader.result } }, cat, barcode, true);
        } else {
            renderFallbackUI(barcode);
        }
    };
}

// Offline OCR-Pipeline via Tesseract.js — extrahiert Zutatenliste aus Produktfotos
function processLocalOCR(file, productName, barcode, category) {
    showLoading('Optische Texterkennung gestartet...');
    Tesseract.recognize(
        file,
        'deu+eng',  // Deutsch + Englisch
        { logger: m => {
            if (m.status === 'recognizing text') {
                let progress = Math.round(m.progress * 100);
                showLoading(`OCR Fortschritt: ${progress}%`);
            }
        }}
    ).then(({ data: { text } }) => {
        if (!text || text.trim().length < 5) {
            renderFallbackUI(barcode, productName);
            return;
        }
        analyzeProduct({ 
            product: { 
                product_name: productName, 
                ingredients_text: text,
                image_url: "" 
            } 
        }, category || "Optisch (OCR)", barcode, true);
    }).catch(() => {
        renderFallbackUI(barcode, productName);
    });
}

function executeDatabaseSearch() {
    let term = document.getElementById('searchInput').value.trim();
    if(!term) return;
    openView('result');
    showLoading('Scanne Primär-Sektoren...');
    
    // Timeout nach 15s, falls API hängt
    let controller = new AbortController();
    let timeout = setTimeout(() => controller.abort(), 15000);
    
    fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=15`, { signal: controller.signal })
    .then(r => r.json()).then(data => {
        clearTimeout(timeout);
        if(data.products && data.products.length > 0) { renderSearchResults(data.products, "Nahrung", term); return; }
        // Sekundär: OpenBeautyFacts
        showLoading('Nahrungs-DB negativ. Scanne Kosmetik-Sektor...');
        let c2 = new AbortController();
        let t2 = setTimeout(() => c2.abort(), 15000);
        fetch(`https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=15`, { signal: c2.signal })
        .then(rb => rb.json()).then(dataB => {
            clearTimeout(t2);
            if(dataB.products && dataB.products.length > 0) { renderSearchResults(dataB.products, "Kosmetik", term); }
            else { let fakeId = "MANUAL-" + Date.now().toString().slice(-6); renderFallbackUI(fakeId, term, term); }
        }).catch(() => { clearTimeout(t2); let fakeId = "MANUAL-" + Date.now().toString().slice(-6); renderFallbackUI(fakeId, term, term); });
    }).catch(() => { clearTimeout(timeout); let fakeId = "MANUAL-" + Date.now().toString().slice(-6); renderFallbackUI(fakeId, term, term); });
}

// Rendert Suchergebnisse als klickbare Karten
function renderSearchResults(products, category, searchTerm) {
    window._searchResults = products;
    let html = products.map((p, i) => {
        let imgUrl = p.image_url || p.image_front_small_url || '';
        let imgHtml = imgUrl ? `<img src="${escapeHTML(imgUrl)}" class="res-img">` : `<div class="res-img" style="display:flex;align-items:center;justify-content:center;font-size:10px;color:#555;">NO IMG</div>`;
        let name = p.product_name || p.generic_name || 'Unbekanntes Objekt';
        let brand = p.brands || '';
        return `
        <div class="res-card search-result-card" onclick="analyzeSearchResult(${i}, ${jsArg(category)})">
            <div class="res-header">
                ${imgHtml}
                <div class="res-info">
                    <span class="res-badge">${escapeHTML(category)}</span>
                    <h3 class="res-title">${escapeHTML(name)}</h3>
                    ${brand ? `<div style="font-size:11px; color:var(--text-muted); margin-top:3px;">${escapeHTML(brand)}</div>` : ''}
                </div>
                <div style="color:var(--text-muted); font-size:20px;">→</div>
            </div>
        </div>`;
    }).join('');
    
    document.getElementById('result-content').innerHTML = 
        `<div style="color:var(--text-muted); font-size:11px; text-transform:uppercase; letter-spacing:1px; margin-bottom:10px;">${products.length} Ergebnisse für "${escapeHTML(searchTerm)}"</div>` +
        html;
}

function analyzeSearchResult(index, category) {
    let product = window._searchResults[index];
    if (product) {
        let barcode = product.code || ('SEARCH-' + Date.now());
        analyzeProduct({ product }, category, barcode, false);
    }
}

function fetchGoogleCSE(query) {
    return new Promise((resolve) => {
        let key = getSecretKey('google');
        let cx = getGoogleCx();
        if (!key || !cx) { resolve([]); return; }
        
        let callbackName = "googleSearchCallback_" + Math.floor(Math.random() * 1000000);
        window[callbackName] = function(data) {
            delete window[callbackName];
            document.getElementById(scriptId)?.remove();
            if (data && data.items) {
                let snippets = data.items.map(item => `${item.title}: ${item.snippet}`);
                resolve(snippets);
            } else {
                resolve([]);
            }
        };
        
        let scriptId = "googleSearchScript_" + Date.now();
        let script = document.createElement('script');
        script.id = scriptId;
        script.src = `https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&q=${encodeURIComponent(query)}&callback=${callbackName}`;
        script.onerror = function() {
            delete window[callbackName];
            script.remove();
            resolve([]);
        };
        document.body.appendChild(script);
    });
}

async function fetchDuckDuckGoScrape(query) {
    let url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    let proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    try {
        let response = await fetch(proxyUrl);
        if (!response.ok) return [];
        let json = await response.json();
        let html = json.contents;
        if (!html) return [];
        
        let parser = new DOMParser();
        let doc = parser.parseFromString(html, "text/html");
        let results = doc.querySelectorAll('.result__snippet');
        let snippets = [];
        results.forEach(el => {
            let text = el.textContent.trim();
            if (text) snippets.push(text);
        });
        return snippets.slice(0, 8);
    } catch (e) {
        console.error("DuckDuckGo fetch failed:", e);
        return [];
    }
}

async function fetchWebSearchSnippets(productName) {
    let query = `${productName} Zutaten Inhaltsstoffe ingredients`;
    let key = getSecretKey('google');
    let cx = getGoogleCx();
    if (key && cx) {
        return await fetchGoogleCSE(query);
    } else {
        return await fetchDuckDuckGoScrape(query);
    }
}
