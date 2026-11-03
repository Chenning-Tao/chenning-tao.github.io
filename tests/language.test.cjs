const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../assets/js/language.js"), "utf8");
const key = "chenning-tao-language";

function page({ saved = null, href = "https://example.com/", blocked = false, readOnly = false } = {}) {
  const listeners = {};
  const storage = new Map(saved === null ? [] : [[key, saved]]);
  const root = { dataset: {}, lang: "en" };
  const buttons = ["en", "zh"].map((language) => ({
    dataset: { setLanguage: language },
    attributes: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  }));
  const input = {
    dataset: { languageAttribute: "placeholder", languageEn: "Type to filter", languageZh: "输入关键词筛选论文" },
    attributes: {},
    value: "TensorMLD",
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
  };
  const control = {
    hidden: true,
    addEventListener(name, callback) {
      listeners[name] = callback;
    },
  };
  const document = {
    documentElement: root,
    querySelectorAll(selector) {
      return { "[data-set-language]": buttons, "[data-language-attribute]": [input], ".language-switch": [control] }[selector];
    },
    addEventListener(name, callback) {
      listeners[name] = callback;
    },
  };
  const replacements = [];
  const window = {
    location: { href },
    history: { state: { kept: true }, replaceState: (...args) => replacements.push(args) },
    localStorage: {
      getItem(name) {
        if (blocked) throw new Error("Storage disabled");
        return storage.get(name) ?? null;
      },
      setItem(name, value) {
        if (blocked || readOnly) throw new Error("Storage disabled");
        storage.set(name, value);
      },
    },
    addEventListener(name, callback) {
      listeners[name] = callback;
    },
  };
  vm.runInNewContext(source, { window, document, URL });
  const loaded = () => listeners.DOMContentLoaded();
  const click = (language) => listeners.click({ target: { closest: () => buttons.find((button) => button.dataset.setLanguage === language) } });
  return { root, buttons, input, control, storage, replacements, listeners, loaded, click };
}

test("English is the default before first paint; invalid preferences are ignored", () => {
  for (const saved of [null, "fr", "zh-CN"]) {
    const view = page({ saved });
    assert.equal(view.root.lang, "en");
    assert.equal(view.root.dataset.siteLanguage, "en");
  }
});

test("a saved Chinese choice applies before DOMContentLoaded and updates controls", () => {
  const view = page({ saved: "zh" });
  assert.equal(view.root.lang, "zh-CN");
  view.loaded();
  assert.equal(view.control.hidden, false);
  assert.equal(view.buttons[1].attributes["aria-pressed"], "true");
  assert.equal(view.input.attributes.placeholder, "输入关键词筛选论文");
});

test("repeated switching is in-place, persistent, and keeps the publication search", () => {
  const view = page({ href: "https://example.com/publications/?q=x#paper" });
  view.loaded();
  for (const language of ["zh", "en", "zh", "zh", "en"]) {
    view.click(language);
    assert.equal(view.root.dataset.siteLanguage, language);
    assert.equal(view.storage.get(key), language);
    assert.equal(view.input.value, "TensorMLD");
  }
  assert.deepEqual(view.replacements, []);
});

test("storage-disabled browsers still render and switch", () => {
  const view = page({ blocked: true });
  view.loaded();
  view.click("zh");
  assert.equal(view.root.lang, "zh-CN");
  view.listeners.pageshow({ persisted: true });
  assert.equal(view.root.lang, "zh-CN");
  view.click("en");
  assert.equal(view.root.lang, "en");
});

test("the legacy language parameter preserves other query arguments, hash and history state", () => {
  const view = page({ saved: "en", href: "https://example.com/?from=bookmark&lang=zh#education" });
  assert.equal(view.root.lang, "zh-CN");
  assert.equal(view.storage.get(key), "zh");
  assert.equal(view.replacements.length, 1);
  assert.equal(view.replacements[0][2], "/?from=bookmark#education");
  assert.equal(view.replacements[0][0].kept, true);
});

test("the legacy language parameter works without storage", () => {
  const view = page({ blocked: true, href: "https://example.com/?lang=zh" });
  view.loaded();
  assert.equal(view.root.lang, "zh-CN");
});

test("Back/Forward restoration follows the latest saved preference", () => {
  const view = page();
  view.loaded();
  view.storage.set(key, "zh");
  view.listeners.pageshow({ persisted: true });
  assert.equal(view.root.lang, "zh-CN");
});

test("another tab's preference is synchronized without navigation", () => {
  const view = page();
  view.loaded();
  view.storage.set(key, "zh");
  view.listeners.storage({ key });
  assert.equal(view.root.lang, "zh-CN");
  assert.deepEqual(view.replacements, []);
});

test("the initial pageshow does not overwrite an explicit choice when storage is read-only", () => {
  const view = page({ saved: "en", readOnly: true, href: "https://example.com/?lang=zh" });
  view.loaded();
  view.listeners.pageshow({ persisted: false });
  assert.equal(view.root.lang, "zh-CN");
});

test("the initial HTML declares the language attribute for production CSS purging", () => {
  const layout = fs.readFileSync(path.join(__dirname, "../_layouts/default.liquid"), "utf8");
  assert.match(layout, /<html[^>]+data-site-language="en"/);
});

test("the publication search remains an HTML block when included from Markdown", () => {
  const include = fs.readFileSync(path.join(__dirname, "../_includes/bib_search.liquid"), "utf8");
  assert.match(include, /<div class="publication-search">[\s\S]*<label[\s\S]*<input[\s\S]*>\s*<\/div>/);
});

test("the biography preserves research and uses the approved internship wording", () => {
  const biography = fs.readFileSync(path.join(__dirname, "../_pages/about.md"), "utf8");
  assert.match(biography, /research focuses on \*\*computer architecture/);
  assert.match(biography, /quantum computing/);
  assert.match(biography, /I’m currently looking for AI Infra internship opportunities\./);
  assert.match(biography, /我目前正在寻找 AI Infra 相关实习机会。/);
  assert.doesNotMatch(biography, /transitioning|希望转向/);
  assert.doesNotMatch(biography, /research focuses on \*\*AI|focusing on AI Infra|研究方向是 \*\*AI Infra/);
});
