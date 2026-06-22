// Globale Datenbehälter für die Laufzeit
let blacklist = {}; 
let whitelist = {}; 
let categoryProfiles = {};
let curatedAlternatives = [];
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
    let category = ['Nahrung', 'Kosmetik', 'Optisch', 'Kleidung', 'Haushalt', 'Möbel'].includes(item.category) ? item.category : 'Optisch';
    let score = Number.parseInt(item.score, 10);
    if (Number.isNaN(score)) score = 0;
    let dateIso = item.dateIso || item.date || new Date().toISOString();
    return {
        schemaVersion: 14,
        productId: String(item.productId || barcode).slice(0, 120),
        barcode,
        name: String(item.name || 'Unbekanntes Objekt').slice(0, 180),
        score: Math.max(0, Math.min(100, score)),
        category,
        rawIngredients: String(item.rawIngredients || '').slice(0, 20000),
        imageUrl: isSafeImageUrl(item.imageUrl) ? String(item.imageUrl) : '',
        kiSummary: item.kiSummary ? String(item.kiSummary).slice(0, 5000) : '',
        summaryStatus: item.kiSummary ? 'ready' : 'missing',
        captureMethod: ['barcode', 'photo', 'ocr', 'manual', 'archive'].includes(item.captureMethod) ? item.captureMethod : 'archive',
        packaging: normalizePackagingAssessment(item.packaging),
        foundToxins: Array.isArray(item.foundToxins) ? item.foundToxins.map(String).slice(0, 80) : [],
        foundGood: Array.isArray(item.foundGood) ? item.foundGood.map(String).slice(0, 80) : [],
        webAlternatives: normalizeWebAlternatives(item.webAlternatives),
        analysisVersion: Number.parseInt(item.analysisVersion, 10) || 14,
        date: getDisplayDate(dateIso),
        dateIso
    };
}

function normalizeWebAlternatives(items) {
    if (!Array.isArray(items)) return [];
    return items.slice(0, 6).map(item => ({
        name: String(item?.name || '').slice(0, 180),
        reason: String(item?.reason || '').slice(0, 600),
        sourceHint: String(item?.sourceHint || '').slice(0, 240),
        verified: false
    })).filter(item => item.name);
}

function getBaseCategory(category) {
    let value = String(category || '');
    return ['Nahrung', 'Kosmetik', 'Kleidung', 'Haushalt', 'Möbel'].find(name => value.includes(name)) || 'Optisch';
}

function getCuratedAlternatives(category) {
    if (!Array.isArray(curatedAlternatives)) return [];
    return curatedAlternatives.filter(item => item?.category === category).slice(0, 4);
}

function renderCuratedAlternatives(category) {
    let items = getCuratedAlternatives(category);
    if (!items.length) return '';
    return `<div class="sec-title">Kuratierte faire Alternativen</div><div class="curated-alternative-list">${items.map(item => {
        let criteria = Array.isArray(item.criteria) ? item.criteria.slice(0, 4) : [];
        let link = /^https:\/\//i.test(item.verificationUrl || '')
            ? `<a href="${escapeHTML(item.verificationUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(item.sourceLabel || 'Quelle prüfen')}</a>`
            : `<span>${escapeHTML(item.sourceLabel || 'Lokal kuratiert')}</span>`;
        return `<article class="curated-alternative"><strong>${escapeHTML(item.name)}</strong><p>${escapeHTML(item.reason || '')}</p><ul>${criteria.map(value => `<li>${escapeHTML(value)}</li>`).join('')}</ul><div>${link}</div></article>`;
    }).join('')}</div>`;
}

function normalizePackagingAssessment(value) {
    let source = value && typeof value === 'object' ? value : {};
    let score = Number.parseInt(source.score, 10);
    if (Number.isNaN(score)) score = 50;
    let risk = ['low', 'moderate', 'high', 'unknown'].includes(source.risk) ? source.risk : 'unknown';
    let confidence = ['high', 'medium', 'low'].includes(source.confidence) ? source.confidence : 'low';
    return {
        material: String(source.material || 'Nicht verifiziert').slice(0, 160),
        score: Math.max(0, Math.min(100, score)),
        risk,
        confidence,
        reason: String(source.reason || 'Verpackungsmaterial konnte nicht sicher bestimmt werden.').slice(0, 1200),
        disposal: String(source.disposal || 'Lokale Entsorgungshinweise prüfen.').slice(0, 500)
    };
}

function assessPackaging(product) {
    if (product?._packaging_assessment) return normalizePackagingAssessment(product._packaging_assessment);
    let text = normalizeIngredientText([
        product?.packaging,
        product?.packaging_text,
        product?.packaging_tags?.join?.(' '),
        product?.packaging_materials_tags?.join?.(' ')
    ].filter(Boolean).join(' '));

    const match = (pattern) => pattern.test(text);
    if (match(/pvc|polyvinylchlorid|polystyrol|styrofoam|\bps\b/)) return normalizePackagingAssessment({ material: 'PVC / Polystyrol', score: 12, risk: 'high', confidence: 'medium', reason: 'Problematischer Kunststoff erkannt. Kontakt, Hitze und lange Lagerung erhöhen die Unsicherheit.', disposal: 'Nicht wiederverwenden; lokale Kunststoffentsorgung prüfen.' });
    if (match(/\bpet\b|polyethylenterephthalat/)) return normalizePackagingAssessment({ material: 'PET', score: 38, risk: 'moderate', confidence: 'medium', reason: 'PET ist leicht und recycelbar, bleibt aber eine Einweg-Kunststoffverpackung mit möglicher Partikelabgabe.', disposal: 'Pfand- oder Wertstoffsystem verwenden.' });
    if (match(/polypropylen|\bpp\b|hdpe|polyethylen|\bpe\b/)) return normalizePackagingAssessment({ material: match(/polypropylen|\bpp\b/) ? 'Polypropylen (PP)' : 'Polyethylen (PE/HDPE)', score: 56, risk: 'moderate', confidence: 'medium', reason: 'Vergleichsweise stabiler Kunststoff, dessen Eignung von Temperatur, Nutzung und Produktkontakt abhängt.', disposal: 'Nur bestimmungsgemäß wiederverwenden und lokal recyceln.' });
    if (match(/aluminium|aluminum|metal|dose|can\b/)) return normalizePackagingAssessment({ material: 'Metall / Aluminium', score: 62, risk: 'moderate', confidence: 'medium', reason: 'Gut recycelbar; Innenbeschichtungen und direkter Kontakt sind ohne weitere Angaben nicht bewertbar.', disposal: 'Metall- oder Wertstoffsammlung verwenden.' });
    if (match(/glas|glass|jar\b/)) return normalizePackagingAssessment({ material: 'Glas', score: 92, risk: 'low', confidence: 'high', reason: 'Inertes, gut wiederverwendbares Material mit geringem Leaching-Risiko bei intakter Verpackung.', disposal: 'Wiederverwenden oder nach Farben im Altglas entsorgen.' });
    if (match(/papier|paper|karton|cardboard/)) return normalizePackagingAssessment({ material: 'Papier / Karton', score: 78, risk: 'low', confidence: 'medium', reason: 'Faserbasierte Verpackung; mögliche Beschichtungen sind ohne Materialangabe nicht verifizierbar.', disposal: 'Sauber und unbeschichtet im Altpapier entsorgen.' });
    return normalizePackagingAssessment(null);
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

function isNegatedIngredientMatch(text, index, aliasLength) {
    let before = text.slice(Math.max(0, index - 28), index).trim();
    let after = text.slice(index + aliasLength, index + aliasLength + 14).trim();
    if (/(^|[\s,;:])(?:ohne|kein|keine|frei von|without|no)\s*$/iu.test(before)) return true;
    if (/^(?:frei|free|less)(?=$|[^a-z0-9])/iu.test(after)) return true;
    return false;
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
    // Für sehr kurze Kürzel (z.B. PEG, MSG, SLS, BHT) verlangen wir exakte Wortgrenzen
    if (cleanAlias.length < 4) {
        return hasUnicodeBoundary(cleanText, cleanAlias);
    }
    // Für längere Begriffe erlauben wir Komposita, vermeiden aber Negationen wie "zuckerfrei" oder "ohne parfum".
    let index = cleanText.indexOf(cleanAlias);
    while (index !== -1) {
        if (!isNegatedIngredientMatch(cleanText, index, cleanAlias.length)) return true;
        index = cleanText.indexOf(cleanAlias, index + cleanAlias.length);
    }
    return false;
}

async function analyzeProduct(data, category, barcode, isExtracted = false) {
    if (!data || !data.product) {
        renderFallbackUI(barcode);
        return;
    }
    let p = data.product;
    let baseCategory = getBaseCategory(category);
    let categoryProfile = categoryProfiles?.[baseCategory] || null;
    let isMaterialCategory = ['Kleidung', 'Haushalt', 'Möbel'].includes(baseCategory);

    // Global KI Translation step
    let keyActive = typeof getSecretKey === 'function' && (getSecretKey('gemini') || getSecretKey('deepseek'));
    let extractedNeedsKiCleanup = isExtracted && !p.ki_summary && (category.includes("OCR") || category.includes("Optisch") || category.includes("Offline-Analyse"));
    if (keyActive && (!isExtracted || extractedNeedsKiCleanup) && !category.includes("KI")) {
        let rawIngredientsText = p.ingredients_text_de || p.ingredients_text_en || p.ingredients_text || "";
        let currentName = p.product_name || "Unbekanntes Objekt";
        
        let needsTranslation = false;
        if (category.includes("OCR") || category.includes("Optisch") || category.includes("Offline-Analyse")) {
            needsTranslation = true;
        } else if (!p.ingredients_text_de || p.ingredients_text_de.trim().length === 0) {
            needsTranslation = true;
        }
        
        if (needsTranslation && rawIngredientsText.trim().length > 0) {
            showLoading("Übersetze Produktdaten ins Deutsche via KI...");
            let translatedData = await translateProductDataViaKI(currentName, rawIngredientsText);
            if (translatedData) {
                p.product_name_original = currentName;
                p.ingredients_text_original = rawIngredientsText;
                p.product_name = translatedData.name;
                p.ingredients_text_de = translatedData.ingredients;
            }
        }
    }

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
    const severityPenalty = { high: 30, medium: 20, low: 10 };
    const benefitReward = { high: 20, medium: 10, low: 5 };
    
    let rawToxinsNames = [];
    let rawGoodNames = [];
    let hasHighToxin = false;
    let kiSummary = p.ki_summary || "";
    let packagingAssessment = assessPackaging(p);

    let collectedAlts = new Set();
    let contextMatch = false;

    let effectiveBlacklist = Object.assign({}, isMaterialCategory ? (categoryProfile?.hazards || {}) : blacklist);
    let effectiveWhitelist = Object.assign({}, isMaterialCategory ? (categoryProfile?.benefits || {}) : whitelist);
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
                foundToxins.push(`<li class="list-toxin" onclick="openModal(${jsArg(mainKey.toUpperCase())}, ${jsArg(item.desc || '')}, ${jsArg(item.detail || '')}, ${jsArg(item.severity || 'medium')})">${escapeHTML(mainKey.toUpperCase())}</li>`); 
                score -= (severityPenalty[item.severity] || 20);
                rawToxinsNames.push(mainKey.toUpperCase());
                if (item.severity === 'high') {
                    hasHighToxin = true;
                }
                if (!contextMatch) {
                    for (let key in fallbackAlternatives) {
                        if (mainKey.toLowerCase().includes(key)) collectedAlts.add(fallbackAlternatives[key]);
                    }
                }
                if (Array.isArray(item.alternatives)) item.alternatives.forEach(alt => collectedAlts.add(alt));
            }
        }
        for (let mainKey in effectiveWhitelist) {
            let item = effectiveWhitelist[mainKey];
            if (!item || !Array.isArray(item.aliases)) continue;
            if (item.aliases.some(alias => matchIngredient(ingredientsRaw, alias, item.pattern || null))) {
                foundGood.push(`<li class="list-good" onclick="openModal(${jsArg(mainKey.toUpperCase())}, ${jsArg(item.desc || '')}, ${jsArg(item.detail || '')}, 'good')">${escapeHTML(mainKey.toUpperCase())}</li>`); 
                let benefit = item.benefit || "low";
                let reward = benefitReward[benefit] || 5;
                score += reward;
                rawGoodNames.push(mainKey.toUpperCase());
            }
        }

        if (foundToxins.length > 0 && !categoryProfile) {
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

    score = Math.max(0, Math.min(100, score));
    if (foundToxins.length > 0) {
        let maxCap = 50;
        if (!hasHighToxin) {
            let totalReward = 0;
            for (let mainKey in effectiveWhitelist) {
                let item = effectiveWhitelist[mainKey];
                if (item && Array.isArray(item.aliases) && item.aliases.some(alias => matchIngredient(ingredientsRaw, alias, item.pattern || null))) {
                    let benefit = item.benefit || "low";
                    totalReward += (benefitReward[benefit] || 5);
                }
            }
            maxCap = Math.min(75, 50 + totalReward);
        }
        if (score > maxCap) {
            score = maxCap;
        }
    }

    let suggestedAltsHtml = [];
    collectedAlts.forEach(alt => {
        let lookupKey = Object.keys(alternativeDeepDiveMatrix).find(k => alt.toLowerCase().includes(k));
        if (lookupKey) {
            suggestedAltsHtml.push(`<li class="list-alt-clickable" onclick="openModal(${jsArg(alt.toUpperCase())}, 'BIOLOGISCHER SCHUTZSCHILD', ${jsArg(alternativeDeepDiveMatrix[lookupKey])}, 'alternative')">${escapeHTML(alt)}</li>`);
        } else {
            suggestedAltsHtml.push(`<li>${escapeHTML(alt)}</li>`);
        }
    });

    if (keyActive && (!isExtracted || extractedNeedsKiCleanup) && !category.includes("KI") && !kiSummary && ingredientsRaw.trim() !== "") {
        let promptToxins = rawToxinsNames.join(", ");
        let promptGood = rawGoodNames.join(", ");
        showLoading("Generiere System-Zusammenfassung via KI...");
        let summaryResult = await generateProductSummaryViaKI(productName, ingredientsRaw, promptToxins, promptGood, baseCategory);
        if (summaryResult) {
            kiSummary = summaryResult;
        }
    }

    let scoreColor = score >= 80 ? 'var(--matrix-green)' : (score >= 40 ? 'var(--warn)' : 'var(--alert)');
    saveToHistory(barcode, productName, score, category, ingredientsRaw, imgUrlFinal, kiSummary, {
        packaging: packagingAssessment,
        foundToxins: rawToxinsNames,
        foundGood: rawGoodNames,
        captureMethod: p._capture_method || (isExtracted ? 'photo' : 'barcode'),
        webAlternatives: p._web_alternatives || []
    });

    let resultHtml = `
        <div class="res-card">
            <div class="res-header">
                ${imageHtml}
                <div class="res-info"><span class="res-badge">${escapeHTML(category)}</span><h3 class="res-title">${escapeHTML(productName)}</h3></div>
                <div class="res-score-circle" style="color:${scoreColor}; border-color:${scoreColor};">${score}</div>
            </div>
            <div class="status-bar ${foundToxins.length > 0 ? 'st-alert' : 'st-clean'}">${foundToxins.length > 0 ? 'ANGRIFF DETEKTIERT' : 'STATUS REIN'}</div>`;
            
    if (kiSummary) {
        resultHtml += `
            <div class="status-bar st-gemini" style="letter-spacing:1px; font-size:10px; padding:6px;">System-Analyse (KI)</div>
            <div style="padding:15px 20px; font-size:13px; line-height:1.5; color:var(--text-main); border-bottom:1px solid var(--border-color); background:rgba(99,102,241,0.03); font-style:italic;">
                "${escapeHTML(kiSummary)}"
            </div>`;
    } else {
        resultHtml += `
            <div class="summary-empty">
                <div><strong>KI-Systemanalyse fehlt</strong><span>Einmal erzeugen und dauerhaft im Archiv speichern.</span></div>
                <button class="summary-generate-btn" onclick="generateArchiveSummary(${jsArg(barcode)})">Analyse erstellen</button>
            </div>`;
    }
            
    resultHtml += `
            <div class="res-body">`;
            
    let subjectLabel = categoryProfile?.subjectLabel || 'Inhaltsstoffe';
    if (foundToxins.length > 0) resultHtml += `<div class="sec-title">Kritische ${escapeHTML(subjectLabel)} (Klicken für Analyse)</div><ul class="data-list">${foundToxins.join('')}</ul>`;
    if (foundGood.length > 0) resultHtml += `<div class="sec-title">Positive ${escapeHTML(subjectLabel)}</div><ul class="data-list">${foundGood.join('')}</ul>`;
    if (suggestedAltsHtml.length > 0) resultHtml += `<div class="sec-title">Souveräne Alternativen (Klicken für Deep-Dive)</div><ul class="data-list">${suggestedAltsHtml.join('')}</ul>`;
    if (categoryProfile) resultHtml += renderCuratedAlternatives(baseCategory);

    if (categoryProfile) {
        let webAlternatives = normalizeWebAlternatives(p._web_alternatives);
        if (webAlternatives.length) {
            resultHtml += `<div class="sec-title">Unbestätigte Webfunde</div><div class="web-alternative-list">${webAlternatives.map(item => `<article><span>Unbestätigt</span><strong>${escapeHTML(item.name)}</strong><p>${escapeHTML(item.reason)}</p><small>${escapeHTML(item.sourceHint || 'Vor dem Kauf Herstellerdaten und Verfügbarkeit prüfen.')}</small></article>`).join('')}</div>`;
        } else {
            resultHtml += `<button class="web-alternative-btn" onclick="generateWebAlternatives(${jsArg(barcode)})">Unbestätigte Web-Alternativen suchen</button>`;
        }
    }

    let packagingColor = packagingAssessment.score >= 75 ? 'var(--matrix-green)' : (packagingAssessment.score >= 40 ? 'var(--warn)' : 'var(--alert)');
    resultHtml += `
        <div class="packaging-panel">
            <div class="packaging-heading">
                <div><span class="packaging-kicker">Packaging</span><strong>${escapeHTML(packagingAssessment.material)}</strong></div>
                <div class="packaging-score" style="color:${packagingColor};border-color:${packagingColor};">${packagingAssessment.score}</div>
            </div>
            <div class="packaging-meter"><span style="width:${packagingAssessment.score}%;background:${packagingColor};"></span></div>
            <p>${escapeHTML(packagingAssessment.reason)}</p>
            <div class="packaging-meta"><span>Risiko: ${escapeHTML(packagingAssessment.risk)}</span><span>Konfidenz: ${escapeHTML(packagingAssessment.confidence)}</span></div>
            <small>${escapeHTML(packagingAssessment.disposal)}</small>
        </div>`;
    
    let rawTextToShow = escapeHTML(p.ingredients_text_de || p.ingredients_text || ingredientsRawOriginal || ingredientsRaw);
    if (p.ingredients_text_original) {
        rawTextToShow = `<strong>Deutsch (KI-Übersetzt):</strong><br>${escapeHTML(p.ingredients_text_de)}<br><br><strong>Original (${escapeHTML(p.product_name_original || productName)}):</strong><br>${escapeHTML(p.ingredients_text_original)}`;
    }
    resultHtml += `<div class="sec-title">${categoryProfile ? 'Material-Rohdaten' : 'Zutaten-Rohdaten'}</div><div class="raw-text">${rawTextToShow}</div></div></div>`;
    document.getElementById('result-content').innerHTML = resultHtml;
}

// ─── PASSPHRASE ENCRYPTION HELPERS ───
function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
}

function base64ToBytes(base64) {
    let binary = atob(base64);
    let bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function derivePassphraseKey(passphrase, salt) {
    const webCrypto = globalThis.crypto;
    if (!webCrypto?.subtle) throw new Error('WebCrypto ist auf diesem Gerät nicht verfügbar.');
    let material = await webCrypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(passphrase),
        'PBKDF2',
        false,
        ['deriveKey']
    );
    return webCrypto.subtle.deriveKey(
        { name: 'PBKDF2', salt, iterations: 250000, hash: 'SHA-256' },
        material,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptWithPin(text, passphrase) {
    if (!text) return "";
    const webCrypto = globalThis.crypto;
    if (!webCrypto?.subtle) throw new Error('WebCrypto ist auf diesem Gerät nicht verfügbar.');
    let salt = webCrypto.getRandomValues(new Uint8Array(16));
    let iv = webCrypto.getRandomValues(new Uint8Array(12));
    let key = await derivePassphraseKey(passphrase, salt);
    let ciphertext = await webCrypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode("OK_DEC_" + text)
    );
    return JSON.stringify({
        v: 2,
        alg: 'PBKDF2-SHA256-AES-GCM',
        salt: bytesToBase64(salt),
        iv: bytesToBase64(iv),
        data: bytesToBase64(new Uint8Array(ciphertext))
    });
}

function legacyDecryptWithPin(encoded, pin, salt = "op_salt_99") {
    try {
        let hash = pin + salt;
        for (let i = 0; i < 2000; i++) {
            let h = 0;
            for (let j = 0; j < hash.length; j++) {
                h = (h << 5) - h + hash.charCodeAt(j);
                h |= 0;
            }
            hash = h.toString(16) + hash;
        }
        let key = hash.substring(0, 32);
        let text = decodeURIComponent(escape(atob(encoded)));
        let result = "";
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result.startsWith("OK_DEC_") ? result.substring(7) : null;
    } catch (e) {
        return null;
    }
}

async function decryptWithPin(encoded, passphrase) {
    if (!encoded) return "";
    try {
        let payload = JSON.parse(encoded);
        if (payload?.v !== 2) return null;
        let salt = base64ToBytes(payload.salt);
        let iv = base64ToBytes(payload.iv);
        let key = await derivePassphraseKey(passphrase, salt);
        let plaintext = await globalThis.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            base64ToBytes(payload.data)
        );
        let result = new TextDecoder().decode(plaintext);
        return result.startsWith("OK_DEC_") ? result.substring(7) : null;
    } catch (e) {
        return legacyDecryptWithPin(encoded, passphrase);
    }
}
