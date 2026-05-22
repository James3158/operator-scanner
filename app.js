let html5QrCode; 
let currentHistoryFilter = 'Alle';
let viewStack = ['home']; 
let activeArchiveInjectBarcode = "";

// State Management & Navigation Stack
function goBack() {
    if (viewStack.length > 1) {
        viewStack.pop(); 
        openView(viewStack[viewStack.length - 1], true);
    }
}

// Kamerasor-Kapselung mit async Error-Catching
function startScanner() {
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('reader').style.display = 'block';
    html5QrCode = new Html5Qrcode("reader");
    html5QrCode.start({ facingMode: "environment" }, { fps: 20, useBarCodeDetectorIfSupported: true, videoConstraints: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } } }, onScanSuccess).catch(() => {
        alert("Hardware-Zugriff verweigert."); goBack();
    });
}

function triggerArchiveImageInject(event, barcode) {
    event.stopPropagation();
    activeArchiveInjectBarcode = barcode;
    document.getElementById('archiveImageInjectorInput').click();
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

// Initialer Boot-Prozess & DOM Event-Binding
document.addEventListener('DOMContentLoaded', () => {
    // Navigations-Tabs
    document.getElementById('nav-home').addEventListener('click', () => openView('home'));
    document.getElementById('nav-scan').addEventListener('click', () => openView('scan'));
    document.getElementById('nav-search').addEventListener('click', () => openView('search'));
    document.getElementById('nav-history').addEventListener('click', () => openView('history'));
    document.getElementById('nav-settings').addEventListener('click', () => openView('settings'));

    // Dashboard Cards
    document.getElementById('card-scan').addEventListener('click', () => openView('scan'));
    document.getElementById('card-search').addEventListener('click', () => openView('search'));
    document.getElementById('card-history').addEventListener('click', () => openView('history'));

    // Archiv-Filter
    document.getElementById('flt-alle').addEventListener('click', () => filterHistory('Alle', 'flt-alle'));
    document.getElementById('flt-nahrung').addEventListener('click', () => filterHistory('Nahrung', 'flt-nahrung'));
    document.getElementById('flt-kosmetik').addEventListener('click', () => filterHistory('Kosmetik', 'flt-kosmetik'));
    document.getElementById('flt-optisch').addEventListener('click', () => filterHistory('Optisch', 'flt-optisch'));

    // Canvas Downscaler für Galerie-Bilder
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
