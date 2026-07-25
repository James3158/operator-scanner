const fs = require('fs');
const vm = require('vm');

const storage = new Map();
const context = {
    console,
    JSON,
    Math,
    Date,
    String,
    Number,
    RegExp,
    Uint8Array,
    localStorage: {
        getItem: key => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: key => storage.delete(key)
    },
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    document: { getElementById: () => null }
};
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync('rules.js', 'utf8'), context, { filename: 'rules.js' });

const blacklist = JSON.parse(fs.readFileSync('blacklist.json', 'utf8'));
const whitelist = JSON.parse(fs.readFileSync('whitelist.json', 'utf8'));
context.blacklist = blacklist;
context.whitelist = whitelist;

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function calculateScore(input, facts = null) {
    return context.calculateV16Score(input, blacklist, whitelist, facts);
}

const fixtures = [
    { input: 'Ohne Zucker, kaltgepresstes Olivenöl', score: 100, hazards: [], benefits: ['olivenöl'] },
    { input: 'Zucker, kaltgepresstes Olivenöl', score: 89, hazards: ['zucker'], benefits: ['olivenöl'] },
    { input: 'Aspartam, kaltgepresstes Olivenöl', score: 49, hazards: ['aspartam'], benefits: ['olivenöl'] },
    { input: 'Sodium Lauryl Sulfate, Sheabutter', score: 69, hazards: ['sls'], benefits: ['sheabutter'] },
    { input: 'Pegasus Extrakt', score: 100, hazards: [], benefits: [] },
    { input: 'PEG-40 hydrogenated castor oil', score: 89, hazards: ['peg'], benefits: [] },
    {
        input: 'Wasser, Aloe-Vera-Blattextrakt, Phenoxyethanol, Natriumbenzoat',
        score: 47,
        hazards: ['phenoxyethanol', 'natriumbenzoat'],
        benefits: ['aloe_vera']
    }
];

for (const fixture of fixtures) {
    const result = calculateScore(fixture.input);
    assert(result.score === fixture.score, `${fixture.input}: expected score ${fixture.score}, got ${result.score}`);
    assert(JSON.stringify(result.hazards) === JSON.stringify(fixture.hazards), `${fixture.input}: unexpected hazards ${result.hazards}`);
    assert(JSON.stringify(result.benefits) === JSON.stringify(fixture.benefits), `${fixture.input}: unexpected benefits ${result.benefits}`);
}

const capri = calculateScore('Wasser, Zucker, Orangensaftkonzentrat', {
    orderedIngredients: ['Wasser', 'Zucker', 'Orangensaftkonzentrat'],
    sugarsPer100: 9,
    nutritionBasis: 'per100ml',
    sourceLabel: 'OpenFoodFacts',
    confidence: 'high'
});
const knoppers = calculateScore(
    'Zucker, pflanzliche Fette, Haselnüsse, Weizenmehl, Magermilchpulver, Kakao, Molkenerzeugnis, Salz, Sojalecithin, Rohkakao',
    {
        orderedIngredients: ['Zucker', 'pflanzliche Fette', 'Haselnüsse', 'Weizenmehl', 'Magermilchpulver', 'Kakao', 'Molkenerzeugnis', 'Salz', 'Sojalecithin', 'Rohkakao'],
        sugarsPer100: 39,
        nutritionBasis: 'per100g',
        sourceLabel: 'OpenFoodFacts',
        confidence: 'high'
    }
);
assert(capri.score >= 45 && capri.score <= 60, `Capri calibration out of range: ${capri.score}`);
assert(knoppers.score >= 25 && knoppers.score <= 45, `Knoppers calibration out of range: ${knoppers.score}`);
assert(knoppers.score < capri.score, 'Knoppers must score below Capri with complete facts');
assert(knoppers.benefitBonus === 5, 'Positive signal bonus must be capped at five');

const legacy = context.normalizeHistoryItem({
    barcode: '4000000000001',
    name: 'Legacy Produkt',
    score: 140,
    category: 'Unbekannt',
    rawIngredients: 'Zucker',
    imageUrl: 'javascript:alert(1)'
});
assert(legacy.score === 100, 'Legacy score must be clamped');
assert(legacy.category === 'Optisch', 'Unknown legacy category must normalize to Optisch');
assert(legacy.imageUrl === '', 'Unsafe legacy image URL must be removed');

assert(context.assessPackaging({ packaging: 'Glasflasche' }).risk === 'low', 'Glass packaging fixture failed');
assert(context.assessPackaging({ packaging: 'PVC blister' }).risk === 'high', 'PVC packaging fixture failed');

console.log(`Rule parity tests passed (${fixtures.length} score fixtures)`);
