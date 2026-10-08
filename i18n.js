// Arayüz metinleri (TR / EN). Statik metinler index.html'de data-i18n* öznitelikleriyle,
// dinamik metinler app.js'de t() ile bu sözlükten okunur.
const DICT = {
  tr: {
    title: 'Deprem Birliktelik Haritası',
    subtitle: 'Türkiye, 2019–2023 · Günlük sepet · Apriori birliktelik kuralları (KOERI, ML ≥ 2.0)',
    rules: 'Kurallar',
    reset: 'Filtreleri sıfırla',
    time: 'Zaman',
    compareYears: 'Yılları karşılaştır (renk = yıl)',
    play: '▶ Yılları oynat',
    stop: '■ Durdur',
    playHint: 'Seçim tek tek yıllar arasında döner',
    edgeWeight: 'Kenar ağırlığı',
    weightMetric: 'Kalınlık / renk metriği',
    aggregate: 'Aynı bağlantı için birleştirme',
    aggMaxOpt: 'En büyük (max)', aggMeanOpt: 'Ortalama', aggSumOpt: 'Toplam', aggCountOpt: 'Kural sayısı',
    scaleType: 'Kalınlık ölçeği', linear: 'Doğrusal', log: 'Logaritmik',
    scaleRange: 'Kalınlık aralığı', rangeVisible: 'Görünen kenarlar', rangeGlobal: 'Tüm kurallar (yıllar arası sabit)',
    directed: 'Yönlü kenarlar (A → B ayrı çizilir)',
    topN: 'En güçlü N kural',
    all: 'tümü',
    metricRanges: 'Metrik aralıkları',
    ruleStructure: 'Kural yapısı',
    antLen: 'Antecedent eleman sayısı',
    consLen: 'Consequent eleman sayısı',
    oneToOne: 'Sadece 1 → 1 kurallar',
    location: 'Konum',
    locRole: 'Seçili illerin rolü',
    roleAny: 'Kuralın herhangi bir tarafında', roleAnt: 'Antecedent (öncül) tarafında', roleCons: 'Consequent (sonuç) tarafında',
    locSearch: 'İl ara…',
    clear: 'Temizle',
    distance: 'Mesafe',
    distanceLabel: 'İller arası mesafe',
    distanceHint: 'İl merkezleri arası kuş uçuşu mesafe (km). Uzak iller arasındaki birliktelikleri ayıklamak için.',
    display: 'Görünüm',
    nodeSize: 'Düğüm boyutu',
    sizeSupport: 'Tekil destek (il depremli gün oranı)', sizeDegree: 'Derece (görünen kenar sayısı)', sizeStrength: 'Ağırlıklı derece',
    basemap: 'Harita altlığı',
    mapAuto: 'Sisteme göre', mapLight: 'Açık', mapDark: 'Koyu', mapNone: 'Sadece il sınırları',
    showLabels: 'İl etiketleri', showArrows: 'Ok başları', showBorders: 'İl sınırları', hideIsolated: 'Kenarı olmayan illeri gizle',
    tileAttr: 'Altlık © Esri, HERE, Garmin, © OpenStreetMap katkıcıları',
    agg: { max: 'en büyük', mean: 'ortalama', sum: 'toplam', count: 'kural sayısı' },
    legendAgg: { max: 'max', mean: 'ortalama', sum: 'toplam', count: 'kural sayısı' },
    directedTag: ' (yönlü)',
    nRules: n => `${n} kural`,
    moreRules: n => `+${n} kural daha (tabloda)`,
    year: 'Yıl', rule: 'Kural',
    nodeInfo: n => `${n} kenar · tıkla: odaklan`,
    singleSupport: 'Tekil destek',
    strongest: m => `En güçlü bağlantılar (${m})`,
    thinStrong: 'ince → güçlü',
    widthRange: 'Kalınlık aralığı',
    edge: 'Kenar',
    noRules: 'Filtrelere uyan kural yok',
    convNote: '∞ değerler en büyük sonlu değere eşitlendi',
    allYears: 'Tüm yıllar',
    sumRules: 'kural', sumEdges: 'kenar', sumNodes: 'il / bölge', sumPeriod: 'dönem',
    ruleCol: 'Kural (antecedent → consequent)',
    tableInfo: n => `${n} kural · başlığa tıkla: sırala · satıra tıkla: haritada vurgula`,
    info: {
      antSupport: 'Öncül itemset’in (A) görüldüğü günlerin oranı.',
      consSupport: 'Sonuç itemset’in (B) görüldüğü günlerin oranı.',
      support: 'Support(A∪B): A ve B’nin aynı gün birlikte görüldüğü günlerin oranı.',
      confidence: 'Support(A∪B) / Support(A): A deprem gördüğünde aynı gün B’nin de görme olasılığı.',
      lift: 'Confidence / Support(B). 1’den büyükse pozitif birliktelik.',
      leverage: 'Support(A∪B) − Support(A)·Support(B). 0 bağımsızlık; pozitif değer birlikte görülme eğilimi.',
      conviction: '(1 − Support(B)) / (1 − Confidence). Confidence = 1 olan kurallarda ∞.',
      zhang: '−1 ile 1 arasında; pozitif değer birliktelik, negatif değer ayrışma.',
    },
  },
  en: {
    title: 'Earthquake Association Map',
    subtitle: 'Türkiye, 2019–2023 · Daily baskets · Apriori association rules (KOERI, ML ≥ 2.0)',
    rules: 'Rules',
    reset: 'Reset filters',
    time: 'Time',
    compareYears: 'Compare years (colour = year)',
    play: '▶ Play years',
    stop: '■ Stop',
    playHint: 'Steps through the years one at a time',
    edgeWeight: 'Edge weight',
    weightMetric: 'Width / colour measure',
    aggregate: 'Aggregation for the same link',
    aggMaxOpt: 'Maximum', aggMeanOpt: 'Mean', aggSumOpt: 'Sum', aggCountOpt: 'Rule count',
    scaleType: 'Width scale', linear: 'Linear', log: 'Logarithmic',
    scaleRange: 'Width range', rangeVisible: 'Visible edges', rangeGlobal: 'All rules (fixed across years)',
    directed: 'Directed edges (A → B drawn separately)',
    topN: 'Top N rules',
    all: 'all',
    metricRanges: 'Measure ranges',
    ruleStructure: 'Rule structure',
    antLen: 'Antecedent size',
    consLen: 'Consequent size',
    oneToOne: 'Only 1 → 1 rules',
    location: 'Location',
    locRole: 'Role of selected locations',
    roleAny: 'On either side of the rule', roleAnt: 'In the antecedent', roleCons: 'In the consequent',
    locSearch: 'Search location…',
    clear: 'Clear',
    distance: 'Distance',
    distanceLabel: 'Distance between locations',
    distanceHint: 'Great-circle distance between province centres (km). Use it to isolate associations between distant provinces.',
    display: 'Display',
    nodeSize: 'Node size',
    sizeSupport: 'Single support (share of days with an event)', sizeDegree: 'Degree (number of visible edges)', sizeStrength: 'Weighted degree',
    basemap: 'Basemap',
    mapAuto: 'Follow system', mapLight: 'Light', mapDark: 'Dark', mapNone: 'Province borders only',
    showLabels: 'Location labels', showArrows: 'Arrowheads', showBorders: 'Province borders', hideIsolated: 'Hide locations without edges',
    tileAttr: 'Basemap © Esri, HERE, Garmin, © OpenStreetMap contributors',
    agg: { max: 'maximum', mean: 'mean', sum: 'sum', count: 'rule count' },
    legendAgg: { max: 'max', mean: 'mean', sum: 'sum', count: 'rule count' },
    directedTag: ' (directed)',
    nRules: n => `${n} ${n === 1 ? 'rule' : 'rules'}`,
    moreRules: n => `+${n} more ${n === 1 ? 'rule' : 'rules'} (see table)`,
    year: 'Year', rule: 'Rule',
    nodeInfo: n => `${n} ${n === 1 ? 'edge' : 'edges'} · click to focus`,
    singleSupport: 'Single support',
    strongest: m => `Strongest links (${m})`,
    thinStrong: 'weak → strong',
    widthRange: 'Width range',
    edge: 'Edge',
    noRules: 'No rules match the filters',
    convNote: '∞ values are capped at the largest finite value',
    allYears: 'All years',
    sumRules: 'rules', sumEdges: 'edges', sumNodes: 'locations', sumPeriod: 'period',
    ruleCol: 'Rule (antecedent → consequent)',
    tableInfo: n => `${n} ${n === 1 ? 'rule' : 'rules'} · click a header to sort · click a row to highlight it on the map`,
    info: {
      antSupport: 'Share of days on which the antecedent itemset (A) occurs.',
      consSupport: 'Share of days on which the consequent itemset (B) occurs.',
      support: 'Support(A∪B): share of days on which A and B occur on the same day.',
      confidence: 'Support(A∪B) / Support(A): probability that B has an event on a day on which A has one.',
      lift: 'Confidence / Support(B). Values above 1 indicate positive association.',
      leverage: 'Support(A∪B) − Support(A)·Support(B). 0 means independence; positive values mean co-occurrence.',
      conviction: '(1 − Support(B)) / (1 − Confidence). ∞ for rules with confidence = 1.',
      zhang: 'Between −1 and 1; positive values indicate association, negative values dissociation.',
    },
  },
};

const STORE_KEY = 'lang';
function initialLang() {
  const q = new URLSearchParams(location.search).get('lang');
  if (q in DICT) return q;
  try { const s = localStorage.getItem(STORE_KEY); if (s in DICT) return s; } catch {}
  return (navigator.language || '').toLowerCase().startsWith('tr') ? 'tr' : 'en';
}

export let lang = initialLang();
export const t = key => DICT[lang][key];

export function setLang(l) {
  lang = l;
  try { localStorage.setItem(STORE_KEY, l); } catch {}
  applyStatic();
}

// index.html'deki statik metinler
export function applyStatic() {
  document.documentElement.lang = lang;
  document.title = t('title');
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const b of document.querySelectorAll('[data-lang]')) b.classList.toggle('on', b.dataset.lang === lang);
}
