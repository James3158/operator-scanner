let html5QrCode; 
let currentHistoryFilter = 'Alle';
let currentHistorySearch = '';
let currentHistorySort = 'recent';
let viewStack = ['home']; 
let activeArchiveInjectBarcode = "";
const summaryGenerationLocks = new Set();
const guidedScanFiles = { front: null, label: null, packaging: null };
const APP_SCHEMA_VERSION = '14.4';
const APP_ANALYSIS_VERSION = 14.4;
const MAP_POI_LIMIT = 30;
let currentMapCategory = 'clean-food';
let currentMapRadius = 2500;
let currentMapCenter = null;
let currentMapPois = [];
let currentMapLoading = false;
let mapAbortController = null;

function setScanMode(mode) {
    let isBarcode = mode === 'barcode';
    document.getElementById('scanModeBarcode').classList.toggle('active', isBarcode);
    document.getElementById('scanModePhoto').classList.toggle('active', !isBarcode);
    document.getElementById('scanModeBarcode').setAttribute('aria-selected', String(isBarcode));
    document.getElementById('scanModePhoto').setAttribute('aria-selected', String(!isBarcode));
    document.getElementById('barcodeScanPane').hidden = !isBarcode;
    document.getElementById('photoScanPane').hidden = isBarcode;
    document.getElementById('barcodeScanPane').classList.toggle('active', isBarcode);
    document.getElementById('photoScanPane').classList.toggle('active', !isBarcode);
    if (!isBarcode && html5QrCode?.isScanning) html5QrCode.stop().catch(() => {});
}

function setGuidedScanFile(kind, file) {
    if (!file) return;
    guidedScanFiles[kind] = file;
    let stateId = { front: 'captureFrontState', label: 'captureLabelState', packaging: 'capturePackagingState' }[kind];
    let state = document.getElementById(stateId);
    state.textContent = 'Bereit';
    state.closest('.capture-step').classList.add('complete');
    document.getElementById('guidedAnalyzeBtn').disabled = !(guidedScanFiles.front || guidedScanFiles.label);
}

function resetGuidedScan() {
    Object.keys(guidedScanFiles).forEach(kind => { guidedScanFiles[kind] = null; });
    ['guidedFrontInput', 'guidedLabelInput', 'guidedPackagingInput'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('captureFrontState').textContent = 'Aufnehmen';
    document.getElementById('captureLabelState').textContent = 'Aufnehmen';
    document.getElementById('capturePackagingState').textContent = 'Optional';
    document.querySelectorAll('.capture-step').forEach(step => step.classList.remove('complete'));
    document.getElementById('guidedAnalyzeBtn').disabled = true;
}

function migrateArchiveToCurrentVersion() {
    if (localStorage.getItem('op_schema_version') === APP_SCHEMA_VERSION) return;
    let history = getHistory();
    if (saveHistory(history)) localStorage.setItem('op_schema_version', APP_SCHEMA_VERSION);
}

function renderScannerRecents() {
    let container = document.getElementById('scanRecentList');
    if (!container) return;
    let recent = getHistory().slice(0, 3);
    if (!recent.length) {
        container.innerHTML = '<p class="scan-recents-empty">Noch keine lokalen Scans.</p>';
        return;
    }
    container.innerHTML = recent.map(item => `
        <button class="scan-recent-item" onclick="loadFromArchive(${jsArg(item.barcode)})">
            ${isSafeImageUrl(item.imageUrl) ? `<img src="${escapeHTML(item.imageUrl)}" alt="">` : '<span class="scan-recent-placeholder">V14.4</span>'}
            <span><strong>${escapeHTML(item.name)}</strong><small>${escapeHTML(item.category)} · Score ${item.score}</small></span>
        </button>`).join('');
}

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
    
    document.getElementById('mod-detail').className = '';
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
    if(viewName === 'scan') { document.getElementById('startBtn').style.display = 'block'; document.getElementById('reader').style.display = 'none'; renderScannerRecents(); }
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

function saveToHistory(barcode, name, score, category, rawIngredients, imgUrl, kiSummary = "", analysisMeta = {}) {
    let history = getHistory();
    let existing = history.find(item => item.barcode === barcode);
    history = history.filter(item => item.barcode !== barcode);
    let mainCategory = getBaseCategory(category);
    let nextPackaging = analysisMeta.packaging || existing?.packaging;
    if (existing?.packaging?.risk !== 'unknown' && nextPackaging?.risk === 'unknown') nextPackaging = existing.packaging;
    history.unshift({ 
        barcode, 
        name, 
        score, 
        category: mainCategory, 
        rawIngredients, 
        imageUrl: imgUrl || existing?.imageUrl || '',
        kiSummary: kiSummary || existing?.kiSummary || '',
        captureMethod: analysisMeta.captureMethod || existing?.captureMethod || 'barcode',
        packaging: nextPackaging,
        foundToxins: analysisMeta.foundToxins || existing?.foundToxins || [],
        foundGood: analysisMeta.foundGood || existing?.foundGood || [],
        webAlternatives: analysisMeta.webAlternatives || existing?.webAlternatives || [],
        analysisVersion: APP_ANALYSIS_VERSION,
        dateIso: new Date().toISOString() 
    });
    if (history.length > 100) history.pop();
    saveHistory(history);
}

function openChangelogModal() {
    document.getElementById('mod-title').innerText = 'PATCH NOTES V14.4';
    document.getElementById('mod-desc').innerText = 'System-Aktualisierungsprotokoll';
    document.getElementById('mod-desc').style.color = 'var(--gemini-blue)';
    document.getElementById('mod-hazard-container').style.display = 'none';
    document.getElementById('mod-detail').className = 'changelog-timeline';
    document.getElementById('mod-detail').innerHTML = renderChangelogHtml();
    document.getElementById('detailModalOverlay').style.display = 'block';
    setTimeout(() => {
        document.getElementById('detailModalOverlay').style.opacity = '1';
        document.getElementById('detailModal').style.transform = 'translateX(-50%) translateY(0)';
    }, 10);
}

async function generateArchiveSummary(barcode) {
    if (summaryGenerationLocks.has(barcode)) return;
    let keyActive = typeof getSecretKey === 'function' && (getSecretKey('gemini') || getSecretKey('deepseek'));
    if (!keyActive) {
        alert('Für die einmalige KI-Systemanalyse wird ein aktiver Gemini- oder DeepSeek-Key benötigt.');
        return;
    }
    let history = getHistory();
    let item = history.find(entry => entry.barcode === barcode);
    if (!item || item.kiSummary) {
        if (item) loadFromArchive(barcode);
        return;
    }
    summaryGenerationLocks.add(barcode);
    document.querySelectorAll('.summary-generate-btn').forEach(button => {
        button.disabled = true;
        button.textContent = 'Analyse läuft...';
    });
    try {
        let summary = await generateProductSummaryViaKI(item.name, item.rawIngredients, item.foundToxins.join(', '), item.foundGood.join(', '), item.category);
        if (!summary) throw new Error('Die KI hat keine verwertbare Zusammenfassung geliefert.');
        item.kiSummary = summary;
        item.summaryStatus = 'ready';
        item.analysisVersion = APP_ANALYSIS_VERSION;
        saveHistory(history);
        loadFromArchive(barcode);
    } catch (error) {
        alert('Systemanalyse konnte nicht gespeichert werden: ' + error.message);
        loadFromArchive(barcode);
    } finally {
        summaryGenerationLocks.delete(barcode);
    }
}

function filterHistory(category, btnId) {
    currentHistoryFilter = category;
    document.querySelectorAll('.flt-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(btnId)?.classList.add('active');
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

function getScoreColor(score) {
    return score >= 80 ? 'var(--matrix-green)' : (score >= 40 ? 'var(--warn)' : 'var(--alert)');
}

function getScoreLabel(score) {
    if (score >= 80) return 'Clean';
    if (score >= 40) return 'Prüfen';
    return 'Kritisch';
}

function getHistorySummary(history) {
    let categories = {};
    let risks = {};
    let avgScore = history.length ? Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length) : 0;
    let critical = history.filter(item => item.score < 40).length;
    history.forEach(item => {
        categories[item.category] = (categories[item.category] || 0) + 1;
        let risk = item.packaging?.risk || 'unknown';
        risks[risk] = (risks[risk] || 0) + 1;
    });
    return { categories, risks, avgScore, critical };
}

function renderHistoryStats(history) {
    let el = document.getElementById('historyStats');
    if (!el) return;
    let summary = getHistorySummary(history);
    el.innerHTML = `
        <article><span>Produkte</span><strong>${history.length}</strong></article>
        <article><span>Ø Score</span><strong style="color:${getScoreColor(summary.avgScore)}">${summary.avgScore || '-'}</strong></article>
        <article><span>Kritisch</span><strong style="color:var(--alert)">${summary.critical}</strong></article>
        <article><span>Packaging High</span><strong>${summary.risks.high || 0}</strong></article>`;
}

function updateHistoryFilterCounts(history) {
    let summary = getHistorySummary(history);
    const map = {
        'flt-alle': history.length,
        'flt-nahrung': summary.categories.Nahrung || 0,
        'flt-kosmetik': summary.categories.Kosmetik || 0,
        'flt-kleidung': summary.categories.Kleidung || 0,
        'flt-haushalt': summary.categories.Haushalt || 0,
        'flt-moebel': summary.categories.Möbel || 0,
        'flt-optisch': summary.categories.Optisch || 0
    };
    Object.entries(map).forEach(([id, count]) => {
        let btn = document.getElementById(id);
        if (!btn) return;
        let label = btn.dataset.label || btn.textContent.replace(/\s+\d+$/, '');
        btn.dataset.label = label;
        btn.innerHTML = `${escapeHTML(label)} <span>${count}</span>`;
    });
}

function getFilteredHistory(history) {
    let search = normalizeIngredientText(currentHistorySearch);
    let filtered = currentHistoryFilter === 'Alle' ? history : history.filter(item => item.category === currentHistoryFilter);
    if (search) {
        filtered = filtered.filter(item => normalizeIngredientText([
            item.name,
            item.category,
            item.rawIngredients,
            (item.foundToxins || []).join(' '),
            item.packaging?.material || ''
        ].join(' ')).includes(search));
    }
    let sorted = filtered.slice();
    if (currentHistorySort === 'scoreAsc') sorted.sort((a, b) => a.score - b.score);
    else if (currentHistorySort === 'scoreDesc') sorted.sort((a, b) => b.score - a.score);
    else if (currentHistorySort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    else sorted.sort((a, b) => new Date(b.dateIso || 0) - new Date(a.dateIso || 0));
    return sorted;
}

function getHistoryTopSignals(item) {
    let signals = [];
    (item.foundToxins || []).slice(0, 2).forEach(value => signals.push({ label: value, type: 'bad' }));
    (item.foundGood || []).slice(0, 1).forEach(value => signals.push({ label: value, type: 'good' }));
    if (item.packaging?.risk && item.packaging.risk !== 'unknown') signals.push({ label: `Pack ${item.packaging.risk}`, type: item.packaging.risk === 'high' ? 'bad' : 'neutral' });
    return signals.slice(0, 4);
}

function renderHistory() {
    let history = getHistory();
    renderHistoryStats(history);
    updateHistoryFilterCounts(history);
    let filtered = getFilteredHistory(history);
    let html = '';

    if (filtered.length === 0) {
        html = `<div class="archive-empty"><strong>Keine Treffer</strong><span>Filter oder Suche anpassen, oder neue Produkte scannen.</span></div>`;
    }
    else {
        filtered.forEach(item => {
            let sColor = getScoreColor(item.score);
            let imgHtml = isSafeImageUrl(item.imageUrl) ? `<img src="${escapeHTML(item.imageUrl)}" class="hist-img" loading="lazy" alt="">` : `<div class="hist-img hist-img-empty">NO IMG</div>`;
            let signals = getHistoryTopSignals(item);
            let signalHtml = signals.length
                ? `<div class="hist-signal-row">${signals.map(signal => `<span class="hist-signal hist-signal-${signal.type}">${escapeHTML(signal.label)}</span>`).join('')}</div>`
                : `<div class="hist-signal-row"><span class="hist-signal hist-signal-neutral">Keine Signatur gespeichert</span></div>`;
            let packaging = item.packaging ? `${item.packaging.material} · ${item.packaging.risk}` : 'Packaging nicht verifiziert';
            let rawPreview = String(item.rawIngredients || '').slice(0, 115);
            
            html += `
            <div class="hist-item" onclick="loadFromArchive(${jsArg(item.barcode)})">
                <div class="hist-img-container">
                    ${imgHtml}
                    <button class="hist-img-upload-trigger" onclick="triggerArchiveImageInject(event, ${jsArg(item.barcode)})" aria-label="Archivfoto ersetzen">FOTO</button>
                </div>
                <div class="hist-info">
                    <div class="hist-topline"><span class="res-badge">${escapeHTML(item.category)}</span><small>${escapeHTML(item.date)}</small></div>
                    <div class="hist-title">${escapeHTML(item.name)}</div>
                    <div class="hist-meta">${escapeHTML(packaging)}</div>
                    ${signalHtml}
                    <div class="hist-preview">${escapeHTML(rawPreview)}${rawPreview.length >= 115 ? '...' : ''}</div>
                </div>
                <div class="hist-side">
                    <div class="hist-score-ring" style="--score-color:${sColor};">${item.score}<span>${getScoreLabel(item.score)}</span></div>
                    <button class="hist-delete" onclick="deleteHistoryItem(event, ${jsArg(item.barcode)})">Löschen</button>
                </div>
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
                ki_summary: item.kiSummary || "",
                _packaging_assessment: item.packaging,
                _capture_method: item.captureMethod || 'archive',
                _web_alternatives: item.webAlternatives || []
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
    if (!ingredients) { alert('Zutaten- oder Materialliste eingeben.'); return; }
    let productName = document.getElementById('quickScanName').value.trim() || 'Schnellbewertung';
    let category = document.getElementById('quickScanCategory').value || 'Nahrung';
    let fakeBarcode = 'QUICK-' + Date.now().toString().slice(-6);
    openView('result');
    analyzeProduct({ product: { product_name: productName, ingredients_text: ingredients, image_url: '', _capture_method: 'manual' } }, category + ' (Schnellbewertung)', fakeBarcode, true);
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
    
    // Häufigste kritische Signaturen aus der gespeicherten Kategorieanalyse
    let toxinCounts = {};
    history.forEach(item => {
        (item.foundToxins || []).forEach(key => { toxinCounts[key] = (toxinCounts[key] || 0) + 1; });
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

// ─── PHASE 3: Archiv-KI Chat ───
function getArchiveChatMessages() {
    return readJsonStorage('op_archive_chat', []).filter(item =>
        item && ['user', 'assistant', 'system'].includes(item.role) && item.content
    ).slice(-40);
}

function saveArchiveChatMessages(messages) {
    writeJsonStorage('op_archive_chat', messages.slice(-40));
}

function getArchiveContextSummary() {
    let history = getHistory();
    let categoryCounts = {};
    let packagingRisks = {};
    history.forEach(item => {
        categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
        let risk = item.packaging?.risk || 'unknown';
        packagingRisks[risk] = (packagingRisks[risk] || 0) + 1;
    });
    let avgScore = history.length ? Math.round(history.reduce((sum, item) => sum + item.score, 0) / history.length) : 0;
    return { total: history.length, avgScore, categoryCounts, packagingRisks };
}

function renderChatContextStrip() {
    let el = document.getElementById('chatContextStrip');
    if (!el) return;
    let summary = getArchiveContextSummary();
    let categories = Object.entries(summary.categoryCounts).map(([name, count]) => `${name} ${count}`).join(' · ') || 'keine Kategorien';
    el.textContent = `${summary.total} Produkte · Ø ${summary.avgScore || '-'} · ${categories}`;
}

function renderArchiveChat() {
    renderChatContextStrip();
    let log = document.getElementById('archiveChatLog');
    if (!log) return;
    let messages = getArchiveChatMessages();
    if (!messages.length) {
        log.innerHTML = `
            <div class="chat-empty">
                <div class="ai-empty-orb">AI</div>
                <strong>Wie kann ich dein Archiv analysieren?</strong>
                <span>Frage nach kritischen Produkten, Packaging-Risiken, Kategorie-Trends oder besseren Alternativen.</span>
            </div>`;
        return;
    }
    log.innerHTML = messages.map(message => `
        <article class="chat-message ${message.role === 'user' ? 'chat-user' : 'chat-assistant'}">
            <div class="chat-avatar">${message.role === 'user' ? 'DU' : 'AI'}</div>
            <div class="chat-bubble">
                <span>${message.role === 'user' ? 'Du' : 'Archiv Assistant'}</span>
                <p>${escapeHTML(message.content)}</p>
            </div>
            ${Array.isArray(message.sources) && message.sources.length ? `<div class="chat-sources">${message.sources.slice(0, 4).map(src => `<button type="button" onclick="loadFromArchive(${jsArg(src.barcode || '')})">${escapeHTML(src.name || src.barcode || 'Archivobjekt')}</button>`).join('')}</div>` : ''}
        </article>`).join('');
    log.scrollTop = log.scrollHeight;
}

function scoreArchiveRelevance(item, question) {
    let normalizedQuestion = normalizeIngredientText(question);
    if (!normalizedQuestion) return 0;
    let haystack = normalizeIngredientText([
        item.name,
        item.category,
        item.rawIngredients,
        (item.foundToxins || []).join(' '),
        (item.foundGood || []).join(' '),
        item.packaging?.material || '',
        item.packaging?.risk || ''
    ].join(' '));
    return normalizedQuestion.split(' ').filter(token => token.length > 2 && haystack.includes(token)).length;
}

function buildArchiveChatContext(question = '') {
    let history = getHistory();
    let summary = getArchiveContextSummary();
    let candidates = history
        .map((item, index) => ({ item, index, relevance: scoreArchiveRelevance(item, question) }))
        .sort((a, b) => {
            if (b.relevance !== a.relevance) return b.relevance - a.relevance;
            if (a.item.score !== b.item.score) return a.item.score - b.item.score;
            return a.index - b.index;
        })
        .slice(0, 36)
        .map(entry => entry.item);
    let products = candidates.map(item => ({
        barcode: item.barcode,
        name: item.name,
        category: item.category,
        score: item.score,
        toxins: item.foundToxins || [],
        positives: item.foundGood || [],
        packaging: item.packaging ? {
            material: item.packaging.material,
            score: item.packaging.score,
            risk: item.packaging.risk,
            confidence: item.packaging.confidence
        } : null,
        summary: item.kiSummary || '',
        raw: String(item.rawIngredients || '').slice(0, 420)
    }));
    return JSON.stringify({ summary, products }, null, 2);
}

function setArchiveChatBusy(isBusy) {
    let sendBtn = document.getElementById('archiveChatSendBtn');
    if (!sendBtn) return;
    sendBtn.disabled = isBusy;
    sendBtn.innerHTML = isBusy
        ? '<span class="send-dot"></span>'
        : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
}

async function sendArchiveChatMessage(prefilledPrompt = '') {
    let input = document.getElementById('archiveChatInput');
    let question = (prefilledPrompt || input.value || '').trim();
    if (!question) return;
    if (!getSecretKey('gemini') && !getSecretKey('deepseek')) {
        alert('Für den Archiv-KI-Chat wird ein aktiver Gemini- oder DeepSeek-Key benötigt.');
        return;
    }
    let messages = getArchiveChatMessages();
    messages.push({ role: 'user', content: question, ts: new Date().toISOString() });
    saveArchiveChatMessages(messages);
    if (input) input.value = '';
    renderArchiveChat();
    let log = document.getElementById('archiveChatLog');
    if (log) {
        log.insertAdjacentHTML('beforeend', `<article class="chat-message chat-assistant chat-thinking"><div class="chat-avatar">AI</div><div class="chat-bubble"><span>Archiv Assistant</span><p><i></i><i></i><i></i></p></div></article>`);
        log.scrollTop = log.scrollHeight;
    }

    setArchiveChatBusy(true);
    try {
        let prompt = `Du bist der Archiv-KI-Core einer lokalen Produktanalyse-App.
Nutze ausschließlich den folgenden Archivkontext. Wenn eine Information dort nicht enthalten ist, sage klar "nicht im Archiv verifiziert".
Antworte kurz, konkret und auf Deutsch. Priorisiere Risiko, Kategorie, Packaging, bessere Alternativen und nächste sinnvolle Handlung.
Gib bis zu vier Quellen aus dem Archiv zurück, wenn du konkrete Produkte erwähnst.

ARCHIVKONTEXT:
${buildArchiveChatContext(question)}

LETZTE CHAT-NACHRICHTEN:
${messages.slice(-8).map(m => `${m.role}: ${m.content}`).join('\n')}

NUTZERFRAGE:
${question}

Antworte ausschließlich als JSON:
{"answer":"Antworttext","sources":[{"barcode":"Barcode aus Kontext","name":"Produktname aus Kontext"}]}`;
        let result = await executeKIEngine(prompt);
        let answer = result?.answer || 'Die KI hat keine verwertbare Antwort geliefert.';
        let sources = Array.isArray(result?.sources) ? result.sources : [];
        messages = getArchiveChatMessages();
        messages.push({ role: 'assistant', content: answer, sources, ts: new Date().toISOString() });
        saveArchiveChatMessages(messages);
    } catch (error) {
        messages = getArchiveChatMessages();
        messages.push({ role: 'assistant', content: 'Archiv-Chat konnte nicht ausgeführt werden: ' + (error?.message || error), ts: new Date().toISOString() });
        saveArchiveChatMessages(messages);
    } finally {
        setArchiveChatBusy(false);
        renderArchiveChat();
    }
}

function clearArchiveChat() {
    localStorage.removeItem('op_archive_chat');
    renderArchiveChat();
}

function setMapStatus(title, message = '', tone = 'neutral') {
    let card = document.getElementById('mapStatusCard');
    if (!card) return;
    card.className = `map-status-card map-status-${tone}`;
    card.innerHTML = `<strong>${escapeHTML(title)}</strong><span>${escapeHTML(message)}</span>`;
}

function getMapCategoryLabel(category = currentMapCategory) {
    const labels = {
        'clean-food': 'Clean Food',
        market: 'Märkte',
        beauty: 'Kosmetik',
        clothing: 'Kleidung',
        home: 'Home'
    };
    return labels[category] || 'Lokale Läden';
}

function getMapQueryParts(category = currentMapCategory) {
    const foodShops = 'supermarket|greengrocer|health_food|organic|farm|butcher|bakery|deli|convenience';
    const queries = {
        'clean-food': [
            `node["shop"~"${foodShops}"](around:RADIUS,LAT,LON);`,
            `way["shop"~"${foodShops}"](around:RADIUS,LAT,LON);`,
            `node["amenity"="marketplace"](around:RADIUS,LAT,LON);`,
            `way["amenity"="marketplace"](around:RADIUS,LAT,LON);`
        ],
        market: [
            `node["amenity"="marketplace"](around:RADIUS,LAT,LON);`,
            `way["amenity"="marketplace"](around:RADIUS,LAT,LON);`,
            `node["shop"~"farm|greengrocer|organic"](around:RADIUS,LAT,LON);`,
            `way["shop"~"farm|greengrocer|organic"](around:RADIUS,LAT,LON);`
        ],
        beauty: [
            `node["shop"~"chemist|cosmetics|beauty|perfumery"](around:RADIUS,LAT,LON);`,
            `way["shop"~"chemist|cosmetics|beauty|perfumery"](around:RADIUS,LAT,LON);`,
            `node["amenity"="pharmacy"](around:RADIUS,LAT,LON);`,
            `way["amenity"="pharmacy"](around:RADIUS,LAT,LON);`
        ],
        clothing: [
            `node["shop"~"clothes|shoes|second_hand|fabric|tailor"](around:RADIUS,LAT,LON);`,
            `way["shop"~"clothes|shoes|second_hand|fabric|tailor"](around:RADIUS,LAT,LON);`
        ],
        home: [
            `node["shop"~"furniture|houseware|doityourself|hardware|interior_decoration"](around:RADIUS,LAT,LON);`,
            `way["shop"~"furniture|houseware|doityourself|hardware|interior_decoration"](around:RADIUS,LAT,LON);`
        ]
    };
    return queries[category] || queries['clean-food'];
}

function buildOverpassQuery(lat, lon, radius, category = currentMapCategory) {
    let safeRadius = Math.max(500, Math.min(5000, Number.parseInt(radius, 10) || 2500));
    let safeLat = Number(lat).toFixed(6);
    let safeLon = Number(lon).toFixed(6);
    let body = getMapQueryParts(category)
        .join('\n')
        .replace(/RADIUS/g, safeRadius)
        .replace(/LAT/g, safeLat)
        .replace(/LON/g, safeLon);
    return `[out:json][timeout:18];\n(\n${body}\n);\nout center tags;`;
}

function getMapCacheKey(lat, lon, radius, category) {
    return `op_map_${category}_${radius}_${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;
}

function getPoiCoordinates(element) {
    let lat = Number(element.lat ?? element.center?.lat);
    let lon = Number(element.lon ?? element.center?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
    return { lat, lon };
}

function getMapPoiCategory(tags = {}) {
    if (tags.amenity === 'marketplace') return 'Markt';
    if (tags.amenity === 'pharmacy') return 'Apotheke';
    const shopMap = {
        supermarket: 'Supermarkt',
        greengrocer: 'Gemüse/Obst',
        health_food: 'Bio-/Health-Food',
        organic: 'Bio-Laden',
        farm: 'Hofladen',
        butcher: 'Metzgerei',
        bakery: 'Bäckerei',
        deli: 'Feinkost',
        convenience: 'Nahversorgung',
        chemist: 'Drogerie',
        cosmetics: 'Kosmetik',
        beauty: 'Beauty',
        perfumery: 'Parfümerie',
        clothes: 'Kleidung',
        shoes: 'Schuhe',
        second_hand: 'Second-Hand',
        fabric: 'Stoffe',
        tailor: 'Schneiderei',
        furniture: 'Möbel',
        houseware: 'Haushalt',
        doityourself: 'Baumarkt',
        hardware: 'Hardware',
        interior_decoration: 'Interior'
    };
    return shopMap[tags.shop] || tags.shop || 'Laden';
}

function getPoiName(element) {
    let tags = element?.tags || {};
    return tags.name || tags.brand || tags.operator || getMapPoiCategory(tags) || 'Lokaler Eintrag';
}

function getPoiAddress(tags = {}) {
    let parts = [tags['addr:street'], tags['addr:housenumber'], tags['addr:postcode'], tags['addr:city']]
        .filter(Boolean)
        .join(' ');
    return parts || tags.opening_hours || 'Adresse nicht hinterlegt';
}

function sanitizeMapWebsite(url) {
    return sanitizeExternalUrl(url);
}

function distanceMeters(aLat, aLon, bLat, bLon) {
    const radius = 6371000;
    const toRad = value => Number(value) * Math.PI / 180;
    const dLat = toRad(bLat - aLat);
    const dLon = toRad(bLon - aLon);
    const lat1 = toRad(aLat);
    const lat2 = toRad(bLat);
    const hav = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return Math.round(radius * 2 * Math.atan2(Math.sqrt(hav), Math.sqrt(1 - hav)));
}

function formatDistance(meters) {
    if (!Number.isFinite(meters)) return 'Distanz offen';
    if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
    return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0).replace('.', ',')} km`;
}

function normalizeMapPois(elements, center) {
    let seen = new Set();
    return (elements || [])
        .map(element => {
            let coords = getPoiCoordinates(element);
            if (!coords) return null;
            let tags = element.tags || {};
            let name = getPoiName(element);
            let key = `${name}|${coords.lat.toFixed(5)}|${coords.lon.toFixed(5)}`;
            if (seen.has(key)) return null;
            seen.add(key);
            let distance = distanceMeters(center.lat, center.lon, coords.lat, coords.lon);
            return {
                id: `poi-${String(element.id || key).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)}`,
                name,
                category: getMapPoiCategory(tags),
                address: getPoiAddress(tags),
                lat: coords.lat,
                lon: coords.lon,
                distance,
                openingHours: tags.opening_hours || '',
                website: sanitizeMapWebsite(tags.website || tags['contact:website'])
            };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, MAP_POI_LIMIT);
}

async function fetchLocalShopPois(lat, lon, radius, category) {
    let cacheKey = getMapCacheKey(lat, lon, radius, category);
    let cached = readJsonStorage(cacheKey, null);
    if (cached?.timestamp && Date.now() - cached.timestamp < 1000 * 60 * 20 && Array.isArray(cached.pois)) {
        return cached.pois;
    }
    if (mapAbortController) mapAbortController.abort();
    mapAbortController = new AbortController();
    let timeout = setTimeout(() => mapAbortController.abort(), 15000);
    try {
        let response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: buildOverpassQuery(lat, lon, radius, category),
            signal: mapAbortController.signal
        });
        if (!response.ok) throw new Error(`Overpass HTTP ${response.status}`);
        let data = await response.json();
        let pois = normalizeMapPois(data.elements || [], { lat, lon });
        writeJsonStorage(cacheKey, { timestamp: Date.now(), pois });
        return pois;
    } finally {
        clearTimeout(timeout);
    }
}

function getMapExternalSearchUrl() {
    if (!currentMapCenter) return 'https://www.openstreetmap.org/';
    let query = encodeURIComponent(`${getMapCategoryLabel()} near ${currentMapCenter.lat},${currentMapCenter.lon}`);
    return `https://www.openstreetmap.org/search?query=${query}`;
}

function renderLocalMap() {
    let canvas = document.getElementById('localMapCanvas');
    let list = document.getElementById('mapPoiList');
    let mapView = document.getElementById('view-map');
    if (!canvas || !list) return;
    const setMapLayoutState = (hasPois) => {
        if (!mapView) return;
        mapView.classList.toggle('map-has-pois', Boolean(hasPois));
        mapView.classList.toggle('map-no-pois', !hasPois);
    };
    if (currentMapLoading) {
        setMapLayoutState(false);
        canvas.innerHTML = `<div class="map-loading"><i></i><strong>Lokale Karte wird geladen</strong><small>${escapeHTML(getMapCategoryLabel())} im Radius ${formatDistance(currentMapRadius)}</small></div>`;
        list.innerHTML = '';
        return;
    }
    if (!currentMapCenter) {
        setMapLayoutState(false);
        canvas.innerHTML = `<div class="map-empty-state"><span>◎</span><strong>Noch kein Standort</strong><small>Die Karte startet erst nach deiner Freigabe.</small></div>`;
        list.innerHTML = '';
        return;
    }
    setMapLayoutState(currentMapPois.length > 0);
    let radius = Math.max(1000, currentMapRadius);
    let pins = currentMapPois.map((poi, index) => {
        let x = 50 + ((poi.lon - currentMapCenter.lon) / (radius / 111320)) * 35;
        let y = 50 - ((poi.lat - currentMapCenter.lat) / (radius / 111320)) * 35;
        x = Math.max(8, Math.min(92, x));
        y = Math.max(8, Math.min(92, y));
        return `<button class="map-pin" style="left:${x}%; top:${y}%;" title="${escapeHTML(poi.name)}" onclick="document.getElementById('poi-${escapeHTML(poi.id)}')?.scrollIntoView({behavior:'smooth', block:'center'});">${index + 1}</button>`;
    }).join('');
    canvas.innerHTML = `
        <div class="map-grid"></div>
        <div class="map-user-dot" style="left:50%; top:50%;"></div>
        ${pins}
        <div class="map-radius-label">${escapeHTML(formatDistance(currentMapRadius))}</div>
    `;
    if (!currentMapPois.length) {
        list.innerHTML = `<div class="map-poi-empty"><strong>Keine Treffer</strong><span>Radius oder Kategorie ändern, oder externe Suche öffnen.</span><a href="${escapeHTML(getMapExternalSearchUrl())}" target="_blank" rel="noopener">In OpenStreetMap suchen</a></div>`;
        return;
    }
    list.innerHTML = currentMapPois.map((poi, index) => {
        let mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${poi.lat},${poi.lon}`)}`;
        let osmUrl = `https://www.openstreetmap.org/?mlat=${encodeURIComponent(poi.lat)}&mlon=${encodeURIComponent(poi.lon)}#map=18/${encodeURIComponent(poi.lat)}/${encodeURIComponent(poi.lon)}`;
        return `
            <article class="map-poi-card" id="poi-${escapeHTML(poi.id)}">
                <div class="map-poi-index">${index + 1}</div>
                <div class="map-poi-main">
                    <div class="map-poi-head">
                        <strong>${escapeHTML(poi.name)}</strong>
                        <span>${escapeHTML(formatDistance(poi.distance))}</span>
                    </div>
                    <p>${escapeHTML(poi.category)} · ${escapeHTML(poi.address)}</p>
                    ${poi.openingHours ? `<small>${escapeHTML(poi.openingHours)}</small>` : ''}
                    <div class="map-poi-actions">
                        <a href="${escapeHTML(mapsUrl)}" target="_blank" rel="noopener">Route</a>
                        <a href="${escapeHTML(osmUrl)}" target="_blank" rel="noopener">OSM</a>
                        ${poi.website ? `<a href="${escapeHTML(poi.website)}" target="_blank" rel="noopener">Website</a>` : ''}
                    </div>
                </div>
            </article>
        `;
    }).join('');
}

async function loadMapPoisForCurrentCenter() {
    if (!currentMapCenter) return;
    currentMapLoading = true;
    renderLocalMap();
    setMapStatus('Suche lokale Einkaufsoptionen...', `${getMapCategoryLabel()} · ${formatDistance(currentMapRadius)} Radius`, 'loading');
    try {
        currentMapPois = await fetchLocalShopPois(currentMapCenter.lat, currentMapCenter.lon, currentMapRadius, currentMapCategory);
        setMapStatus(
            currentMapPois.length ? `${currentMapPois.length} lokale Treffer` : 'Keine lokalen Treffer',
            currentMapPois.length ? 'Sortiert nach Entfernung. Route öffnet externe Karten.' : 'Versuche eine andere Kategorie oder einen größeren Radius.',
            currentMapPois.length ? 'success' : 'warning'
        );
    } catch (error) {
        currentMapPois = [];
        setMapStatus('Kartenabfrage nicht verfügbar', 'Overpass kann temporär ausgelastet sein. Externe Suche bleibt verfügbar.', 'warning');
    } finally {
        currentMapLoading = false;
        renderLocalMap();
    }
}

function locateAndLoadMapPois() {
    if (!navigator.geolocation) {
        setMapStatus('Standort nicht verfügbar', 'Dieser Browser unterstützt keine Geolocation. Nutze die externe OpenStreetMap-Suche.', 'warning');
        renderLocalMap();
        return;
    }
    setMapStatus('Standort wird angefragt...', 'Der Browser fragt dich gleich nach Freigabe.', 'loading');
    currentMapLoading = true;
    renderLocalMap();
    navigator.geolocation.getCurrentPosition(position => {
        currentMapCenter = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
        };
        loadMapPoisForCurrentCenter();
    }, () => {
        currentMapLoading = false;
        setMapStatus('Standort blockiert', 'Ohne Standort kann die App keine lokalen Pins berechnen. Du kannst die Freigabe im Browser ändern.', 'warning');
        renderLocalMap();
    }, {
        enableHighAccuracy: false,
        timeout: 12000,
        maximumAge: 1000 * 60 * 10
    });
}

function setMapCategory(category) {
    currentMapCategory = category;
    document.querySelectorAll('.map-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mapCategory === category);
    });
    if (currentMapCenter) loadMapPoisForCurrentCenter();
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
        let imgHtml = isSafeImageUrl(item.imageUrl) ? `<img src="${escapeHTML(item.imageUrl)}" class="hist-img" alt="">` : `<div class="hist-img" style="display:flex;align-items:center;justify-content:center;font-size:7px;color:#555;">NO IMG</div>`;
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
            let imgHtml = isSafeImageUrl(data.imageUrl) ? `<img src="${escapeHTML(data.imageUrl)}" class="res-img" alt="">` : `<div class="res-img" style="display:flex;align-items:center;justify-content:center;font-size:8px;color:#555;">NO IMG</div>`;
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
    if (viewName === 'chat') renderArchiveChat();
    if (viewName === 'map') renderLocalMap();
};

function renderChangelogHtml() {
    const releases = [
        {
            version: 'V14.4',
            tag: 'Readiness',
            title: 'Security, Responsive und KI-Robustheit',
            highlights: [
                'Gemini-JSON-Antworten werden robuster extrahiert; Parse-Fehler blockieren die App nicht mehr als iOS-Systemalert.',
                'Textanalysen können bei Gemini-Problemen auf DeepSeek ausweichen, während Vision-Funktionen bei Gemini bleiben.',
                'Vision-Pipelines sichern die Websuche vor der KI-Detailanalyse: Google CSE zuerst, DuckDuckGo als Fallback.',
                'Desktop-, Tablet- und Android-Layouts wurden mit eigenen Breakpoints ergänzt.',
                'Externe URLs und dynamische Renderpfade wurden zusätzlich gehärtet.'
            ]
        },
        {
            version: 'V14.3',
            tag: 'Phase 5',
            title: 'Local Shopping Map Core',
            highlights: [
                'Neue Clean Shopping Map für lokale Märkte, Bio-/Health-Food-Läden, Drogerien, Kleidung, Second-Hand, Möbel und Haushaltsalternativen.',
                'Standort wird nur nach Nutzeraktion verwendet; lokale Pins, Distanz, Kategorie und externe Route werden im Browser berechnet.',
                'Overpass-Abfragen sind gecacht, auf 30 Treffer begrenzt und fallen bei Last oder Netzwerkproblemen auf externe OpenStreetMap-Suche zurück.',
                'Bottom-Navigation und Home-Dashboard enthalten jetzt einen direkten Karten-Einstieg.'
            ]
        },
        {
            version: 'V14.2',
            tag: 'Phase 4',
            title: 'Vault UI und AI Chat Polish',
            highlights: [
                'Archiv wurde als übersichtlicher Vault mit Kennzahlen, Suche, Sortierung, Kategorie-Counts und lesbaren Produktkarten neu aufgebaut.',
                'Produktkarten zeigen Score-Zustand, Top-Signaturen, Packaging-Risiko und Rohdaten-Vorschau ohne Textüberladung.',
                'Archiv-Chat wurde an moderne iOS-AI-Chat-Apps angelehnt: Header, Assistant-Orb, Bubble-Layout, Suggestions und Composer-Bar.',
                'Chat-Kontext wird relevanzsortiert und gekürzt, damit KI-Anfragen performanter und stabiler bleiben.'
            ]
        },
        {
            version: 'V14.1',
            tag: 'Phase 3',
            title: 'Archive AI Core',
            highlights: [
                'Neuer separater KI-Chat mit Zugriff auf lokale Archivprodukte, Kategorien, Scores, Packaging und gespeicherte Summaries.',
                'Gemini-Aufrufe nutzen eine Flash-Fallback-Kette mit Retry bei temporärer Überlastung statt sofortigem Abbruch.',
                'Changelog wurde als lesbare Timeline mit Release-Karten, Tags und klarer Typografie neu aufgebaut.',
                'Systemlabels, README und lokale Analyseversion wurden auf V14.1 aktualisiert.'
            ]
        },
        {
            version: 'V14',
            tag: 'Scanner + Material Core',
            title: 'Guided Scanner, Packaging & Multi-Category',
            highlights: [
                'Scanner-Interface mit getrennten Modi für Live-Barcode und geführte Produktfotos.',
                'Guided Vision erfasst Vorderseite, Inhalts- oder Materialetikett und optional Packaging.',
                'Packaging Core ergänzt einen separaten 0-100 Teilscore mit Material, Risiko, Konfidenz und Entsorgungshinweis.',
                'Archivobjekte werden in das versionierte Datenmodell überführt; fehlende KI-Summaries können einmalig erzeugt und gespeichert werden.',
                'Kleidung, Haushalt und Möbel nutzen eigene Materialprofile; Lebensmittelregeln werden nicht auf diese Kategorien übertragen.',
                'Kuratierte Alternativen und unbestätigte Web-Alternativen werden getrennt dargestellt.'
            ]
        },
        {
            version: 'V13.8.3',
            tag: 'Security + Quality',
            title: 'Key-Sicherheit und Analysehärtung',
            highlights: [
                'API-Keys können per WebCrypto AES-GCM und PBKDF2-Master-Passphrase verschlüsselt gespeichert werden.',
                'OCR- und QuickScan-Ergebnisse können durch KI bereinigt, übersetzt und zusammengefasst werden.',
                'Negierte Treffer wie "ohne Zucker", "zuckerfrei" oder "ohne Parfum" werden nicht mehr als echte Schadstofftreffer gewertet.',
                'System-Reset löscht nur App-eigene op_-Speicherwerte.'
            ]
        },
        {
            version: 'V13.8.2',
            tag: 'Quota Hotfix',
            title: 'Gemini Grounding entfernt',
            highlights: [
                'Google Search Grounding wurde aus Gemini-Aufrufen entfernt, weil die App eine eigene Websuch-Pipeline besitzt.'
            ]
        },
        {
            version: 'V13.7 - V13.5',
            tag: 'Foundation',
            title: 'RAG Kamera, Setup und lokales Archiv',
            highlights: [
                'Multimodale Kamera-Pipeline identifiziert Produktnamen aus Fotos, sucht Kontext und analysiert Zutaten.',
                'Setup-Anleitung für Gemini und DeepSeek wurde integriert.',
                'Lokaler Import, Export, Custom Toxins und Offline-Archiv wurden eingeführt.'
            ]
        }
    ];

    return releases.map(release => `
        <article class="changelog-card">
            <div class="changelog-card-head">
                <span>${escapeHTML(release.version)}</span>
                <b>${escapeHTML(release.tag)}</b>
            </div>
            <h4>${escapeHTML(release.title)}</h4>
            <ul>${release.highlights.map(item => `<li>${escapeHTML(item)}</li>`).join('')}</ul>
        </article>
    `).join('');
}

// Boot-Sequenz & Event-Binding
let dbTimestamp = new Date().getTime();
Promise.all([
    fetchJsonWithTimeout('blacklist.json?v=' + dbTimestamp).then(r => r),
    fetchJsonWithTimeout('whitelist.json?v=' + dbTimestamp).then(r => r),
    fetchJsonWithTimeout('category_profiles.json?v=' + dbTimestamp).catch(() => ({})),
    fetchJsonWithTimeout('curated_alternatives.json?v=' + dbTimestamp).catch(() => ([]))
]).then(data => {
    blacklist = data[0]; whitelist = data[1]; categoryProfiles = data[2] || {}; curatedAlternatives = data[3] || []; dbActive = true;
    if (document.getElementById('db-status')) document.getElementById('db-status').style.display = 'none';
    initTheme();
    updateCoreStatusBadge();
}).catch(() => {
    blacklist = blacklist || {};
    whitelist = whitelist || {};
    categoryProfiles = categoryProfiles || {};
    curatedAlternatives = curatedAlternatives || [];
    dbActive = false;
    initTheme();
    updateCoreStatusBadge();
    if (document.getElementById('db-status')) document.getElementById('db-status').style.display = 'block';
});

document.addEventListener('DOMContentLoaded', () => {
    migrateArchiveToCurrentVersion();
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
    document.getElementById('nav-map').addEventListener('click', () => openView('map'));
    document.getElementById('nav-history').addEventListener('click', () => openView('history'));
    document.getElementById('nav-chat').addEventListener('click', () => openView('chat'));
    if (document.getElementById('nav-settings')) {
        document.getElementById('nav-settings').addEventListener('click', () => openView('settings'));
    }

    document.getElementById('card-scan').addEventListener('click', () => openView('scan'));
    document.getElementById('card-search').addEventListener('click', () => openView('search'));
    document.getElementById('card-history').addEventListener('click', () => openView('history'));
    document.getElementById('card-map').addEventListener('click', () => openView('map'));
    document.getElementById('card-compare').addEventListener('click', () => openView('compare'));
    document.getElementById('card-chat').addEventListener('click', () => openView('chat'));

    // Quick-Scan
    document.getElementById('quickScanBtn').addEventListener('click', executeQuickScan);
    
    // Export/Import
    document.getElementById('exportHistoryBtn').addEventListener('click', exportHistory);
    document.getElementById('importHistoryBtn').addEventListener('click', () => document.getElementById('importHistoryInput').click());
    document.getElementById('importHistoryInput').onchange = (e) => { if(e.target.files.length > 0) importHistory(e.target.files[0]); };
    document.getElementById('historySearchInput').addEventListener('input', (e) => {
        currentHistorySearch = e.target.value;
        renderHistory();
    });
    document.getElementById('historySortSelect').addEventListener('change', (e) => {
        currentHistorySort = e.target.value;
        renderHistory();
    });
    
    // Custom Toxin
    document.getElementById('addCustomToxinBtn').addEventListener('click', addCustomToxin);
    
    // Torch
    document.getElementById('torchToggleBtn').addEventListener('click', toggleTorch);
    
    // Barcode aus Foto
    document.getElementById('barcodePhotoBtn').addEventListener('click', () => document.getElementById('barcodePhotoInput').click());
    document.getElementById('barcodePhotoInput').onchange = (e) => { if(e.target.files.length > 0) processBarcodePhoto(e.target.files[0]); };

    // V14 Guided Scanner
    document.getElementById('scanModeBarcode').addEventListener('click', () => setScanMode('barcode'));
    document.getElementById('scanModePhoto').addEventListener('click', () => setScanMode('photo'));
    document.getElementById('captureFrontBtn').addEventListener('click', () => document.getElementById('guidedFrontInput').click());
    document.getElementById('captureLabelBtn').addEventListener('click', () => document.getElementById('guidedLabelInput').click());
    document.getElementById('capturePackagingBtn').addEventListener('click', () => document.getElementById('guidedPackagingInput').click());
    document.getElementById('guidedFrontInput').onchange = (e) => setGuidedScanFile('front', e.target.files[0]);
    document.getElementById('guidedLabelInput').onchange = (e) => setGuidedScanFile('label', e.target.files[0]);
    document.getElementById('guidedPackagingInput').onchange = (e) => setGuidedScanFile('packaging', e.target.files[0]);
    document.getElementById('guidedAnalyzeBtn').addEventListener('click', () => processGuidedProductScan(guidedScanFiles));
    
    // Compare
    document.getElementById('compareRunBtn').addEventListener('click', runCompare);
    document.getElementById('archiveChatSendBtn').addEventListener('click', () => sendArchiveChatMessage());
    document.getElementById('archiveChatClearBtn').addEventListener('click', clearArchiveChat);
    document.getElementById('archiveChatInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendArchiveChatMessage();
        }
    });
    document.getElementById('archiveChatInput').addEventListener('input', (e) => {
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(118, e.target.scrollHeight) + 'px';
    });
    document.querySelectorAll('[data-chat-prompt]').forEach(button => {
        button.addEventListener('click', () => sendArchiveChatMessage(button.dataset.chatPrompt || ''));
    });

    document.getElementById('mapLocateBtn').addEventListener('click', locateAndLoadMapPois);
    document.getElementById('mapRadiusSelect').addEventListener('change', (e) => {
        currentMapRadius = Number.parseInt(e.target.value, 10) || 2500;
        if (currentMapCenter) loadMapPoisForCurrentCenter();
    });
    document.querySelectorAll('[data-map-category]').forEach(button => {
        button.addEventListener('click', () => setMapCategory(button.dataset.mapCategory || 'clean-food'));
    });

    document.getElementById('flt-alle').addEventListener('click', () => filterHistory('Alle', 'flt-alle'));
    document.getElementById('flt-nahrung').addEventListener('click', () => filterHistory('Nahrung', 'flt-nahrung'));
    document.getElementById('flt-kosmetik').addEventListener('click', () => filterHistory('Kosmetik', 'flt-kosmetik'));
    document.getElementById('flt-optisch').addEventListener('click', () => filterHistory('Optisch', 'flt-optisch'));
    document.getElementById('flt-kleidung').addEventListener('click', () => filterHistory('Kleidung', 'flt-kleidung'));
    document.getElementById('flt-haushalt').addEventListener('click', () => filterHistory('Haushalt', 'flt-haushalt'));
    document.getElementById('flt-moebel').addEventListener('click', () => filterHistory('Möbel', 'flt-moebel'));

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

    // Passphrase Modal Events
    document.getElementById('pinModalConfirm')?.addEventListener('click', confirmPinModal);
    document.getElementById('pinModalCancel')?.addEventListener('click', cancelPinModal);
    document.getElementById('pinModalOverlay')?.addEventListener('click', cancelPinModal);
    document.getElementById('pinModalInput')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') confirmPinModal();
        if (e.key === 'Escape') cancelPinModal();
    });
    
    // Globale Escape-Taste für Modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (document.getElementById('kiModalBox')?.classList.contains('active')) cancelKIInputModal();
            if (document.getElementById('pinModalBox')?.style.display === 'block') cancelPinModal();
            if (document.getElementById('detailModalOverlay')?.style.display === 'block') closeModal();
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
            openChangelogModal();
        });
    }

    const resetAppSettingsBtn = document.getElementById('resetAppSettingsBtn');
    if (resetAppSettingsBtn) {
        resetAppSettingsBtn.addEventListener('click', () => {
            if (confirm("Möchtest du wirklich alle Werkseinstellungen zurücksetzen?\n\nDies löscht alle gespeicherten API-Schlüssel, das gesamte Archiv und deine benutzerdefinierten Toxin-Definitionen unwiderruflich!")) {
                Object.keys(localStorage).filter(key => key.startsWith('op_')).forEach(key => localStorage.removeItem(key));
                Object.keys(sessionStorage).filter(key => key.startsWith('op_')).forEach(key => sessionStorage.removeItem(key));
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
            sessionStorage.removeItem('op_google_key_session');
        }
    });

    document.getElementById('persistKeyToggle')?.addEventListener('change', async (e) => {
        if (e.target.checked) {
            showPinModal('create').then(async pin => {
                try {
                    // Verschlüssele aktuell geladene Schlüssel, bevor das Persistenz-Flag gesetzt wird.
                    if (runtimeGeminiKey) localStorage.setItem('op_gemini_key_enc', await encryptWithPin(runtimeGeminiKey, pin));
                    if (runtimeDeepSeekKey) localStorage.setItem('op_deepseek_key_enc', await encryptWithPin(runtimeDeepSeekKey, pin));
                    if (runtimeGoogleSearchKey) localStorage.setItem('op_google_key_enc', await encryptWithPin(runtimeGoogleSearchKey, pin));
                    if (runtimeGoogleSearchCx) localStorage.setItem('op_google_cx_enc', await encryptWithPin(runtimeGoogleSearchCx, pin));

                    runtimePin = pin;
                    localStorage.setItem('op_keys_are_encrypted', '1');
                    alert("System-Core mit WebCrypto verschlüsselt dauerhaft auf diesem Gerät gesichert.");
                } catch (err) {
                    localStorage.removeItem('op_gemini_key_enc');
                    localStorage.removeItem('op_deepseek_key_enc');
                    localStorage.removeItem('op_google_key_enc');
                    localStorage.removeItem('op_google_cx_enc');
                    localStorage.removeItem('op_keys_are_encrypted');
                    runtimePin = "";
                    alert("Verschlüsselung konnte nicht aktiviert werden: " + (err?.message || err));
                    e.target.checked = false;
                }
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

// ─── PASSPHRASE MODAL DIALOG FLOW ───
let _pinModalResolve = null;
let _pinModalReject = null;

function showPinModal(mode) {
    return new Promise((resolve, reject) => {
        _pinModalResolve = resolve;
        _pinModalReject = reject;
        
        const overlay = document.getElementById('pinModalOverlay');
        const box = document.getElementById('pinModalBox');
        if (!overlay || !box) {
            reject("Passphrase modal elements not found in DOM");
            return;
        }
        
        const title = box.querySelector('h3');
        const desc = box.querySelector('p');
        const input = document.getElementById('pinModalInput');
        const confirmBtn = document.getElementById('pinModalConfirm');
        
        if (input) input.value = "";
        
        if (mode === 'create') {
            if (title) title.innerText = "🔒 Master-Passphrase erstellen";
            if (desc) desc.innerText = "Erstelle eine Passphrase mit mindestens 6 Zeichen, um deine API-Schlüssel verschlüsselt auf diesem Gerät zu speichern:";
            if (confirmBtn) confirmBtn.innerText = "Erstellen";
        } else {
            if (title) title.innerText = "🔒 Master-Passphrase erforderlich";
            if (desc) desc.innerText = "Gib deine Master-Passphrase ein, um die verschlüsselten System-Core-Schlüssel freizuschalten:";
            if (confirmBtn) confirmBtn.innerText = "Entsperren";
        }
        
        overlay.style.display = "block";
        box.style.display = "block";
        setTimeout(() => {
            box.style.transform = "translate(-50%, -50%) scale(1)";
            box.style.opacity = "1";
            if (input) input.focus();
        }, 10);
    });
}

function confirmPinModal() {
    const input = document.getElementById('pinModalInput');
    if (!input) return;
    const val = input.value.trim();
    if (val.length < 6) {
        alert("Die Passphrase muss mindestens 6 Zeichen enthalten.");
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
    if (box) {
        box.style.transform = "translate(-50%, -50%) scale(0.95)";
        box.style.opacity = "0";
    }
    setTimeout(() => {
        if (overlay) overlay.style.display = "none";
        if (box) box.style.display = "none";
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
        
        showPinModal('unlock').then(async pin => {
            let keysFound = ['op_gemini_key_enc', 'op_deepseek_key_enc', 'op_google_key_enc', 'op_google_cx_enc'].some(k => localStorage.getItem(k));
            let isCorrect = false;
            if (keysFound) {
                let testKey = ['op_gemini_key_enc', 'op_deepseek_key_enc', 'op_google_key_enc', 'op_google_cx_enc'].find(k => localStorage.getItem(k));
                let testDecrypted = await decryptWithPin(localStorage.getItem(testKey), pin);
                if (testDecrypted !== null) {
                    isCorrect = true;
                }
            } else {
                isCorrect = true;
            }
            
            if (isCorrect) {
                runtimePin = pin;
                runtimeGeminiKey = await decryptWithPin(localStorage.getItem('op_gemini_key_enc'), pin) || "";
                runtimeDeepSeekKey = await decryptWithPin(localStorage.getItem('op_deepseek_key_enc'), pin) || "";
                runtimeGoogleSearchKey = await decryptWithPin(localStorage.getItem('op_google_key_enc'), pin) || "";
                runtimeGoogleSearchCx = await decryptWithPin(localStorage.getItem('op_google_cx_enc'), pin) || "";
                
                sessionStorage.setItem('op_gemini_key_session', runtimeGeminiKey);
                sessionStorage.setItem('op_deepseek_key_session', runtimeDeepSeekKey);
                sessionStorage.setItem('op_google_key_session', runtimeGoogleSearchKey);
                localStorage.setItem('op_google_cx', runtimeGoogleSearchCx);
                
                updateCoreStatusBadge();
                loadSettings();
            } else {
                alert("Ungültige Master-Passphrase. Zugriff verweigert.");
                loadSettings();
            }
        }).catch(() => {
            console.log("Passphrase-Freischaltung abgebrochen.");
            loadSettings();
        });
    }
}
