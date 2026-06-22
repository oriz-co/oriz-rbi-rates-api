// oriz-rbi-rates-api scrape — ToS-conservative posture.
// User-Agent identifies us; rate ≤ 1 fetch / upstream / day; cache aggressively;
// on 403 / CAPTCHA / network fail, write placeholder so /latest.json stays valid.
import { writeFileSync, mkdirSync } from 'node:fs';
import { load } from 'cheerio';

const today = new Date().toISOString().slice(0, 10);
const UA = "oriz-api-bot/0.1 (+https://oriz.in/about; contact: privacy@oriz.in)";
const placeholder = {"source":"placeholder","rates":{}};
const seed = {"source":"placeholder","as_of":"2026-06-22","rates":{"repo":6.5,"reverse_repo":3.35,"bank_rate":6.75,"wacr":6.48,"mclr_1y":8.95}};
const HEADERS = { 'User-Agent': UA, 'Accept': 'application/json, text/html;q=0.9' };

async function safe(fn) { try { return await fn(); } catch (e) { console.error('upstream:', e.message); return null; } }

async function scrape() {
  // RBI policy rates — public PDF press releases. Lazy: pull the static HTML, regex out numbers.
  const r = await fetch('https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx', { headers: HEADERS });
  if (!r.ok) throw new Error('RBI ' + r.status);
  const html = await r.text();
  const $ = load(html);
  const text = $('body').text().replace(/\s+/g,' ');
  const m = (label) => { const x = new RegExp(label+'[^0-9]{0,40}(\\d+\\.\\d+)','i').exec(text); return x ? +x[1] : null; };
  return {
    source: 'rbi',
    as_of: today,
    rates: {
      repo: m('repo rate'), reverse_repo: m('reverse repo'), bank_rate: m('bank rate'),
      wacr: m('WACR') ?? m('weighted average call'), mclr_1y: m('MCLR'),
    },
  };
}
let result = await safe(scrape) ?? seed;
const payload = { date: today, ...result };
mkdirSync('data', { recursive: true });
writeFileSync('data/' + today + '.json', JSON.stringify(payload, null, 2) + '\n');
writeFileSync('data/latest.json', JSON.stringify(payload, null, 2) + '\n');
console.log('wrote data/latest.json source=', payload.source);
