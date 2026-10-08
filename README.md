# Visualizing Inter-Provincial Seismic Co-occurrence Networks with Particular Focus on the 2023 Kahramanmaraş Earthquake Year: An Interactive Map-Based Approach

Interactive web map of same-day earthquake association rules between locations in Türkiye, 2019–2023.

**Live demo:** https://bahaalturan.github.io/kahramanmaras-seismic-cooccurrence-map/?lang=en

The interface is available in English and Turkish (TR | EN switch, top right).

## What it shows

Each calendar day of the KOERI earthquake catalogue (local magnitude ML ≥ 2.0) is treated as one basket of the locations where events occurred. Yearly association rules were mined with the Apriori algorithm in our earlier study [1]. This interface does not mine new rules. It draws the existing 533 rules (2019–2023) on a map of Türkiye as a directed, weighted network:

- **Nodes** are locations: province centres, plus a representative point for the Sea of Marmara.
- **Edges** link the antecedent and consequent locations of a rule. Their width and colour encode a selectable measure: support, confidence, lift, leverage, conviction or Zhang's metric. Rules with several items on one side are drawn as one edge per antecedent–consequent pair. These edges are a visual projection, not new pairwise rules.
- **Filters** cover year, all eight rule measures, rule structure (antecedent / consequent size), locations and their role, and the distance between locations. A linked table lists exactly the rules shown on the map.

## Repository layout

| Path | Content |
|---|---|
| `web/` | The static web interface (HTML, CSS, JavaScript, Leaflet). This folder is what GitHub Pages serves. |
| `web/data/rules.json` | All 533 rules with their measures, converted from the Excel file below |
| `web/data/tr-provinces.geojson` | Province boundaries of Türkiye |
| `web/locations.js` | Coordinates of the locations used as nodes |
| `web/i18n.js` | English and Turkish interface texts |
| `input/*.xlsx` | Yearly rule tables produced by the Apriori analysis in [1] |
| `scripts/convert-xlsx.mjs` | Converts the Excel rule tables to `web/data/rules.json` |

## Running locally

Requires [Node.js](https://nodejs.org/).

```bash
npm install
npm start            # serves web/ at http://localhost:8080/
npm run convert      # optional: rebuild web/data/rules.json from input/*.xlsx
npm run deploy       # publish web/ to the gh-pages branch (GitHub Pages)
```

## Data sources

- Earthquake catalogue: Kandilli Observatory and Earthquake Research Institute (KOERI), Regional Earthquake-Tsunami Monitoring Center.
- Province boundaries: [cihadturhan/tr-geojson](https://github.com/cihadturhan/tr-geojson).
- Basemap tiles: Esri (World Light/Dark Gray Canvas), via [Leaflet](https://leafletjs.com/).

## Reference

[1] B. Alturan and İ. Türker, "Association rule mining with earthquake data collected from Turkiye region," arXiv:2312.16158, 2023. https://doi.org/10.48550/arXiv.2312.16158

## Authors

Baha Alturan, İlker Türker, Kürşat Mustafa Karaoğlan, Karabük University
