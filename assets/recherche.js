/* Annexe I : carnet de recherche. Lit content/recherche.json (modifiable depuis l'admin),
   affiche l'index filtrable des articles et la vue de lecture.
   Adresses : recherche/ pour le carnet, recherche/nom-de-l-article/ pour chaque article
   (pages générées à la publication par scripts/build.mjs). */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var animate = hasGsap && !reduceMotion;
  var lenis = null;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  // Racine du site et adresse du carnet, en absolu : elles restent justes quand l'adresse change sans recharger la page
  var SITE = new URL(document.body.getAttribute("data-root") || "../", location.href).href;
  var CARNET = SITE + "recherche/";
  function asset(p) { return !p || /^([a-z]+:|\/|data:)/i.test(p) ? p : SITE + p; }
  function articleURL(slug) { return CARNET + encodeURIComponent(slug) + "/"; }
  function slugFromLocation() {
    var here = location.href.split("#")[0].split("?")[0];
    if (here.indexOf(CARNET) !== 0) return document.body.getAttribute("data-article") || "";
    return decodeURIComponent(here.slice(CARNET.length).replace(/\/+$/, "").replace(/\/index\.html$/, "").replace(/^index\.html$/, ""));
  }

  var data = { articles: [] };
  var articles = [];
  var filter = { rubrique: "", q: "" };
  var current = null;

  /* ---------- Utilitaires ---------- */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  // Un seul mot *entre astérisques* passe en Times New Roman italique (règle de la charte)
  function setRich(node, str) {
    node.textContent = "";
    var used = false;
    String(str).split(/\*([^*]+)\*/).forEach(function (part, i) {
      if (!part) return;
      if (i % 2 && !used) { node.appendChild(el("span", "ilf-accent", part)); used = true; }
      else node.appendChild(document.createTextNode(part));
    });
  }

  function parseDate(s) {
    var p = String(s || "").split("-").map(Number);
    if (p.length !== 3 || p.some(isNaN)) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  }
  function longDate(d) { return d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : ""; }

  function slugify(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
  }
  function fold(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(); }

  function readingTime(md) {
    var words = String(md || "").replace(/[#>*_\[\]()`-]/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.round(words / 230));
  }

  // Copie dans le presse-papiers ; à défaut, sélection du texte pour une copie manuelle
  function copy(btn, value, label, target) {
    function done(t) { btn.textContent = t; setTimeout(function () { btn.textContent = label; }, 1800); }
    function select() {
      if (target) { var r = document.createRange(); r.selectNodeContents(target); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
      done("Sélectionné");
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(function () { done("Copié"); }, select);
    else select();
  }

  // Écrit le texte en surlignant les passages qui correspondent à la recherche
  function highlight(node, text, q) {
    node.textContent = "";
    text = String(text || "");
    if (!q) { node.textContent = text; return; }
    var hay = fold(text), needle = fold(q), i = 0, at;
    while ((at = hay.indexOf(needle, i)) !== -1) {
      node.appendChild(document.createTextNode(text.slice(i, at)));
      node.appendChild(el("mark", null, text.slice(at, at + needle.length)));
      i = at + needle.length;
    }
    node.appendChild(document.createTextNode(text.slice(i)));
  }

  function load() {
    return fetch(SITE + "content/recherche.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("recherche"); return r.json(); })
      .catch(function () { return null; });
  }

  /* ---------- Carnet : présentation, à la une, index ---------- */

  function prepare(raw) {
    data = raw || { articles: [] };
    var seen = {};
    articles = (data.articles || []).filter(function (a) { return a && a.titre; }).map(function (a) {
      var slug = slugify(a.slug || a.titre) || "article";
      while (seen[slug]) slug += "-2";
      seen[slug] = true;
      return Object.assign({}, a, { slug: slug, _date: parseDate(a.date), _min: readingTime(a.corps) });
    }).sort(function (a, b) { return (b._date || 0) - (a._date || 0); });
  }

  function renderHome() {
    if (data.titre) setRich($("#r-title"), data.titre);
    if (data.chapeau) $("#r-chapeau").textContent = data.chapeau;
    if (data.presentation) $("#r-presentation").textContent = data.presentation; else $("#r-presentation").hidden = true;
    var mail = data.email;
    if (mail) {
      $("#r-mail").href = "mailto:" + mail;
      $("#r-mail-txt").textContent = mail;
      $("#foot-mail").textContent = mail;
    }
    var rubriques = [];
    articles.forEach(function (a) { if (a.rubrique && rubriques.indexOf(a.rubrique) === -1) rubriques.push(a.rubrique); });
    $("#r-count-a").textContent = String(articles.length);
    $("#r-count-r").textContent = String(rubriques.length);

    var box = $("#r-filters");
    box.textContent = "";
    [""].concat(rubriques).forEach(function (r) {
      var b = el("button", "r-chip", r || "Toutes");
      b.type = "button";
      b.setAttribute("aria-pressed", String(r === filter.rubrique));
      var n = r ? articles.filter(function (a) { return a.rubrique === r; }).length : articles.length;
      var sup = el("sup", null, String(n)); sup.setAttribute("aria-label", n + " articles");
      b.appendChild(sup);
      b.addEventListener("click", function () {
        filter.rubrique = r;
        $all(".r-chip", box).forEach(function (c) { c.setAttribute("aria-pressed", String(c === b)); });
        renderGrid(true);
      });
      box.appendChild(b);
    });

    var feat = $("#r-feature");
    feat.textContent = "";
    if (articles.length) {
      var a = articles[0];
      var link = el("a", "r-feat");
      link.href = articleURL(a.slug); link.setAttribute("data-cursor", "Lire");
      var media = el("div", "r-feat__media");
      if (a.image) { var img = el("img"); img.src = asset(a.image); img.alt = ""; img.loading = "lazy"; media.appendChild(img); }
      else media.appendChild(el("span", "r-feat__word", a.rubrique || "Recherche"));
      var tag = el("span", "label r-feat__tag", "À la une"); media.appendChild(tag);
      link.appendChild(media);
      var body = el("div", "r-feat__body");
      var kick = el("div", "r-card__kick");
      kick.appendChild(el("span", "label label--blue", a.rubrique || "Article"));
      if (a.exemple) kick.appendChild(el("span", "tag tag--outline", "Exemple"));
      body.appendChild(kick);
      body.appendChild(el("h2", "r-feat__t", a.titre));
      if (a.chapeau) body.appendChild(el("p", "r-feat__c", a.chapeau));
      body.appendChild(el("p", "r-card__date", [a.auteurs, longDate(a._date), a._min + " min de lecture"].filter(Boolean).join(" · ")));
      var more = el("span", "r-feat__more"); more.appendChild(el("span", null, "Lire l'article")); more.appendChild(el("span", null, "→"));
      body.appendChild(more);
      link.appendChild(body);
      feat.appendChild(link);
      feat.hidden = false;
    }
    renderGrid(false);
  }

  function matches(a) {
    if (filter.rubrique && a.rubrique !== filter.rubrique) return false;
    if (!filter.q) return true;
    var q = fold(filter.q);
    return [a.titre, a.chapeau, a.auteurs, a.rubrique, a.corps].some(function (f) { return fold(f).indexOf(q) !== -1; });
  }

  function card(a) {
    var li = el("li");
    var c = el("a", "r-card");
    c.href = articleURL(a.slug); c.setAttribute("data-cursor", "Lire");
    var kick = el("div", "r-card__kick");
    var rub = el("span", "label label--blue"); highlight(rub, a.rubrique || "Article", filter.q); kick.appendChild(rub);
    kick.appendChild(el("span", "r-card__date", a._date ? a._date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : ""));
    c.appendChild(kick);
    if (a.exemple) { var ex = el("span", "tag tag--outline", "Exemple"); ex.style.alignSelf = "flex-start"; c.appendChild(ex); }
    var t = el("h3", "r-card__t"); highlight(t, a.titre, filter.q); c.appendChild(t);
    if (a.chapeau) { var p = el("p", "r-card__c"); highlight(p, a.chapeau, filter.q); c.appendChild(p); }
    var meta = el("div", "r-card__meta");
    var who = el("span"); highlight(who, [a.auteurs, a._min + " min"].filter(Boolean).join(" · "), filter.q); meta.appendChild(who);
    meta.appendChild(el("span", "r-card__arrow", "→"));
    c.appendChild(meta);
    li.appendChild(c);
    return li;
  }

  function renderGrid(animated) {
    var grid = $("#r-grid");
    var list = articles.filter(matches);
    function fill() {
      grid.textContent = "";
      list.forEach(function (a) { grid.appendChild(card(a)); });
      $("#r-empty").hidden = list.length > 0;
      var total = articles.length;
      $("#r-result").textContent = list.length === total ? total + " article" + (total > 1 ? "s" : "") : list.length + " sur " + total + " article" + (total > 1 ? "s" : "");
      if (animated && animate) gsap.fromTo(grid.children, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: "expo.out", stagger: 0.05 });
    }
    if (animated && animate && grid.children.length) {
      gsap.to(grid.children, { y: -12, opacity: 0, duration: 0.22, ease: "power2.in", stagger: 0.02, onComplete: fill });
    } else fill();
  }

  function setupSearch() {
    var input = $("#r-q"), t = null;
    input.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { filter.q = input.value.trim(); renderGrid(true); }, 160);
    });
    $("#r-reset").addEventListener("click", function () {
      filter = { rubrique: "", q: "" }; input.value = "";
      $all(".r-chip").forEach(function (c, i) { c.setAttribute("aria-pressed", String(i === 0)); });
      renderGrid(true);
    });
  }

  /* ---------- Lecture d'un article ---------- */

  function renderArticle(a) {
    $("#a-rubrique").textContent = a.rubrique || "Article";
    $("#a-exemple").hidden = !a.exemple;
    $("#a-titre").textContent = a.titre;
    var meta = $("#a-meta"); meta.textContent = "";
    if (a.auteurs) { var au = el("span"); au.appendChild(document.createTextNode("Par ")); au.appendChild(el("b", null, a.auteurs)); meta.appendChild(au); }
    if (a._date) meta.appendChild(el("span", null, "Publié le " + longDate(a._date)));
    meta.appendChild(el("span", null, a._min + " min de lecture"));
    $("#a-chapeau").textContent = a.chapeau || "";
    $("#a-chapeau").hidden = !a.chapeau;
    var fig = $("#a-fig");
    if (a.image) { $("#a-img").src = asset(a.image); $("#a-img").alt = a.imageAlt || ""; fig.hidden = false; } else fig.hidden = true;

    // Corps : Markdown converti puis nettoyé (aucun script ni attribut dangereux ne passe)
    var html = window.marked ? marked.parse(String(a.corps || ""), { gfm: true, breaks: false }) : "";
    var clean = window.DOMPurify ? DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }) : "";
    var body = $("#a-corps");
    body.innerHTML = clean;
    $all("a[href]", body).forEach(function (link) {
      if (/^https?:/i.test(link.getAttribute("href"))) { link.target = "_blank"; link.rel = "noopener"; }
    });
    $all("img", body).forEach(function (im) { im.loading = "lazy"; im.src = asset(im.getAttribute("src")); });

    // Appels de notes : « [1] » dans le texte renvoie à la note 1
    var notes = (a.notes || []).filter(Boolean);
    if (notes.length) {
      var walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
      var texts = [];
      while (walker.nextNode()) texts.push(walker.currentNode);
      texts.forEach(function (tn) {
        if (!/\[\d+\]/.test(tn.nodeValue)) return;
        var frag = document.createDocumentFragment();
        tn.nodeValue.split(/(\[\d+\])/).forEach(function (part) {
          var m = /^\[(\d+)\]$/.exec(part);
          if (m && +m[1] >= 1 && +m[1] <= notes.length) {
            var sup = el("sup", "r-fn");
            var ref = el("a", null, m[1]);
            ref.href = "#note-" + m[1]; ref.id = "appel-" + m[1];
            ref.setAttribute("aria-label", "Note " + m[1]);
            sup.appendChild(ref); frag.appendChild(sup);
          } else if (part) frag.appendChild(document.createTextNode(part));
        });
        tn.parentNode.replaceChild(frag, tn);
      });
    }
    var nl = $("#a-notes"); nl.textContent = "";
    notes.forEach(function (n, i) {
      var li = el("li"); li.id = "note-" + (i + 1);
      li.appendChild(document.createTextNode(n));
      var up = el("a", "r-up", "↑"); up.href = "#appel-" + (i + 1); up.setAttribute("aria-label", "Revenir à l'appel de note " + (i + 1));
      li.appendChild(up);
      nl.appendChild(li);
    });
    $("#a-notes-wrap").hidden = !notes.length;

    // Sommaire automatique à partir des intertitres
    var toc = $("#a-toc-list"); toc.textContent = "";
    var heads = $all("h2, h3", body);
    heads.forEach(function (h, i) {
      h.id = "partie-" + (i + 1) + "-" + slugify(h.textContent).slice(0, 40);
      var li = el("li"), link = el("a", null, h.textContent);
      link.href = "#" + h.id;
      if (h.tagName === "H3") link.style.paddingLeft = "28px";
      li.appendChild(link); toc.appendChild(li);
    });
    $("#a-toc").hidden = heads.length < 2;

    // Référence à citer
    var url = articleURL(a.slug);
    var cite = [a.auteurs, "« " + a.titre + " »", data.nomCarnet || "Carnet de recherche de l'AE Institut Louis Favoreu", longDate(a._date)].filter(Boolean).join(", ")
      + ", en ligne : " + url + " (consulté le " + longDate(new Date()) + ").";
    $("#a-cite").textContent = cite;

    // Articles voisins (du plus récent au plus ancien)
    var pager = $("#a-pager"); pager.textContent = "";
    var idx = articles.indexOf(a);
    [[articles[idx - 1], "← Article plus récent"], [articles[idx + 1], "Article plus ancien →"]].forEach(function (p) {
      if (!p[0]) { pager.appendChild(el("span")); return; }
      var l = el("a"); l.href = articleURL(p[0].slug); l.setAttribute("data-cursor", "Lire");
      l.appendChild(el("span", "label label--blue", p[1])); l.appendChild(el("b", null, p[0].titre));
      pager.appendChild(l);
    });

    document.title = a.titre + " · Carnet de recherche";
  }

  var readTriggers = [];
  function readMotion() {
    readTriggers.forEach(function (t) { t.kill(); }); readTriggers = [];
    var title = $("#a-titre");
    title.classList.add("split-lines");
    var lines = splitLines(title);
    gsap.from(lines, { yPercent: 115, duration: 1.2, ease: "expo.out", stagger: 0.08, delay: 0.15 });
    gsap.from(["#a-rubrique", "#a-meta", "#a-chapeau", ".r-back"], { y: 20, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.08, delay: 0.3 });
    gsap.from(".r-read__head", { borderBottomColor: "rgba(32,30,29,0)", duration: 1, delay: 0.4 });
    if (!$("#a-fig").hidden) gsap.from("#a-fig", { clipPath: "inset(0% 0% 100% 0%)", duration: 1.3, ease: "expo.inOut", delay: 0.3 });
    $all("#a-corps > *").forEach(function (b) {
      var tw = gsap.from(b, { y: 24, opacity: 0, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: b, start: "top 92%", once: true } });
      readTriggers.push(tw.scrollTrigger);
    });
    gsap.from(".r-aside__in > *", { x: -16, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.1, delay: 0.5 });
    // Barre de lecture de l'en-tête : progression dans l'article seulement
    gsap.set("#progress", { scaleX: 0 });
    var pr = ScrollTrigger.create({ trigger: "#a-corps", start: "top 70%", end: "bottom 60%", onUpdate: function (s) { gsap.set("#progress", { scaleX: s.progress }); } });
    readTriggers.push(pr);
  }

  // Le sommaire suit la lecture ; un repère bleu glisse sur l'intertitre en cours
  var tocIO = null;
  function tocSpy() {
    if (tocIO) tocIO.disconnect();
    var list = $("#a-toc-list");
    var ind = $(".r-toc__ind", list.parentNode) || el("span", "r-toc__ind");
    list.appendChild(ind);
    function mark(id) {
      $all("a", list).forEach(function (a) {
        var on = a.getAttribute("href") === "#" + id;
        a.classList.toggle("is-current", on);
        if (on) { var li = a.parentNode; ind.style.transform = "translateY(" + li.offsetTop + "px)"; ind.style.height = li.offsetHeight + "px"; }
      });
    }
    if (!("IntersectionObserver" in window)) return;
    tocIO = new IntersectionObserver(function (es) {
      es.forEach(function (en) { if (en.isIntersecting) mark(en.target.id); });
    }, { rootMargin: "-20% 0px -70% 0px" });
    $all("#a-corps h2, #a-corps h3").forEach(function (h) { tocIO.observe(h); });
  }

  /* ---------- Navigation entre les vues ---------- */

  function scrollTop(instant, target) {
    var y = target ? target.getBoundingClientRect().top + window.scrollY - 90 : 0;
    if (lenis) lenis.scrollTo(y, { immediate: !!instant, duration: 1.4 });
    else window.scrollTo({ top: y, behavior: instant || reduceMotion ? "auto" : "smooth" });
  }

  function showView(slug, opts) {
    opts = opts || {};
    var a = slug ? articles.filter(function (x) { return x.slug === slug; })[0] : null;
    var swap = function () {
      if (a) {
        current = a;
        renderArticle(a);
        $("#r-home").hidden = true; $("#r-read").hidden = false;
        scrollTop(true);
      } else {
        current = null;
        document.title = "Carnet de recherche · AE Institut Louis Favoreu";
        $("#r-read").hidden = true; $("#r-home").hidden = false;
        if (opts.toIndex) scrollTop(true, $("#r-index")); else scrollTop(true);
      }
      if (hasGsap) ScrollTrigger.refresh();
      if (a) { tocSpy(); if (animate) readMotion(); }
      else if (animate) gsap.to("#progress", { scaleX: 0, duration: 0.3 });
    };
    if (!animate || opts.instant) { swap(); return; }
    // Rideau bleu : il monte, la vue change dessous, puis il repart vers le haut
    var c = $("#curtain");
    gsap.timeline()
      .fromTo(c, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: "expo.inOut" })
      .add(swap)
      .to(c, { yPercent: -100, duration: 0.7, ease: "expo.inOut" }, "+=0.05")
      .set(c, { yPercent: 100 });
  }

  function route(instant) {
    var h = decodeURIComponent(location.hash.replace(/^#/, ""));
    var slug = slugFromLocation();
    // Anciens liens « recherche/#article » : on passe à l'adresse propre
    if (!slug && h && articles.some(function (x) { return x.slug === h; })) {
      history.replaceState(null, "", articleURL(h)); slug = h; h = "";
    }
    if (slug && articles.some(function (x) { return x.slug === slug; })) {
      if (!current || current.slug !== slug) showView(slug, { instant: instant });
      else if (h && document.getElementById(h)) scrollTop(false, document.getElementById(h));
      return;
    }
    if (current || instant) showView(null, { instant: instant, toIndex: h === "r-index" });
    else if (h === "r-index") scrollTop(false, $("#r-index"));
  }

  // Les liens vers le carnet ou un article changent l'adresse sans recharger la page (le bouton « retour » fonctionne)
  function setupLinks() {
    $all("a[href]").forEach(function (a) {
      var h = a.getAttribute("href");
      if (h && h.charAt(0) !== "#" && !/^(mailto|tel):/i.test(h)) a.setAttribute("href", a.href);
    });
    $("#r-back").setAttribute("href", CARNET + "#r-index");
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest && e.target.closest("a[href]");
      if (!a || a.target === "_blank" || a.closest(".r-toc, .r-notes, .r-fn")) return;
      var href = a.href;
      if (href.indexOf(CARNET) !== 0 || /\.(json|jpe?g|png|webp|pdf)$/i.test(href.split("#")[0])) return;
      e.preventDefault();
      if (href !== location.href) history.pushState(null, "", href);
      route(false);
    });
    window.addEventListener("popstate", function () { route(false); });
  }

  /* ---------- Découpage en lignes (titres) ---------- */

  function splitLines(node) {
    var text = node.textContent.trim().split(/\s+/);
    node.textContent = "";
    var words = text.map(function (w, i) {
      var s = el("span", "w", w); node.appendChild(s);
      if (i < text.length - 1) node.appendChild(document.createTextNode(" "));
      return s;
    });
    var lines = [], cur = [], last = null;
    words.forEach(function (w) { var t = w.offsetTop; if (last !== null && Math.abs(t - last) > 4) { lines.push(cur); cur = []; } cur.push(w); last = t; });
    if (cur.length) lines.push(cur);
    node.textContent = "";
    return lines.map(function (ws) {
      var o = el("span", "sl"), inn = el("span");
      inn.style.display = "inline-block";
      ws.forEach(function (w, i) { if (i) inn.appendChild(document.createTextNode(" ")); inn.appendChild(w); });
      o.appendChild(inn);
      if (node.childNodes.length) node.appendChild(document.createTextNode(" "));
      node.appendChild(o);
      return inn;
    });
  }

  /* ---------- Interface commune au site ---------- */

  function smoothScroll() {
    if (typeof window.Lenis === "undefined") return;
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function setupHeader() {
    var top = $("#top"), nav = $("#nav"), btn = $("#menu-btn"), lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (!nav.classList.contains("is-open")) {
        if (y > 400 && y > lastY + 4) top.classList.add("is-hidden");
        if (y < lastY - 4 || y < 400) top.classList.remove("is-hidden");
      }
      lastY = y;
    }, { passive: true });
    function setMenu(open) {
      nav.classList.toggle("is-open", open);
      root.classList.toggle("nav-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      if (lenis) { if (open) lenis.stop(); else lenis.start(); }
      if (open && animate) gsap.fromTo($all("a", nav), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.9, ease: "expo.out", delay: 0.25 });
    }
    btn.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });
    $all("a", nav).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
  }

  function setupTotop() {
    var totop = $("#totop"), bar = $("#totop-bar");
    function update() {
      var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      totop.classList.toggle("is-visible", y > 500);
      bar.style.strokeDashoffset = String(100 - (max > 0 ? Math.min(1, y / max) : 0) * 100);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
    [totop, $("#foot-top")].forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); scrollTop(false); });
    });
  }

  function cursor() {
    if (!finePointer) return;
    var c = $("#cursor"), label = $("#cursor-label");
    root.classList.add("has-cursor");
    var xTo = gsap.quickTo(c, "x", { duration: 0.45, ease: "power3.out" });
    var yTo = gsap.quickTo(c, "y", { duration: 0.45, ease: "power3.out" });
    window.addEventListener("pointermove", function (e) { c.classList.add("is-on"); xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    document.addEventListener("pointerleave", function () { c.classList.remove("is-on"); });
    document.addEventListener("pointerover", function (e) {
      if (!e.target.closest) return;
      var t = e.target.closest("[data-cursor], a, button, input");
      var text = t && t.getAttribute("data-cursor");
      c.classList.toggle("is-hover", !!t && !text);
      c.classList.toggle("is-label", !!text);
      c.classList.toggle("is-invert", !!e.target.closest(".join, .totop"));
      if (text) label.textContent = text;
    });
  }

  function magnetic() {
    if (!finePointer) return;
    $all(".magnetic").forEach(function (btn) {
      var xTo = gsap.quickTo(btn, "x", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
      var yTo = gsap.quickTo(btn, "y", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.18); yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      btn.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
    });
  }

  function pageTransitions() {
    $all(".js-transition").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || !animate) return;
        e.preventDefault();
        gsap.fromTo("#curtain", { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: "expo.inOut", onComplete: function () { window.location.href = a.href; } });
      });
    });
    window.addEventListener("pageshow", function () { if (hasGsap) gsap.set("#curtain", { yPercent: 100 }); });
  }

  function homeMotion() {
    var title = $("#r-title");
    var tl = gsap.timeline({ delay: 0.5 });
    tl.from(".r-hero__kicker", { y: 16, opacity: 0, duration: 1, ease: "expo.out" }, 0)
      .from(title, { yPercent: 30, opacity: 0, duration: 1.4, ease: "expo.out" }, 0.05)
      .from(".r-hero__side > *", { y: 24, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.1 }, 0.3);
    var counters = $all(".r-hero__stats b");
    counters.forEach(function (b) {
      var end = +b.textContent || 0, o = { v: 0 };
      tl.to(o, { v: end, duration: 1.4, ease: "power3.out", onUpdate: function () { b.textContent = String(Math.round(o.v)); } }, 0.5);
    });
    var feat = $(".r-feat");
    if (feat) {
      gsap.from(feat, { clipPath: "inset(0% 0% 100% 0%)", duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: feat, start: "top 88%", once: true } });
      var img = $(".r-feat__media img, .r-feat__word", feat);
      if (img) gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: feat, start: "top bottom", end: "bottom top", scrub: true } });
    }
    $all(".r-index .split-lines").forEach(function (h) {
      var lines = splitRich(h);
      gsap.from(lines, { yPercent: 115, duration: 1.2, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
    });
    gsap.from(".r-search, .r-chip", { y: 20, opacity: 0, duration: 0.9, ease: "expo.out", stagger: 0.04, scrollTrigger: { trigger: ".r-tools", start: "top 85%", once: true } });
    gsap.from("#r-grid > li", { clipPath: "inset(0% 0% 100% 0%)", duration: 1.1, ease: "expo.inOut", stagger: 0.08, scrollTrigger: { trigger: "#r-grid", start: "top 85%", once: true } });
    gsap.fromTo(".r-cta .join__bg", { clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", ease: "none", scrollTrigger: { trigger: ".r-cta", start: "top bottom", end: "top 30%", scrub: 0.6 } });
    gsap.from(".r-cta .join__body > *", { y: 30, opacity: 0, duration: 1.1, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: ".r-cta", start: "top 60%", once: true } });
  }

  // Titre contenant le mot en Times : on garde l'italique en découpant
  function splitRich(node) {
    var parts = [];
    Array.prototype.slice.call(node.childNodes).forEach(function (ch) {
      var acc = ch.nodeType === 1 && ch.classList.contains("ilf-accent");
      ch.textContent.split(/(\s+)/).forEach(function (w) { if (w) parts.push({ w: w, acc: acc }); });
    });
    node.textContent = "";
    var inn = el("span"); inn.style.display = "inline-block";
    parts.forEach(function (p) { inn.appendChild(p.acc ? el("span", "ilf-accent", p.w) : document.createTextNode(p.w)); });
    var o = el("span", "sl"); o.appendChild(inn); node.appendChild(o);
    return [inn];
  }

  /* ---------- Démarrage ---------- */

  if (animate) smoothScroll();
  setupHeader();
  setupTotop();
  pageTransitions();

  // En-tête : même nom que sur l'accueil, tel que saisi dans l'admin (Textes du site)
  fetch(SITE + "content/site.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (site) {
    if (!site) return;
    $all(".brand__name [data-bind]").forEach(function (n) {
      var v = site[n.getAttribute("data-bind")];
      v = typeof v === "string" ? v.trim() : "";
      n.hidden = !v; n.textContent = v;
    });
  }).catch(function () {});

  load().then(function (raw) {
    prepare(raw);
    renderHome();
    setupSearch();

    $("#a-share").addEventListener("click", function () { copy(this, current ? articleURL(current.slug) : CARNET, "Copier le lien"); });
    $("#a-cite-copy").addEventListener("click", function () { copy(this, $("#a-cite").textContent, "Copier la référence", $("#a-cite")); });
    setupLinks();

    // Liens internes à l'article (sommaire, notes) : défilement doux sans changer de vue
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest(".r-toc a, .r-fn a, .r-notes a");
      if (!a) return;
      var t = document.getElementById(a.getAttribute("href").slice(1));
      if (t) { e.preventDefault(); scrollTop(false, t); }
    });

    route(true);
    if (!animate) return;
    var start = function () { if (!current) homeMotion(); cursor(); magnetic(); ScrollTrigger.refresh(); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
  });
})();
