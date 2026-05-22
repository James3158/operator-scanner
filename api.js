// Lokaler Monitor für API-Limitierung
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

// REST-Call an Google-Infrastruktur mit Search Grounding Befehl
async function callGeminiAPI(prompt, base64Image = null) {
    let key = localStorage.getItem('op_gemini_key');
    if(!key) { alert("API Key Konfiguration unvollständig."); return null; }
    if(checkApiCounter() >= 1500) { alert("Tägliches Freikontingent erschöpft."); return null; }

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
        alert("Schnittstellen-Fehler: " + err.message); 
        return null;
    }
}

async function triggerGeminiTextSearch(barcode, prefilledTerm = "") {
    let name = prefilledTerm || prompt("Marke und Produktname deklarieren:");
    if(!name) return;
    let actualBarcode = barcode || ("MANUAL-" + Date.now().toString().slice(-6));
    openView('result');
    document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="res-body" style="text-align:center;">Führe Live-Internetrecherche durch (Grounding)...</div></div>`;
    
    let promptText = `Recherchiere via Google Search die wahren Inhaltsstoffe für: "${name}". Antworte AUSSCHLIESSLICH in diesem JSON: {"product_name": "Name", "ingredients_text": "Zutat 1, Zutat 2...", "category": "Nahrung"}. Setze category auf "Nahrung" oder "Kosmetik".`;
    let resultJson = await callGeminiAPI(promptText);
    if(resultJson) analyzeProduct({ product: { product_name: resultJson.product_name, ingredients_text: resultJson.ingredients_text, image_url: "" } }, resultJson.category + " (KI)", actualBarcode, true);
    else renderFallbackUI(actualBarcode, name, name);
}

function processGeminiVision(file, barcode) {
    document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="res-body" style="text-align:center;">Übermittle Bildmatrix an Google Vision-Schnittstelle...</div></div>`;
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async function () {
        let promptText = `Analysiere dieses Bild eines Produkts. Erkenne den Namen, nutze die Google Suche, um die GENAUEN Zutaten zu recherchieren. Bestimme ob es "Nahrung" oder "Kosmetik" ist. Antworte AUSSCHLIESSLICH in JSON: {"product_name": "Name", "ingredients_text": "Zutat 1...", "category": "Nahrung"}.`;
        let resultJson = await callGeminiAPI(promptText, reader.result);
        if(resultJson) analyzeProduct({ product: { product_name: resultJson.product_name, ingredients_text: resultJson.ingredients_text, image_url: reader.result } }, resultJson.category + " (KI)", barcode, true);
        else renderFallbackUI(barcode);
    };
}

function processLocalOCR(file, productName, barcode, imgUrlFinal) {
    document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="status-bar st-alert">Lokale Tesseract OCR Engine aktiv...</div></div>`;
    Tesseract.recognize(file, 'deu+eng').then(({ data: { text } }) => {
        analyzeProduct({ product: { product_name: productName, ingredients_text: text, image_url: imgUrlFinal } }, "Optisch", barcode, true);
    }).catch(() => { renderFallbackUI(barcode, productName); });
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
