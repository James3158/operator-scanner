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
    if(key) { localStorage.setItem('op_gemini_key', key); alert('Gemini Key im sandboxed Container abgelegt.'); }
}

function saveDeepSeekKey() {
    let key = document.getElementById('deepseekApiKey').value.trim();
    if(key) { localStorage.setItem('op_deepseek_key', key); alert('DeepSeek Key im sandboxed Container abgelegt.'); }
}

function loadSettings() {
    document.getElementById('geminiApiKey').value = localStorage.getItem('op_gemini_key') || "";
    document.getElementById('deepseekApiKey').value = localStorage.getItem('op_deepseek_key') || "";
    if(localStorage.getItem('op_active_model')) {
        document.getElementById('activeModelSelect').value = localStorage.getItem('op_active_model');
    }
    checkApiCounter();
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
    let key = localStorage.getItem('op_gemini_key');
    if(!key) { alert("Gemini API Key fehlt."); return null; }
    let url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${key}`;
    let parts = [{ text: prompt }];
    if(base64Image) {
        let mime = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,/)[1];
        let b64Data = base64Image.split(',')[1];
        parts.push({ inline_data: { mime_type: mime, data: b64Data } });
    }
    try {
        incrementApiCounter();
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
    } catch (err) { alert("Gemini-Fehler: " + err.message); return null; }
}

async function callDeepSeekAPI(prompt, base64Image = null) {
    let key = localStorage.getItem('op_deepseek_key');
    if(!key) { alert("DeepSeek API Key fehlt."); return null; }
    
    let messages = [];
    if(base64Image) {
        // Falls DeepSeek-Schnittstelle im Endpoint keine nativen Vision-Daten verarbeitet, Kapselung als multimodaler Payload
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
        if(data.error) throw new Error(data.error.message);
        let rawText = data.choices[0].message.content;
        let jsonStr = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (err) { alert("DeepSeek-Fehler: " + err.message); return null; }
}

async function triggerKIExtraktion(barcode, prefilledTerm = "") {
    let name = prefilledTerm || prompt("Marke und Produktname deklarieren:");
    if(!name) return;
    let actualBarcode = barcode || ("MANUAL-" + Date.now().toString().slice(-6));
    openView('result');
    document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="res-body" style="text-align:center;">KI Pipeline gestartet. Analysiere Spezifikationen...</div></div>`;
    
    let promptText = `Du bist ein toxikologisches Analyse-Terminal. Ermittle die präzisen Inhaltsstoffe für das Produkt: "${name}". Antworte AUSSCHLIESSLICH in diesem JSON-Format: {"product_name": "Name", "ingredients_text": "Zutat 1, Zutat 2...", "category": "Nahrung"}. Setze category strikt auf "Nahrung" oder "Kosmetik".`;
    let resultJson = await executeKIEngine(promptText);
    if(resultJson) {
        let cat = resultJson.category === "Kosmetik" ? "Kosmetik (KI)" : "Nahrung (KI)";
        analyzeProduct({ product: { product_name: resultJson.product_name, ingredients_text: resultJson.ingredients_text, image_url: "" } }, cat, actualBarcode, true);
    } else {
        renderFallbackUI(actualBarcode, name, name);
    }
}

function processKIVision(file, barcode) {
    document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="res-body" style="text-align:center;">Verarbeite Bildmatrix über aktive KI...</div></div>`;
    let reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async function () {
        let promptText = `Analysiere dieses Bild. Erkenne das Produkt, ermittle die exakten Inhaltsstoffe. Antworte AUSSCHLIESSLICH im JSON-Format: {"product_name": "Name", "ingredients_text": "Zutat 1, Zutat 2...", "category": "Nahrung"}. Setze category auf "Nahrung" oder "Kosmetik".`;
        let resultJson = await executeKIEngine(promptText, reader.result);
        if(resultJson) {
            let cat = resultJson.category === "Kosmetik" ? "Kosmetik (KI)" : "Nahrung (KI)";
            analyzeProduct({ product: { product_name: resultJson.product_name, ingredients_text: resultJson.ingredients_text, image_url: reader.result } }, cat, barcode, true);
        } else {
            renderFallbackUI(barcode);
        }
    };
}

function executeDatabaseSearch() {
    let term = document.getElementById('searchInput').value.trim();
    if(!term) return;
    openView('result');
    document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="res-body" style="text-align:center;">Scanne Primär-Sektoren...</div></div>`;
    
    fetch(`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=15`)
    .then(r => r.json()).then(data => {
        if(data.products && data.products.length > 0) renderSearchResults(data.products, "Nahrung", term);
        else {
            fetch(`https://world.openbeautyfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(term)}&search_simple=1&action=process&json=1&page_size=15`)
            .then(rb => rb.json()).then(dataB => {
                if(dataB.products && dataB.products.length > 0) renderSearchResults(dataB.products, "Kosmetik", term);
                else { let fakeId = "MANUAL-" + Date.now().toString().slice(-6); renderFallbackUI(fakeId, term, term); }
            });
        }
    }).catch(() => { let fakeId = "MANUAL-" + Date.now().toString().slice(-6); renderFallbackUI(fakeId, term, term); });
}