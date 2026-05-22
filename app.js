let html5QrCode; 
let currentHistoryFilter = 'Alle';
let viewStack = ['home']; 
let activeArchiveInjectBarcode = "";

function toggleTheme(checkbox) {
    if (checkbox.checked) {
        document.documentElement.classList.add('light-theme');
        localStorage.setItem('op_theme', 'light');
    } else {
        document.documentElement.classList.remove('light-theme');
        localStorage.setItem('op_theme', 'dark');
    }
}

function initTheme() {
    let savedTheme = localStorage.getItem('op_theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
        if(document.getElementById('themeToggleCheckbox')) document.getElementById('themeToggleCheckbox').checked = true;
    }
}

function openModal(title, desc, detail, isAlert) {
    document.getElementById('mod-title').innerText = title;
    document.getElementById('mod-desc').innerText = desc;
    document.getElementById('mod-desc').style.color = isAlert ? "var(--alert)" : "var(--matrix-green)";
    document.getElementById('mod-detail').innerText = detail;
    document.getElementById('detailModalOverlay').style.display = 'block';
    setTimeout(() => {
        document.getElementById('detailModalOverlay').style.opacity = '1';
        document.getElementById('detailModal').style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
}

function closeModal() {
    document.getElementById('detailModalOverlay').style.opacity = '0';
    document.getElementById('detailModal').style.transform = 'translateX(-50%) translateY(100%)';
    setTimeout(() => { document.getElementById('detailModalOverlay').style.display = 'none'; }, 300);
}

function openView(viewName, isBackAction = false) {
    if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(() => {});
    }
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    if (!isBackAction) {
        if (viewStack[viewStack.length - 1] !== viewName) viewStack.push(viewName);
    }
    document.getElementById('backBtn').style.display = viewStack.length > 1 ? 'block' : 'none';
    document.getElementById('view-' + viewName).classList.add('active');
    if(document.getElementById('nav-' + viewName)) document.getElementById('nav-' + viewName).classList.add('active');
    if(viewName === 'scan') { document.getElementById('startBtn').style.display = 'block'; document.getElementById('reader').style.display = 'none'; }
    if(viewName === 'history') renderHistory();
    if(viewName === 'settings') loadSettings();
}

function goBack() {
    if (viewStack.length > 1) {
        viewStack.pop(); 
        openView(viewStack[viewStack.length - 1], true);
    }
}

function startScanner() {
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('reader').style.display = 'block';
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 20, useBarCodeDetectorIfSupported: true, videoConstraints: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } }, onScanSuccess).catch(() => {
        alert("Hardware-Zugriff verweigert."); goBack();
    });
}

function onScanSuccess(decodedText) {
    if (html5QrCode?.isScanning) {
        html5QrCode.stop().then(() => {
            openView('result');
            document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="res-body" style="text-align:center;">Analisiere Signatur [${escapeHTML(decodedText)}]...</div></div>`;
            fetchDataCascade(decodedText);
        }).catch(() => {});
    }
}

function triggerArchiveImageInject(event, barcode) {
    event.stopPropagation();
    activeArchiveInjectBarcode = barcode;
    document.getElementById('archiveImageInjectorInput').click();
}

function saveToHistory(barcode, name, score, category, rawIngredients, imgUrl) {
    let history = JSON.parse(localStorage.getItem('op_history')) || [];
    history = history.filter(item => item.barcode !== barcode);
    let mainCategory = "Nahrung";
    if (category.includes("Kosmetik")) mainCategory = "Kosmetik";
    if (category.includes("Optisch") || category.includes("OCR") || category.includes("KI")) mainCategory = "Optisch";
    history.unshift({ barcode, name, score, category: mainCategory, rawIngredients, imageUrl: imgUrl, date: new Date().toLocaleDateString() });
    if (history.length > 100) history.pop();
    try { localStorage.setItem('op_history', JSON.stringify(history)); } catch (e) {}
}

function filterHistory(category, btnId) {
    currentHistoryFilter = category;
    document.querySelectorAll('.flt-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    renderHistory();
}

function deleteHistoryItem(event, barcode) {
    event.stopPropagation();
    let history = JSON.parse(localStorage.getItem('op_history')) || [];
    history = history.filter(item => item.barcode !== barcode);
    localStorage.setItem('op_history', JSON.stringify(history));
    renderHistory();
}

function clearHistory() {
    if(confirm("Lokal-Archiv komplett löschen?")) { localStorage.removeItem('op_history'); renderHistory(); }
}

function renderHistory() {
    let history = JSON.parse(localStorage.getItem('op_history')) || [];
    let html = '';
    let filtered = currentHistoryFilter === 'Alle' ? history : history.filter(item => item.category === currentHistoryFilter);

    if (filtered.length === 0) { html = '<div style="text-align:center;color:#666;padding:20px;">Archiv leer.</div>'; } 
    else {
        filtered.forEach(item => {
            let sColor = item.score >= 80 ? 'var(--matrix-green)' : (item.score >= 40 ? '#ffcc00' : 'var(--alert)');
            let imgHtml = item.imageUrl ? `<img src="${escapeHTML(item.imageUrl)}" class="hist-img">` : `<div class="hist-img" style="display:flex;align-items:center;justify-content:center;font-size:7px;color:#555;text-align:center;background:#000;">NO<br>IMG</div>`;
            
            html += `
            <div class="hist-item" onclick="loadFromArchive('${escapeHTML(item.barcode)}')">
                <div class="hist-img-container">
                    ${imgHtml}
                    <div class="hist-img-upload-trigger" onclick="triggerArchiveImageInject(event, '${escapeHTML(item.barcode)}')">➕ FOTO</div>
                </div>
                <div class="hist-info"><span class="res-badge" style="margin-bottom:3px;">${escapeHTML(item.category)}</span><div style="font-size:15px; font-weight:700; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(item.name)}</div><div style="font-size:11px; color:var(--text-muted);">${escapeHTML(item.date)}</div></div>
                <div class="hist-score" style="color:${sColor}; margin-right:30px;">${item.score}</div>
                <button class="hist-delete" onclick="deleteHistoryItem(event, '${escapeHTML(item.barcode)}')">DELETE</button>
                    </div>`;
        });
    }
    document.getElementById('history-list').innerHTML = html;
}

function loadFromArchive(barcode) {
    openView('result');
    document.getElementById('result-content').innerHTML = `<div class="res-card"><div class="res-body" style="text-align:center;">Lade Archiv...</div></div>`;
    let history = JSON.parse(localStorage.getItem('op_history')) || [];
    let item = history.find(i => i.barcode === barcode);
    if (item && item.rawIngredients) analyzeProduct({ product: { product_name: item.name, ingredients_text: item.rawIngredients, image_url: item.imageUrl } }, item.category, barcode, true);
    else fetchDataCascade(barcode);
}

function renderFallbackUI(barcode, productName = "", searchTerm = "") {
    document.getElementById('result-content').innerHTML = `
        <div class="res-card">
            <div class="status-bar st-alert">Primär-Datenbanken isoliert.</div>
            <div class="res-body" style="display:flex; flex-direction:column; gap:12px;">
                <p style="font-size:13px; color:var(--text-muted); margin-top:0;">Objekt nicht erfasst. Befehl wählen:</p>
                <button class="action-btn ocr-btn" onclick="document.getElementById('ocrInputText').click()">📸 1. Offline Text-Scan (OCR)</button>
                <div style="width:100%; text-align:center; color:#555; font-size:11px; margin:5px 0;">-- OVERRIDE VIA GROUNDING ENGINE --</div>
                <button class="gemini-btn" onclick="triggerGeminiTextSearch('${escapeHTML(barcode)}', '${escapeHTML(searchTerm)}')">🧠 2. KI: Identität eintippen</button>
                <div style="display:flex; gap:10px;">
                    <button class="gemini-vision-btn" style="flex:1; padding:12px;" onclick="document.getElementById('geminiVisionCamera').click()">👁️ Kamera</button>
                    <button class="gemini-vision-btn" style="flex:1; padding:12px; background:#333;" onclick="document.getElementById('geminiVisionGallery').click()">🖼️ Galerie</button>
                </div>
            </div>
        </div>`;
        
    document.getElementById('ocrInputText').onchange = (e) => { if(e.target.files.length > 0) processLocalOCR(e.target.files[0], productName || searchTerm || "Unbekanntes Objekt", barcode, ""); };
    document.getElementById('geminiVisionCamera').onchange = (e) => { if(e.target.files.length > 0) processGeminiVision(e.target.files[0], barcode); };
    document.getElementById('geminiVisionGallery').onchange = (e) => { if(e.target.files.length > 0) processGeminiVision(e.target.files[0], barcode); };
}

// Boot-Sequenz & Event-Binding
let dbTimestamp = new Date().getTime();
Promise.all([
    fetch('blacklist.json?v=' + dbTimestamp).then(r => r.json()),
    fetch('whitelist.json?v=' + dbTimestamp).then(r => r.json())
]).then(data => {
    blacklist = data[0]; whitelist = data[1]; dbActive = true;
    if (document.getElementById('db-status')) document.getElementById('db-status').style.display = 'none';
    initTheme();
}).catch(() => { if (document.getElementById('db-status')) document.getElementById('db-status').style.display = 'block'; });

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('nav-home').addEventListener('click', () => openView('home'));
    document.getElementById('nav-scan').addEventListener('click', () => openView('scan'));
    document.getElementById('nav-search').addEventListener('click', () => openView('search'));
    document.getElementById('nav-history').addEventListener('click', () => openView('history'));
    document.getElementById('nav-settings').addEventListener('click', () => openView('settings'));

    document.getElementById('card-scan').addEventListener('click', () => openView('scan'));
    document.getElementById('card-search').addEventListener('click', () => openView('search'));
    document.getElementById('card-history').addEventListener('click', () => openView('history'));

    document.getElementById('flt-alle').addEventListener('click', () => filterHistory('Alle', 'flt-alle'));
    document.getElementById('flt-nahrung').addEventListener('click', () => filterHistory('Nahrung', 'flt-nahrung'));
    document.getElementById('flt-kosmetik').addEventListener('click', () => filterHistory('Kosmetik', 'flt-kosmetik'));
    document.getElementById('flt-optisch').addEventListener('click', () => filterHistory('Optisch', 'flt-optisch'));

    document.getElementById('themeToggleCheckbox').addEventListener('change', (e) => toggleTheme(e.target));
    document.getElementById('saveApiKeyBtn').addEventListener('click', saveApiKey);
    document.getElementById('resetApiCounterBtn').addEventListener('click', resetApiCounter);
    document.getElementById('startBtn').addEventListener('click', startScanner);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    document.getElementById('detailModalOverlay').addEventListener('click', closeModal);

    document.getElementById('archiveImageInjectorInput').onchange = function(e) {
        if(e.target.files.length === 0 || !activeArchiveInjectBarcode) return;
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = function(event) {
            let img = new Image();
            img.src = event.target.result;
            img.onload = function() {
                let canvas = document.createElement('canvas');
                let ctx = canvas.getContext('2d');
                let max_size = 120; let width = img.width; let height = img.height;
                if (width > height) { if (width > max_size) { height *= max_size / width; width = max_size; } } 
                else { if (height > max_size) { width *= max_size / height; height = max_size; } }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                let compressedBase64 = canvas.toDataURL('image/jpeg', 0.5);
                let history = JSON.parse(localStorage.getItem('op_history')) || [];
                let item = history.find(i => i.barcode === activeArchiveInjectBarcode);
                if(item) {
                    item.imageUrl = compressedBase64;
                    localStorage.setItem('op_history', JSON.stringify(history));
                    renderHistory();
                }
            };
        };
    };
});
