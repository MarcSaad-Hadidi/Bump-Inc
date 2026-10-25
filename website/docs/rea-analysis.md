# REA evidence

REA 6.7.0 inspected the public JavaScript application of Shopify Editions Winter ’26.

The scoped analysis parsed four page-specific sources, with 65,374 AST nodes,
235 findings, and zero parse failures. Eleven other cached application sources
were intentionally outside the scoped analysis.

Inspected modules:

- `(_locale).editions.winter2026-CdSmWtXg.js`
- `FallbackImageScene-iLGd0Ad5.js`
- `HeroScene-CQfa8zjw.js`
- `constants-AgmyR9jG.js`

The findings and direct source inspection established the 12-chapter layout,
Theatre-authored scene tracks, GLB/KTX2 hero assets, responsive fallback artwork,
Rive product media and asset binding, and chapter navigation structure.
The reconstruction uses independent React components and runtime code, not the
original minified application bundles. Server loader metadata and analytics
configuration are not included.

Command shape:

```sh
rea analyze-javascript-application SOURCE_DIRECTORY \
  --source-path '(_locale).editions.winter2026-CdSmWtXg.js' \
  --source-path FallbackImageScene-iLGd0Ad5.js \
  --source-path HeroScene-CQfa8zjw.js \
  --source-path constants-AgmyR9jG.js \
  --analysis-timeout-ms 30000 --json
```

Hero animation data was separately checked across 4,816 finite curve samples,
including the source opening camera position, FOV, and initial rig clip progress.
