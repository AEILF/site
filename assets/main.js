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

  // Sigle de l'ouverture : une lettre par élément, pour animer chacune séparément
  function setSigle(text) {
    var box = $("#hero-sigle");
    if (!box) return [];
    box.textContent = "";
    return Array.from(String(text).trim()).map(function (c) {
      var ch = el("span", "ch"), inner = el("span", "ch__in", c);
      ch.appendChild(inner); box.appendChild(ch);
      return ch;
    });
  }

  function storage(fn) { try { return fn(window.sessionStorage); } catch (e) { return null; } }

  // Icônes Lucide (trait 2 px, extrémités carrées), tracés repris de la charte
  var ICONS = {
    calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z",
    pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0ZM12 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6",
    mail: "M3 5h18v14H3zM3 5l9 8 9-8"
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
    // L'admin est la référence : un champ vidé (Pages CMS le retire alors du fichier) disparaît du site
    $all("[data-bind]").forEach(function (node) {
      var v = site[node.getAttribute("data-bind")];
      var empty = typeof v !== "string" || v.trim() === "";
      node.hidden = empty;
      if (empty) { node.textContent = ""; return; }
      v = v.trim();
      if (node.hasAttribute("data-rich")) setRich(node, v); else node.textContent = v.replace(/\*/g, "");
    });


    var sig = $("#hero-sigle");
    if (sig && site.sigle && site.sigle.trim() !== sig.textContent.trim()) setSigle(site.sigle);

    if (site.motsAccent && site.motsAccent.length) accentWords = site.motsAccent.filter(Boolean);
    var first = accentWords[0] || "ensemble";
    var rot = $("#rotator");
    if (rot) { rot.textContent = ""; rot.appendChild(rotWord(first)); }
    var outro = $("#outro-word");
    if (outro) outro.textContent = first;

    var title = $("#hero-title");
    if (title) title.setAttribute("aria-label", [site.titreLigne1, site.titreLigne2, first].filter(Boolean).join(" ") + ".");
    var brandName = [site.nomLigne1, site.nomLigne2].filter(function (v) { return v && String(v).trim(); }).join(" ");
    if (brandName) document.title = brandName;

    var img = $("#hero-bg");
    if (img && site.illustrationAlt) img.alt = site.illustrationAlt;
    // Adhésion : sans vrai lien HelloAsso (ou équivalent), pas de bouton qui mène nulle part
    var join = $("#join-link"), soon = $("#join-soon"), lien = String(site.adhesionLien || "").trim();
    var realLink = /^https?:\/\/.+\/.+/.test(lien.replace(/\/+$/, ""));
    if (join) { join.hidden = !realLink; if (realLink) join.href = lien; }
    var price = $("#join-price");
    if (price) price.hidden = !String(site.adhesionPrix || "").trim();
    if (soon) {
      soon.hidden = realLink;
      soon.textContent = "";
      if (!realLink) {
        soon.appendChild(document.createTextNode("Les adhésions en ligne ouvrent très bientôt."));
        var mail = String(site.email || "").trim();
        if (mail) { soon.appendChild(document.createTextNode(" En attendant, écrivez au bureau : ")); var m = el("a", null, mail); m.href = "mailto:" + mail; soon.appendChild(m); soon.appendChild(document.createTextNode(".")); }
      }
    }
    var fc = $(".foot__contact");
    if (fc) fc.hidden = !String(site.email || "").trim() && !(site.instagram || site.linkedin);

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
      var top = el("div", "act__top");
      top.appendChild(el("p", "label act__n", "Art. 2-" + (i + 1)));
      if (a.statut && String(a.statut).trim()) top.appendChild(el("span", "act__tag", String(a.statut).trim()));
      li.appendChild(top);
      li.appendChild(el("span", "act__big", String(i + 1).padStart(2, "0")));
      li.appendChild(el("h3", "h3 act__t", a.titre));
      li.appendChild(el("p", "act__d", a.texte));
      list.appendChild(li);
    });
    var count = $("#acts-count");
    if (count) count.textContent = "01 / " + String(items.length).padStart(2, "0");
  }

  // « 19:00 - 21:00 » → « 19 h – 21 h » ; « 18:30 » → « 18 h 30 »
  function fmtHeure(h) {
    return String(h || "").trim()
      .replace(/(\d{1,2})\s*[:h]\s*(\d{2})?/gi, function (_, hh, mm) { return +hh + " h" + (mm && mm !== "00" ? " " + mm : ""); })
      .replace(/\s*[-–à]\s*/g, " – ");
  }
  function heures(h) {
    var t = [], re = /(\d{1,2})\s*[:h]\s*(\d{2})?/gi, m;
    while ((m = re.exec(String(h || "")))) t.push([+m[1], +(m[2] || 0)]);
    return t;
  }

  // Fichier .ics pour ajouter l'événement à son agenda (téléphone, Outlook, Google Agenda)
  function icsFor(ev) {
    var d = parseDate(ev.date); if (!d) return null;
    var t = heures(ev.heure), pad = function (n) { return String(n).padStart(2, "0"); };
    var ymd = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    var esc = function (s) { return String(s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, "\\$&"); };
    var lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AEILF//Site//FR", "BEGIN:VEVENT",
      "UID:" + ymd + "-" + String(ev.titre || "").replace(/[^a-z0-9]+/gi, "").slice(0, 24) + "@aeilf",
      "DTSTAMP:" + new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "")];
    if (t.length) {
      var end = t[1] || [t[0][0] + 2, t[0][1]];
      lines.push("DTSTART;TZID=Europe/Paris:" + ymd + "T" + pad(t[0][0]) + pad(t[0][1]) + "00");
      lines.push("DTEND;TZID=Europe/Paris:" + ymd + "T" + pad(Math.min(end[0], 23)) + pad(end[1]) + "00");
    } else {
      var n = new Date(d); n.setDate(n.getDate() + 1);
      lines.push("DTSTART;VALUE=DATE:" + ymd, "DTEND;VALUE=DATE:" + n.getFullYear() + pad(n.getMonth() + 1) + pad(n.getDate()));
    }
    lines.push("SUMMARY:" + esc(ev.titre));
    if (ev.lieu) lines.push("LOCATION:" + esc(String(ev.lieu).trim()));
    if (ev.description) lines.push("DESCRIPTION:" + esc(ev.description));
    lines.push("END:VEVENT", "END:VCALENDAR");
    return lines.join("\r\n");
  }

  // Un événement = une ligne d'agenda : date à gauche, titre, horaires et lieu, résumé dépliable, actions
  function eventCard(ev, isPast) {
    var d = parseDate(ev.date);
    var li = el("li", "ev" + (isPast ? " ev--past" : ""));

    var date = el("div", "ev__date");
    if (d) {
      date.appendChild(el("span", "ev__wd", d.toLocaleDateString("fr-FR", { weekday: "long" })));
      date.appendChild(el("span", "ev__day", String(d.getDate()).padStart(2, "0")));
      date.appendChild(el("span", "ev__mo", d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })));
    }
    li.appendChild(date);

    var main = el("div", "ev__main");
    var kick = el("div", "ev__kick");
    if (ev.categorie) kick.appendChild(el("span", "label label--blue", ev.categorie));
    if (ev.exemple) kick.appendChild(el("span", "tag tag--outline", "Exemple"));
    if (kick.children.length) main.appendChild(kick);
    main.appendChild(el("h3", "ev__t", String(ev.titre || "").trim()));

    var meta = el("p", "ev__meta");
    if (ev.heure) { var h = el("span"); h.appendChild(icon("calendar")); h.appendChild(document.createTextNode(fmtHeure(ev.heure))); meta.appendChild(h); }
    if (ev.lieu) { var l = el("span"); l.appendChild(icon("pin")); l.appendChild(document.createTextNode(String(ev.lieu).trim())); meta.appendChild(l); }
    if (meta.children.length) main.appendChild(meta);

    var paras = String(ev.description || "").split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
    if (paras.length) {
      var desc = el("div", "ev__desc");
      desc.id = "ev-" + Math.random().toString(36).slice(2, 9);
      paras.forEach(function (p) { desc.appendChild(el("p", null, p)); });
      main.appendChild(desc);
    }

    var acts = el("div", "ev__acts");
    if (desc) {
      var more = el("button", "ev__more"); more.type = "button";
      more.setAttribute("aria-expanded", "false"); more.setAttribute("aria-controls", desc.id);
      more.appendChild(el("span", null, "Lire la suite")); more.appendChild(el("span", "ev__chev", "↓"));
      more.hidden = true;
      acts.appendChild(more);
    }
    var lien = String(ev.lien || "").trim();
    if (lien && !isPast) {
      var go = el("a", "btn btn--primary ev__go"); go.href = lien; go.target = "_blank"; go.rel = "noopener"; go.setAttribute("data-cursor", "S'inscrire");
      go.appendChild(el("span", null, "S'inscrire")); go.appendChild(el("span", "btn__arrow", "→"));
      acts.appendChild(go);
    }
    if (!isPast && d) {
      var cal = el("button", "ev__cal"); cal.type = "button";
      cal.appendChild(icon("calendar")); cal.appendChild(document.createTextNode("Ajouter à mon agenda"));
      cal.addEventListener("click", function () {
        var ics = icsFor(ev); if (!ics) return;
        var url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
        var a = document.createElement("a"); a.href = url; a.download = "aeilf-" + ev.date + ".ics";
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
      });
      acts.appendChild(cal);
    }
    if (acts.children.length) main.appendChild(acts);
    li.appendChild(main);
    return li;
  }

  // Résumé limité à 3 lignes ; « Lire la suite » déplie le texte complet en douceur
  function setupEventDesc(scope) {
    $all(".ev__desc", scope).forEach(function (desc) {
      var btn = desc.parentNode.querySelector(".ev__more");
      if (!btn) return;
      desc.classList.add("is-clamped");
      var clampH = desc.clientHeight;
      if (desc.scrollHeight <= clampH + 4) { desc.classList.remove("is-clamped"); return; }
      btn.hidden = false;
      btn.addEventListener("click", function () {
        var open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        btn.firstChild.textContent = open ? "Réduire" : "Lire la suite";
        var from = desc.clientHeight;
        desc.classList.toggle("is-clamped", !open);
        var to = open ? desc.scrollHeight : clampH;
        if (!animate) { if (hasGsap) ScrollTrigger.refresh(); return; }
        gsap.fromTo(desc, { height: from }, { height: to, duration: 0.7, ease: "expo.inOut", onComplete: function () { desc.style.height = ""; ScrollTrigger.refresh(); } });
        if (open) gsap.fromTo($all("p", desc).slice(1), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, delay: 0.15, ease: "expo.out" });
      });
    });
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

    var next = upcoming[0], teaser = $("#teaser");
    if (next && teaser) {
      var nd = parseDate(next.date);
      $("#teaser-day").textContent = String(nd.getDate()).padStart(2, "0");
      $("#teaser-t").textContent = next.titre;
      $("#teaser-meta").textContent = [nd.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }), next.heure ? fmtHeure(next.heure) : ""].filter(Boolean).join(" · ");
      teaser.hidden = false;
    }

    list.textContent = "";
    if (!upcoming.length) list.appendChild(el("li", "events__empty", "Le prochain événement sera annoncé ici très bientôt."));
    upcoming.forEach(function (e) { list.appendChild(eventCard(e, false)); });
    var settle = function () { setupEventDesc(list); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle); else settle();

    var details = $("#past");
    if (details && past.length) {
      var pl = $("#events-past");
      pl.textContent = "";
      past.forEach(function (e) { pl.appendChild(eventCard(e, true)); });
      details.addEventListener("toggle", function once() { if (details.open) { setupEventDesc(pl); details.removeEventListener("toggle", once); } });
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
      txt.appendChild(el("p", "member__n", String(m.nom || "").trim()));
      txt.appendChild(el("p", "label member__r", [m.role, m.promo].map(function (v) { return String(v || "").trim(); }).filter(Boolean).join(" · ")));
      li.appendChild(txt);
      list.appendChild(li);
    });
  }

  // Art. 4 : photos de groupe. Repères numérotés, légende « de gauche à droite », mise en lumière au survol
  var crew = { groups: [], gi: 0 };
  function renderCrew(data) {
    var box = $("#crew");
    crew.groups = ((data && data.groupes) || []).filter(function (g) { return g && g.photo; });
    if (!box || !crew.groups.length) return;
    box.hidden = false;
    var tabs = $("#crew-tabs");
    tabs.textContent = "";
    if (crew.groups.length > 1) {
      crew.groups.forEach(function (g, i) {
        var t = el("button", "crew__tab", g.intitule || "Photo " + (i + 1));
        t.type = "button"; t.setAttribute("role", "tab"); t.setAttribute("aria-selected", String(i === 0));
        t.addEventListener("click", function () { switchCrew(i); });
        tabs.appendChild(t);
      });
      tabs.hidden = false;
    }
    drawCrew(0);
    $("#crew-frame").addEventListener("pointerleave", crewBlur);
  }

  function crewPeople(g) {
    // Le numéro du repère est celui de la fiche dans l'admin (fiche n° 4 = repère 4)
    return (g.personnes || []).map(function (p, i) {
      if (!p || !isFinite(+p.x) || !isFinite(+p.y)) return null;
      return { n: i + 1, nom: String(p.nom || "").trim(), role: String(p.role || "").trim(), rang: +p.rang || 1, x: +p.x, y: +p.y };
    }).filter(Boolean);
  }

  function drawCrew(gi) {
    crew.gi = gi;
    var g = crew.groups[gi], people = crewPeople(g);
    var img = $("#crew-img");
    img.src = g.photo; img.alt = g.alt || ("Photo de groupe : " + (g.intitule || "bureau"));
    img.className = "crew__img";
    if (/\/bureau-etendu\.jpg$/.test(g.photo)) img.srcset = "images/bureau-etendu-1200.jpg 1200w, images/bureau-etendu.jpg 2000w";
    else img.removeAttribute("srcset");
    img.sizes = "(max-width: 1340px) 100vw, 1280px";
    $("#crew-title").textContent = [g.intitule, g.annee ? g.annee.replace("-", "–") : ""].filter(Boolean).join(" · ");

    var pins = $("#crew-pins"), rows = $("#crew-rows");
    pins.textContent = ""; rows.textContent = "";
    var byRow = {};
    people.forEach(function (p, i) {
      var n = p.n;
      var pin = el("button", "crew__pin", String(n));
      pin.type = "button";
      pin.style.left = p.x + "%"; pin.style.top = Math.max(4, p.y - 12) + "%";
      pin.setAttribute("aria-label", n + " : " + [p.nom, p.role].filter(Boolean).join(", "));
      pin.addEventListener("pointerenter", function () { crewFocus(i); });
      pin.addEventListener("focus", function () { crewFocus(i); });
      pin.addEventListener("click", function () { crewFocus(i); });
      pin.addEventListener("blur", crewBlur);
      pins.appendChild(pin);
      (byRow[p.rang] = byRow[p.rang] || []).push({ p: p, i: i, n: n });
    });
    Object.keys(byRow).sort().forEach(function (r) {
      byRow[r].sort(function (a, b) { return a.p.x - b.p.x; });
      var row = el("div", "crew__row");
      var many = Object.keys(byRow).length > 1;
      row.appendChild(el("p", null, (many ? (r === "1" ? "Premier rang" : r === "2" ? "Second rang" : "Rang " + r) + ", de gauche à droite" : "De gauche à droite")));
      var ol = el("ol");
      byRow[r].forEach(function (it) {
        var li = el("li"), b = el("button", "crew__who");
        b.type = "button";
        b.appendChild(el("b", null, String(it.n)));
        var txt = el("span"); txt.appendChild(el("strong", null, it.p.nom));
        if (it.p.role) txt.appendChild(document.createTextNode(", " + it.p.role));
        b.appendChild(txt);
        b.addEventListener("pointerenter", function () { crewFocus(it.i); });
        b.addEventListener("pointerleave", crewBlur);
        b.addEventListener("focus", function () { crewFocus(it.i); });
        b.addEventListener("blur", crewBlur);
        b.addEventListener("click", function () { crewFocus(it.i); });
        li.appendChild(b); ol.appendChild(li);
      });
      row.appendChild(ol); rows.appendChild(row);
    });
    crew.people = people;
  }

  function crewFocus(i) {
    var p = crew.people && crew.people[i];
    if (!p) return;
    var box = $("#crew"), frame = $("#crew-frame"), tag = $("#crew-tag");
    box.classList.add("is-focus");
    if (animate) gsap.to(frame, { "--sx": p.x + "%", "--sy": p.y + "%", duration: 0.6, ease: "expo.out", overwrite: true });
    else { frame.style.setProperty("--sx", p.x + "%"); frame.style.setProperty("--sy", p.y + "%"); }
    $("#crew-tag-n").textContent = p.nom;
    $("#crew-tag-r").textContent = p.role;
    tag.style.left = Math.min(86, Math.max(14, p.x)) + "%";
    tag.style.top = Math.max(4, p.y - 12) + "%";
    tag.classList.add("is-on");
    $all(".crew__pin").forEach(function (b, j) { b.classList.toggle("is-on", j === i); });
    $all(".crew__who").forEach(function (b) { b.classList.toggle("is-on", b.firstChild.textContent === String(p.n)); });
  }
  function crewBlur() {
    var box = $("#crew");
    if (!box) return;
    box.classList.remove("is-focus");
    $("#crew-tag").classList.remove("is-on");
    $all(".crew__pin.is-on, .crew__who.is-on").forEach(function (b) { b.classList.remove("is-on"); });
  }

  function switchCrew(i) {
    if (i === crew.gi) return;
    $all(".crew__tab").forEach(function (t, j) { t.setAttribute("aria-selected", String(j === i)); });
    crewBlur();
    if (!animate) { drawCrew(i); return; }
    var frame = $("#crew-frame");
    gsap.timeline()
      .to(frame, { clipPath: "inset(0% 0% 0% 100%)", duration: 0.55, ease: "expo.in" })
      .add(function () { drawCrew(i); })
      .fromTo(frame, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.8, ease: "expo.out" })
      .fromTo("#crew-img", { scale: 1.15 }, { scale: 1, duration: 1.2, ease: "expo.out" }, "<")
      .from(".crew__pin", { scale: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.05 }, "-=0.6")
      .from(".crew__who", { y: 10, opacity: 0, duration: 0.5, ease: "expo.out", stagger: 0.03 }, "<");
  }

  function setupMailCopy(btn, value) {
    btn.addEventListener("click", function () {
      function done(label) { btn.textContent = label; setTimeout(function () { btn.textContent = "Copier"; }, 1800); }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(function () { done("Copié"); }, function () { done("Sélectionnez l'adresse"); });
      else done("Sélectionnez l'adresse");
    });
  }

  // Art. 5 : une ligne par pôle ; sur grand écran le panneau du pôle choisi s'affiche à droite, sur téléphone il se déplie
  function renderPoles(data) {
    var list = $("#poles-list");
    if (!list) return;
    list.textContent = "";
    ((data && data.poles) || []).forEach(function (p, i) {
      var n = i + 1, id = "pole-" + n;
      var li = el("li", "pole");
      var head = el("button", "pole__head");
      head.type = "button"; head.id = id + "-tab";
      head.setAttribute("aria-expanded", "false"); head.setAttribute("aria-controls", id);
      head.appendChild(el("span", "pole__n", "5-" + n));
      var name = el("span", "pole__name");
      name.appendChild(el("span", "pole__title", p.nom));
      if (p.accroche) name.appendChild(el("span", "pole__acc", p.accroche));
      head.appendChild(name);
      head.appendChild(el("span", "pole__arrow", "→"));
      li.appendChild(head);

      var body = el("div", "pole__body");
      body.id = id; body.setAttribute("role", "region"); body.setAttribute("aria-labelledby", head.id);
      var inner = el("div", "pole__inner");
      // Photo du pôle : elle reste habillée du numéro et du nom du pôle, sur un voile bleu
      var fig = el("figure", "pole__pic" + (p.photo ? " has-photo" : ""));
      if (p.photo) {
        var img = el("img");
        img.src = p.photo; img.alt = "Le pôle " + p.nom; img.loading = "lazy";
        fig.appendChild(img);
        fig.appendChild(el("span", "pole__veil"));
      }
      var ph = el("figcaption", "pole__ph");
      ph.appendChild(el("b", null, String(n).padStart(2, "0")));
      var cap = el("span", "pole__cap");
      cap.appendChild(el("span", "label", "Pôle " + n + " · " + p.nom));
      var lead = String(p.responsables || "").trim();
      if (p.photo && lead && !/^Prénom Nom$/.test(lead)) cap.appendChild(el("span", "pole__lead", lead));
      if (!p.photo) cap.appendChild(el("span", "pole__lead", "Photo du pôle à venir"));
      ph.appendChild(cap);
      fig.appendChild(ph);
      inner.appendChild(fig);
      if (p.exemple) { var tg = el("span", "tag tag--outline", "Exemple"); tg.style.justifySelf = "start"; inner.appendChild(tg); }
      if (p.description) inner.appendChild(el("p", "pole__desc", p.description));

      var facts = el("dl", "pole__facts");
      [["Responsable" + (/[,&]| et /.test(p.responsables || "") ? "s" : ""), p.responsables], ["Membres", (p.membres || []).filter(Boolean).join(", ")]].forEach(function (f) {
        if (!f[1]) return;
        var d = el("div"); d.appendChild(el("dt", null, f[0])); d.appendChild(el("dd", null, f[1])); facts.appendChild(d);
      });
      if (facts.children.length) inner.appendChild(facts);

      if (p.email || p.instagram || p.lien) {
        var c = el("div", "pole__contact");
        if (p.email) {
          var mail = el("span", "pole__mail", p.email);
          c.appendChild(mail);
          var cp = el("button", "copy__btn", "Copier"); cp.type = "button"; setupMailCopy(cp, p.email); c.appendChild(cp);
          var w = el("a", "btn btn--primary");
          w.href = "mailto:" + p.email; w.setAttribute("data-cursor", "Écrire");
          w.appendChild(el("span", null, "Écrire au pôle")); w.appendChild(el("span", "btn__arrow", "→"));
          c.appendChild(w);
        }
        if (p.lien) {
          var lk = el("a", "btn btn--secondary" + (/^https?:/i.test(p.lien) ? "" : " js-transition"));
          lk.href = p.lien; lk.setAttribute("data-cursor", "Ouvrir");
          if (/^https?:/i.test(p.lien)) { lk.target = "_blank"; lk.rel = "noopener"; }
          lk.appendChild(el("span", null, p.lienTexte || "En savoir plus")); lk.appendChild(el("span", "btn__arrow", "→"));
          c.appendChild(lk);
        }
        if (p.instagram) { var ig = el("a", "link", "Instagram du pôle"); ig.href = p.instagram; ig.target = "_blank"; ig.rel = "noopener"; c.appendChild(ig); }
        inner.appendChild(c);
      }
      body.appendChild(inner);
      li.appendChild(body);
      list.appendChild(li);
    });
  }

  // Annexe I : les trois derniers articles du carnet, qui s'ouvrent sur la page dédiée
  function renderCarnet(data) {
    var grid = $("#carnet-grid"), sec = $("#carnet");
    if (!grid || !data || !data.articles || !data.articles.length) return;
    var slug = function (s) { return String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80); };
    data.articles.filter(function (a) { return a && a.titre; })
      .sort(function (a, b) { return (parseDate(b.date) || 0) - (parseDate(a.date) || 0); })
      .slice(0, 3).forEach(function (a) {
        var d = parseDate(a.date);
        var li = el("li"), c = el("a", "r-card js-transition");
        c.href = "recherche/" + slug(a.slug || a.titre) + "/"; c.setAttribute("data-cursor", "Lire");
        var k = el("div", "r-card__kick");
        k.appendChild(el("span", "label label--blue", a.rubrique || "Article"));
        k.appendChild(el("span", "r-card__date", d ? d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : ""));
        c.appendChild(k);
        if (a.exemple) { var ex = el("span", "tag tag--outline", "Exemple"); ex.style.alignSelf = "flex-start"; c.appendChild(ex); }
        c.appendChild(el("h3", "r-card__t", a.titre));
        if (a.chapeau) c.appendChild(el("p", "r-card__c", a.chapeau));
        var m = el("div", "r-card__meta"); m.appendChild(el("span", null, a.auteurs || "")); m.appendChild(el("span", "r-card__arrow", "→"));
        c.appendChild(m); li.appendChild(c); grid.appendChild(li);
      });
    sec.hidden = false;
  }

  function setupPoles() {
    var list = $("#poles-list");
    if (!list) return;
    var poles = $all(".pole", list);
    if (!poles.length) return;
    var wide = window.matchMedia("(min-width: 900px)");
    var current = -1;

    function fit() {
      if (!wide.matches) { list.style.minHeight = ""; return; }
      var h = 0;
      poles.forEach(function (p) { h = Math.max(h, p.querySelector(".pole__body").scrollHeight); });
      list.style.minHeight = h + "px";
    }

    function show(i, instant) {
      var wasOpen = current === i;
      var prev = poles[current];
      if (!wide.matches && wasOpen) { close(prev, instant); current = -1; return; }
      if (wasOpen) return;
      current = i;
      var next = poles[i];
      poles.forEach(function (p) { p.querySelector(".pole__head").setAttribute("aria-expanded", String(p === next)); });
      if (prev) prev.classList.remove("is-active");
      next.classList.add("is-active");
      var body = next.querySelector(".pole__body");
      var pic = body.querySelector(".pole__pic"), media = pic.querySelector("img") || pic.querySelector(".pole__ph b");
      var parts = $all(".pole__inner > :not(.pole__pic)", body);
      if (wide.matches) {
        if (prev && animate) gsap.to(prev.querySelector(".pole__inner"), { opacity: 0, duration: 0.3, ease: "power2.out", overwrite: true });
        if (!animate || instant) { gsap.set(body.querySelector(".pole__inner"), { opacity: 1 }); return; }
        gsap.set(body.querySelector(".pole__inner"), { opacity: 1 });
        gsap.fromTo(pic, { clipPath: "inset(0% 0% 0% 100%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.9, ease: "expo.inOut", overwrite: true });
        gsap.fromTo(media, { scale: 1.2, xPercent: 6 }, { scale: 1, xPercent: 0, duration: 1.3, ease: "expo.out", overwrite: true });
        gsap.fromTo(parts, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.06, delay: 0.2, overwrite: true });
        gsap.fromTo(pic.querySelector(".pole__ph b"), { yPercent: 70, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.1, ease: "expo.out", delay: 0.35, overwrite: true });
        gsap.fromTo(pic.querySelectorAll(".pole__cap > *"), { x: -16, opacity: 0 }, { x: 0, opacity: 1, duration: 0.9, ease: "expo.out", stagger: 0.08, delay: 0.5, overwrite: true });
      } else {
        if (prev) close(prev, instant);
        open(next, instant);
      }
    }
    function open(p, instant) {
      var b = p.querySelector(".pole__body");
      if (!animate || instant) { b.style.height = "auto"; return; }
      gsap.fromTo(b, { height: 0 }, { height: "auto", duration: 0.8, ease: "expo.inOut", overwrite: true });
      gsap.fromTo(b.querySelector(".pole__inner"), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: "expo.out", delay: 0.2, overwrite: true });
    }
    function close(p, instant) {
      if (!p) return;
      p.classList.remove("is-active");
      p.querySelector(".pole__head").setAttribute("aria-expanded", "false");
      var b = p.querySelector(".pole__body");
      if (!animate || instant) { b.style.height = "0px"; return; }
      gsap.to(b, { height: 0, duration: 0.6, ease: "expo.inOut", overwrite: true });
    }

    function layout() {
      poles.forEach(function (p, i) {
        var b = p.querySelector(".pole__body");
        if (animate) gsap.killTweensOf([b, b.querySelector(".pole__inner")]);
        b.style.height = wide.matches || i === current ? "" : "0px";
        if (wide.matches) b.querySelector(".pole__inner").style.opacity = i === current ? "1" : "0";
      });
      fit();
    }

    poles.forEach(function (p, i) {
      var head = p.querySelector(".pole__head");
      head.addEventListener("click", function () { show(i); });
      if (finePointer) head.addEventListener("pointerenter", function () { if (wide.matches) show(i); });
      head.addEventListener("keydown", function (e) {
        var k = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
        if (!k) return;
        e.preventDefault();
        poles[(i + k + poles.length) % poles.length].querySelector(".pole__head").focus();
      });
    });
    var startIndex = 0;
    current = -1;
    poles.forEach(function (p) { p.querySelector(".pole__body").style.height = wide.matches ? "" : "0px"; });
    show(startIndex, true);
    layout();
    (wide.addEventListener ? wide.addEventListener.bind(wide, "change") : wide.addListener.bind(wide))(function () { layout(); if (hasGsap) ScrollTrigger.refresh(); });
    window.addEventListener("resize", fit);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    $all("img", list).forEach(function (im) { im.addEventListener("load", fit); });
  }

  // Repère « Art. en cours » (avec sommaire rapide) et bouton de retour en haut
  function setupWayfinding() {
    var chapter = $("#chapter"), btn = $("#chapter-btn"), menu = $("#chapter-menu"), now = $("#chapter-now");
    var totop = $("#totop"), bar = $("#totop-bar"), hero = $("#hero");
    if (!chapter || !totop) return;

    function setMenu(open) {
      btn.setAttribute("aria-expanded", String(open));
      menu.hidden = !open;
      if (open && animate) gsap.fromTo($all("a", menu), { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: "expo.out", stagger: 0.04 });
    }
    btn.addEventListener("click", function () { setMenu(menu.hidden); });
    $all("a", menu).forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !menu.hidden) { setMenu(false); btn.focus(); } });
    document.addEventListener("click", function (e) { if (!menu.hidden && !chapter.contains(e.target)) setMenu(false); });

    function setChapter(text, id) {
      $all("a", menu).forEach(function (a) { a.classList.toggle("is-current", a.getAttribute("href") === "#" + id); });
      var cur = now.querySelector(".chapter__txt:last-child");
      if (cur && cur.textContent === text) return;
      var nx = el("span", "chapter__txt", text);
      now.appendChild(nx);
      if (!animate || !cur) { if (cur) cur.remove(); return; }
      gsap.fromTo(nx, { yPercent: 100 }, { yPercent: 0, duration: 0.6, ease: "expo.out" });
      gsap.to(cur, { yPercent: -100, duration: 0.6, ease: "expo.out", onComplete: function () { cur.remove(); } });
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) setChapter(en.target.getAttribute("data-chapter"), en.target.id); });
      }, { rootMargin: "-45% 0px -50% 0px" });
      $all("[data-chapter]").forEach(function (s) { io.observe(s); });
    }

    function update() {
      var y = window.scrollY, max = document.documentElement.scrollHeight - window.innerHeight;
      var past = y > (hero ? hero.offsetHeight * 0.85 : 400);
      chapter.classList.toggle("is-visible", past);
      totop.classList.toggle("is-visible", past);
      if (!past && !menu.hidden) setMenu(false);
      bar.style.strokeDashoffset = String(100 - (max > 0 ? Math.min(1, y / max) : 0) * 100);
    }
    window.addEventListener("scroll", update, { passive: true });
    update();
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
    var hero = $("#hero");
    function over() { return hero && window.scrollY < 40; }
    top.classList.toggle("is-over", !!over());
    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      top.classList.toggle("is-over", !!over());
      if (!nav.classList.contains("is-open")) {
        if (y > 600 && y > lastY + 4) top.classList.add("is-hidden");
        if (y < lastY - 4 || y < 600) top.classList.remove("is-hidden");
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
      if (node.childNodes.length) node.appendChild(document.createTextNode(" "));
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
    var t0 = showLoader ? 1.7 : 0.1;
    // Le fond et le premier plan bougent ensemble (mêmes valeurs) pour rester parfaitement superposés
    tl.from("#hero-bg, #hero-fg", { scale: 1.18, duration: 2.6, ease: "expo.out" }, t0)
      .from(".hero__veil", { opacity: 0, duration: 1.6, ease: "power2.out" }, t0)
      .from("#hero-sigle .ch__in", { yPercent: 110, duration: 1.9, ease: "expo.out", stagger: 0.09 }, t0 + 0.35)
      .from("#hero-name", { opacity: 0, letterSpacing: "0.6em", duration: 1.8, ease: "expo.out" }, t0 + 0.6)
      .from(".hero__down", { opacity: 0, y: 20, duration: 1, ease: "expo.out" }, t0 + 1.6)
      .from("#teaser", { y: 40, opacity: 0, duration: 1.2, ease: "expo.out" }, t0 + 1.8)
      .from(".top__in > *", { y: -20, opacity: 0, stagger: 0.07, duration: 1, ease: "expo.out" }, t0 + 0.8);
    return t0 + 0.7;
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
      var t = e.target.closest("[data-cursor], a, button, summary, .act, .member, .pole__pic");
      var text = t && t.getAttribute("data-cursor");
      c.classList.toggle("is-hover", !!t && !text);
      c.classList.toggle("is-label", !!text);
      c.classList.toggle("is-invert", !!e.target.closest(".join, .marquee, .act:hover, .hero, .totop") && !e.target.closest(".teaser"));
      if (text) label.textContent = text;
    });
  }

  function progressBar() {
    gsap.to("#progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: 0.3 } });
  }

  // Les lettres montent de derrière la faculté une à une, s'y enfoncent au défilement à des vitesses différentes,
  // et se soulèvent au survol ; léger relief à la souris
  function heroScene() {
    var sigle = $("#hero-sigle");
    if (!sigle) return;
    var chars = $all(".ch", sigle);
    chars.forEach(function (c, i) {
      gsap.to(c, { yPercent: 45 + i * 14, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: true } });
    });
    gsap.to(".hero__brand", { yPercent: -60, opacity: 0, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "40% top", scrub: true } });
    gsap.to(".hero__down", { opacity: 0, ease: "none", scrollTrigger: { trigger: "#hero", start: "top top", end: "15% top", scrub: true } });
    gsap.to("#teaser", { yPercent: 40, opacity: 0, ease: "none", immediateRender: false, scrollTrigger: { trigger: "#hero", start: "5% top", end: "35% top", scrub: true } });

    if (!finePointer) return;
    chars.forEach(function (c) {
      var inner = c.querySelector(".ch__in");
      var lift = gsap.quickTo(inner, "y", { duration: 0.9, ease: "elastic.out(1, 0.45)" });
      c.addEventListener("pointerenter", function () { lift(-inner.offsetHeight * 0.07); });
      c.addEventListener("pointerleave", function () { lift(0); });
    });
    var hero = $("#hero");
    var sx = gsap.quickTo(sigle, "x", { duration: 1.2, ease: "power3.out" });
    var nx = gsap.quickTo("#hero-name", "x", { duration: 1.2, ease: "power3.out" });
    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      sx(px * -24); nx(px * 10);
    });
    hero.addEventListener("pointerleave", function () { sx(0); nx(0); });
  }

  function introBlock() {
    var tl = gsap.timeline({ scrollTrigger: { trigger: "#intro", start: "top 80%", once: true } });
    tl.from(".intro__title .line__in", { yPercent: 115, duration: 1.4, ease: "expo.out", stagger: 0.12 }, 0)
      .from(".intro__kicker", { y: 16, opacity: 0, duration: 1, ease: "expo.out" }, 0.1)
      .from(".intro__side > *", { y: 30, opacity: 0, stagger: 0.12, duration: 1.2, ease: "expo.out" }, 0.3);
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
    var cg = $("#carnet-grid");
    if (cg && cg.children.length) gsap.from(cg.children, { clipPath: "inset(0% 0% 100% 0%)", stagger: 0.1, duration: 1.1, ease: "expo.inOut", scrollTrigger: { trigger: cg, start: "top 85%", once: true } });
    $all(".events").forEach(function (list) {
      var cells = $all(".events > li", list);
      if (cells.length && cells[0].classList.contains("ev")) {
        gsap.from(cells, { y: 30, opacity: 0, stagger: 0.1, duration: 1, ease: "expo.out", scrollTrigger: { trigger: list, start: "top 85%", once: true } });
        gsap.from($all(".ev__day", list), { yPercent: 60, opacity: 0, stagger: 0.1, duration: 1.2, ease: "expo.out", delay: 0.2, scrollTrigger: { trigger: list, start: "top 85%", once: true } });
        return;
      }
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

  // La photo de groupe s'ouvre comme la porte qu'elle montre : d'abord la seule porte, puis toute l'équipe
  function crewMotion() {
    var frame = $("#crew-frame");
    if (!frame || $("#crew").hidden) return;
    gsap.fromTo(frame, { clipPath: "inset(0% 36% 0% 33%)" }, {
      clipPath: "inset(0% 0% 0% 0%)", ease: "none",
      scrollTrigger: { trigger: frame, start: "top 85%", end: "top 25%", scrub: 0.8 }
    });
    gsap.fromTo("#crew-img", { scale: 1.22 }, { scale: 1, ease: "none", scrollTrigger: { trigger: frame, start: "top 85%", end: "bottom 40%", scrub: 0.8 } });
    gsap.from(".crew__pin", { scale: 0, opacity: 0, duration: 0.7, ease: "back.out(2)", stagger: 0.07, scrollTrigger: { trigger: frame, start: "top 45%", once: true } });
    gsap.from([".crew__title", ".crew__row"], { y: 20, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.1, scrollTrigger: { trigger: ".crew__cap", start: "top 90%", once: true } });
  }

  function polesMotion() {
    var list = $("#poles-list");
    if (!list) return;
    var heads = $all(".pole__head", list);
    gsap.from(heads, { y: 30, opacity: 0, duration: 1, ease: "expo.out", stagger: 0.08, scrollTrigger: { trigger: list, start: "top 85%", once: true } });
    gsap.from(".poles__intro", { y: 20, opacity: 0, duration: 1, ease: "expo.out", scrollTrigger: { trigger: "#poles", start: "top 80%", once: true } });
    var active = $(".pole.is-active .pole__pic", list);
    if (active && window.matchMedia("(min-width: 900px)").matches) {
      gsap.from(active, { clipPath: "inset(100% 0% 0% 0%)", duration: 1.4, ease: "expo.inOut", scrollTrigger: { trigger: list, start: "top 80%", once: true } });
    }
  }

  // Léger relief : la photo du pôle suit la souris, le numéro en sens inverse
  function poleParallax() {
    if (!finePointer) return;
    $all(".pole__pic.has-photo").forEach(function (fig) {
      var img = fig.querySelector("img"), num = fig.querySelector(".pole__ph b");
      var ix = gsap.quickTo(img, "x", { duration: 1, ease: "power3.out" }), iy = gsap.quickTo(img, "y", { duration: 1, ease: "power3.out" });
      var nx = gsap.quickTo(num, "x", { duration: 1, ease: "power3.out" });
      gsap.set(img, { scale: 1.06 });
      fig.addEventListener("pointermove", function (e) {
        var r = fig.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
        ix(px * -18); iy(py * -12); nx(px * 14);
      });
      fig.addEventListener("pointerleave", function () { ix(0); iy(0); nx(0); });
    });
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

  setSigle(($("#hero-sigle") || {}).textContent || "");
  if (!animate) root.classList.remove("is-loading");
  if (animate) smoothScroll();
  if (animate) loaderThenIntro();
  setupHeader();
  setupCopy();

  setupWayfinding();

  Promise.all([load("site"), load("activites"), load("evenements"), load("bureau"), load("poles"), load("recherche")]).then(function (res) {
    bindSite(res[0]);
    renderActivities(res[1]);
    renderEvents(res[2]);
    renderCrew(res[3]);
    renderPoles(res[4]);
    setupPoles();
    renderCarnet(res[5]);

    if (!animate) return;
    var start = function () {
      heroScene();
      introBlock();
      rotator(1.2);
      cursor();
      progressBar();
      manifesto();
      marquee();
      headings();
      activities();
      agenda();
      polesMotion();
      poleParallax();
      crewMotion();
      join();
      magnetic();
      pageTransitions();
      ScrollTrigger.refresh();
    };
    // Les découpages par ligne ont besoin des polices chargées
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
  });
})();
