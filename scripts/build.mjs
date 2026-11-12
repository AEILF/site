// Prépare le site à publier dans _site/ :
// - copie les fichiers du site ;
// - crée une page par article du carnet, à l'adresse recherche/<nom-de-l-article>/,
//   avec son propre titre et son résumé (utiles aux moteurs de recherche et aux aperçus de lien).
// Lancé automatiquement par GitHub à chaque modification (.github/workflows/publication.yml).
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";

const OUT = "_site";
const PUBLIC = ["index.html", "404.html", "recherche.html", "mentions-legales.html", "recherche", "mentions-legales", "assets", "content", "images", "site"];

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT);
for (const p of PUBLIC) if (existsSync(p)) cpSync(p, `${OUT}/${p}`, { recursive: true });

// Même règle que assets/recherche.js : l'adresse vient du champ « slug », sinon du titre
const slugify = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const plain = (s) => String(s ?? "").replace(/\*/g, "").replace(/\s+/g, " ").trim();

const data = JSON.parse(readFileSync("content/recherche.json", "utf8"));
const site = JSON.parse(readFileSync("content/site.json", "utf8"));
const template = readFileSync("recherche/index.html", "utf8");
const brand = [site.nomLigne1, site.nomLigne2].map(plain).filter(Boolean).join(" ") || "AE Institut Louis Favoreu";

const seen = {};
let count = 0;
for (const a of data.articles || []) {
  if (!a || !a.titre) continue;
  let slug = slugify(a.slug || a.titre) || "article";
  while (seen[slug]) slug += "-2";
  seen[slug] = true;

  const title = `${plain(a.titre)} · Carnet de recherche · ${brand}`;
  const desc = plain(a.chapeau).slice(0, 300);
  const meta = [
    `<meta property="og:type" content="article">`,
    `<meta property="og:title" content="${esc(plain(a.titre))}">`,
    desc && `<meta property="og:description" content="${esc(desc)}">`,
    a.auteurs && `<meta name="author" content="${esc(plain(a.auteurs))}">`,
    a.date && `<meta property="article:published_time" content="${esc(a.date)}">`,
  ].filter(Boolean).join("\n");

  // La page d'article est un dossier plus profond : chaque chemin relatif remonte d'un cran de plus
  const html = template
    .replace(/((?:href|src)=")\.\.\//g, "$1../../")
    .replace('data-root="../"', 'data-root="../../"')
    .replace('data-article=""', `data-article="${esc(slug)}"`)
    .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
    .replace(/<meta name="description" content="[^"]*">/, `<meta name="description" content="${esc(desc)}">\n${meta}`);

  mkdirSync(`${OUT}/recherche/${slug}`, { recursive: true });
  writeFileSync(`${OUT}/recherche/${slug}/index.html`, html);
  count++;
}
console.log(`Site prêt dans ${OUT}/ : ${count} page(s) d'article générée(s).`);

// Numéro de version ajouté aux feuilles de style et scripts du site (?v=…) : à chaque publication,
// les navigateurs téléchargent la nouvelle version au lieu de garder l'ancienne en mémoire.
const version = (process.env.GITHUB_SHA || String(Date.now())).slice(0, 10);
const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = `${dir}/${f}`; return statSync(p).isDirectory() ? walk(p) : [p]; });
let stamped = 0;
for (const file of walk(OUT).filter((f) => f.endsWith(".html"))) {
  const html = readFileSync(file, "utf8");
  const out = html.replace(/((?:href|src)="[^"]*assets\/(?:style\.css|fonts\.css|main\.js|recherche\.js))"/g, `$1?v=${version}"`);
  if (out !== html) { writeFileSync(file, out); stamped++; }
}
console.log(`Version ${version} appliquée à ${stamped} page(s).`);
