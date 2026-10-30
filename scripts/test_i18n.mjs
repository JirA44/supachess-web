import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const i18nSource = readFileSync('shared/i18n.js', 'utf8');
const english = JSON.parse(readFileSync('shared/translations/en.json', 'utf8'));
const french = JSON.parse(readFileSync('shared/translations/fr.json', 'utf8'));
const dom = new JSDOM(
  '<!doctype html><html lang="fr"><body><script src="shared/i18n.js"></script>' +
  '<label data-i18n="exercise_mode_label">Mode d’exercice</label>' +
  '<select data-i18n="exercise_mode_label" data-i18n-attr="aria-label" aria-label="Mode d’exercice"></select>' +
  '</body></html>',
  { runScripts: 'outside-only', url: 'https://chessnova.test/' }
);

const { window } = dom;
window.localStorage.setItem('chessnova_lang', 'en');
window.XMLHttpRequest = class {
  open(method, url) { this.url = url; }
  send() {
    const language = this.url.endsWith('/en.json') ? english : french;
    this.status = 200;
    this.responseText = JSON.stringify(language);
    this.readyState = 4;
    this.onreadystatechange();
  }
};
window.eval(i18nSource);
window.document.dispatchEvent(new window.Event('DOMContentLoaded'));

assert.equal(window.document.documentElement.lang, 'en', 'the document language follows the selected English locale');
assert.equal(window.document.querySelector('label').textContent, 'Exercise mode', 'English text is applied');
assert.equal(window.document.querySelector('select').getAttribute('aria-label'), 'Exercise mode', 'translated attributes are applied');
window.document.querySelector('.cn-lang-toggle').click();
assert.equal(window.document.documentElement.lang, 'fr', 'the language toggle updates the document language');
assert.equal(window.document.querySelector('label').textContent, 'Mode d’exercice', 'French text is restored after toggling');
console.log('i18n locale and translated-attribute checks passed');

const tacticsHtml = readFileSync('TRAINING_TACTICS.html', 'utf8');
const communitySource = readFileSync('shared/community.js', 'utf8');
const pageScripts = [...tacticsHtml.matchAll(/<script\b[^>]+src=["']([^"']+)/g)].map((match) => match[1]);
const i18nIndex = pageScripts.findIndex((src) => src.includes('shared/i18n.js'));
const communityIndex = pageScripts.findIndex((src) => src.includes('shared/community.js'));
assert.ok(i18nIndex >= 0 && communityIndex > i18nIndex, 'tactics page loads translations before injecting community UI');
for (const key of ["auth_login","auth_logout","auth_tab_login","auth_tab_signup","players_panel_title","players_status_available","players_status_busy","players_status_invisible","players_loading","stats_unique_visitors","stats_registered_users","footer_brand","panel_title","tab_chat","tab_suggestions","tab_faq","chat_empty","suggest_category_label","suggest_category_bug","suggest_category_feature","suggest_category_ui","suggest_category_content","suggest_category_other","suggest_rating_label","suggest_message_label","suggest_submit","faq_empty"]) {
  assert.ok(french[key] !== undefined && english[key] !== undefined, key + ' exists in both dictionaries');
  assert.ok(communitySource.includes(key), key + ' is used by the shared community UI');
}
