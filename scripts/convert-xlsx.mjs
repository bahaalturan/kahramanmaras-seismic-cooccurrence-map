// input/*.xlsx içindeki yıllık kural sayfalarını web/data/rules.json dosyasına dönüştürür.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import XLSX from 'xlsx';
import { LOCATIONS } from '../web/locations.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const inputDir = join(root, 'input');
const xlsxName = readdirSync(inputDir).find(f => f.toLowerCase().endsWith('.xlsx'));
if (!xlsxName) throw new Error('input klasöründe .xlsx bulunamadı');

const wb = XLSX.read(readFileSync(join(inputDir, xlsxName)));

// "frozenset({'HATAY', 'ADANA'})" → ['HATAY', 'ADANA']
const parseSet = s => [...String(s).matchAll(/'([^']+)'/g)].map(m => m[1]);

const COLS = {
  'antecedent support': 'antSupport',
  'consequent support': 'consSupport',
  support: 'support',
  confidence: 'confidence',
  lift: 'lift',
  leverage: 'leverage',
  conviction: 'conviction',
  zhangs_metric: 'zhang',
};

const rules = [];
const unknown = new Set();
for (const sheet of wb.SheetNames) {
  const year = Number(sheet);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { defval: null });
  for (const row of rows) {
    const antecedents = parseSet(row.antecedents);
    const consequents = parseSet(row.consequents);
    if (!antecedents.length || !consequents.length) continue;
    [...antecedents, ...consequents].forEach(l => { if (!LOCATIONS[l]) unknown.add(l); });
    const rule = { year, id: `${year}-${row.__EMPTY ?? rules.length}`, antecedents, consequents };
    // confidence = 1 olan kurallarda conviction "inf"; JSON'da null olarak tutulur.
    for (const [col, key] of Object.entries(COLS)) {
      const v = Number(row[col]);
      rule[key] = Number.isFinite(v) && row[col] !== null ? v : null;
    }
    rule.antLen = antecedents.length;
    rule.consLen = consequents.length;
    rules.push(rule);
  }
  console.log(`${sheet}: ${rules.filter(r => r.year === year).length} kural`);
}

if (unknown.size) console.warn('UYARI — koordinatı olmayan konumlar:', [...unknown].join(', '));
else console.log('Bilinmeyen konum yok.');

writeFileSync(join(root, 'web', 'data', 'rules.json'), JSON.stringify({ source: xlsxName, rules }));
console.log(`Toplam ${rules.length} kural → web/data/rules.json`);
