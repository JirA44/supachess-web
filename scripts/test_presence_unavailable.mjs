import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const english = JSON.parse(readFileSync('shared/translations/en.json', 'utf8'));
const communitySource = readFileSync('shared/community.js', 'utf8');
const permissionDenied = Object.assign(new Error('Missing or insufficient permissions.'), {
  code: 'permission-denied'
});

const db = {
  collection(name) {
    const query = {
      where() { return query; },
      orderBy() { return query; },
      limit() { return query; },
      get() {
        if (name === 'presence_public') return Promise.reject(permissionDenied);
        if (name === 'visitors') return Promise.resolve({ exists: false });
        return Promise.resolve({ forEach() {} });
      },
      onSnapshot() { return () => {}; },
      doc() {
        return {
          get: () => Promise.resolve({ exists: false }),
          set: () => Promise.resolve(),
          update: () => Promise.resolve(),
          onSnapshot: () => () => {}
        };
      }
    };
    return query;
  }
};

const auth = {
  setPersistence: () => Promise.resolve(),
  getRedirectResult: () => Promise.resolve(null),
  onAuthStateChanged(callback) { callback(null); }
};
const firebase = function () {};
firebase.app = () => ({});
firebase.auth = () => auth;
firebase.auth.Auth = { Persistence: { LOCAL: 'local' } };
firebase.firestore = () => db;
firebase.firestore.FieldValue = {
  increment: (value) => value,
  serverTimestamp: () => new Date()
};

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  runScripts: 'outside-only',
  url: 'https://chessnova.test/'
});
const { window } = dom;
Object.defineProperty(window.document, 'readyState', { configurable: true, value: 'complete' });
window.setInterval = () => 0;
window.clearInterval = () => {};
window.firebase = firebase;
window.ChessNovaI18n = {
  getLang: () => 'en',
  t: (key) => english[key] || key
};
window.eval(communitySource);
window.document.querySelector('.cn-status-btn[data-status="dispo"]').click();
await new Promise((resolve) => setTimeout(resolve, 0));

assert.equal(window.document.getElementById('cn-players-count').textContent, '—');
assert.equal(
  window.document.getElementById('cn-players-list').textContent,
  english.players_permission_denied
);
console.log('Presence permission errors show an unavailable state, never a false zero.');
dom.window.close();
