let html5QrCode; 
let currentHistoryFilter = 'Alle';
let viewStack = ['home']; 
let activeArchiveInjectBarcode = "";

function fetchJsonWithTimeout(url, timeoutMs = 15000) {
    let controller = new AbortController();
    let timeout = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { signal: controller.signal })
        .then(response => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        })
        .finally(() => clearTimeout(timeout));
}

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

function openModal(title, desc, detail, isAlertOrSeverity) {
    document.getElementById('mod-title').innerText = title;
    document.getElementById('mod-desc').innerText = desc;
    
    let severity = "";
    let isGood = false;
    let isAlternative = false;
    
    if (typeof isAlertOrSeverity === 'boolean') {
        if (isAlertOrSeverity) severity = "medium";
        else isGood = true;
    } else if (typeof isAlertOrSeverity === 'string') {
        if (['high', 'medium', 'low'].includes(isAlertOrSeverity)) {
            severity = isAlertOrSeverity;
        } else if (isAlertOrSeverity === 'good') {
            isGood = true;
        } else if (isAlertOrSeverity === 'alternative') {
            isAlternative = true;
        }
    }
    
    const hazardContainer = document.getElementById('mod-hazard-container');
    const hazardFill = document.getElementById('mod-hazard-fill');
    const hazardLabel = document.getElementById('mod-hazard-label');
    
    if (severity) {
        hazardContainer.style.display = 'block';
        hazardFill.className = 'hazard-bar-fill';
        if (severity === 'high') {
            document.getElementById('mod-desc').style.color = "var(--alert)";
            hazardLabel.innerText = "Kritisch (Neurotoxin / Karzinogen)";
            hazardLabel.style.color = "var(--alert)";
            hazardFill.classList.add('hazard-high');
            hazardFill.style.width = '100%';
        } else if (severity === 'medium') {
            document.getElementById('mod-desc').style.color = "var(--warn)";
            hazardLabel.innerText = "Mittel (Entzündung / Hormon-Gefahr)";
            hazardLabel.style.color = "var(--warn)";
            hazardFill.classList.add('hazard-medium');
            hazardFill.style.width = '60%';
        } else if (severity === 'low') {
            document.getElementById('mod-desc').style.color = "var(--matrix-green)";
            hazardLabel.innerText = "Niedrig (Füllstoff / Milde Belastung)";
            hazardLabel.style.color = "var(--matrix-green)";
            hazardFill.classList.add('hazard-low');
            hazardFill.style.width = '30%';
        }
    } else {
        hazardContainer.style.display = 'none';
        if (isGood) {
            document.getElementById('mod-desc').style.color = "var(--matrix-green)";
        } else if (isAlternative) {
            document.getElementById('mod-desc').style.color = "var(--gemini-blue)";
        } else {
            document.getElementById('mod-desc').style.color = "var(--text-muted)";
        }
    }
    
    document.getElementById('mod-detail').innerText = detail;
    document.getElementById('detailModalOverlay').style.display = 'block';
    setTimeout(() => {
        document.getElementById('detailModalOverlay').style.opacity = '1';
        document.getElementById('detailModal').style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
}

function updateCoreStatusBadge() {
    let keyActive = typeof getSecretKey === 'function' && (getSecretKey('gemini') || getSecretKey('deepseek'));
    let badge = document.getElementById('coreStatusBadge');
    if (badge) {
        if (keyActive) {
            badge.innerText = "KI-CORE ACTIVE";
            badge.className = "core-status-badge core-status-ki";
        } else {
            badge.innerText = "OFFLINE-CORE ACTIVE";
            badge.className = "core-status-badge core-status-offline";
        }
    }
}

function closeModal() {
    document.getElementById('detailModalOverlay').style.opacity = '0';
    document.getElementById('detailModal').style.transform = 'translateX(-50%) translateY(100%)';
    setTimeout(() => { document.getElementById('detailModalOverlay').style.display = 'none'; }, 300);
}

function openDrawer() {
    loadSettings();
    renderCustomToxinList();
    document.getElementById('sideDrawerOverlay').style.display = 'block';
    setTimeout(() => {
        document.getElementById('sideDrawerOverlay').style.opacity = '1';
        document.getElementById('sideDrawer').style.transform = 'translateX(0)';
    }, 10);
}

function closeDrawer() {
    document.getElementById('sideDrawerOverlay').style.opacity = '0';
    document.getElementById('sideDrawer').style.transform = 'translateX(-100%)';
    setTimeout(() => {
        document.getElementById('sideDrawerOverlay').style.display = 'none';
    }, 300);
}

function openView(viewName, isBackAction = false) {
    if (viewName === 'settings') {
        openDrawer();
        return;
    }
    if (html5QrCode?.isScanning) {
        html5QrCode.stop().catch(() => {});
    }
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    if (!isBackAction) {
        if (viewStack[viewStack.length - 1] !== viewName) viewStack.push(viewName);
    }
    
    const showBack = viewStack.length > 1;
    document.getElementById('backBtn').style.display = showBack ? 'block' : 'none';
    if (document.getElementById('burgerBtn')) {
        document.getElementById('burgerBtn').style.display = 'flex';
    }
    
    document.getElementById('view-' + viewName).classList.add('active');
    if(document.getElementById('nav-' + viewName)) document.getElementById('nav-' + viewName).classList.add('active');
    if(viewName === 'scan') { document.getElementById('startBtn').style.display = 'block'; document.getElementById('reader').style.display = 'none'; }
    if(viewName === 'history') renderHistory();
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
    document.getElementById('torchToggleBtn').style.display = 'block';
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 20, useBarCodeDetectorIfSupported: true, videoConstraints: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } }, onScanSuccess).catch(() => {
        document.getElementById('startBtn').style.display = 'block';
        document.getElementById('reader').style.display = 'none';
        document.getElementById('torchToggleBtn').style.display = 'none';
        alert("Hardware-Zugriff verweigert.");
    });
}

function onScanSuccess(decodedText) {
    if (html5QrCode?.isScanning) {
        html5QrCode.stop().then(() => {
            openView('result');
            showLoading(`Analysiere Signatur [${escapeHTML(decodedText)}]...`);
            fetchDataCascade(decodedText);
        }).catch(() => {});
    }
}

// Zentrale Barcode-Kaskade: OpenFoodFacts → OpenBeautyFacts → Fallback
function fetchDataCascade(barcode) {
    // Primär: OpenFoodFacts
    fetchJsonWithTimeout(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`)
    .then(data => {
        if (data.status === 1 && data.product) {
            analyzeProduct(data, "Nahrung", barcode, false);
        } else {
            // Sekundär: OpenBeautyFacts
            fetchJsonWithTimeout(`https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`)
            .then(dataB => {
                if (dataB.status === 1 && dataB.product) {
                    analyzeProduct(dataB, "Kosmetik", barcode, false);
                } else {
                    renderFallbackUI(barcode);
                }
            }).catch(() => renderFallbackUI(barcode));
        }
    }).catch(() => {
        // Selbst wenn OFF down ist, BeautyFacts versuchen
        fetchJsonWithTimeout(`https://world.openbeautyfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`)
        .then(dataB => {
            if (dataB.status === 1 && dataB.product) {
                analyzeProduct(dataB, "Kosmetik", barcode, false);
            } else {
                renderFallbackUI(barcode);
            }
        }).catch(() => renderFallbackUI(barcode));
    });
}

function triggerArchiveImageInject(event, barcode) {
    event.stopPropagation();
    activeArchiveInjectBarcode = barcode;
    document.getElementById('archiveImageInjectorInput').click();
}

function saveToHistory(barcode, name, score, category, rawIngredients, imgUrl, kiSummary = "") {
    let history = getHistory();
    history = history.filter(item => item.barcode !== barcode);
    let mainCategory = "Nahrung";
    if (category.includes("Kosmetik")) mainCategory = "Kosmetik";
    if (category.includes("Optisch") || category.includes("OCR") || category.includes("KI")) mainCategory = "Optisch";
    history.unshift({ 
        barcode, 
        name, 
        score, 
        category: mainCategory, 
        rawIngredients, 
        imageUrl: imgUrl, 
        kiSummary: kiSummary, 
        dateIso: new Date().toISOString() 
    });
    if (history.length > 100) history.pop();
    saveHistory(history);
}

function filterHistory(category, btnId) {
    currentHistoryFilter = category;
    document.querySelectorAll('.flt-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(btnId).classList.add('active');
    renderHistory();
}

function deleteHistoryItem(event, barcode) {
    event.stopPropagation();
    let history = getHistory();
    history = history.filter(item => item.barcode !== barcode);
    saveHistory(history);
    renderHistory();
}

function clearHistory() {
    if(confirm("Lokal-Archiv komplett löschen?")) { localStorage.removeItem('op_history'); renderHistory(); }
}

function renderHistory() {
    let history = getHistory();
    let html = '';
    let filtered = currentHistoryFilter === 'Alle' ? history : history.filter(item => item.category === currentHistoryFilter);

    if (filtered.length === 0) { html = '<div style="text-align:center;color:#666;padding:20px;">Archiv leer.</div>'; } 
    else {
        filtered.forEach(item => {
            let sColor = item.score >= 80 ? 'var(--matrix-green)' : (item.score >= 40 ? 'var(--warn)' : 'var(--alert)');
            let imgHtml = item.imageUrl ? `<img src="${escapeHTML(item.imageUrl)}" class="hist-img" alt="">` : `<div class="hist-img" style="display:flex;align-items:center;justify-content:center;font-size:7px;color:#555;text-align:center;background:#000;">NO<br>IMG</div>`;
            
            html += `
            <div class="hist-item" onclick="loadFromArchive(${jsArg(item.barcode)})">
                <div class="hist-img-container">
                    ${imgHtml}
                    <div class="hist-img-upload-trigger" onclick="triggerArchiveImageInject(event, ${jsArg(item.barcode)})">➕ FOTO</div>
                </div>
                <div class="hist-info"><span class="res-badge" style="margin-bottom:3px;">${escapeHTML(item.category)}</span><div style="font-size:15px; font-weight:700; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHTML(item.name)}</div><div style="font-size:11px; color:var(--text-muted);">${escapeHTML(item.date)}</div></div>
                <div class="hist-score" style="color:${sColor}; margin-right:30px;">${item.score}</div>
                <button class="hist-delete" onclick="deleteHistoryItem(event, ${jsArg(item.barcode)})">DELETE</button>
                    </div>`;
        });
    }
    document.getElementById('history-list').innerHTML = html;
}

function loadFromArchive(barcode) {
    openView('result');
    showLoading('Lade Archiv...');
    let history = getHistory();
    let item = history.find(i => i.barcode === barcode);
    if (item && item.rawIngredients) {
        analyzeProduct({ 
            product: { 
                product_name: item.name, 
                ingredients_text: item.rawIngredients, 
                image_url: item.imageUrl,
                ki_summary: item.kiSummary || "" 
            } 
        }, item.category, barcode, true);
    } else {
        fetchDataCascade(barcode);
    }
}

function renderFallbackUI(barcode, productName = "", searchTerm = "") {
    document.getElementById('result-content').innerHTML = `
        <div class="res-card">
            <div class="status-bar st-alert">Primär-Datenbanken isoliert.</div>
            <div class="res-body" style="display:flex; flex-direction:column; gap:12px;">
                <p style="font-size:13px; color:var(--text-muted); margin-top:0;">Objekt nicht erfasst. Befehl wählen:</p>
                <button class="action-btn ocr-btn" onclick="document.getElementById('ocrInputText').click()">📸 1. Offline Text-Scan (OCR)</button>
                <div style="width:100%; text-align:center; color:#555; font-size:11px; margin:5px 0;">-- OVERRIDE VIA KI ENGINE --</div>
                <button class="gemini-btn" onclick="triggerKIExtraktion(${jsArg(barcode)}, ${jsArg(searchTerm)})">🌐 2. Web-Suche & KI-Analyse</button>
                <div style="display:flex; gap:10px;">
                    <button class="gemini-vision-btn" style="flex:1; padding:12px;" onclick="document.getElementById('geminiVisionCamera').click()">👁️ Kamera</button>
                    <button class="gemini-vision-btn" style="flex:1; padding:12px; background:#333;" onclick="document.getElementById('geminiVisionGallery').click()">🖼️ Galerie</button>
                </div>
            </div>
        </div>`;
        
    document.getElementById('ocrInputText').onchange = (e) => { if(e.target.files.length > 0) processLocalOCR(e.target.files[0], productName || searchTerm || "Unbekanntes Objekt", barcode, ""); };
    document.getElementById('geminiVisionCamera').onchange = (e) => { if(e.target.files.length > 0) processKIVision(e.target.files[0], barcode); };
    document.getElementById('geminiVisionGallery').onchange = (e) => { if(e.target.files.length > 0) processKIVision(e.target.files[0], barcode); };
}

// ─── FEATURE: Schnellbewertung Offline ───
function executeQuickScan() {
    let ingredients = document.getElementById('quickScanInput').value.trim();
    if (!ingredients) { alert('Zutatenliste eingeben.'); return; }
    let productName = document.getElementById('quickScanName').value.trim() || 'Schnellbewertung';
    let fakeBarcode = 'QUICK-' + Date.now().toString().slice(-6);
    openView('result');
    analyzeProduct({ product: { product_name: productName, ingredients_text: ingredients, image_url: '' } }, 'Offline-Analyse', fakeBarcode, true);
}

// ─── FEATURE: Export / Import ───
function exportHistory() {
    let history = getHistory();
    let customToxins = typeof getCustomToxins === 'function' ? getCustomToxins() : {};
    let exportData = {
        history: history,
        customToxins: customToxins
    };
    let blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    let url = URL.createObjectURL(blob);
    let a = document.createElement('a');
    a.href = url;
    a.download = `operator-archiv-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importHistory(file) {
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            let parsed = JSON.parse(e.target.result);
            let importList = [];
            let importCustom = {};
            
            if (Array.isArray(parsed)) {
                importList = parsed;
            } else if (parsed && typeof parsed === 'object') {
                importList = parsed.history || [];
                importCustom = parsed.customToxins || {};
            } else {
                throw new Error('Ungültiges Format');
            }
            
            let existing = getHistory();
            let merged = importList.map(normalizeHistoryItem).filter(Boolean);
            existing.forEach(item => {
                if (!merged.find(m => m.barcode === item.barcode)) merged.push(item);
            });
            merged = merged.slice(0, 100);
            saveHistory(merged);
            
            if (Object.keys(importCustom).length > 0) {
                let currentCustom = typeof getCustomToxins === 'function' ? getCustomToxins() : {};
                let mergedCustom = Object.assign({}, currentCustom, importCustom);
                writeJsonStorage('op_custom_toxins', mergedCustom);
                if (typeof renderCustomToxinList === 'function') renderCustomToxinList();
            }
            
            renderHistory();
            alert(`${merged.length} Einträge und ${Object.keys(importCustom).length} Custom-Toxine importiert.`);
        } catch (err) { alert('Import fehlgeschlagen: Ungültige JSON-Datei oder falsches Format.'); }
    };
    reader.readAsText(file);
}

// ─── FEATURE: Custom Toxine ───
function getCustomToxins() {
    return readJsonStorage('op_custom_toxins', {});
}

function addCustomToxin() {
    let name = document.getElementById('customToxinName').value.trim().toLowerCase();
    let aliasesRaw = document.getElementById('customToxinAliases').value.trim();
    let severity = document.getElementById('customToxinSeverity').value;
    let desc = document.getElementById('customToxinDesc').value.trim();
    let detail = document.getElementById('customToxinDetail').value.trim();
    if (!name || !aliasesRaw) { alert('Name und Aliase erforderlich.'); return; }
    
    let customToxins = getCustomToxins();
    let key = name.replace(/\s+/g, '_');
    customToxins[key] = {
        aliases: aliasesRaw.split(',').map(s => s.trim()).filter(Boolean),
        severity: severity,
        desc: desc || 'Custom Toxin',
        detail: detail || 'Benutzerdefiniertes Toxin.'
    };
    writeJsonStorage('op_custom_toxins', customToxins);
    renderCustomToxinList();
    // Felder leeren
    ['customToxinName','customToxinAliases','customToxinDesc','customToxinDetail'].forEach(id => document.getElementById(id).value = '');
}

function removeCustomToxin(key) {
    let customToxins = getCustomToxins();
    delete customToxins[key];
    writeJsonStorage('op_custom_toxins', customToxins);
    renderCustomToxinList();
}

function renderCustomToxinList() {
    let customToxins = getCustomToxins();
    let html = '';
    for (let key in customToxins) {
        html += `<span class="custom-toxin-tag">${escapeHTML(key.replace(/_/g, ' '))} <button onclick="removeCustomToxin(${jsArg(key)})">×</button></span>`;
    }
    let el = document.getElementById('customToxinList');
    if (el) el.innerHTML = html || '<span style="color:var(--text-muted); font-size:11px;">Keine Custom-Toxine definiert.</span>';
}

// ─── FEATURE: Kamera-Blitz ───
function toggleTorch() {
    if (!html5QrCode) return;
    let videoTrack = html5QrCode.getRunningTrack?.();
    if (!videoTrack) {
        // Versuche Track aus dem Video-Element zu extrahieren
        let video = document.querySelector('#reader video');
        if (video && video.srcObject) {
            videoTrack = video.srcObject.getVideoTracks()[0];
        }
    }
    if (!videoTrack) return;
    let capabilities = videoTrack.getCapabilities?.() || {};
    if (!capabilities.torch) { alert('Blitz auf diesem Gerät nicht verfügbar.'); return; }
    let currentTorch = videoTrack.getSettings().torch || false;
    videoTrack.applyConstraints({ advanced: [{ torch: !currentTorch }] }).then(() => {
        document.getElementById('torchToggleBtn').innerText = currentTorch ? '🔦 Blitz Ein' : '🔦 Blitz Aus';
    }).catch(() => alert('Blitz-Steuerung fehlgeschlagen.'));
}

// ─── FEATURE: Barcode aus Foto ───
function processBarcodePhoto(file) {
    openView('result');
    showLoading('Extrahiere Barcode aus Foto...');
    if ('BarcodeDetector' in window) {
        let detector;
        try {
            detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128'] });
        } catch (e) {
            detector = null;
        }
        if (detector) {
            createImageBitmap(file).then(bitmap => detector.detect(bitmap)).then(codes => {
                if (codes && codes.length > 0 && codes[0].rawValue) {
                    let barcode = String(codes[0].rawValue).replace(/\D/g, '');
                    if (barcode.length >= 8) {
                        showLoading(`Barcode [${barcode}] erkannt. Rufe Daten ab...`);
                        fetchDataCascade(barcode);
                        return;
                    }
                }
                processBarcodePhotoViaOCR(file);
            }).catch(() => processBarcodePhotoViaOCR(file));
            return;
        }
    }
    processBarcodePhotoViaOCR(file);
}

function processBarcodePhotoViaOCR(file) {
    Tesseract.recognize(file, 'eng', {
        logger: m => {
            if (m.status === 'recognizing text') {
                showLoading(`Barcode-Erkennung: ${Math.round(m.progress * 100)}%`);
            }
        }
    }).then(({ data: { text } }) => {
        // Suche nach Barcode-Mustern (EAN-13, UPC-A, etc.)
        let barcodeMatch = text.match(/\b(\d{8,14})\b/g);
        if (barcodeMatch) {
            let barcode = barcodeMatch[0];
            showLoading(`Barcode [${barcode}] erkannt. Rufe Daten ab...`);
            fetchDataCascade(barcode);
        } else {
            // Fallback: OCR der Zutaten
            processLocalOCR(file, 'Foto-Analyse', 'PHOTO-' + Date.now().toString().slice(-6), 'Optisch (OCR)');
        }
    }).catch(() => {
        alert('Barcode-Erkennung fehlgeschlagen.');
    });
}

// ─── FEATURE: Statistik-Dashboard ───
function renderStats() {
    let history = getHistory();
    if (history.length === 0) {
        document.getElementById('stats-content').innerHTML = '<p style="text-align:center;color:var(--text-muted);">Scanne Produkte, um Statistiken zu generieren.</p>';
        return;
    }
    let total = history.length;
    let avgScore = Math.round(history.reduce((s,i) => s + i.score, 0) / total);
    let thisWeek = history.filter(i => {
        let d = new Date(i.dateIso || i.date);
        let weekAgo = new Date(Date.now() - 7*24*60*60*1000);
        return !Number.isNaN(d.getTime()) && d > weekAgo;
    }).length;
    
    // Häufigste Toxine (aus rawIngredients grob schätzen)
    let toxinCounts = {};
    let toxinKeys = Object.keys(blacklist);
    history.forEach(item => {
        let ingr = normalizeIngredientText(item.rawIngredients || '');
        toxinKeys.forEach(key => {
            let toxin = blacklist[key];
            if (toxin.aliases.some(a => matchIngredient(ingr, a, toxin.pattern || null))) {
                toxinCounts[key] = (toxinCounts[key] || 0) + 1;
            }
        });
    });
    let topToxins = Object.entries(toxinCounts).sort((a,b) => b[1]-a[1]).slice(0, 5);
    
    let scoreColor = avgScore >= 80 ? 'var(--matrix-green)' : (avgScore >= 40 ? 'var(--warn)' : 'var(--alert)');
    
    let html = `
    <div class="stats-grid">
        <div class="stat-item"><div class="stat-value">${total}</div><div class="stat-label">Gesamt-Scans</div></div>
        <div class="stat-item"><div class="stat-value">${thisWeek}</div><div class="stat-label">Letzte 7 Tage</div></div>
        <div class="stat-item"><div class="stat-value" style="color:${scoreColor};">${avgScore}</div><div class="stat-label">Ø Score</div></div>
        <div class="stat-item"><div class="stat-value">${Object.keys(toxinCounts).length}</div><div class="stat-label">Versch. Toxine</div></div>
    </div>`;
    
    if (topToxins.length > 0) {
        let maxCount = topToxins[0][1];
        html += '<div class="stat-bar-container"><div class="sec-title">Häufigste Toxine</div>';
        topToxins.forEach(([key, count]) => {
            let pct = Math.round((count/maxCount)*100);
            html += `<div class="stat-bar-row"><span class="stat-bar-name">${escapeHTML(key)}</span><div class="stat-bar-track"><div class="stat-bar-fill" style="width:${pct}%; background:var(--alert);"></div></div><span style="font-size:10px; color:var(--text-muted);">${count}</span></div>`;
        });
        html += '</div>';
    }
    
    document.getElementById('stats-content').innerHTML = html;
}

// ─── FEATURE: Produkt-Vergleich ───
let compareData = { A: null, B: null };

function selectCompareSlot(slot) {
    let history = getHistory();
    if (history.length === 0) { alert('Archiv ist leer. Scanne zuerst Produkte.'); return; }
    
    let overlay = document.getElementById('compareArchiveModal');
    if (!overlay) {
        // Modal dynamisch erstellen
        overlay = document.createElement('div');
        overlay.id = 'compareArchiveModal';
        document.body.appendChild(overlay);
    }
    
    let html = `<div id="compareArchiveList"><h3 style="color:var(--text-main); margin:0 0 15px; text-transform:uppercase; letter-spacing:1px;">Produkt für Slot ${slot} wählen</h3>`;
    history.forEach((item, i) => {
        let imgHtml = item.imageUrl ? `<img src="${escapeHTML(item.imageUrl)}" class="hist-img" alt="">` : `<div class="hist-img" style="display:flex;align-items:center;justify-content:center;font-size:7px;color:#555;">NO IMG</div>`;
        html += `<div class="hist-item" onclick="setCompareSlot('${slot}', ${i}); document.getElementById('compareArchiveModal').classList.remove('active');">
            <div class="hist-img-container">${imgHtml}</div>
            <div class="hist-info"><span class="res-badge">${escapeHTML(item.category)}</span><div style="font-size:14px; font-weight:700; color:var(--text-main);">${escapeHTML(item.name)}</div></div>
            <div class="hist-score" style="color:${item.score>=80?'var(--matrix-green)':(item.score>=40?'var(--warn)':'var(--alert)')}">${item.score}</div>
        </div>`;
    });
    html += `<button class="action-btn" style="margin-top:10px;" onclick="document.getElementById('compareArchiveModal').classList.remove('active')">Abbrechen</button></div>`;
    overlay.innerHTML = html;
    overlay.classList.add('active');
}

function setCompareSlot(slot, historyIndex) {
    let history = getHistory();
    compareData[slot] = history[historyIndex];
    updateCompareUI();
}

function updateCompareUI() {
    ['A','B'].forEach(slot => {
        let data = compareData[slot];
        let el = document.getElementById('compareSlot' + slot);
        let placeholder = el.querySelector('.compare-placeholder');
        let content = el.querySelector('.compare-content');
        
        if (data) {
            let imgHtml = data.imageUrl ? `<img src="${escapeHTML(data.imageUrl)}" class="res-img" alt="">` : `<div class="res-img" style="display:flex;align-items:center;justify-content:center;font-size:8px;color:#555;">NO IMG</div>`;
            content.innerHTML = `<div class="res-header">${imgHtml}<div class="res-info"><span class="res-badge">${escapeHTML(data.category)}</span><h3 class="res-title">${escapeHTML(data.name)}</h3><div style="font-size:20px; font-weight:900; color:${data.score>=80?'var(--matrix-green)':(data.score>=40?'var(--warn)':'var(--alert)')};">${data.score}</div></div></div>`;
            placeholder.style.display = 'none';
            content.style.display = 'block';
            el.classList.add('selected');
        } else {
            placeholder.style.display = 'flex';
            content.style.display = 'none';
            el.classList.remove('selected');
        }
    });
    document.getElementById('compareRunBtn').style.display = (compareData.A && compareData.B) ? 'block' : 'none';
}

function runCompare() {
    if (!compareData.A || !compareData.B) return;
    let a = compareData.A, b = compareData.B;
    let diff = a.score - b.score;
    let winner = diff > 0 ? a.name : (diff < 0 ? b.name : null);
    let diffAbs = Math.abs(diff);
    let diffColor = diff > 0 ? 'var(--matrix-green)' : (diff < 0 ? 'var(--alert)' : 'var(--warn)');
    
    let html = `<div class="res-card"><div class="res-body">`;
    if (winner) {
        html += `<div class="compare-score-diff" style="color:${diffColor}; background:${diff>0?'rgba(0,255,65,0.08)':'rgba(255,0,60,0.08)'};">
            🏆 ${escapeHTML(winner)} ist ${diffAbs} Punkte besser
        </div>`;
    } else {
        html += `<div class="compare-score-diff" style="color:var(--warn); background:rgba(245,158,11,0.08);">⚖️ Gleichstand — beide Score ${a.score}</div>`;
    }
    html += `<p style="color:var(--text-muted); font-size:13px; text-align:center;">${escapeHTML(a.name)} (${a.score}) vs ${escapeHTML(b.name)} (${b.score})</p>`;
    
    // Zutaten-Vergleich
    let aIng = (a.rawIngredients || '').toLowerCase();
    let bIng = (b.rawIngredients || '').toLowerCase();
    if (aIng && bIng) {
        html += `<div class="sec-title">Zutaten-Vergleich</div>`;
        html += `<p style="font-size:11px; color:var(--text-muted);"><strong>${escapeHTML(a.name)}:</strong> ${escapeHTML(a.rawIngredients.substring(0,200))}${a.rawIngredients.length>200?'…':''}</p>`;
        html += `<p style="font-size:11px; color:var(--text-muted);"><strong>${escapeHTML(b.name)}:</strong> ${escapeHTML(b.rawIngredients.substring(0,200))}${b.rawIngredients.length>200?'…':''}</p>`;
    }
    html += `</div></div>`;
    document.getElementById('compare-result').innerHTML = html;
}

// Event: Home-View rendert Stats
let _originalOpenView = openView;
openView = function(viewName, isBackAction) {
    _originalOpenView(viewName, isBackAction);
    if (viewName === 'home') renderStats();
    if (viewName === 'settings') renderCustomToxinList();
    if (viewName === 'compare') updateCompareUI();
};

// Boot-Sequenz & Event-Binding
let dbTimestamp = new Date().getTime();
Promise.all([
    fetchJsonWithTimeout('blacklist.json?v=' + dbTimestamp).then(r => r),
    fetchJsonWithTimeout('whitelist.json?v=' + dbTimestamp).then(r => r)
]).then(data => {
    blacklist = data[0]; whitelist = data[1]; dbActive = true;
    if (document.getElementById('db-status')) document.getElementById('db-status').style.display = 'none';
    initTheme();
    updateCoreStatusBadge();
}).catch(() => {
    blacklist = blacklist || {};
    whitelist = whitelist || {};
    dbActive = false;
    initTheme();
    updateCoreStatusBadge();
    if (document.getElementById('db-status')) document.getElementById('db-status').style.display = 'block';
});

document.addEventListener('DOMContentLoaded', () => {
    // Side-Drawer (Burger-Menü) Event-Binding
    if (document.getElementById('burgerBtn')) {
        document.getElementById('burgerBtn').addEventListener('click', openDrawer);
    }
    if (document.getElementById('closeDrawerBtn')) {
        document.getElementById('closeDrawerBtn').addEventListener('click', closeDrawer);
    }
    if (document.getElementById('sideDrawerOverlay')) {
        document.getElementById('sideDrawerOverlay').addEventListener('click', closeDrawer);
    }

    // CRITICAL FIX: Zuweisung des Navigations-Stack-Events für den Back-Button
    document.getElementById('backBtn').addEventListener('click', goBack);

    // CRITICAL FIX: Zuweisung des Such-Events an den Terminal-Button
    document.getElementById('searchBtn').addEventListener('click', executeDatabaseSearch);

    document.getElementById('nav-home').addEventListener('click', () => openView('home'));
    document.getElementById('nav-scan').addEventListener('click', () => openView('scan'));
    document.getElementById('nav-search').addEventListener('click', () => openView('search'));
    document.getElementById('nav-history').addEventListener('click', () => openView('history'));
    if (document.getElementById('nav-settings')) {
        document.getElementById('nav-settings').addEventListener('click', () => openView('settings'));
    }

    document.getElementById('card-scan').addEventListener('click', () => openView('scan'));
    document.getElementById('card-search').addEventListener('click', () => openView('search'));
    document.getElementById('card-history').addEventListener('click', () => openView('history'));
    document.getElementById('card-compare').addEventListener('click', () => openView('compare'));

    // Quick-Scan
    document.getElementById('quickScanBtn').addEventListener('click', executeQuickScan);
    
    // Export/Import
    document.getElementById('exportHistoryBtn').addEventListener('click', exportHistory);
    document.getElementById('importHistoryBtn').addEventListener('click', () => document.getElementById('importHistoryInput').click());
    document.getElementById('importHistoryInput').onchange = (e) => { if(e.target.files.length > 0) importHistory(e.target.files[0]); };
    
    // Custom Toxin
    document.getElementById('addCustomToxinBtn').addEventListener('click', addCustomToxin);
    
    // Torch
    document.getElementById('torchToggleBtn').addEventListener('click', toggleTorch);
    
    // Barcode aus Foto
    document.getElementById('barcodePhotoBtn').addEventListener('click', () => document.getElementById('barcodePhotoInput').click());
    document.getElementById('barcodePhotoInput').onchange = (e) => { if(e.target.files.length > 0) processBarcodePhoto(e.target.files[0]); };
    
    // Compare
    document.getElementById('compareRunBtn').addEventListener('click', runCompare);

    document.getElementById('flt-alle').addEventListener('click', () => filterHistory('Alle', 'flt-alle'));
    document.getElementById('flt-nahrung').addEventListener('click', () => filterHistory('Nahrung', 'flt-nahrung'));
    document.getElementById('flt-kosmetik').addEventListener('click', () => filterHistory('Kosmetik', 'flt-kosmetik'));
    document.getElementById('flt-optisch').addEventListener('click', () => filterHistory('Optisch', 'flt-optisch'));

    document.getElementById('themeToggleCheckbox').addEventListener('change', (e) => toggleTheme(e.target));
    document.getElementById('saveApiKeyBtn').addEventListener('click', saveApiKey);
    document.getElementById('saveDeepSeekKeyBtn').addEventListener('click', saveDeepSeekKey);
    document.getElementById('saveGoogleSearchKeyBtn').addEventListener('click', saveGoogleSearchKey);
    document.getElementById('clearGeminiKeyBtn').addEventListener('click', clearGeminiKey);
    document.getElementById('clearDeepSeekKeyBtn').addEventListener('click', clearDeepSeekKey);
    document.getElementById('clearGoogleSearchKeyBtn').addEventListener('click', clearGoogleSearchKey);
    document.getElementById('resetApiCounterBtn').addEventListener('click', resetApiCounter);
    document.getElementById('startBtn').addEventListener('click', startScanner);
    document.getElementById('clearHistoryBtn').addEventListener('click', clearHistory);
    document.getElementById('detailModalOverlay').addEventListener('click', closeModal);
    document.getElementById('closeDetailModalBtn')?.addEventListener('click', closeModal);
    
    // Swipe-down to close für das Bottom-Sheet Detail-Modal (mit Scroll-Schutz)
    const detailModal = document.getElementById('detailModal');
    if (detailModal) {
        let touchStartY = 0;
        let touchEndY = 0;
        detailModal.addEventListener('touchstart', (e) => {
            touchStartY = e.changedTouches[0].screenY;
        }, { passive: true });
        detailModal.addEventListener('touchend', (e) => {
            touchEndY = e.changedTouches[0].screenY;
            // Nur schließen, wenn nach unten gewischt wurde (> 80px) und der Modal-Inhalt ganz oben ist
            if (touchEndY - touchStartY > 80 && detailModal.scrollTop <= 0) {
                closeModal();
            }
        }, { passive: true });
    }
    
    // KI Modal
    document.getElementById('kiModalConfirm').addEventListener('click', confirmKIInputModal);
    document.getElementById('kiModalCancel').addEventListener('click', cancelKIInputModal);
    document.getElementById('kiModalOverlay').addEventListener('click', cancelKIInputModal);
    document.getElementById('kiModalInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmKIInputModal();
        if (e.key === 'Escape') cancelKIInputModal();
    });

    // PIN Modal Events
    document.getElementById('pinModalConfirm').addEventListener('click', confirmPinModal);
    document.getElementById('pinModalCancel').addEventListener('click', cancelPinModal);
    document.getElementById('pinModalOverlay').addEventListener('click', cancelPinModal);
    document.getElementById('pinModalInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmPinModal();
        if (e.key === 'Escape') cancelPinModal();
    });
    
    // Globale Escape-Taste für Modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('kiModalBox').classList.contains('active')) cancelKIInputModal();
            if (document.getElementById('pinModalBox').style.display === 'block') cancelPinModal();
            if (document.getElementById('detailModalOverlay').style.display === 'block') closeModal();
        }
    });
    
    // Keyboard-Navigation: Enter auf Nav-Items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') item.click();
        });
    });

    document.getElementById('activeModelSelect').addEventListener('change', (e) => {
        localStorage.setItem('op_active_model', e.target.value);
    });

    const versionTagBtn = document.getElementById('versionTagBtn');
    if (versionTagBtn) {
        versionTagBtn.addEventListener('click', () => {
            const changelogText = `SYSTEM-AKTUALISIERUNGSHISTORIE:\n\n` +
                `=== SYSTEM V13.8.1 ===\n` +
                `- Hotfix für Syntax-Fehler: Behebung eines Klammerfehlers bei der Key-Speicherung, der das Laden der Event-Listener verhinderte (Buttons funktionierten nicht).\n\n` +
                `=== SYSTEM V13.8 ===\n` +
                `- Master-PIN Verschlüsselung: Sicheres Speichern der API-Keys im Browser. Schützt vor unbefugter Nutzung bei physischem Zugriff durch eine 4-stellige PIN.\n` +
                `- Schließen-Optimierungen: Schließen des Changelogs auf Mobilgeräten über dedizierten Button und native Wischgeste (Swipe-down) behoben.\n\n` +
                `=== SYSTEM V13.7 ===\n` +
                `- Multimodale RAG Kamera-Pipeline: Höhere Genauigkeit beim Scannen. Die KI identifiziert erst den Namen aus Fotos, führt eine Websuche durch und analysiert dann die präzisen Zutaten.\n` +
                `- Setup-Anleitung: Schritt-für-Schritt-Guide für Gemini 3.5 Flash & DeepSeek in den Einstellungen integriert.\n` +
                `- System-Reset: Neue Funktion zum Zurücksetzen aller API-Keys, des Cache-Speichers und der benutzerdefinierten Toxine auf Werkseinstellungen.\n` +
                `- Version-Tag Changelog: Interaktiver Versions-Knopf zum schnellen Aufrufen dieser Update-Protokolle.\n\n` +
                `=== SYSTEM V13.6 ===\n` +
                `- Lokaler Import/Export: Backup- und Wiederherstellungsfunktion für das gesamte Offline-Archiv sowie Custom Toxine im JSON-Format.\n` +
                `- Custom Toxin-Definition: Benutzerdefinierte Spezifikation von Toxinen direkt über das Interface.\n` +
                `- Erweiterter Offline-Abgleich mit intelligenter Regex-Mustererkennung.\n\n` +
                `=== SYSTEM V13.5 ===\n` +
                `- Gemini 3.5 API-Integration & DeepSeek Fallback.\n` +
                `- Dynamic Core Status Badges & Live API-Traffic Monitor.\n` +
                `- Lokales Offline-Archiv zur Speicherung gescannter Signaturen.`;
            openModal("PATCH NOTES v13.8.1", "System-Aktualisierungsprotokoll", changelogText, "alternative");
        });
    }

    const resetAppSettingsBtn = document.getElementById('resetAppSettingsBtn');
    if (resetAppSettingsBtn) {
        resetAppSettingsBtn.addEventListener('click', () => {
            if (confirm("Möchtest du wirklich alle Werkseinstellungen zurücksetzen?\n\nDies löscht alle gespeicherten API-Schlüssel, das gesamte Archiv und deine benutzerdefinierten Toxin-Definitionen unwiderruflich!")) {
                localStorage.clear();
                sessionStorage.clear();
                alert("System zurückgesetzt. Anwendung wird neu geladen...");
                location.reload();
            }
        });
    }
    document.getElementById('sessionKeyToggle')?.addEventListener('change', (e) => {
        localStorage.setItem('op_key_session_mode', e.target.checked ? '1' : '0');
        if (!e.target.checked) {
            sessionStorage.removeItem('op_gemini_key_session');
            sessionStorage.removeItem('op_deepseek_key_session');
        }
    });

    document.getElementById('persistKeyToggle')?.addEventListener('change', (e) => {
        if (e.target.checked) {
            showPinModal('create').then(pin => {
                runtimePin = pin;
                localStorage.setItem('op_keys_are_encrypted', '1');
                
                // Verschlüssele aktuell geladene Schlüssel
                if (runtimeGeminiKey) localStorage.setItem('op_gemini_key_enc', encryptWithPin(runtimeGeminiKey, pin));
                if (runtimeDeepSeekKey) localStorage.setItem('op_deepseek_key_enc', encryptWithPin(runtimeDeepSeekKey, pin));
                if (runtimeGoogleSearchKey) localStorage.setItem('op_google_key_enc', encryptWithPin(runtimeGoogleSearchKey, pin));
                if (runtimeGoogleSearchCx) localStorage.setItem('op_google_cx_enc', encryptWithPin(runtimeGoogleSearchCx, pin));
                
                alert("System-Core verschlüsselt dauerhaft auf diesem Gerät gesichert.");
            }).catch(() => {
                e.target.checked = false;
            });
        } else {
            if (confirm("Möchtest du die dauerhafte Speicherung deaktivieren?\n\nDies löscht die verschlüsselten API-Schlüssel von diesem Gerät.")) {
                localStorage.removeItem('op_gemini_key_enc');
                localStorage.removeItem('op_deepseek_key_enc');
                localStorage.removeItem('op_google_key_enc');
                localStorage.removeItem('op_google_cx_enc');
                localStorage.removeItem('op_keys_are_encrypted');
                runtimePin = "";
            } else {
                e.target.checked = true;
            }
        }
    });
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
                let history = getHistory();
                let item = history.find(i => i.barcode === activeArchiveInjectBarcode);
                if(item) {
                    item.imageUrl = compressedBase64;
                    saveHistory(history);
                    renderHistory();
                }
            };
        };
    };

    checkPinStorage();
});

// ─── PIN MODAL DIALOG FLOW ───
let _pinModalResolve = null;
let _pinModalReject = null;

function showPinModal(mode) {
    return new Promise((resolve, reject) => {
        _pinModalResolve = resolve;
        _pinModalReject = reject;
        
        const overlay = document.getElementById('pinModalOverlay');
        const box = document.getElementById('pinModalBox');
        const title = box.querySelector('h3');
        const desc = box.querySelector('p');
        const input = document.getElementById('pinModalInput');
        const confirmBtn = document.getElementById('pinModalConfirm');
        
        input.value = "";
        
        if (mode === 'create') {
            title.innerText = "🔒 Master-PIN erstellen";
            desc.innerText = "Erstelle eine 4-stellige Master-PIN, um deine API-Schlüssel dauerhaft verschlüsselt auf diesem Gerät zu speichern:";
            confirmBtn.innerText = "Erstellen";
        } else {
            title.innerText = "🔒 Master-PIN erforderlich";
            desc.innerText = "Gib deine 4-stellige Master-PIN ein, um die verschlüsselten System-Core-Schlüssel freizuschalten:";
            confirmBtn.innerText = "Entsperren";
        }
        
        overlay.style.display = "block";
        box.style.display = "block";
        setTimeout(() => {
            box.style.transform = "translate(-50%, -50%) scale(1)";
            box.style.opacity = "1";
            input.focus();
        }, 10);
    });
}

function confirmPinModal() {
    const input = document.getElementById('pinModalInput');
    const val = input.value.trim();
    if (!/^\d{4}$/.test(val)) {
        alert("Die PIN muss genau 4 Ziffern enthalten.");
        input.focus();
        return;
    }
    closePinModal();
    if (_pinModalResolve) {
        _pinModalResolve(val);
        _pinModalResolve = null;
        _pinModalReject = null;
    }
}

function cancelPinModal() {
    closePinModal();
    if (_pinModalReject) {
        _pinModalReject();
        _pinModalResolve = null;
        _pinModalReject = null;
    }
}

function closePinModal() {
    const overlay = document.getElementById('pinModalOverlay');
    const box = document.getElementById('pinModalBox');
    box.style.transform = "translate(-50%, -50%) scale(0.95)";
    box.style.opacity = "0";
    setTimeout(() => {
        overlay.style.display = "none";
        box.style.display = "none";
    }, 250);
}

function checkPinStorage() {
    if (localStorage.getItem('op_keys_are_encrypted') === '1') {
        let geminiSession = sessionStorage.getItem('op_gemini_key_session');
        let deepseekSession = sessionStorage.getItem('op_deepseek_key_session');
        let googleSession = sessionStorage.getItem('op_google_key_session');
        
        if (geminiSession || deepseekSession || googleSession) {
            runtimeGeminiKey = geminiSession || "";
            runtimeDeepSeekKey = deepseekSession || "";
            runtimeGoogleSearchKey = googleSession || "";
            runtimeGoogleSearchCx = localStorage.getItem('op_google_cx') || "";
            updateCoreStatusBadge();
            loadSettings();
            return;
        }
        
        showPinModal('unlock').then(pin => {
            let keysFound = ['op_gemini_key_enc', 'op_deepseek_key_enc', 'op_google_key_enc', 'op_google_cx_enc'].some(k => localStorage.getItem(k));
            let isCorrect = false;
            if (keysFound) {
                let testKey = ['op_gemini_key_enc', 'op_deepseek_key_enc', 'op_google_key_enc', 'op_google_cx_enc'].find(k => localStorage.getItem(k));
                let testDecrypted = decryptWithPin(localStorage.getItem(testKey), pin);
                if (testDecrypted !== null) {
                    isCorrect = true;
                }
            } else {
                isCorrect = true;
            }
            
            if (isCorrect) {
                runtimePin = pin;
                runtimeGeminiKey = decryptWithPin(localStorage.getItem('op_gemini_key_enc'), pin) || "";
                runtimeDeepSeekKey = decryptWithPin(localStorage.getItem('op_deepseek_key_enc'), pin) || "";
                runtimeGoogleSearchKey = decryptWithPin(localStorage.getItem('op_google_key_enc'), pin) || "";
                runtimeGoogleSearchCx = decryptWithPin(localStorage.getItem('op_google_cx_enc'), pin) || "";
                
                sessionStorage.setItem('op_gemini_key_session', runtimeGeminiKey);
                sessionStorage.setItem('op_deepseek_key_session', runtimeDeepSeekKey);
                sessionStorage.setItem('op_google_key_session', runtimeGoogleSearchKey);
                localStorage.setItem('op_google_cx', runtimeGoogleSearchCx);
                
                updateCoreStatusBadge();
                loadSettings();
            } else {
                alert("Ungültige Master-PIN. Zugriff verweigert.");
                loadSettings();
            }
        }).catch(() => {
            console.log("PIN freischalten abgebrochen.");
            loadSettings();
        });
    }
}
