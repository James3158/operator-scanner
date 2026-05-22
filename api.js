function checkApiCounter() {
    let date = new Date().toLocaleDateString();
    let usageObj = JSON.parse(localStorage.getItem('op_api_usage')) || { date: date, count: 0 };
    if(usageObj.date !== date) usageObj = { date: date, count: 0 };
    if(document.getElementById('apiUsageCount')) document.getElementById('apiUsageCount').innerText = usageObj.count;
    localStorage.setItem('op_api_usage', JSON.stringify(usageObj));
    return usageObj.count;
}

function incrementApiCounter() {
    let date = new Date().toLocaleDateString();
    let usageObj = JSON.parse(localStorage.getItem('op_api_usage')) || { date: date, count: 0 };
    if(usageObj.date !== date) usageObj = { date: date, count: 0 };
    usageObj.count += 1;
    localStorage.setItem('op_api_usage', JSON.stringify(usageObj));
    if (document.getElementById('apiUsageCount')) document.getElementById('apiUsageCount').innerText = usageObj.count;
}

function resetApiCounter() {
    localStorage.setItem('op_api_usage', JSON.stringify({ date: new Date().toLocaleDateString(), count: 0 }));
    checkApiCounter();
}

function saveApiKey() {
    let key = document.getElementById('geminiApiKey').value.trim();
    if(key) { localStorage.setItem('op_gemini_key', key); alert('Schlüssel im sandboxed Container abgelegt.'); }
}

function loadSettings() {
    document.getElementById('geminiApiKey').value = localStorage.getItem('op_gemini_key') || "";
    checkApiCounter();
}

async function callGeminiAPI(prompt, base64Image = null) {
    let key = localStorage.getItem('op_gemini_key');
    if(!key) { alert("API Key Konfiguration unvollständig."); return null; }
    if(checkApiCounter() >= 1500) { alert("Tägliches Kontingent erschöpft."); return null; }

    incrementApiCounter();
    let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${key}`;
    let parts = [{ text: prompt }];
    if(base64Image) {
        let mime = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/)[1];
        let b64Data = base64Image.split(',')[1];
        parts.push({ inline_data: { mime_type: mime, data: b64Data } });
    }

    try {
        let response = await fetch(url, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ contents: [{ parts }], tools: [{ "googleSearch": {} }] }) 
        });
        let data = await response.json();
        if(data.error) throw new Error(data.error.message);
        
        let rawText = data.candidates[0].content.parts[0].text;
        let jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (err) {
        alert("Schnittstellen-Fehler: " + err.message); return null;
    }
}

async function triggerGeminiTextSearch(barcode, prefilledTerm = "") {
    let name = prefilledTerm || prompt("Marke und Produktname deklarieren:");
    if(!name) return;
    let actualBarcode = barcode || ("MANUAL-" + Date.now().toString().slice(-6));
    openView('result');
    document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="res-body" style="text-align:center;">Nutze Google Search Grounding um Fakten zu prüfen...</div></div>`;
    
    let promptText = `Recherchiere via Google Search die wahren Inhaltsstoffe für: "${name}". Antworte AUSSCHLIESSLICH in diesem JSON: {"product_name": "Name", "ingredients_text": "Zutat 1, Zutat 2...", "category": "Nahrung"}. Setze category auf "Nahrung" oder "Kosmetik".`;
    let resultJson = await callGeminiAPI(promptText);
    if(resultJson) {
        let cat = resultJson.category === "Kosmetik" ? "Kosmetik (KI)" : "Nahrung (KI)";
        analyzeProduct({ product: { product_name: resultJson.product_name, ingredients_text: resultJson.ingredients_text, image_url: "" } }, cat, actualBarcode, true);
    } else {
        renderFallbackUI(actualBarcode, name, name);
    }
}

function processGeminiVision(file, barcode) {
    document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="res-body" style="text-align:center;">Nutze Bild und Google Search Grounding...</div></div>`;
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async function () {
        let promptText = `Analysiere dieses Bild eines Produkts. Erkenne den Namen, nutze die Google Suche, um die GENAUEN Zutaten zu recherchieren. Bestimme ob es "Nahrung" oder "Kosmetik" ist. Antworte AUSSCHLIESSLICH in JSON: {"product_name": "Name", "ingredients_text": "Zutat 1...", "category": "Nahrung"}.`;
        let resultJson = await callGeminiAPI(promptText, reader.result);
        if(resultJson) {
            let cat = resultJson.category === "Kosmetik" ? "Kosmetik (KI)" : "Nahrung (KI)";
            analyzeProduct({ product: { product_name: resultJson.product_name, ingredients_text: resultJson.ingredients_text, image_url: reader.result } }, cat, barcode, true);
        } else {
            renderFallbackUI(barcode);
        }
    };
}

function processLocalOCR(file, productName, barcode, imgUrlFinal) {
    document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="status-bar st-alert">OCR Analysator aktiv...</div></div>`;
    Tesseract.recognize(file, 'deu+eng').then(({ data: { text } }) => {
        analyzeProduct({ product: { product_name: productName, ingredients_text: text, image_url: imgUrlFinal } }, "Optisch", barcode, true);
    }).catch(() => { renderFallbackUI(barcode, productName); });
}

function renderSearchResults(products, categoryStr, originalTerm) {
    let html = `
        <div class="res-card" style="padding:15px; margin-bottom:15px;">
            <div style="font-size:12px; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:10px;">Suche: [${escapeHTML(originalTerm)}]</div>
            <button class="gemini-btn" style="margin:0 0 5px 0; padding:12px; font-size:12px;" onclick="triggerGeminiTextSearch('', '${escapeHTML(originalTerm)}')">🧠 KI Grounding-Suche erzwingen</button>
        </div>`;
    products.forEach(p => {
        let name = p.product_name || "Unbekannt"; let img = p.image_front_small_url || p.image_url || "";
        let imgHtml = img ? `<img src="${escapeHTML(img)}" class="hist-img">` : `<div class="hist-img" style="display:flex;align-items:center;justify-content:center;font-size:8px;color:#555;">NO IMG</div>`;
        let safeData = encodeURIComponent(JSON.stringify(p));
        html += `
        <div class="hist-item" style="margin-bottom:10px;" onclick="selectSearchResult('${escapeHTML(p.code || name)}', '${escapeHTML(categoryStr)}', '${safeData}')">
            ${imgHtml}
            <div class="hist-info"><div style="font-size:14px; font-weight:700; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(name)}</div><div style="font-size:11px; color:var(--text-muted);">${escapeHTML(p.brands || 'Keine Marke')}</div></div>
        </div>`;
    });
    document.getElementById('result-content').innerHTML = html;
}

function selectSearchResult(barcode, category, dataStr) {
    analyzeProduct({status: 1, product: JSON.parse(decodeURIComponent(dataStr))}, category, barcode);
}

async function fetchDataCascade(barcode) {
    try {
        let resOFF = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
        if(resOFF.ok) {
            let dataOFF = await resOFF.json();
            if(dataOFF.status === 1) { analyzeProduct(dataOFF, "Nahrung", barcode); return; }
        }
    } catch(e) {}
    try {
        let resOBF = await fetch(`https://world.openbeautyfacts.org/api/v0/product/${barcode}.json`);
        if(resOBF.ok) {
            let dataOBF = await resOBF.json();
            if(dataOBF.status === 1) { analyzeProduct(dataOBF, "Kosmetik", barcode); return; }
        }
    } catch(e) {}
    renderFallbackUI(barcode);
}
