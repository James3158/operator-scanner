const fs = require('fs');
const path = require('path');

const dir = process.argv[2] ? path.resolve(process.argv[2]) : __dirname;
const htmlSrc = fs.readFileSync(path.join(dir, 'index.html'), 'utf-8');
const apiSrc = fs.readFileSync(path.join(dir, 'api.js'), 'utf-8');
const appSrc = fs.readFileSync(path.join(dir, 'app.js'), 'utf-8');

// Extract all ids from HTML using regex (id="...")
const htmlIds = new Set();
const htmlIdRegex = /id=["']([^"']+)["']/g;
let match;
while ((match = htmlIdRegex.exec(htmlSrc)) !== null) {
    htmlIds.add(match[1]);
}

// Extract all document.getElementById('...') from api.js and app.js
const queriedIds = new Set();
const getElementRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;

while ((match = getElementRegex.exec(apiSrc)) !== null) {
    queriedIds.add(match[1]);
}
while ((match = getElementRegex.exec(appSrc)) !== null) {
    queriedIds.add(match[1]);
}

console.log("HTML IDs found:", htmlIds.size);
console.log("Queried IDs found:", queriedIds.size);

console.log("\nChecking queried IDs against HTML IDs...");
let missingCount = 0;
for (const id of queriedIds) {
    // Some IDs are dynamic (e.g., 'view-' + viewName or 'compareSlot' + slot), so check if they contain variable concatenation
    if (id.includes('+') || id.includes('`') || id.includes('${')) {
        console.log(`Skipping dynamic ID: ${id}`);
        continue;
    }
    
    // Ignore dynamic view/nav constructions and dynamically created modal IDs.
    if (
        id.startsWith('view-') ||
        id.startsWith('nav-') ||
        id.startsWith('compareSlot') ||
        id === 'compareArchiveModal'
    ) {
        continue;
    }

    if (!htmlIds.has(id)) {
        console.error(`⚠️ MISSING ID IN HTML: "${id}"`);
        missingCount++;
    }
}

if (missingCount === 0) {
    console.log("✅ All statically queried IDs are present in index.html!");
} else {
    console.error(`❌ Found ${missingCount} missing IDs in index.html!`);
}
