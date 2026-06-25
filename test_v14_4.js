const fs = require('fs');
const vm = require('vm');

function makeElement(id) {
    return {
        id,
        value: '',
        innerHTML: '',
        innerText: '',
        textContent: '',
        style: {},
        className: '',
        classList: { add() {}, remove() {}, toggle() {} },
        setAttribute() {},
        appendChild() {},
        remove() {},
        addEventListener() {},
        focus() {}
    };
}

const storage = new Map();
const elements = new Map();
const context = {
    console,
    setTimeout,
    clearTimeout,
    Promise,
    JSON,
    Math,
    Date,
    String,
    Number,
    RegExp,
    encodeURIComponent,
    decodeURIComponent,
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
    atob: value => Buffer.from(value, 'base64').toString('binary'),
    localStorage: {
        getItem: key => storage.has(key) ? storage.get(key) : null,
        setItem: (key, value) => storage.set(key, String(value)),
        removeItem: key => storage.delete(key)
    },
    sessionStorage: {
        getItem: key => storage.has(`s:${key}`) ? storage.get(`s:${key}`) : null,
        setItem: (key, value) => storage.set(`s:${key}`, String(value)),
        removeItem: key => storage.delete(`s:${key}`)
    },
    window: {},
    document: {
        body: { appendChild() {} },
        createElement: id => makeElement(id),
        getElementById(id) {
            if (!elements.has(id)) elements.set(id, makeElement(id));
            return elements.get(id);
        }
    },
    DOMParser: class {
        parseFromString() {
            return { querySelectorAll: () => [] };
        }
    },
    fetch: async () => ({ ok: true, json: async () => ({}), text: async () => '' }),
    alert(message) {
        throw new Error(`Unexpected alert: ${message}`);
    }
};
context.globalThis = context;
context.window = context;

vm.createContext(context);
vm.runInContext(fs.readFileSync('rules.js', 'utf8'), context, { filename: 'rules.js' });
vm.runInContext(fs.readFileSync('api.js', 'utf8'), context, { filename: 'api.js' });

vm.runInContext(`
    const parsedFence = parseJsonFromModelText('Hinweis vorab\\n\\\`\\\`\\\`json\\n{"summary":"ok","nested":{"value":1}}\\n\\\`\\\`\\\`\\nNachtrag');
    if (parsedFence.summary !== 'ok' || parsedFence.nested.value !== 1) throw new Error('Markdown JSON recovery failed');

    const parsedArray = parseJsonFromModelText('prefix [{"name":"A"},{"name":"B"}] suffix');
    if (!Array.isArray(parsedArray) || parsedArray.length !== 2) throw new Error('Array JSON recovery failed');

    if (sanitizeExternalUrl('javascript:alert(1)') !== '') throw new Error('Unsafe URL was not rejected');
    if (sanitizeExternalUrl('www.example.com') !== 'https://www.example.com') throw new Error('www URL normalization failed');
    if (isSafeImageUrl('javascript:alert(1)')) throw new Error('Unsafe image URL was accepted');
`, context);

(async () => {
    await vm.runInContext(`
        fetchGoogleCSE = async () => [];
        fetchDuckDuckGoScrape = async () => ['duck result'];
        runtimeGoogleSearchKey = 'google-key';
        runtimeGoogleSearchCx = 'cx';
        fetchSearchSnippets('test product').then(result => {
            if (result.provider !== 'DuckDuckGo Fallback') throw new Error('Expected DuckDuckGo fallback after empty Google');
            if (result.snippets[0] !== 'duck result') throw new Error('Fallback snippets missing');
            if (window.__lastSearchTrace.join('>') !== 'google>duckduckgo') throw new Error('Search trace order wrong');
        })
    `, context);

    await vm.runInContext(`
        fetchGoogleCSE = async () => ['google result'];
        fetchDuckDuckGoScrape = async () => { throw new Error('DuckDuckGo should not run when Google has results'); };
        fetchSearchSnippets('test product').then(result => {
            if (result.provider !== 'Google CSE') throw new Error('Expected Google CSE provider');
            if (result.snippets[0] !== 'google result') throw new Error('Google snippets missing');
            if (window.__lastSearchTrace.join('>') !== 'google') throw new Error('Google trace order wrong');
        })
    `, context);

    await vm.runInContext(`
        (async () => {
            let usedProvider = '';
            callGeminiAPI = async () => { usedProvider = 'gemini'; return { ok: true }; };
            callDeepSeekAPI = async () => { usedProvider = 'deepseek'; return { ok: true }; };
            document.getElementById('activeModelSelect').value = 'deepseek';
            await executeKIEngine('vision prompt', 'data:image/png;base64,AAAA');
            if (usedProvider !== 'gemini') throw new Error('Image analysis did not force Gemini Vision');
        })()
    `, context);

    console.log('V14.4 parser/search/security tests passed');
})().catch(error => {
    console.error(error);
    process.exit(1);
});
