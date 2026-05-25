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

function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchIngredient(text, alias, itemPattern) {
    // Wenn ein explizites Regex-Pattern in der JSON definiert ist, nutze dieses
    if (itemPattern) {
        return (new RegExp(itemPattern, 'i')).test(text);
    }
    let cleanAlias = alias.toLowerCase().trim();
    // Prefix-Match: Alias endet mit '-' → matcht alle Wörter die so beginnen
    if (cleanAlias.endsWith('-')) {
        let prefix = cleanAlias.slice(0, -1);
        return (new RegExp('\\b' + escapeRegExp(prefix) + '-', 'i')).test(text) || (new RegExp('\\b' + escapeRegExp(prefix) + '\\b', 'i')).test(text);
    }
    // Standard: ganzes Wort
    return (new RegExp('\\b' + escapeRegExp(cleanAlias) + '\\b', 'i')).test(text);
}

function analyzeProduct(data, category, barcode, isExtracted = false) {
    if(!dbActive) return;
    let p = data.product;
    let imgUrlFinal = p.image_url || p.image_front_small_url || "";
    let ingredientsRaw = [p.ingredients_text_de || "", p.ingredients_text_en || "", p.ingredients_text || "", p.ingredients_tags ? p.ingredients_tags.join(" ") : ""].join(" ").toLowerCase();
    let productName = p.product_name || "Unbekanntes Objekt";
    let productContext = (productName + " " + (p.categories || "")).toLowerCase();
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
        let customToxins = JSON.parse(localStorage.getItem('op_custom_toxins')) || {};
        Object.keys(customToxins).forEach(key => {
            effectiveBlacklist['custom_' + key] = customToxins[key];
        });
    } catch(e) {}

    if (ingredientsRaw.trim() !== "") {
        for (let mainKey in effectiveBlacklist) {
            let item = effectiveBlacklist[mainKey];
            if (item.aliases.some(alias => matchIngredient(ingredientsRaw, alias, item.pattern || null))) {
                let safeDesc = item.desc.replace(/'/g, "\\'"); let safeDetail = item.detail.replace(/'/g, "\\'");
                foundToxins.push(`<li class="list-toxin" onclick="openModal('${escapeHTML(mainKey.toUpperCase())}', '${escapeHTML(safeDesc)}', '${escapeHTML(safeDetail)}', true)">${escapeHTML(mainKey.toUpperCase())}</li>`); 
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
            if (item.aliases.some(alias => matchIngredient(ingredientsRaw, alias, item.pattern || null))) {
                let safeDesc = item.desc.replace(/'/g, "\\'"); let safeDetail = item.detail.replace(/'/g, "\\'");
                foundGood.push(`<li class="list-good" onclick="openModal('${escapeHTML(mainKey.toUpperCase())}', '${escapeHTML(safeDesc)}', '${escapeHTML(safeDetail)}', false)">${escapeHTML(mainKey.toUpperCase())}</li>`); 
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
            let safeDetail = alternativeDeepDiveMatrix[lookupKey].replace(/'/g, "\\'");
            suggestedAltsHtml.push(`<li class="list-alt-clickable" onclick="openModal('${escapeHTML(alt.toUpperCase())}', 'BIOLOGISCHER SCHUTZSCHILD', '${escapeHTML(safeDetail)}', false)">${escapeHTML(alt)}</li>`);
        } else {
            suggestedAltsHtml.push(`<li>${escapeHTML(alt)}</li>`);
        }
    });

    let scoreColor = score >= 80 ? 'var(--matrix-green)' : (score >= 40 ? '#ffcc00' : 'var(--alert)');
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
    
    resultHtml += `<div class="sec-title">Zutaten-Rohdaten</div><div class="raw-text">${escapeHTML(p.ingredients_text_de || p.ingredients_text || ingredientsRaw)}</div></div></div>`;
    document.getElementById('result-content').innerHTML = resultHtml;
}
