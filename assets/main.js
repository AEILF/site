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

  function load(name) {
    return fetch("content/" + name + ".json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error(name); return r.json(); })
      .catch(function () { return null; });
  }

  // Dans l'admin, un passage entre astérisques (*comme ceci*) s'affiche en Times New Roman italique
  function setRich(node, str) {
    node.textContent = "";
    String(str).split(/\*([^*]+)\*/).forEach(function (part, i) {
      if (!part) return;
      node.appendChild(i % 2 ? el("em", null, part) : document.createTextNode(part));
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

  /* ---------- Rendu du contenu ---------- */

  function bindSite(site) {
    if (!site) return;
    $all("[data-bind]").forEach(function (node) {
      var v = site[node.getAttribute("data-bind")];
      if (typeof v !== "string" || v.trim() === "") return;
      if (node.hasAttribute("data-rich")) setRich(node, v); else node.textContent = v.replace(/\*/g, "");
    });
    var title = $("#hero-title");
    if (title) title.setAttribute("aria-label", [site.titreLigne1, site.titreLigne2, site.titreLigne3].filter(Boolean).join(" ").replace(/\*/g, ""));
    if (site.sigle) document.title = site.sigle + " · Aix-en-Provence";
    if (site.adhesionLien) { var join = $("#join-link"); if (join) join.href = site.adhesionLien; }

    var socials = $("#socials");
    if (socials) {
      socials.textContent = "";
      [["Instagram", site.instagram], ["LinkedIn", site.linkedin]].forEach(function (s) {
        if (!s[1]) return;
        var a = el("a", "link-u", s[0]);
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
        var group = el("div", "marquee__group");
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
    ((data && data.activites) || []).forEach(function (a, i) {
      var li = el("li", "act");
      li.appendChild(el("span", "act__n", "2-" + (i + 1)));
      li.appendChild(el("h3", "act__t", a.titre));
      li.appendChild(el("p", "act__d", a.texte));
      list.appendChild(li);
    });
  }

  function eventRow(ev) {
    var d = parseDate(ev.date);
    var hasLink = ev.lien && String(ev.lien).trim() !== "";
    var row = el(hasLink ? "a" : "div", "ev" + (hasLink ? "" : " ev--nolink"));
    if (hasLink) { row.href = ev.lien; row.target = "_blank"; row.rel = "noopener"; row.setAttribute("data-cursor", "Ouvrir"); }

    var date = el("div", "ev__date");
    date.appendChild(el("span", "ev__day", d ? String(d.getDate()).padStart(2, "0") : "—"));
    date.appendChild(el("span", "ev__month", d ? d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : ""));
    row.appendChild(date);

    var main = el("div", "ev__main");
    var meta = el("div", "ev__meta");
    if (ev.categorie) meta.appendChild(el("span", "tag", ev.categorie));
    if (ev.exemple) meta.appendChild(el("span", "tag tag--ex", "Exemple"));
    var when = [];
    if (d) when.push(d.toLocaleDateString("fr-FR", { weekday: "long" }));
    if (ev.heure) when.push(ev.heure.replace(":", " h "));
    if (ev.lieu) when.push(ev.lieu);
    if (when.length) meta.appendChild(el("span", null, when.join(" · ")));
    main.appendChild(meta);
    main.appendChild(el("h3", "ev__t", ev.titre));
    if (ev.description) main.appendChild(el("p", "ev__d", ev.description));
    row.appendChild(main);

    row.appendChild(el("span", "ev__go", "→"));
    var li = el("li");
    li.appendChild(row);
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
    upcoming.forEach(function (e) { list.appendChild(eventRow(e)); });

    var details = $("#past");
    if (details && past.length) {
      var pl = $("#events-past");
      pl.textContent = "";
      past.forEach(function (e) { pl.appendChild(eventRow(e)); });
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
        var img = el("img");
        img.src = m.photo; img.alt = m.nom || ""; img.loading = "lazy";
        pic.appendChild(img);
      } else {
        pic.appendChild(el("span", "member__initials", initials(m.nom)));
      }
      li.appendChild(pic);
      var txt = el("div", "member__txt");
      txt.appendChild(el("p", "member__n", m.nom));
      txt.appendChild(el("p", "member__r", [m.role, m.promo].filter(Boolean).join(" · ")));
      li.appendChild(txt);
      list.appendChild(li);
    });
  }

  /* ---------- Interface ---------- */

  function scrollToHash(hash) {
    var target = hash === "#accueil" ? 0 : document.querySelector(hash);
    if (target === null) return false;
    if (lenis) lenis.scrollTo(target, { offset: -70, duration: 1.6, easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); } });
    else if (target === 0) window.scrollTo({ top: 0, behavior: "smooth" });
    else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    return true;
  }

  function setupHeader() {
    var top = $("#top"), nav = $("#nav"), btn = $("#menu-btn");
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      top.classList.toggle("is-scrolled", y > 20);
      if (!nav.classList.contains("is-open")) {
        if (y > 500 && y > lastY + 4) top.classList.add("is-hidden");
        if (y < lastY - 4 || y < 500) top.classList.remove("is-hidden");
      }
      lastY = y;
    }, { passive: true });

    function setMenu(open) {
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      if (lenis) open ? lenis.stop() : lenis.start();
      if (open && animate) gsap.fromTo($all("a", nav), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, stagger: 0.06, duration: 0.9, ease: "expo.out", delay: 0.25 });
    }
    btn.addEventListener("click", function () { setMenu(!nav.classList.contains("is-open")); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") setMenu(false); });

    // Liens internes : défilement fluide
    $all('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) {
        var hash = a.getAttribute("href");
        if (hash.length < 2) return;
        if (nav.classList.contains("is-open")) setMenu(false);
        if (scrollToHash(hash)) e.preventDefault();
      });
    });

    // Lien actif selon la section visible
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

  // Découpe en mots en conservant l'italique Times (<em>)
  // (les espaces d'origine sont respectés : pas d'espace ajouté avant une virgule qui suit un mot en italique)
  function tokenize(node) {
    var tokens = [], space = false;
    Array.prototype.slice.call(node.childNodes).forEach(function (child) {
      var isEm = child.nodeName === "EM";
      child.textContent.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { space = true; return; }
        tokens.push({ w: part, em: isEm, space: space && tokens.length > 0 });
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
      if (t.em) span.appendChild(el("em", null, t.w)); else span.textContent = t.w;
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

  function splitChars(node, cls) {
    var tokens = tokenize(node);
    node.textContent = "";
    var chars = [];
    tokens.forEach(function (t) {
      var word = el("span", cls === "pc" ? "ch-wrap" : "word");
      var holder = t.em ? el("em") : word;
      Array.from(t.w).forEach(function (c) { var s = el("span", cls, c); holder.appendChild(s); chars.push(s); });
      if (t.em) word.appendChild(holder);
      if (t.space) node.appendChild(document.createTextNode(" "));
      node.appendChild(word);
    });
    return chars;
  }

  /* ---------- Animations ---------- */

  function smoothScroll() {
    if (typeof window.Lenis === "undefined") return;
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  function loaderThenIntro() {
    var loader = $("#loader");
    var showLoader = root.classList.contains("is-loading");
    var tl = gsap.timeline();
    if (showLoader) {
      if (lenis) lenis.stop();
      var counter = { v: 0 }, out = $("#loader-n");
      tl.from(".loader__word", { yPercent: 110, duration: 0.9, ease: "expo.out" }, 0)
        .to(counter, { v: 100, duration: 1.3, ease: "power3.inOut", onUpdate: function () { out.textContent = String(Math.round(counter.v)).padStart(2, "0"); } }, 0)
        .to(".loader__in", { yPercent: -30, opacity: 0, duration: 0.6, ease: "power3.in" }, 1.35)
        .to(loader, { clipPath: "inset(0 0 100% 0)", duration: 1.1, ease: "expo.inOut" }, 1.45)
        .add(function () {
          root.classList.remove("is-loading");
          storage(function (s) { s.setItem("ilf-intro", "1"); });
          if (lenis) lenis.start();
        });
    }
    var t0 = showLoader ? 1.85 : 0.1;
    tl.from(".hero__title .line__in", { yPercent: 120, rotate: 3, duration: 1.4, ease: "expo.out", stagger: 0.12 }, t0)
      .from(".hero__eyebrow", { y: 16, opacity: 0, duration: 1, ease: "expo.out" }, t0 + 0.1)
      .from(".hero__rule", { scaleX: 0, duration: 1.6, ease: "expo.inOut" }, t0 + 0.2)
      .from(".hero__aside > *", { y: 30, opacity: 0, stagger: 0.1, duration: 1.2, ease: "expo.out" }, t0 + 0.45)
      .from(".toc li", { y: 20, opacity: 0, stagger: 0.06, duration: 1, ease: "expo.out" }, t0 + 0.6)
      .from(".seal", { scale: 0.5, rotate: -140, opacity: 0, duration: 1.8, ease: "expo.out" }, t0 + 0.3)
      .from(".top__in > *", { y: -24, opacity: 0, stagger: 0.07, duration: 1, ease: "expo.out" }, t0 + 0.4);
    return t0 + 1.6;
  }

  // Le titre réagit : survolées, les lettres basculent en Times New Roman italique
  function playfulTitle(delay) {
    var chars = [];
    $all("#hero-title [data-play]").forEach(function (line) { chars = chars.concat(splitChars(line, "pc")); });
    if (!chars.length) return;
    function flip(c, ms) {
      c.classList.add("is-serif");
      clearTimeout(c._t);
      c._t = setTimeout(function () { c.classList.remove("is-serif"); }, ms);
    }
    if (finePointer) chars.forEach(function (c) { c.addEventListener("pointerenter", function () { flip(c, 1100); }); });
    // Démonstration discrète après l'ouverture, pour suggérer l'interaction
    gsap.delayedCall(delay, function () {
      var picks = gsap.utils.shuffle(chars.filter(function (c) { return c.textContent.trim(); })).slice(0, 4);
      picks.forEach(function (c, i) { gsap.delayedCall(i * 0.22, function () { flip(c, 900); }); });
    });
  }

  function cursor() {
    if (!finePointer) return;
    var c = $("#cursor"), label = $("#cursor-label");
    root.classList.add("has-cursor");
    var xTo = gsap.quickTo(c, "x", { duration: 0.5, ease: "power3.out" });
    var yTo = gsap.quickTo(c, "y", { duration: 0.5, ease: "power3.out" });
    window.addEventListener("pointermove", function (e) { c.classList.add("is-on"); xTo(e.clientX); yTo(e.clientY); }, { passive: true });
    document.addEventListener("pointerleave", function () { c.classList.remove("is-on"); });
    document.addEventListener("pointerover", function (e) {
      var t = e.target.closest ? e.target.closest("[data-cursor], a, button, summary, .act, .member") : null;
      var text = t && t.getAttribute("data-cursor");
      c.classList.toggle("is-hover", !!t && !text);
      c.classList.toggle("is-label", !!text);
      if (text) label.textContent = text;
    });
  }

  function progressBar() {
    gsap.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
  }

  function seal() {
    var ring = $(".seal__ring");
    if (!ring) return;
    var spin = gsap.to(ring, { rotate: 360, duration: 26, ease: "none", repeat: -1, svgOrigin: "100 100" });
    ScrollTrigger.create({
      onUpdate: function (self) {
        var v = Math.min(Math.abs(self.getVelocity()) / 400, 8);
        gsap.to(spin, { timeScale: 1 + v, duration: 0.2, overwrite: true });
        gsap.to(spin, { timeScale: 1, duration: 1.2, delay: 0.2 });
      }
    });
  }

  function heroParallax() {
    gsap.utils.toArray(".hero__title .line").forEach(function (line, i) {
      gsap.to(line, { xPercent: [5, -7, 9][i % 3], ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
    });
    gsap.to(".hero__aside, .toc", { yPercent: -18, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });
  }

  function manifesto() {
    var node = $("[data-split]");
    if (!node) return;
    var words = splitWords(node);
    gsap.fromTo(words, { opacity: 0.14 }, {
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
        skewTo(gsap.utils.clamp(-12, 12, raw / -150));
        clearTimeout(track._s); track._s = setTimeout(function () { skewTo(0); }, 120);
      }
    });
  }

  function headings() {
    $all(".split-lines").forEach(function (h) {
      var lines = splitLines(h);
      gsap.from(lines, { yPercent: 115, rotate: 2, duration: 1.3, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: h, start: "top 88%", once: true } });
    });
    $all(".art-label").forEach(function (node) {
      gsap.from(node, { y: 16, opacity: 0, stagger: 0.08, duration: 1, ease: "expo.out", scrollTrigger: { trigger: node, start: "top 90%", once: true } });
    });
    $all(".reveal").forEach(function (node) {
      gsap.from(node, { y: 50, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: node, start: "top 88%", once: true } });
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
    var mm = gsap.matchMedia();
    // Grand écran : la section se fige et les cartes défilent horizontalement
    mm.add("(min-width: 900px)", function () {
      var track = $("#acts");
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var tween = gsap.to(track, {
        x: function () { return -dist(); }, ease: "none",
        scrollTrigger: { trigger: "#acts-pin", start: "top top", end: function () { return "+=" + dist(); }, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      gsap.to("#acts-bar", { scaleX: 1, ease: "none", scrollTrigger: { trigger: "#acts-pin", start: "top top", end: function () { return "+=" + dist(); }, scrub: 1 } });
      acts.forEach(function (a) {
        gsap.from(a.querySelector(".act__n"), { xPercent: -60, ease: "none", scrollTrigger: { trigger: a, containerAnimation: tween, start: "left right", end: "right left", scrub: true } });
        gsap.from(a, { rotate: 2.5, yPercent: 6, ease: "none", scrollTrigger: { trigger: a, containerAnimation: tween, start: "left right", end: "center center", scrub: true } });
      });
      gsap.from(acts, { y: 80, opacity: 0, stagger: 0.08, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: "#acts", start: "top 90%", once: true } });
    });
    mm.add("(max-width: 899px)", function () {
      acts.forEach(function (a) { gsap.from(a, { y: 60, opacity: 0, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: a, start: "top 90%", once: true } }); });
    });
  }

  function agenda() {
    $all(".events").forEach(function (list) {
      var rows = $all(".ev, .events__empty", list);
      gsap.from(rows, { y: 40, opacity: 0, stagger: 0.1, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: list, start: "top 85%", once: true } });
      gsap.from($all(".ev__day", list), { yPercent: 50, opacity: 0, stagger: 0.1, duration: 1.3, ease: "expo.out", delay: 0.1, scrollTrigger: { trigger: list, start: "top 85%", once: true } });
    });
  }

  function team() {
    var t = $("#team");
    if (!t) return;
    gsap.from($all(".member__pic", t), { clipPath: "inset(100% 0% 0% 0%)", duration: 1.5, ease: "expo.inOut", stagger: 0.1, scrollTrigger: { trigger: t, start: "top 85%", once: true } });
    gsap.from($all(".member__pic > *", t), { scale: 1.4, duration: 1.8, ease: "expo.out", stagger: 0.1, delay: 0.3, scrollTrigger: { trigger: t, start: "top 85%", once: true } });
    gsap.from($all(".member__txt", t), { y: 20, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.1, delay: 0.6, scrollTrigger: { trigger: t, start: "top 85%", once: true } });
    if (!finePointer) return;
    $all(".member", t).forEach(function (m) {
      var pic = m.querySelector(".member__pic");
      var rx = gsap.quickTo(pic, "rotationX", { duration: 0.6, ease: "power3.out" });
      var ry = gsap.quickTo(pic, "rotationY", { duration: 0.6, ease: "power3.out" });
      m.addEventListener("pointermove", function (e) {
        var r = pic.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 14);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 14);
      });
      m.addEventListener("pointerleave", function () { rx(0); ry(0); });
    });
  }

  function join() {
    gsap.fromTo("#join-bg", { clipPath: "circle(8% at 50% 100%)" }, {
      clipPath: "circle(142% at 50% 100%)", ease: "none",
      scrollTrigger: { trigger: ".join", start: "top bottom", end: "top 25%", scrub: 0.6 }
    });
    var title = $("[data-split-chars]");
    if (title) {
      var chars = splitChars(title, "ch");
      gsap.from(chars, {
        yPercent: 100, opacity: 0, rotateX: -90, transformOrigin: "50% 100%",
        stagger: 0.022, duration: 1.2, ease: "expo.out",
        scrollTrigger: { trigger: title, start: "top 75%", once: true }
      });
    }
    gsap.from(".join__text, .join__row", { y: 30, opacity: 0, stagger: 0.12, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".join__body", start: "top 55%", once: true } });
  }

  function footer() {
    gsap.from("#giant", { yPercent: 70, scaleY: 0.5, ease: "none", scrollTrigger: { trigger: ".foot__giant", start: "top bottom", end: "bottom bottom", scrub: 0.6 } });
  }

  function magnetic() {
    if (!finePointer) return;
    $all(".magnetic").forEach(function (btn) {
      var inner = btn.querySelector("span");
      var xTo = gsap.quickTo(btn, "x", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
      var yTo = gsap.quickTo(btn, "y", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
      var ixTo = inner && gsap.quickTo(inner, "x", { duration: 0.8, ease: "elastic.out(1, 0.35)" });
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
        xTo(dx * 0.3); yTo(dy * 0.45);
        if (ixTo) ixTo(dx * 0.12);
      });
      btn.addEventListener("pointerleave", function () { xTo(0); yTo(0); if (ixTo) ixTo(0); });
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
    // Retour arrière depuis le cache du navigateur : on relève le rideau
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
      playfulTitle(introEnd);
      cursor();
      progressBar();
      seal();
      heroParallax();
      manifesto();
      marquee();
      headings();
      activities();
      agenda();
      team();
      join();
      footer();
      magnetic();
      pageTransitions();
      ScrollTrigger.refresh();
    };
    // Les découpages par ligne ont besoin des polices chargées
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
  });
})();
