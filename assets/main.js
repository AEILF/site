/* Site de l'association : lit le contenu dans /content/*.json (modifiable depuis l'admin),
   remplit la page, puis lance les animations. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";
  var animate = hasGsap && !reduceMotion;
  if (hasGsap) gsap.registerPlugin(ScrollTrigger);

  /* ---------- Utilitaires ---------- */

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

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

  /* ---------- Rendu du contenu ---------- */

  function bindSite(site) {
    if (!site) return;
    $all("[data-bind]").forEach(function (node) {
      var key = node.getAttribute("data-bind");
      if (typeof site[key] === "string" && site[key].trim() !== "") node.textContent = site[key];
    });
    var title = $(".hero__title");
    if (title) title.setAttribute("aria-label", [site.titreLigne1, site.titreLigne2, site.titreLigne3].filter(Boolean).join(" "));
    if (site.sigle) document.title = site.sigle + " · Aix-en-Provence";

    if (site.adhesionLien) {
      var join = $("#join-link");
      if (join) join.href = site.adhesionLien;
    }

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
    var items = (data && data.activites) || [];
    list.textContent = "";
    items.forEach(function (a, i) {
      var li = el("li", "act");
      li.appendChild(el("span", "act__n", "Art. 2-" + (i + 1)));
      li.appendChild(el("h3", "act__t", a.titre));
      li.appendChild(el("p", "act__d", a.texte));
      list.appendChild(li);
    });
  }

  function eventRow(ev) {
    var d = parseDate(ev.date);
    var hasLink = ev.lien && String(ev.lien).trim() !== "";
    var row = el(hasLink ? "a" : "div", "ev" + (hasLink ? "" : " ev--nolink"));
    if (hasLink) { row.href = ev.lien; row.target = "_blank"; row.rel = "noopener"; }

    var date = el("div", "ev__date");
    date.appendChild(el("span", "ev__day", d ? String(d.getDate()).padStart(2, "0") : "—"));
    date.appendChild(el("span", "ev__month", d ? d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" }) : ""));
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
    if (!upcoming.length) {
      list.appendChild(el("li", "events__empty", "Le prochain événement sera annoncé ici très bientôt."));
    } else {
      upcoming.forEach(function (e) { list.appendChild(eventRow(e)); });
    }

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
    var people = (data && data.membres) || [];
    list.textContent = "";
    people.forEach(function (m) {
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
      var txt = el("div");
      txt.appendChild(el("p", "member__n", m.nom));
      txt.appendChild(el("p", "member__r", [m.role, m.promo].filter(Boolean).join(" · ")));
      li.appendChild(txt);
      list.appendChild(li);
    });
  }

  /* ---------- Interface ---------- */

  function setupHeader() {
    var top = $("#top");
    var lastY = window.scrollY;
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      top.classList.toggle("is-scrolled", y > 20);
      var menuOpen = $("#nav").classList.contains("is-open");
      top.classList.toggle("is-hidden", !menuOpen && y > 400 && y > lastY + 4);
      if (y < lastY - 4) top.classList.remove("is-hidden");
      lastY = y;
    }, { passive: true });

    var btn = $("#menu-btn"), nav = $("#nav");
    function close() { nav.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); btn.setAttribute("aria-label", "Ouvrir le menu"); }
    btn.addEventListener("click", function () {
      var open = !nav.classList.contains("is-open");
      nav.classList.toggle("is-open", open);
      btn.setAttribute("aria-expanded", String(open));
      btn.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });
    $all("a", nav).forEach(function (a) { a.addEventListener("click", close); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

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

  /* ---------- Animations ---------- */

  function splitWords(node) {
    var words = node.textContent.trim().split(/\s+/);
    node.textContent = "";
    words.forEach(function (w, i) {
      node.appendChild(el("span", "w", w));
      if (i < words.length - 1) node.appendChild(document.createTextNode(" "));
    });
    return $all(".w", node);
  }

  function splitChars(node) {
    var words = node.textContent.trim().split(/\s+/);
    node.textContent = "";
    var chars = [];
    words.forEach(function (w, i) {
      var word = el("span", "word");
      Array.from(w).forEach(function (c) { var s = el("span", "ch", c); word.appendChild(s); chars.push(s); });
      node.appendChild(word);
      if (i < words.length - 1) node.appendChild(document.createTextNode(" "));
    });
    return chars;
  }

  function intro() {
    var tl = gsap.timeline({ defaults: { ease: "expo.out", duration: 1.3 } });
    tl.from(".hero__title .line__in", { yPercent: 115, rotate: 2, stagger: 0.12 }, 0.1)
      .from(".hero__eyebrow", { y: 16, opacity: 0, duration: 1 }, 0.2)
      .from(".hero__rule", { scaleX: 0, duration: 1.6, ease: "expo.inOut" }, 0.3)
      .from(".hero__aside > *", { y: 28, opacity: 0, stagger: 0.1, duration: 1.1 }, 0.55)
      .from(".toc li", { y: 18, opacity: 0, stagger: 0.06, duration: 0.9 }, 0.7)
      .from(".seal", { scale: 0.6, rotate: -120, opacity: 0, duration: 1.8 }, 0.4)
      .from(".top__in > *", { y: -20, opacity: 0, stagger: 0.06, duration: 1 }, 0.5);
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
      gsap.to(line, {
        xPercent: i % 2 ? -6 : 4,
        ease: "none",
        scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
      });
    });
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
    var loop = gsap.to(track, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
    var dir = 1;
    ScrollTrigger.create({
      onUpdate: function (self) {
        if (self.direction !== dir) { dir = self.direction; }
        var v = Math.min(Math.abs(self.getVelocity()) / 300, 6);
        gsap.to(loop, { timeScale: dir * (1 + v), duration: 0.25, overwrite: true });
        gsap.to(loop, { timeScale: dir, duration: 1.4, delay: 0.25 });
      }
    });
  }

  function reveals() {
    $all(".reveal").forEach(function (node) {
      gsap.from(node, { y: 50, opacity: 0, duration: 1.2, ease: "expo.out", scrollTrigger: { trigger: node, start: "top 88%", once: true } });
    });
    $all(".art-label").forEach(function (node) {
      gsap.from(node.children, { y: 14, opacity: 0, stagger: 0.08, duration: 1, ease: "expo.out", scrollTrigger: { trigger: node, start: "top 90%", once: true } });
    });
    [["#acts", ".act"], ["#events", ".ev, .events__empty"]].forEach(function (p) {
      var list = $(p[0]);
      if (!list) return;
      gsap.from($all(p[1], list), { y: 40, opacity: 0, stagger: 0.09, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: list, start: "top 85%", once: true } });
    });
    var team = $("#team");
    if (team) {
      gsap.from($all(".member__pic", team), {
        clipPath: "inset(100% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut", stagger: 0.1,
        scrollTrigger: { trigger: team, start: "top 85%", once: true }
      });
      gsap.from($all(".member > div:last-child", team), {
        y: 20, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.1, delay: 0.5,
        scrollTrigger: { trigger: team, start: "top 85%", once: true }
      });
    }
    var title = $("[data-split-chars]");
    if (title) {
      var chars = splitChars(title);
      gsap.from(chars, {
        yPercent: 100, opacity: 0, rotateX: -80, transformOrigin: "50% 100%",
        stagger: 0.025, duration: 1.1, ease: "expo.out",
        scrollTrigger: { trigger: title, start: "top 85%", once: true }
      });
    }
    var rows = $all(".join__text, .join__row");
    gsap.from(rows, { y: 30, opacity: 0, stagger: 0.12, duration: 1.1, ease: "expo.out", scrollTrigger: { trigger: ".join", start: "top 60%", once: true } });
  }

  function magnetic() {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    $all(".magnetic").forEach(function (btn) {
      var xTo = gsap.quickTo(btn, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      var yTo = gsap.quickTo(btn, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
      btn.addEventListener("pointermove", function (e) {
        var r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.3);
        yTo((e.clientY - r.top - r.height / 2) * 0.4);
      });
      btn.addEventListener("pointerleave", function () { xTo(0); yTo(0); });
    });
  }

  /* ---------- Démarrage ---------- */

  if (animate) intro();
  setupHeader();
  setupCopy();

  Promise.all([load("site"), load("activites"), load("evenements"), load("bureau")]).then(function (res) {
    bindSite(res[0]);
    renderActivities(res[1]);
    renderEvents(res[2]);
    renderTeam(res[3]);

    if (!animate) return;
    seal();
    heroParallax();
    manifesto();
    marquee();
    reveals();
    magnetic();
    ScrollTrigger.refresh();
  });
})();
