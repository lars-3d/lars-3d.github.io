/* LARS-3D project page — interactions */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ------------------------------------------------------------------ theme */
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    var btn = $(".theme-toggle");
    if (btn) btn.setAttribute("aria-label", t === "dark" ? "Switch to light theme" : "Switch to dark theme");
  }

  var toggle = $(".theme-toggle");
  if (toggle) {
    toggle.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      try { localStorage.setItem("lars3d-theme", next); } catch (e) { /* private mode */ }
      applyTheme(next);
    });
  }
  // follow the OS when the visitor has never chosen explicitly
  var mq = window.matchMedia("(prefers-color-scheme: dark)");
  var onSchemeChange = function (e) {
    var stored = null;
    try { stored = localStorage.getItem("lars3d-theme"); } catch (err) { /* ignore */ }
    if (!stored) applyTheme(e.matches ? "dark" : "light");
  };
  if (mq.addEventListener) mq.addEventListener("change", onSchemeChange);
  else if (mq.addListener) mq.addListener(onSchemeChange);

  /* ---------------------------------------------------- header + scrollspy */
  var header = $(".site-header");
  var navLinks = $$(".site-nav a");
  var sections = navLinks
    .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
    .filter(Boolean);

  function onScroll() {
    if (header) header.classList.toggle("is-stuck", window.scrollY > 8);
    var y = window.scrollY + 140, current = null;
    sections.forEach(function (s) { if (s.offsetTop <= y) current = s.id; });
    navLinks.forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("href") === "#" + current);
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* -------------------------------------------------------------- reveal */
  var revealables = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) { el.classList.add("in"); });
  } else {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); ro.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealables.forEach(function (el) { ro.observe(el); });
  }

  /* --------------------------------------------------------- hero canvas */
  (function heroCloud() {
    var canvas = document.getElementById("hero-canvas");
    if (!canvas || reduceMotion) return;
    var ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    var pts = [];
    var rnd = (function (seed) {           // deterministic, so the scene is stable
      return function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    })(20260417);

    // ground return rings
    for (var ring = 0; ring < 46; ring++) {
      var r = 3.0 + ring * 1.16;
      var n = Math.min(150, Math.round(18 + r * 2.8));
      for (var i = 0; i < n; i++) {
        var th = (i / n) * Math.PI * 2 + rnd() * 0.02;
        pts.push({
          x: Math.cos(th) * r,
          y: -1.9 + Math.sin(r * 0.55) * 0.18 + (rnd() - 0.5) * 0.1,
          z: Math.sin(th) * r,
          s: 1, k: 0
        });
      }
    }
    // vertical structure: trees / poles, the thing global context has to tie together
    for (var t = 0; t < 34; t++) {
      var a = rnd() * Math.PI * 2, rr = 7 + rnd() * 36;
      var bx = Math.cos(a) * rr, bz = Math.sin(a) * rr, h = 2.2 + rnd() * 4.2;
      var kind = rnd() < 0.55 ? 1 : 2;             // 1 = canopy, 2 = pole
      var m = kind === 1 ? 26 : 12;
      for (var j = 0; j < m; j++) {
        pts.push({
          x: bx + (kind === 1 ? (rnd() - 0.5) * 1.8 : (rnd() - 0.5) * 0.18),
          y: -1.9 + (kind === 1 ? h * (0.45 + rnd() * 0.55) : h * rnd()),
          z: bz + (kind === 1 ? (rnd() - 0.5) * 1.8 : (rnd() - 0.5) * 0.18),
          s: 1.3, k: kind
        });
      }
    }

    var palette = { 0: null, 1: "#19b24a", 2: "#1f8bd6" };
    var dpr = 1, W = 0, H = 0, yaw = 0, raf = 0, visible = true;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function draw() {
      raf = 0;
      ctx.clearRect(0, 0, W, H);
      var dark = document.documentElement.getAttribute("data-theme") === "dark";
      var base = dark ? "255,255,255" : "22,30,46";
      var cx = W * 0.5, cy = H * 0.30;
      var f = Math.max(W, 760) * 0.34;          // focal length
      var camY = 18, camZ = 34, pitch = 0.52;   // camera above and behind the cloud
      var cp = Math.cos(pitch), sp = Math.sin(pitch);
      var cyaw = Math.cos(yaw), syaw = Math.sin(yaw);

      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        var x = p.x * cyaw - p.z * syaw;
        var z = p.x * syaw + p.z * cyaw + camZ;
        var y = p.y - camY;
        var yr = y * cp + z * sp;                // pitch the camera down
        var zr = z * cp - y * sp;
        if (zr < 6) continue;
        var sx = cx + (x / zr) * f;
        var sy2 = cy - (yr / zr) * f;
        if (sx < -20 || sx > W + 20 || sy2 < -20 || sy2 > H + 20) continue;
        var fade = Math.max(0, Math.min(1, 1 - (zr - 24) / 115));
        var alpha = fade * (dark ? 0.72 : 0.6);
        if (alpha <= 0.015) continue;
        var size = Math.max(1.4, p.s * (f / zr) * 0.13);
        if (p.k) {
          ctx.fillStyle = palette[p.k];
          ctx.globalAlpha = alpha * 0.95;
        } else {
          ctx.fillStyle = "rgba(" + base + ",1)";
          ctx.globalAlpha = alpha * 0.72;
        }
        ctx.fillRect(sx, sy2, size, size);
      }
      ctx.globalAlpha = 1;
    }

    function tick() {
      yaw += 0.00085;
      draw();
      if (visible) raf = requestAnimationFrame(tick);
    }

    resize();
    var rt;
    window.addEventListener("resize", function () {
      clearTimeout(rt);
      rt = setTimeout(function () { resize(); draw(); }, 120);
    });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        visible = es[0].isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(tick);
      }, { threshold: 0 }).observe(canvas);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
      else if (visible && !raf) raf = requestAnimationFrame(tick);
    });
    raf = requestAnimationFrame(tick);
  })();

  /* ------------------------------------------------------ compare slider */
  $$(".compare").forEach(function (box) {
    var input = $('input[type="range"]', box);
    if (!input) return;
    var set = function (v) { box.style.setProperty("--pos", v + "%"); };
    set(input.value);
    input.addEventListener("input", function () { set(input.value); });
  });

  /* ------------------------------------------------------------ lightbox */
  (function () {
    var lb = $(".lightbox");
    if (!lb) return;
    var img = $("img", lb);
    var lastFocus = null;

    function open(src, alt) {
      lastFocus = document.activeElement;
      img.src = src; img.alt = alt || "";
      lb.classList.add("open");
      document.body.style.overflow = "hidden";
      $(".close", lb).focus();
    }
    function close() {
      lb.classList.remove("open");
      document.body.style.overflow = "";
      var old = img.getAttribute("src");
      img.removeAttribute("src");
      if (old && old.indexOf("blob:") === 0) URL.revokeObjectURL(old);
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    // a click opens the figure, but dragging over selectable SVG text must not
    var downX = 0, downY = 0;
    function armed(el) {
      el.addEventListener("mousedown", function (e) { downX = e.clientX; downY = e.clientY; });
    }
    function isClick(e) {
      if (Math.abs(e.clientX - downX) > 5 || Math.abs(e.clientY - downY) > 5) return false;
      var sel = window.getSelection();
      return !sel || sel.isCollapsed;
    }

    $$("[data-zoom]").forEach(function (el) {
      var target = el.tagName === "IMG" ? el : $("img", el);
      if (!target) return;
      el.style.cursor = "zoom-in";
      armed(el);
      el.addEventListener("click", function (e) {
        if (!isClick(e)) return;
        open(el.getAttribute("data-zoom") || target.currentSrc || target.src, target.alt);
      });
    });

    // inline vector figures: serialise the live SVG into a blob to show full size
    $$("[data-zoom-svg]").forEach(function (el) {
      var svg = $("svg", el);
      if (!svg) return;
      armed(el);
      el.addEventListener("click", function (e) {
        if (!isClick(e)) return;
        var clone = svg.cloneNode(true);
        var useEl = clone.querySelector("use");
        if (useEl) {                       // a detail panel re-uses the main diagram
          var src = document.getElementById("archi-root");
          if (src) useEl.parentNode.replaceChild(src.cloneNode(true), useEl);
          var defs = document.querySelector("#archi-root") &&
                     document.querySelector("#archi-root").parentNode.querySelector("defs");
          if (defs) clone.insertBefore(defs.cloneNode(true), clone.firstChild);
        }
        clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
        clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
        var blob = new Blob([new XMLSerializer().serializeToString(clone)],
                            { type: "image/svg+xml;charset=utf-8" });
        open(URL.createObjectURL(blob), svg.getAttribute("aria-label") || "");
      });
    });

    $(".close", lb).addEventListener("click", close);
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && lb.classList.contains("open")) close();
    });
  })();

  /* ---------------------------------------------------------------- tabs */
  $$("[data-tabs]").forEach(function (group) {
    var tabs = $$(".tab", group);
    var panels = tabs.map(function (t) { return document.getElementById(t.getAttribute("aria-controls")); });

    function select(i) {
      tabs.forEach(function (t, j) {
        t.setAttribute("aria-selected", j === i ? "true" : "false");
        t.tabIndex = j === i ? 0 : -1;
        if (panels[j]) panels[j].hidden = j !== i;
      });
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(i); });
      t.addEventListener("keydown", function (e) {
        var d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        var n = (i + d + tabs.length) % tabs.length;
        tabs[n].focus(); select(n);
      });
    });
    select(0);
  });

  /* -------------------------------------------------------- copy bibtex */
  $$("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var src = document.getElementById(btn.getAttribute("data-copy"));
      if (!src) return;
      var text = src.textContent;
      var done = function () {
        var label = $(".label", btn);
        var old = label ? label.textContent : "";
        if (label) label.textContent = "Copied";
        btn.classList.add("done");
        setTimeout(function () { if (label) label.textContent = old; btn.classList.remove("done"); }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, fallback);
      } else { fallback(); }

      function fallback() {
        var ta = document.createElement("textarea");
        ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); done(); } catch (e) { /* give up quietly */ }
        document.body.removeChild(ta);
      }
    });
  });

  /* ------------------------------------------------- EastPark class list */
  var CLASSES = [
    { n: "grass",        v: 160504157, c: "#00cb00" },
    { n: "tree",         v: 56314916,  c: "#006600" },
    { n: "building",     v: 37416859,  c: "#00c7ff" },
    { n: "hard gravel",  v: 30289825,  c: "#4d4d4d" },
    { n: "bush",         v: 30151002,  c: "#c55ae8" },
    { n: "soft gravel",  v: 22163376,  c: "#999999" },
    { n: "followers",    v: 21363668,  c: "#6a6ab3" },
    { n: "other object", v: 20592815,  c: "#f88379" },
    { n: "outlier",      v: 18528080,  c: "#000000" },
    { n: "terrain",      v: 14793632,  c: "#804d1b" },
    { n: "mud",          v: 12596485,  c: "#663400" },
    { n: "fence",        v: 7848074,   c: "#366ef9" },
    { n: "sidewalk",     v: 4419636,   c: "#4b004b" },
    { n: "road",         v: 2642075,   c: "#ff00ff" },
    { n: "car",          v: 2570248,   c: "#f49664" },
    { n: "person",       v: 1363526,   c: "#ff0000" },
    { n: "rubber",       v: 1290397,   c: "#4d004d" },
    { n: "pole",         v: 889462,    c: "#96efff" },
    { n: "concrete",     v: 690878,    c: "#5149b2" },
    { n: "bicycle",      v: 191775,    c: "#d788ee" },
    { n: "kid",          v: 177369,    c: "#31cbb6" },
    { n: "motorcycle",   v: 4580,      c: "#5a1f96" }
  ];

  function shortNum(v) {
    if (v >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, "") + "B";
    if (v >= 1e6) return (v / 1e6).toFixed(v >= 1e7 ? 0 : 1).replace(/\.0$/, "") + "M";
    if (v >= 1e3) return (v / 1e3).toFixed(0) + "K";
    return String(v);
  }

  (function classList() {
    var host = document.getElementById("class-list");
    if (!host) return;
    var lo = Math.log10(1e3), hi = Math.log10(2e8);
    var frag = document.createDocumentFragment();

    CLASSES.forEach(function (cl) {
      var row = document.createElement("div");
      row.className = "cls";
      var pct = Math.max(3, Math.min(100, ((Math.log10(cl.v) - lo) / (hi - lo)) * 100));
      row.innerHTML =
        '<span class="sw" style="background:' + cl.c + '"></span>' +
        '<span class="nm">' + cl.n + "</span>" +
        '<span class="track"><i class="fill" style="background:' + cl.c + '"></i></span>' +
        '<span class="vl">≈ ' + shortNum(cl.v) + "</span>";
      row.title = cl.n + " — ≈ " + cl.v.toLocaleString("en-US") + " labelled points";
      row.querySelector(".fill").dataset.w = pct;
      frag.appendChild(row);
    });
    host.appendChild(frag);

    var fills = $$(".fill", host);
    var paint = function () { fills.forEach(function (f) { f.style.width = f.dataset.w + "%"; }); };
    if (reduceMotion || !("IntersectionObserver" in window)) { paint(); return; }
    var io = new IntersectionObserver(function (es) {
      if (es[0].isIntersecting) { paint(); io.disconnect(); }
    }, { threshold: 0.15 });
    io.observe(host);
  })();

  /* ------------------------------------------------- efficiency scatter */
  (function effChart() {
    var svg = document.getElementById("eff-chart");
    if (!svg) return;

    // EastPark test set, all models trained from scratch (Table II).
    var M = [
      { n: "MinkUNet",  ms: 14,  miou: 68.4, gb: 2.0 },
      { n: "3PNet",     ms: 120, miou: 64.2, gb: 10.0 },
      { n: "PTv3",      ms: 135, miou: 71.9, gb: 4.0 },
      { n: "FRNet",     ms: 55,  miou: 72.2, gb: 0.7 },
      { n: "LSK3DNet",  ms: 75,  miou: 74.8, gb: 0.6 },
      { n: "LARS-3D",   ms: 82,  miou: 76.0, gb: 0.6, ours: true }
    ];

    var W = 720, H = 400, m = { t: 22, r: 26, b: 48, l: 54 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b;
    var xMin = 0, xMax = 150, yMin = 62, yMax = 78;
    var X = function (v) { return m.l + ((v - xMin) / (xMax - xMin)) * pw; };
    var Y = function (v) { return m.t + ph - ((v - yMin) / (yMax - yMin)) * ph; };
    var R = function (gb) { return 9 + Math.sqrt(gb) * 7.5; };

    var NS = "http://www.w3.org/2000/svg";
    function el(name, attrs, text) {
      var e = document.createElementNS(NS, name);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (text != null) e.textContent = text;
      return e;
    }

    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label",
      "Accuracy versus latency on EastPark. LARS-3D reaches 76.0 mIoU at 82 ms using 0.6 GB, " +
      "above LSK3DNet (74.8 mIoU, 75 ms, 0.6 GB), FRNet (72.2 mIoU, 55 ms, 0.7 GB), " +
      "PTv3 (71.9 mIoU, 135 ms, 4 GB) and MinkUNet (68.4 mIoU, 14 ms, 2 GB).");

    var g = el("g");

    for (var yv = yMin; yv <= yMax; yv += 2) {
      g.appendChild(el("line", { class: "grid", x1: m.l, x2: m.l + pw, y1: Y(yv), y2: Y(yv) }));
      g.appendChild(el("text", { class: "tick", x: m.l - 10, y: Y(yv) + 4, "text-anchor": "end" }, String(yv)));
    }
    for (var xv = 0; xv <= xMax; xv += 30) {
      g.appendChild(el("text", { class: "tick", x: X(xv), y: m.t + ph + 20, "text-anchor": "middle" }, String(xv)));
    }
    g.appendChild(el("line", { class: "axis", x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph }));
    g.appendChild(el("line", { class: "axis", x1: m.l, x2: m.l, y1: m.t, y2: m.t + ph }));
    g.appendChild(el("text", { class: "alab", x: m.l + pw / 2, y: H - 8, "text-anchor": "middle" }, "latency per scan (ms)  →  faster is left"));
    var yl = el("text", { class: "alab", x: 14, y: m.t + ph / 2, "text-anchor": "middle",
                          transform: "rotate(-90 14 " + (m.t + ph / 2) + ")" }, "mIoU (%)");
    g.appendChild(yl);

    M.forEach(function (d) {
      var gg = el("g", { class: "m" + (d.ours ? " ours" : "") });
      var cx = X(d.ms), cy = Y(d.miou), r = R(d.gb);
      gg.appendChild(el("circle", { class: "pt", cx: cx, cy: cy, r: r }));
      gg.appendChild(el("circle", { class: "pt-core", cx: cx, cy: cy, r: 3 }));
      var below = d.n === "LSK3DNet";   // keep it clear of the LARS-3D bubble
      gg.appendChild(el("text", {
        class: "plab", x: cx, y: below ? cy + r + 16 : cy - r - 8, "text-anchor": "middle"
      }, d.n));
      gg.appendChild(el("title", {}, d.n + " — " + d.miou + " mIoU, " + d.ms + " ms, " + d.gb + " GB VRAM"));
      g.appendChild(gg);
    });

    svg.appendChild(g);
  })();
})();
