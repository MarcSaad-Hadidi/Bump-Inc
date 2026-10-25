# Bump languages

French is the default at `/`. The header language link opens the English
edition at `/en` and keeps the current chapter hash. Both editions use
the same scroll controller, CSS, media, geometry and animation logic.

`en.json` is the explicit English copy catalog. The English builder replaces
text literals and display markup in generated JavaScript, creates its matching
loader stream and adjusts the one-page route and module URLs. It preserves
object keys, numeric geometry, supplied source files and shared media. Nothing
translates or repeatedly rewrites the live DOM at runtime.

Run `npm run build` to regenerate both editions. The development command also
prepares both. Generated English files are ignored by Git and included in the
Sites build archive. Add English copy here whenever French copy changes, then
check both language links, narratives, native captions, tooltips and app demos.
