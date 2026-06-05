// Globale Datenbehälter für die Laufzeit
let blacklist = {}; 
let whitelist = {}; 
let dbActive = false;

const alternativeDeepDiveMatrix = {
    "100% rohkakao-masse": "Roher Kakao ist frei von industriellem raffiniertem Zucker und ungesunden Fetten. Er liefert maximale Polyphenole und Magnesium, stärkt das Herz-Kreislauf-System und hebt die Frequenz ohne Dopamin-Absturz.",
    "luftgetrocknetes beef jerky": "Liefert reines Protein und bioverfügbares Eisen ohne entzündliche Samenöle (Sojalecithin, Sonnenblumenöl) oder künstliche Geschmacksverstärker.",
    "gefiltertes eiswasser": "Reines strukturiertes Wasser rehydriert die Zellen direkt. Elektrolyte aus Meersalz optimieren die neuronale Signalübertragung der Muskulatur.",
    "echtes sauerteigbrot": "Durch die lange Fermentation der Milchsäurebakterien werden Gluten und Phytinsäure vorab abgebaut. Macht Nährstoffe maximal bioverfügbar.",
    "lavaerde (rhassoul)": "Reinigt Haut und Haare rein physikalisch durch Ionenbindung, ohne Tenside (SLS) einzusetzen. Schützt die Lipidbarriere der Haut komplett.",
    "reiner rindertalg (tallow)": "Besitzt eine fast 1:1 identische Fettsäuren-Struktur zum menschlichen Hauttalg. Zieht perfekt ein, liefert die Vitamine A, D, E, K und verzichtet vollständig auf erdölbasierte Silikone.",
    "100% kernseife": "Frei von Duftstoffen (Parfum), Mikroplastik und hormonellen Konservierungsstoffen (Parabene). Reinigt biologisch neutral.",
    "natürlicher alaunstein": "Ein mineralisches Salz, das antibakteriell wirkt und Gerüche hemmt, ohne die Schweißdrüsen mit neurotoxischen Aluminium-Komplexen zu verstopfen.",
    "unverarbeitetes weidefleisch": "Das optimale menschliche Nährstoffprofil. Reich an gesättigten Fettsäuren (Fundament der Testosteronsynthese) und frei von Nitritpökelsalz.",
    "rohe eier": "Maximale biologische Wertigkeit. Liefert Cholesterin als direkten Baustein für die Leydig-Zellen im Hoden zur Testosteronproduktion. Frei von Industrie-Süßstoffen."
};

const contextualAlternatives = {
    "schokolade|choco|kakao": "100% Rohkakao-Masse, Kakaonibs, oder selbstgemacht aus Kakaobutter und rohem Bio-Honig.",
    "chips|snack|crisps": "Luftgetrocknetes Beef Jerky, gebackene Rinderleber-Crisps, rohe Macadamia-Nüsse.",
    "energy|drink|cola|soda": "Gefiltertes Eiswasser mit keltischem Meersalz, reines Kokoswasser.",
    "brot|bread|toast": "Echtes Sauerteigbrot (nur Wasser, Salz, Urgetreide-Mehl).",
    "shampoo|hair|haar": "Lavaerde (Rhassoul), Roggenmehl-Wäsche, Aleppo-Seife.",
    "creme|lotion|skin|pflege": "Reiner Rindertalg (Tallow), unraffinierte Sheabutter.",
    "seife|soap|wash|dusch": "100% Kernseife (ohne EDTA/Parfum), afrikanische schwarze Seife.",
    "deo|deodorant": "Natürlicher Alaunstein, verdünnter Apfelessig.",
    "wurst|salami|fleisch": "Unverarbeitetes Weidefleisch, Knochenmark vom Metzger.",
    "protein|riegel|shake": "Rohe Eier, Kefir, Rindersteak. Finger weg von Industrie-Isolaten."
};

const fallbackAlternatives = {
    "fluorid": "Miswak-Stab, naturreine Zahnkreide.",
    "aspartam": "Roher Honig.",
    "soja": "Weidefleisch, Eier (Testosteron-Basis)."
};

function escapeHTML(str) {
    return str ? String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';
}

function jsArg(value) {
    return escapeHTML(JSON.stringify(String(value || '')));
}

function readJsonStorage(key, fallback) {
    try {
        let parsed = JSON.parse(localStorage.getItem(key));
        return parsed === null ? fallback : parsed;
    } catch (e) {
        return fallback;
    }
}

function writeJsonStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        return false;
    }
}

function normalizeText(str) {
    return String(str || '')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’`´]/g, "'")
        .toLowerCase();
}

function normalizeIngredientText(str) {
    return normalizeText(str)
        .replace(/[_/]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function isSafeImageUrl(url) {
    if (!url) return false;
    let val = String(url);
    return /^https?:\/\//i.test(val) || /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(val);
}

function getDisplayDate(isoDate) {
    let d = isoDate ? new Date(isoDate) : new Date();
    if (Number.isNaN(d.getTime())) d = new Date();
    return d.toLocaleDateString('de-DE');
}

function normalizeHistoryItem(item) {
    if (!item || typeof item !== 'object') return null;
    let barcode = String(item.barcode || '').slice(0, 80);
    if (!barcode) return null;
    let category = ['Nahrung', 'Kosmetik', 'Optisch'].includes(item.category) ? item.category : 'Optisch';
    let score = Number.parseInt(item.score, 10);
    if (Number.isNaN(score)) score = 0;
    let dateIso = item.dateIso || item.date || new Date().toISOString();
    return {
        barcode,
        name: String(item.name || 'Unbekanntes Objekt').slice(0, 180),
        score: Math.max(0, Math.min(100, score)),
        category,
        rawIngredients: String(item.rawIngredients || '').slice(0, 20000),
        imageUrl: isSafeImageUrl(item.imageUrl) ? String(item.imageUrl) : '',
        date: getDisplayDate(dateIso),
        dateIso
    };
}

function getHistory() {
    let raw = readJsonStorage('op_history', []);
    if (!Array.isArray(raw)) return [];
    return raw.map(normalizeHistoryItem).filter(Boolean).slice(0, 100);
}

function saveHistory(history) {
    return writeJsonStorage('op_history', history.map(normalizeHistoryItem).filter(Boolean).slice(0, 100));
}

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasUnicodeBoundary(text, token) {
    let pattern = new RegExp('(^|[^\\p{L}\\p{N}])' + escapeRegExp(token) + '(?=$|[^\\p{L}\\p{N}])', 'iu');
    return pattern.test(text);
}

function matchIngredient(text, alias, itemPattern) {
    // Wenn ein explizites Regex-Pattern in der JSON definiert ist, nutze dieses
    if (itemPattern) {
        try {
            return (new RegExp(itemPattern, 'iu')).test(text);
        } catch (e) {
            return false;
        }
    }
    let cleanText = normalizeIngredientText(text);
    let cleanAlias = normalizeIngredientText(alias);
    if (!cleanAlias) return false;
    // Prefix-Match: Alias endet mit '-' → matcht alle Wörter die so beginnen
    if (cleanAlias.endsWith('-')) {
        let prefix = cleanAlias.slice(0, -1);
        return hasUnicodeBoundary(cleanText, prefix) || new RegExp('(^|[^\\p{L}\\p{N}])' + escapeRegExp(prefix) + '-', 'iu').test(cleanText);
    }
    return hasUnicodeBoundary(cleanText, cleanAlias);
}

function analyzeProduct(data, category, barcode, isExtracted = false) {
    if (!data || !data.product) {
        renderFallbackUI(barcode);
        return;
    }
    let p = data.product;
    let imgUrlFinal = isSafeImageUrl(p.image_url || p.image_front_small_url || "") ? (p.image_url || p.image_front_small_url || "") : "";
    let ingredientsRawOriginal = [p.ingredients_text_de || "", p.ingredients_text_en || "", p.ingredients_text || "", p.ingredients_tags ? p.ingredients_tags.join(" ") : ""].join(" ");
    let ingredientsRaw = normalizeIngredientText(ingredientsRawOriginal);
    let productName = p.product_name || "Unbekanntes Objekt";
    let productContext = normalizeIngredientText(productName + " " + (p.categories || ""));
    let imageHtml = imgUrlFinal ? `<img src="${escapeHTML(imgUrlFinal)}" class="res-img">` : `<div class="res-img" style="display:flex;align-items:center;justify-content:center;font-size:10px;color:#555;">NO IMG</div>`;
    
    if (ingredientsRaw.trim() === "" && !isExtracted && !category.includes("Suche")) {
        renderFallbackUI(barcode, productName); return;
    }

    let foundToxins = [], foundGood = [], score = 100;
    // Severity-Gewichtung: high=-30, medium=-20, low=-10
    const severityPenalty = { high: 30, medium: 20, low: 10 };
    let collectedAlts = new Set();
    let contextMatch = false;

    // Custom Toxine mergen
    let effectiveBlacklist = Object.assign({}, blacklist);
    try {
        let customToxins = readJsonStorage('op_custom_toxins', {});
        Object.keys(customToxins).forEach(key => {
            effectiveBlacklist['custom_' + key] = customToxins[key];
        });
    } catch(e) {}

    if (ingredientsRaw.trim() !== "") {
        for (let mainKey in effectiveBlacklist) {
            let item = effectiveBlacklist[mainKey];
            if (!item || !Array.isArray(item.aliases)) continue;
            if (item.aliases.some(alias => matchIngredient(ingredientsRaw, alias, item.pattern || null))) {
                foundToxins.push(`<li class="list-toxin" onclick="openModal(${jsArg(mainKey.toUpperCase())}, ${jsArg(item.desc || '')}, ${jsArg(item.detail || '')}, true)">${escapeHTML(mainKey.toUpperCase())}</li>`); 
                score -= (severityPenalty[item.severity] || 20);
                if (!contextMatch) {
                    for (let key in fallbackAlternatives) {
                        if (mainKey.toLowerCase().includes(key)) collectedAlts.add(fallbackAlternatives[key]);
                    }
                }
            }
        }
        for (let mainKey in whitelist) {
            let item = whitelist[mainKey];
            if (!item || !Array.isArray(item.aliases)) continue;
            if (item.aliases.some(alias => matchIngredient(ingredientsRaw, alias, item.pattern || null))) {
                foundGood.push(`<li class="list-good" onclick="openModal(${jsArg(mainKey.toUpperCase())}, ${jsArg(item.desc || '')}, ${jsArg(item.detail || '')}, false)">${escapeHTML(mainKey.toUpperCase())}</li>`); 
                score += 5;
            }
        }

        if (foundToxins.length > 0) {
            let tempContextAlts = new Set();
            for (let key in contextualAlternatives) {
                if (key.split('|').some(kw => productContext.includes(kw))) {
                    let alternativeText = contextualAlternatives[key];
                    let components = alternativeText.split(', ');
                    components.forEach(comp => {
                        let cleanComp = comp.replace(/\./g, "").trim();
                        if (cleanComp) tempContextAlts.add(cleanComp);
                    });
                    contextMatch = true;
                }
            }
            if (contextMatch) collectedAlts = tempContextAlts;
        }
    }

    // Score floor = 0, cap = 100
    score = Math.max(0, Math.min(100, score));
    if (foundToxins.length > 0 && score > 50) { score = 50; }

    let suggestedAltsHtml = [];
    collectedAlts.forEach(alt => {
        let lookupKey = Object.keys(alternativeDeepDiveMatrix).find(k => alt.toLowerCase().includes(k));
        if (lookupKey) {
            suggestedAltsHtml.push(`<li class="list-alt-clickable" onclick="openModal(${jsArg(alt.toUpperCase())}, 'BIOLOGISCHER SCHUTZSCHILD', ${jsArg(alternativeDeepDiveMatrix[lookupKey])}, false)">${escapeHTML(alt)}</li>`);
        } else {
            suggestedAltsHtml.push(`<li>${escapeHTML(alt)}</li>`);
        }
    });

    let scoreColor = score >= 80 ? 'var(--matrix-green)' : (score >= 40 ? 'var(--warn)' : 'var(--alert)');
    saveToHistory(barcode, productName, score, category, ingredientsRaw, imgUrlFinal);

    let resultHtml = `
        <div class="res-card">
            <div class="res-header">
                ${imageHtml}
                <div class="res-info"><span class="res-badge">${escapeHTML(category)}</span><h3 class="res-title">${escapeHTML(productName)}</h3></div>
                <div class="res-score-circle" style="color:${scoreColor}; border-color:${scoreColor};">${score}</div>
            </div>
            <div class="status-bar ${foundToxins.length > 0 ? 'st-alert' : 'st-clean'}">${foundToxins.length > 0 ? 'ANGRIFF DETEKTIERT' : 'STATUS REIN'}</div>
            <div class="res-body">`;

    if (foundToxins.length > 0) resultHtml += `<div class="sec-title">Kritische Toxine (Klicken für Analyse)</div><ul class="data-list">${foundToxins.join('')}</ul>`;
    if (foundGood.length > 0) resultHtml += `<div class="sec-title">Biologische Verstärker</div><ul class="data-list">${foundGood.join('')}</ul>`;
    if (suggestedAltsHtml.length > 0) resultHtml += `<div class="sec-title">Souveräne Alternativen (Klicken für Deep-Dive)</div><ul class="data-list">${suggestedAltsHtml.join('')}</ul>`;
    
    resultHtml += `<div class="sec-title">Zutaten-Rohdaten</div><div class="raw-text">${escapeHTML(p.ingredients_text_de || p.ingredients_text || ingredientsRawOriginal || ingredientsRaw)}</div></div></div>`;
    document.getElementById('result-content').innerHTML = resultHtml;
}
