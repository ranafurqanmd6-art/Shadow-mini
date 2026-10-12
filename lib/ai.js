'use strict';
/**
 * Optional AI providers. Every provider is a real, documented HTTP API and needs
 * its own key from an environment variable. Nothing is hardcoded.
 *   OPENAI_API_KEY   (+ OPENAI_MODEL,   default gpt-4o-mini)
 *   GEMINI_API_KEY   (+ GEMINI_MODEL,   default gemini-2.5-flash)
 *   DEEPSEEK_API_KEY (+ DEEPSEEK_MODEL, default deepseek-chat)
 *   AI_PROVIDER      (optional: openai | gemini | deepseek, used by .ai)
 */
const { fetchTimeout } = require('./http');

const SYSTEM = 'You are SHADOW MD, a helpful WhatsApp assistant. Answer clearly and briefly in the user\'s language.';

async function readError(res) {
  try { const j = await res.json(); return (j.error && (j.error.message || j.error)) || ''; } catch (_) { return ''; }
}

async function httpError(res) {
  const detail = String(await readError(res)).slice(0, 160);
  return new Error(`HTTP ${res.status}${detail ? ': ' + detail : ''}`);
}

async function chatCompletions(url, key, model, prompt) {
  const res = await fetchTimeout(url, {
    method: 'POST', timeout: 45000,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }] }),
  });
  if (!res.ok) throw await httpError(res);
  const j = await res.json();
  return j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
}

const PROVIDERS = {
  openai: {
    label: 'OpenAI', env: 'OPENAI_API_KEY',
    ask: (key, prompt) => chatCompletions('https://api.openai.com/v1/chat/completions', key, process.env.OPENAI_MODEL || 'gpt-4o-mini', prompt),
  },
  deepseek: {
    label: 'DeepSeek', env: 'DEEPSEEK_API_KEY',
    ask: (key, prompt) => chatCompletions('https://api.deepseek.com/chat/completions', key, process.env.DEEPSEEK_MODEL || 'deepseek-chat', prompt),
  },
  gemini: {
    label: 'Gemini', env: 'GEMINI_API_KEY',
    async ask(key, prompt) {
      const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const res = await fetchTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST', timeout: 45000,
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
        }),
      });
      if (!res.ok) throw await httpError(res);
      const j = await res.json();
      const parts = j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts;
      return parts && parts.map((p) => p.text || '').join('');
    },
  },
};

const keyOf = (name) => (process.env[PROVIDERS[name].env] || '').trim();
const isConfigured = (name) => !!PROVIDERS[name] && !!keyOf(name);
const anyConfigured = () => Object.keys(PROVIDERS).some(isConfigured);

function defaultProvider() {
  const pref = (process.env.AI_PROVIDER || '').toLowerCase();
  if (isConfigured(pref)) return pref;
  return ['openai', 'gemini', 'deepseek'].find(isConfigured) || null;
}

async function ask(name, prompt) {
  const p = PROVIDERS[name];
  const text = await p.ask(keyOf(name), prompt);
  if (!text || !String(text).trim()) throw new Error('The model returned an empty answer.');
  return String(text).trim().slice(0, 3800);
}

module.exports = { PROVIDERS, isConfigured, anyConfigured, defaultProvider, ask };
