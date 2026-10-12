'use strict';
/**
 * HTTP helpers: timeouts, size limits and SSRF protection for user-supplied URLs.
 * Uses the global fetch of Node 18+ (no extra dependency).
 */
const dns = require('dns').promises;
const net = require('net');

const UA = 'SHADOW-MD/2.0 (+https://github.com/shadowmd2007/SHADOW-MD-MINI)';

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split('.').map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  if (net.isIPv6(ip)) {
    const l = ip.toLowerCase();
    if (l === '::1' || l === '::') return true;
    if (l.startsWith('::ffff:')) return isPrivateIp(l.slice(7));
    return l.startsWith('fc') || l.startsWith('fd') || l.startsWith('fe8') || l.startsWith('fe9') || l.startsWith('fea') || l.startsWith('feb');
  }
  return true;
}

async function assertPublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch (_) { throw new Error('Invalid URL.'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error('Only http(s) URLs are allowed.');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isPrivateIp(host)) throw new Error('That address is not allowed.');
  } else {
    if (host === 'localhost' || host.endsWith('.internal') || host.endsWith('.local')) throw new Error('That address is not allowed.');
    let addrs;
    try { addrs = await dns.lookup(host, { all: true }); } catch (_) { throw new Error('Could not resolve that host.'); }
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) throw new Error('That address is not allowed.');
  }
  return u;
}

async function fetchTimeout(url, { timeout = 10000, ...opts } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal, headers: { 'User-Agent': UA, ...(opts.headers || {}) } });
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('The request timed out.');
    throw new Error('Network error while contacting the service.');
  } finally { clearTimeout(t); }
}

async function getJson(url, opts = {}) {
  const res = await fetchTimeout(url, opts);
  if (!res.ok) { const err = new Error(`Service returned HTTP ${res.status}.`); err.status = res.status; throw err; }
  try { return await res.json(); } catch (_) { throw new Error('Service returned an unreadable response.'); }
}

/** Fetch an arbitrary public URL with redirect checks and a hard size limit. */
async function safeFetch(rawUrl, { timeout = 10000, maxBytes = 3 * 1024 * 1024, maxRedirects = 3 } = {}) {
  let url = rawUrl;
  for (let i = 0; i <= maxRedirects; i++) {
    const u = await assertPublicUrl(url);
    const res = await fetchTimeout(u.href, { timeout, redirect: 'manual' });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      url = new URL(res.headers.get('location'), u).href;
      continue;
    }
    const declared = Number(res.headers.get('content-length'));
    if (declared && declared > maxBytes) throw new Error(`File is too large (limit ${Math.round(maxBytes / 1048576)} MB).`);
    const chunks = []; let size = 0;
    for await (const chunk of res.body) {
      size += chunk.length;
      if (size > maxBytes) throw new Error(`File is too large (limit ${Math.round(maxBytes / 1048576)} MB).`);
      chunks.push(Buffer.from(chunk));
    }
    return {
      status: res.status, url: u.href, buffer: Buffer.concat(chunks),
      contentType: (res.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim().toLowerCase(),
    };
  }
  throw new Error('Too many redirects.');
}

module.exports = { fetchTimeout, getJson, safeFetch, assertPublicUrl, isPrivateIp };
