/* Site de l'association : lit le contenu dans /content/*.json (modifiable depuis l'admin),
   remplit la page, puis lance les animations. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var animate = hasGsap && !reduceMotion;
  var lenis = null;
  var accentWords = ["ensemble"];
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Utilitaires ---------- */

  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  function accent(text) { return el("span", "ilf-accent", text); }
  // Mot du titre en Times, suivi du point final en Nexa (ils défilent ensemble)
  function rotWord(text) { var w = el("span", "rotator__w"); w.appendChild(accent(text)); w.appendChild(document.createTextNode(".")); return w; }
  function isAccent(node) { return node.nodeType === 1 && (node.nodeName === "EM" || node.classList.contains("ilf-accent")); }

  function load(name) {
    return fetch("content/" + name + ".json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(name); return r.json(); })
      .catch(function () { return null; });
  }

  // Dans l'admin, le mot écrit *entre astérisques* s'affiche en Times New Roman italique.
  // La charte n'autorise qu'un seul mot accentué par phrase : seul le premier est pris en compte.
  function setRich(node, str) {
    node.textContent = "";
    var used = false;
    String(str).split(/\*([^*]+)\*/).forEach(function (part, i) {
      if (!part) return;
      if (i % 2 && !used) { node.appendChild(accent(part)); used = true; }
      else node.appendChild(document.createTextNode(part));
    });
  }

  // "2026-11-19" -> Date locale (évite le décalage UTC)
  function parseDate(s) {
    var p = String(s || "").split("-").map(Number);
    if (p.length !== 3 || p.some(isNaN)) return null;
    return new Date(p[0], p[1] - 1, p[2]);
  }

  function initials(name) {
    return String(name || "")
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map(function (w) { return w.charAt(0).toUpperCase(); }).join("");
  }

  function storage(fn) { try { return fn(window.sessionStorage); } catch (e) { return null; } }

  // Icônes Lucide (trait 2 px, extrémités carrées), tracés repris de la charte
  var ICONS = {
    calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6"
  };
  function icon(name) {
    var ns = "http://www.w3.org/2000/svg";
    var svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24"); svg.setAttribute("width", "18"); svg.setAttribute("height", "18");
    svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "square"); svg.setAttribute("aria-hidden", "true");
    var path = document.createElementNS(ns, "path"); path.setAttribute("d", ICONS[name]);
    svg.appendChild(path);
    return svg;
  }

  /* ---------- Rendu du contenu ---------- */

  function bindSite(site) {
    if (!site) return;
    $all("[data-bind]").forEach(function (node) {
      var v = site[node.getAttribute("data-bind")];
      if (typeof v !== "string" || v.trim() === "") return;
      if (node.hasAttribute("data-rich")) setRich(node, v); else node.textContent = v.replace(/\*/g, "");
    });

    if (site.motsAccent && site.motsAccent.length) accentWords = site.motsAccent.filter(Boolean);
    var first = accentWords[0] || "ensemble";
    var rot = $("#rotator");
    if (rot) { rot.textContent = ""; rot.appendChild(rotWord(first)); }
    var outro = $("#outro-word");
    if (outro) outro.textContent = first;

    var title = $("#hero-title");
    if (title) title.setAttribute("aria-label", [site.titreLigne1, site.titreLigne2, first].filter(Boolean).join(" ") + ".");
    if (site.nomLigne1 && site.nomLigne2) document.title = site.nomLigne1 + " " + site.nomLigne2;

    var img = $("#hero-img");
    if (img && site.illustration) {
      img.removeAttribute("srcset");
      img.src = site.illustration;
    }
    if (img && site.illustrationAlt) img.alt = site.illustrationAlt;
    if (site.adhesionLien) { var join = $("#join-link"); if (join) join.href = site.adhesionLien; }

    var socials = $("#socials");
    if (socials) {
      socials.textContent = "";
      [["Instagram", site.instagram], ["LinkedIn", site.linkedin]].forEach(function (s) {
        if (!s[1]) return;
        var a = el("a", "link", s[0]);
        a.href = s[1]; a.target = "_blank"; a.rel = "noopener";
        socials.appendChild(a);
      });
    }

    var track = $("#marquee");
    if (track) {
      var words = (site.motsCles && site.motsCles.length) ? site.motsCles : ["Justice constitutionnelle", "Droits fondamentaux", "Conférences"];
      track.textContent = "";
      // Deux copies identiques : la boucle tourne sans à-coup
      for (var copy = 0; copy < 2; copy++) {
        var group = el("div");
        group.style.display = "flex";
        words.forEach(function (w) { group.appendChild(el("span", "marquee__item", w)); });
        track.appendChild(group);
      }
    }
  }

  function renderActivities(data) {
    var list = $("#acts");
    if (!list) return;
    list.textContent = "";
    var items = (data && data.activites) || [];
    items.forEach(function (a, i) {
      var li = el("li", "act");
      li.appendChild(el("p", "label act__n", "Art. 2-" + (i + 1)));
      li.appendChild(el("span", "act__big", String(i + 1).padStart(2, "0")));
      li.appendChild(el("h3", "h3 act__t", a.titre));
      li.appendChild(el("p", "act__d", a.texte));
      list.appendChild(li);
    });
    var count = $("#acts-count");
    if (count) count.textContent = "01 / " + String(items.length).padStart(2, "0");
  }

  function eventCard(ev) {
    var d = parseDate(ev.date);
    var hasLink = ev.lien && String(ev.lien).trim() !== "";
    var card = el(hasLink ? "a" : "div", "ev" + (hasLink ? "" : " ev--nolink"));
    if (hasLink) { card.href = ev.lien; card.target = "_blank"; card.rel = "noopener"; card.setAttribute("data-cursor", "Ouvrir"); }

    var kick = el("div", "ev__kick");
    if (ev.categorie) kick.appendChild(el("span", "label label--blue", ev.categorie));
    if (ev.exemple) kick.appendChild(el("span", "tag tag--outline", "Exemple"));
    card.appendChild(kick);

    if (d) card.appendChild(el("span", "ev__day", String(d.getDate()).padStart(2, "0")));
    card.appendChild(el("h3", "ev__t", ev.titre));
    if (ev.description) card.appendChild(el("p", "ev__d", ev.description));

    var meta = el("div", "ev__meta");
    var when = [];
    if (d) when.push(d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }));
    if (ev.heure) when.push(ev.heure.replace(":", " h "));
    var info = el("span");
    info.style.display = "grid"; info.style.gap = "4px";
    var l1 = el("span"); l1.style.display = "flex"; l1.style.gap = "8px"; l1.style.alignItems = "center";
    l1.appendChild(icon("calendar")); l1.appendChild(document.createTextNode(when.join(" · ")));
    info.appendChild(l1);
    if (ev.lieu) {
      var l2 = el("span"); l2.style.display = "flex"; l2.style.gap = "8px"; l2.style.alignItems = "center";
      l2.appendChild(icon("pin")); l2.appendChild(document.createTextNode(ev.lieu));
      info.appendChild(l2);
    }
    meta.appendChild(info);
    meta.appendChild(el("span", "ev__arrow", "→"));
    card.appendChild(meta);

    var li = el("li");
    li.appendChild(card);
    return li;
  }

  function renderEvents(data) {
    var list = $("#events");
    if (!list) return;
    var all = ((data && data.evenements) || []).filter(function (e) { return parseDate(e.date); });
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var upcoming = all.filter(function (e) { return parseDate(e.date) >= today; })
      .sort(function (a, b) { return parseDate(a.date) - parseDate(b.date); });
    var past = all.filter(function (e) { return parseDate(e.date) < today; })
      .sort(function (a, b) { return parseDate(b.date) - parseDate(a.date); });

    list.textContent = "";
    if (!upcoming.length) list.appendChild(el("li", "events__empty", "Le prochain événement sera annoncé ici très bientôt."));
    upcoming.forEach(function (e) { list.appendChild(eventCard(e)); });

    var details = $("#past");
    if (details && past.length) {
      var pl = $("#events-past");
      pl.textContent = "";
      past.forEach(function (e) { pl.appendChild(eventCard(e)); });
      $("#past-count").textContent = "(" + past.length + ")";
      details.hidden = false;
    }
  }

  function renderTeam(data) {
    var list = $("#team");
    if (!list) return;
    list.textContent = "";
    ((data && data.membres) || []).forEach(function (m) {
      var li = el("li", "member");
      var pic = el("div", "member__pic");
      if (m.photo) {
        var img = el("img", "grayscale");
        img.src = m.photo; img.alt = m.nom || ""; img.loading = "lazy";
        pic.appendChild(img);
      } else {
        pic.appendChild(el("span", "member__initials", initials(m.nom)));
      }
      li.appendChild(pic);
      var txt = el("div", "member__txt");
      txt.appendChild(el("p", "member__n", m.nom));
      txt.appendChild(el("p", "label member__r", [m.role, m.promo].filter(Boolean).join(" · ")));
      li.appendChild(txt);
      list.appendChild(li);
    });
  }

  /* ---------- Interface ---------- */

  function scrollToHash(hash) {
    var target = hash === "#accueil" ? 0 : document.querySelector(hash);
    if (target === null) return false;
    if (lenis) lenis.scrollTo(target, { offset: -90, duration: 1.6, easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); } });
    else if (target === 0) window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    return true;
  }

  function setupHeader() {
    var top = $("#top"), nav = $("#nav"), btn = $("#menu-btn");
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      if (!nav.classList.contains("is-open")) {
        if (y > 600 && y > lastY + 4) top.classList.add("is-hidden");
        if (y < lastY - 4 || y < 600) top.classList.remove("is-hidden");
      }
      lastY = y;
    }, { passive: true });

    function setMenu(open) {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      if (lenis) { if (open) lenis.stop(); else lenis.start(); }
      if (open && animate) gsap.fromTo($all("a", nav), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.9, ease: "expo.out", delay: 0.25 });
    }
    btn.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

    $all('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var hash = a.getAttribute("href");
        if (hash.length < 2) return;
        if (nav.classList.contains("is-open")) setMenu(false);
        if (scrollToHash(hash)) e.preventDefault();
      });
    });

    if ("IntersectionObserver" in window) {
      var links = $all("a", nav);
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          links.forEach(function (l) { l.classList.toggle("is-active", l.getAttribute("href") === "#" + en.target.id); });
        });
      }, { rootMargin: "-45% 0px -50% 0px" });
      $all("section[id]").forEach(function (s) { io.observe(s); });
    }
  }

  function setupCopy() {
    var btn = $("#copy-btn"), text = $("#email");
    if (!btn || !text) return;
    btn.addEventListener("click", function () {
      var value = text.textContent.trim();
      function done(label) { btn.textContent = label; setTimeout(function () { btn.textContent = "Copier"; }, 1800); }
      function selectText() {
        var range = document.createRange(); range.selectNodeContents(text);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        done("Sélectionné");
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () { done("Copié"); }, selectText);
      } else { selectText(); }
    });
  }

  /* ---------- Découpage du texte pour l'animer ---------- */

  // Mots, en conservant le mot en Times et les espaces d'origine
  function tokenize(node) {
    var tokens = [], space = false;
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      var acc = isAccent(child);
      child.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { space = true; return; }
        tokens.push({ w: part, accent: acc, space: space && tokens.length > 0 });
        space = false;
      });
    });
    return tokens;
  }

  function splitWords(node) {
    var tokens = tokenize(node);
    node.textContent = "";
    return tokens.map(function (t) {
      var span = el("span", "w");
      if (t.accent) span.appendChild(accent(t.w)); else span.textContent = t.w;
      if (t.space) node.appendChild(document.createTextNode(" "));
      node.appendChild(span);
      return span;
    });
  }

  // Regroupe les mots par ligne affichée, pour faire monter chaque ligne depuis un masque
  function splitLines(node) {
    var words = splitWords(node);
    words.forEach(function (w) { w._space = !!(w.previousSibling && w.previousSibling.nodeType === 3); });
    var lines = [], current = [], lastTop = null;
    words.forEach(function (w) {
      var t = w.offsetTop;
      if (lastTop !== null && Math.abs(t - lastTop) > 4) { lines.push(current); current = []; }
      current.push(w); lastTop = t;
    });
    if (current.length) lines.push(current);
    node.textContent = "";
    return lines.map(function (ws) {
      var outer = el("span", "sl"), inner = el("span");
      ws.forEach(function (w, i) { if (i > 0 && w._space) inner.appendChild(document.createTextNode(" ")); inner.appendChild(w); });
      outer.appendChild(inner);
      node.appendChild(outer);
      return inner;
    });
  }

  function splitChars(node) {
    var tokens = tokenize(node);
    node.textContent = "";
    var chars = [];
    var word = null;
    tokens.forEach(function (t) {
      // Sans espace (« l'» + « association »), on reste dans le même mot : pas de retour à la ligne entre les deux
      if (!word || t.space) {
        if (word && t.space) node.appendChild(document.createTextNode(" "));
        word = el("span", "word");
        node.appendChild(word);
      }
      var holder = t.accent ? accent("") : word;
      Array.from(t.w).forEach(function (c) { var s = el("span", "ch", c); holder.appendChild(s); chars.push(s); });
      if (t.accent) word.appendChild(holder);
    });
    return chars;
  }

  /* ---------- Animations ---------- */

  function smoothScroll() {
    if (typeof window.Lenis === "undefined") return;
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function loaderThenIntro() {
    var showLoader = root.classList.contains("is-loading");
    var tl = gsap.timeline();
    if (showLoader) {
      if (lenis) lenis.stop();
      var counter = { v: 0 }, out = $("#loader-n");
      tl.from(".loader__logo", { opacity: 0, y: 24, duration: 0.9, ease: "expo.out" }, 0)
        .to(counter, { v: 100, duration: 1.3, ease: "power3.inOut", onUpdate: function () { out.textContent = String(Math.round(counter.v)).padStart(2, "0"); } }, 0)
        .to(".loader__in", { yPercent: -30, opacity: 0, duration: 0.6, ease: "power3.in" }, 1.35)
        .to("#loader", { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, 1.45)
        .add(function () {
          root.classList.remove("is-loading");
          storage(function (s) { s.setItem("ilf-intro", "1"); });
          if (lenis) lenis.start();
        });
    }
    var t0 = showLoader ? 1.85 : 0.1;
    tl.from(".hero__title .line__in", { yPercent: 115, duration: 1.4, ease: "expo.out", stagger: 0.12 }, t0)
      .from(".hero__kicker", { y: 16, opacity: 0, duration: 1, ease: "expo.out" }, t0 + 0.1)
      .from(".hero__side > *", { y: 30, opacity: 0, stagger: 0.12, duration: 1.2, ease: "expo.out" }, t0 + 0.4)
      .from("#hero-frame", { clipPath: "inset(100% 0% 0% 0%)", duration: 1.6, ease: "expo.inOut" }, t0 + 0.2)
      .from("#hero-img", { scale: 1.35, duration: 2.4, ease: "expo.out" }, t0 + 0.4)
      .from(".hero__caption > *", { y: 12, opacity: 0, stagger: 0.1, duration: 1, ease: "expo.out" }, t0 + 1.2)
      .from(".top__in > *", { y: -20, opacity: 0, stagger: 0.07, duration: 1, ease: "expo.out" }, t0 + 0.3);
    return t0 + 2.2;
  }

  // Le mot en Times du titre change régulièrement : un seul mot accentué à la fois, comme le veut la charte
  function rotator(delay) {
    var box = $("#rotator");
    if (!box || accentWords.length < 2) return;
    var i = 0;
    function next() {
      var cur = box.querySelector(".rotator__w");
      i = (i + 1) % accentWords.length;
      var nxt = rotWord(accentWords[i]);
      box.appendChild(nxt);
      var from = box.offsetWidth;
      var to = nxt.offsetWidth;
      gsap.timeline({ onComplete: function () { cur.remove(); nxt.style.position = ""; box.style.width = ""; } })
        .set(box, { width: from })
        .to(cur, { yPercent: -110, duration: 0.8, ease: "expo.inOut" }, 0)
        .fromTo(nxt, { yPercent: 110 }, { yPercent: 0, duration: 0.8, ease: "expo.inOut" }, 0)
        .to(box, { width: to, duration: 0.8, ease: "expo.inOut" }, 0);
      var o = $("#outro-word"); if (o) o.textContent = accentWords[i];
      var title = $("#hero-title");
      if (title) title.setAttribute("aria-label", title.getAttribute("aria-label").replace(/\S+\.$/, accentWords[i] + "."));
    }
    gsap.delayedCall(delay, function loop() { next(); gsap.delayedCall(2.8, loop); });
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
      var t = e.target.closest("[data-cursor], a, button, summary, .act, .member");
      var text = t && t.getAttribute("data-cursor");
      c.classList.toggle("is-hover", !!t && !text);
      c.classList.toggle("is-label", !!text);
      c.classList.toggle("is-invert", !!e.target.closest(".join, .marquee, .act:hover"));
      if (text) label.textContent = text;
    });
  }

  function progressBar() {
    gsap.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
  }

  // L'illustration se dégage du cadre et glisse lentement au défilement
  function heroMedia() {
    gsap.to("#hero-img", { yPercent: 12, ease: "none", scrollTrigger: { trigger: "#hero-media", start: "top bottom", end: "bottom top", scrub: true } });
    gsap.fromTo("#hero-frame", { clipPath: "inset(0% 6% 0% 6%)" }, {
      clipPath: "inset(0% 0% 0% 0%)", ease: "none", immediateRender: false,
      scrollTrigger: { trigger: "#hero-media", start: "top 85%", end: "top 15%", scrub: 0.6 }
    });
    gsap.to(".hero__title", { yPercent: -18, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }

  function manifesto() {
    var node = $("[data-split]");
    if (!node) return;
    var words = splitWords(node);
    gsap.fromTo(words, { opacity: 0.16 }, {
      opacity: 1, stagger: 0.08, ease: "none",
      scrollTrigger: { trigger: node, start: "top 80%", end: "bottom 45%", scrub: 0.6 }
    });
  }

  function marquee() {
    var track = $("#marquee");
    if (!track || !track.children.length) return;
    var loop = gsap.to(track, { xPercent: -50, duration: 40, ease: "none", repeat: -1 });
    var skewTo = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3.out" });
    var dir = 1;
    ScrollTrigger.create({
      onUpdate: function (self) {
        dir = self.direction;
        var raw = self.getVelocity();
        var v = Math.min(Math.abs(raw) / 300, 6);
        gsap.to(loop, { timeScale: dir * (1 + v), duration: 0.25, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.4, delay: 0.25 });
        skewTo(gsap.utils.clamp(-10, 10, raw / -160));
        clearTimeout(track._s); track._s = setTimeout(function () { skewTo(0); }, 120);
      }
    });
  }

  function headings() {
    $all(".split-lines").forEach(function (h) {
      var lines = splitLines(h);
      gsap.from(lines, { yPercent: 115, duration: 1.3, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
    });
    $all(".section__head .label, .join__body > .label").forEach(function (node) {
      gsap.from(node, { y: 14, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: node, start: "top 92%", once: true } });
    });
    // Filets de section : ils se tracent de gauche à droite
    $all(".section, .outro").forEach(function (s) {
      var line = el("span");
      line.setAttribute("aria-hidden", "true");
      line.style.cssText = "position:absolute;left:0;right:0;top:-2px;height:2px;background:#0B3C71;transform-origin:left;transform:scaleX(0);pointer-events:none";
      s.style.position = "relative";
      s.appendChild(line);
      gsap.to(line, { scaleX: 1, duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: s, start: "top 85%", once: true } });
      gsap.to(line, { opacity: 0, duration: 0.8, delay: 1.4, scrollTrigger: { trigger: s, start: "top 85%", once: true } });
    });
    $all(".reveal").forEach(function (node) {
      gsap.from(node, { y: 40, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: node, start: "top 88%", once: true } });
    });
  }

  function activities() {
    var acts = $all(".act");
    acts.forEach(function (a) {
      a.addEventListener("pointermove", function (e) {
        var r = a.getBoundingClientRect();
        a.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        a.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    });
    var count = $("#acts-count");
    var mm = gsap.matchMedia();
    mm.add("(min-width: 900px)", function () {
      var track = $("#acts");
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: {
          trigger: "#acts-pin", start: "top top", end: function () { return "+=" + dist(); },
          pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
          onUpdate: function (self) {
            if (!count || !acts.length) return;
            var n = Math.min(acts.length, Math.floor(self.progress * acts.length) + 1);
            count.textContent = String(n).padStart(2, "0") + " / " + String(acts.length).padStart(2, "0");
          }
        }
      });
      gsap.to("#acts-bar", { scaleX: 1, ease: "none", scrollTrigger: { trigger: "#acts-pin", start: "top top", end: function () { return "+=" + dist(); }, scrub: 1 } });
      acts.forEach(function (a) {
        gsap.from(a.querySelector(".act__big"), { xPercent: -40, ease: "none", scrollTrigger: { trigger: a, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
      });
      gsap.from(acts, { y: 80, opacity: 0, stagger: 0.08, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: "#acts", start: "top 90%", once: true } });
    });
    mm.add("(max-width: 899px)", function () {
      acts.forEach(function (a) { gsap.from(a, { y: 50, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: a, start: "top 92%", once: true } }); });
    });
  }

  function agenda() {
    $all(".events").forEach(function (list) {
      var cells = $all(".events > li", list);
      gsap.from(cells, { clipPath: "inset(0% 0% 100% 0%)", stagger: 0.1, duration: 1.1, ease: "expo.inOut", scrollTrigger: { trigger: list, start: "top 85%", once: true } });
      gsap.from($all(".ev__day", list), { yPercent: 60, opacity: 0, stagger: 0.1, duration: 1.2, ease: "expo.out", delay: 0.4, scrollTrigger: { trigger: list, start: "top 85%", once: true } });
    });
  }

  function team() {
    var t = $("#team");
    if (!t) return;
    gsap.from($all(".member__pic", t), { clipPath: "inset(100% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut", stagger: 0.1, scrollTrigger: { trigger: t, start: "top 85%", once: true } });
    gsap.from($all(".member__pic > *", t), { scale: 1.3, duration: 1.8, ease: "expo.out", stagger: 0.1, delay: 0.3, scrollTrigger: { trigger: t, start: "top 85%", once: true } });
    gsap.from($all(".member__txt", t), { y: 20, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.1, delay: 0.6, scrollTrigger: { trigger: t, start: "top 85%", once: true } });
    if (!finePointer) return;
    $all(".member", t).forEach(function (m) {
      var pic = m.querySelector(".member__pic");
      var rx = gsap.quickTo(pic, "rotationX", { duration: 0.6, ease: "power3.out" });
      var ry = gsap.quickTo(pic, "rotationY", { duration: 0.6, ease: "power3.out" });
      m.addEventListener("pointermove", function (e) {
        var r = pic.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 12);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 12);
      });
      m.addEventListener("pointerleave", function () { rx(0); ry(0); });
    });
  }

  function join() {
    gsap.fromTo("#join-bg", { clipPath: "inset(0% 0% 100% 0%)" }, {
      clipPath: "inset(0% 0% 0% 0%)", ease: "none",
      scrollTrigger: { trigger: ".join", start: "top bottom", end: "top 30%", scrub: 0.6 }
    });
    var title = $("[data-split-chars]");
    if (title) {
      var chars = splitChars(title);
      gsap.from(chars, {
        yPercent: 100, opacity: 0, rotateX: -90, transformOrigin: "50% 100%",
        stagger: 0.022, duration: 1.2, ease: "expo.out",
        scrollTrigger: { trigger: title, start: "top 75%", once: true }
      });
    }
    gsap.from(".join__text, .join__row", { y: 30, opacity: 0, stagger: 0.12, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".join__body", start: "top 55%", once: true } });
    gsap.from(".join__seal img", { opacity: 0, y: 40, duration: 1.4, ease: "expo.out", scrollTrigger: { trigger: ".join", start: "top 50%", once: true } });
  }

  function magnetic() {
    if (!finePointer) return;
    $all(".magnetic").forEach(function (btn) {
      var xTo = gsap.quickTo(btn, "x", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
      var yTo = gsap.quickTo(btn, "y", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.18);
        yTo((e.clientY - r.top - r.height / 2) * 0.35);
      });
      btn.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
    });
  }

  function pageTransitions() {
    $all(".js-transition").forEach(function (a) {
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        gsap.fromTo("#curtain", { yPercent: 100 }, { yPercent: 0, duration: 0.8, ease: "expo.inOut", onComplete: function () { window.location.href = a.href; } });
      });
    });
    window.addEventListener("pageshow", function () { gsap.set("#curtain", { yPercent: 100 }); });
  }

  /* ---------- Démarrage ---------- */

  if (!animate) root.classList.remove("is-loading");
  if (animate) smoothScroll();
  var introEnd = animate ? loaderThenIntro() : 0;
  setupHeader();
  setupCopy();

  Promise.all([load("site"), load("activites"), load("evenements"), load("bureau")]).then(function (res) {
    bindSite(res[0]);
    renderActivities(res[1]);
    renderEvents(res[2]);
    renderTeam(res[3]);

    if (!animate) return;
    var start = function () {
      rotator(introEnd);
      cursor();
      progressBar();
      heroMedia();
      manifesto();
      marquee();
      headings();
      activities();
      agenda();
      team();
      join();
      magnetic();
      pageTransitions();
      ScrollTrigger.refresh();
    };
    // Les découpages par ligne ont besoin des polices chargées
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
  });
})();
