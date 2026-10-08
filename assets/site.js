// Zestiwe Games — поведение сайта: тема, язык, появление при прокрутке,
// лента скриншотов и маленькое поле 2048 на странице игры.
(function () {
  "use strict";

  var root = document.documentElement;
  var base = root.getAttribute("data-root") || "";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { return null; }
  }

  // ---------- тема ----------

  function isDark() {
    var chosen = root.getAttribute("data-theme");
    return chosen ? chosen === "dark" : darkQuery.matches;
  }

  function paintThemeClass() { root.classList.toggle("is-dark", isDark()); }

  function setTheme(next, from) {
    var apply = function () {
      root.setAttribute("data-theme", next);
      store("zg-theme", next);
      paintThemeClass();
    };

    // Круг новой темы расходится от кнопки — если браузер умеет
    if (!document.startViewTransition || reduceMotion || !from) { apply(); return; }

    var r = from.getBoundingClientRect();
    var x = r.left + r.width / 2, y = r.top + r.height / 2;
    var radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    root.classList.add("theme-switching");
    var t = document.startViewTransition(apply);
    t.ready.then(function () {
      root.animate(
        { clipPath: ["circle(0px at " + x + "px " + y + "px)", "circle(" + radius + "px at " + x + "px " + y + "px)"] },
        { duration: 550, easing: "cubic-bezier(.2,.8,.2,1)", pseudoElement: "::view-transition-new(root)" }
      );
    }).catch(function () {});
    // Переход может быть пропущен (вкладка свёрнута) — тема всё равно сменится
    t.finished.catch(function () {}).then(function () { root.classList.remove("theme-switching"); });
  }

  paintThemeClass();
  darkQuery.addEventListener && darkQuery.addEventListener("change", paintThemeClass);

  var themeBtn = document.querySelector("[data-theme-toggle]");
  if (themeBtn) {
    themeBtn.addEventListener("click", function () { setTheme(isDark() ? "light" : "dark", themeBtn); });
  }

  // ---------- язык ----------

  var langs = window.SITE_LANGS || [];
  var texts = window.SITE_TEXT || {};

  function pickLang() {
    var saved = store("zg-lang");
    if (saved && texts[saved]) return saved;
    var prefs = navigator.languages || [navigator.language || "en"];
    for (var i = 0; i < prefs.length; i++) {
      var p = String(prefs[i]).toLowerCase();
      var short = p.split("-")[0];
      if (short === "tl") short = "fil";
      if (short === "nb" || short === "nn" || short === "no") continue;
      if (texts[short]) return short;
    }
    return "en";
  }

  function t(code, key) {
    var dict = texts[code] || texts.en;
    return dict[key] != null ? dict[key] : texts.en[key];
  }

  // Политика и условия — на языке посетителя, как кнопки в игре:
  // русский и белорусский — русская страница, украинский — украинская
  var SITE = "https://sites.google.com/view/zestiwemerge-privacy/";
  function docLink(code, kind) {
    var suffix = code === "ru" || code === "be" ? "/ru" : code === "uk" ? "/uk" : "";
    if (kind === "privacy") return suffix ? SITE + "privacy-policy" + suffix : SITE;
    return SITE + "terms" + suffix;
  }

  function shotDir(code) {
    return code === "ru" || code === "be" ? "ru" : code === "uk" ? "uk" : "en";
  }

  var current = null;

  function applyLang(code, animate) {
    current = code;
    var meta = langs.filter(function (l) { return l.code === code; })[0] || langs[0];
    root.setAttribute("lang", meta.lang);

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var value = t(code, el.getAttribute("data-i18n"));
      if (el.textContent === value) return;
      el.textContent = value;
      if (animate && !reduceMotion) { el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap"); }
    });

    document.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":");
        if (p.length === 2) el.setAttribute(p[0].trim(), t(code, p[1].trim()));
      });
    });

    var docKey = root.getAttribute("data-doc");
    if (docKey) document.title = t(code, docKey);

    document.querySelectorAll("[data-doc-link]").forEach(function (a) {
      a.href = docLink(code, a.getAttribute("data-doc-link"));
    });

    document.querySelectorAll("img[data-shot]").forEach(function (img, i) {
      var src = img.getAttribute("data-shot").replace("{lang}", shotDir(code));
      if (img.getAttribute("src") !== src) img.setAttribute("src", src);
      img.alt = t(code, "shot_alt") + " " + (i + 1);
    });

    var flag = document.querySelector("[data-lang-flag]");
    if (flag) { flag.src = base + "assets/img/flags/" + meta.flag + ".webp"; }
    var label = document.querySelector("[data-lang-code]");
    if (label) label.textContent = meta.code.toUpperCase();

    document.querySelectorAll(".lang-menu button").forEach(function (b) {
      b.setAttribute("aria-current", b.getAttribute("data-code") === code ? "true" : "false");
    });
  }

  var langBtn = document.querySelector("[data-lang-toggle]");
  var menu = document.querySelector(".lang-menu");

  function closeMenu() {
    if (!menu) return;
    menu.classList.remove("open");
    langBtn.setAttribute("aria-expanded", "false");
  }

  if (langBtn && menu) {
    langs.forEach(function (l) {
      var li = document.createElement("li");
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-code", l.code);
      b.setAttribute("lang", l.lang);
      var img = document.createElement("img");
      img.src = base + "assets/img/flags/" + l.flag + ".webp";
      img.alt = ""; img.width = 24; img.height = 18; img.loading = "lazy";
      b.appendChild(img);
      b.appendChild(document.createTextNode(l.name));
      b.addEventListener("click", function () {
        store("zg-lang", l.code);
        applyLang(l.code, true);
        closeMenu();
        langBtn.focus();
      });
      li.appendChild(b);
      menu.appendChild(li);
    });

    langBtn.addEventListener("click", function () {
      var open = !menu.classList.contains("open");
      menu.classList.toggle("open", open);
      langBtn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        var cur = menu.querySelector('[aria-current="true"]') || menu.querySelector("button");
        cur && cur.focus();
      }
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest(".lang")) closeMenu();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("open")) { closeMenu(); langBtn.focus(); }
    });
  }

  applyLang(pickLang(), false);

  // ---------- появление при прокрутке ----------

  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("in"); });
  }

  // ---------- лента скриншотов ----------

  var shots = document.querySelector(".shots");
  if (shots) {
    document.querySelectorAll("[data-shots]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var dir = btn.getAttribute("data-shots") === "next" ? 1 : -1;
        var step = shots.querySelector("figure");
        var w = step ? step.getBoundingClientRect().width + 18 : 280;
        shots.scrollBy({ left: dir * w * 2, behavior: reduceMotion ? "auto" : "smooth" });
      });
    });
  }

  // ---------- мини-игра 2048 ----------

  var board = document.querySelector("[data-board]");
  if (board) initBoard(board);

  function initBoard(el) {
    var N = 4;
    var layer = el.querySelector(".tiles");
    var over = el.querySelector(".board-over");
    var overText = over.querySelector("[data-over-text]");
    var scoreEl = document.querySelector("[data-score]");
    var grid, score, nextId, busy, won, queued;

    function empty() {
      var g = [];
      for (var y = 0; y < N; y++) { g.push([]); for (var x = 0; x < N; x++) g[y].push(null); }
      return g;
    }

    function place(tile) {
      tile.el.style.setProperty("--x", tile.x);
      tile.el.style.setProperty("--y", tile.y);
    }

    function make(v, x, y, cls) {
      var d = document.createElement("div");
      d.className = "tile " + (cls || "");
      d.setAttribute("data-v", v);
      if (v > 2048) d.classList.add("big");
      d.textContent = v;
      var tile = { id: nextId++, v: v, x: x, y: y, el: d };
      place(tile);
      layer.appendChild(d);
      return tile;
    }

    function spawn() {
      var free = [];
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) if (!grid[y][x]) free.push([x, y]);
      if (!free.length) return;
      var c = free[Math.floor(Math.random() * free.length)];
      grid[c[1]][c[0]] = make(Math.random() < 0.9 ? 2 : 4, c[0], c[1], "new");
    }

    function setScore(v) {
      score = v;
      if (scoreEl) scoreEl.textContent = v.toLocaleString(root.lang || "en").replace(/ |,/g, " ");
    }

    function reset() {
      layer.innerHTML = "";
      grid = empty(); nextId = 0; busy = false; won = false; queued = null;
      setScore(0);
      over.classList.remove("show");
      spawn(); spawn();
    }

    function canMove() {
      for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
        var t0 = grid[y][x];
        if (!t0) return true;
        if (x + 1 < N && grid[y][x + 1] && grid[y][x + 1].v === t0.v) return true;
        if (y + 1 < N && grid[y + 1][x] && grid[y + 1][x].v === t0.v) return true;
      }
      return false;
    }

    function move(dx, dy) {
      // быстрые нажатия подряд не теряются: следующее ждёт конца хода
      if (busy) { queued = [dx, dy]; return; }
      var moved = false, gained = 0, dying = [];
      var xs = [], ys = [];
      for (var i = 0; i < N; i++) { xs.push(i); ys.push(i); }
      if (dx === 1) xs.reverse();
      if (dy === 1) ys.reverse();
      var mergedAt = empty();

      ys.forEach(function (y) {
        xs.forEach(function (x) {
          var tile = grid[y][x];
          if (!tile) return;
          var cx = x, cy = y;
          while (true) {
            var nx = cx + dx, ny = cy + dy;
            if (nx < 0 || ny < 0 || nx >= N || ny >= N) break;
            var other = grid[ny][nx];
            if (!other) { cx = nx; cy = ny; continue; }
            if (other.v === tile.v && !mergedAt[ny][nx]) {
              // слияние: плитка уезжает на место соседки и исчезает
              grid[y][x] = null;
              tile.x = nx; tile.y = ny; place(tile);
              dying.push(tile, other);
              var merged = { v: tile.v * 2, x: nx, y: ny };
              mergedAt[ny][nx] = merged;
              grid[ny][nx] = merged;
              gained += merged.v;
              moved = true;
              return;
            }
            break;
          }
          if (cx !== x || cy !== y) {
            grid[y][x] = null; grid[cy][cx] = tile;
            tile.x = cx; tile.y = cy; place(tile);
            moved = true;
          }
        });
      });

      if (!moved) return;
      busy = true;
      setTimeout(function () {
        dying.forEach(function (d) { d.el.remove(); });
        for (var y = 0; y < N; y++) for (var x = 0; x < N; x++) {
          var m = mergedAt[y][x];
          if (m) {
            grid[y][x] = make(m.v, x, y, "merged");
            if (m.v === 2048) won = true;
          }
        }
        setScore(score + gained);
        spawn();
        busy = false;
        if (won) { won = false; queued = null; showOver("demo_win"); }
        else if (!canMove()) { queued = null; showOver("demo_over"); }
        else if (queued) { var q = queued; queued = null; move(q[0], q[1]); }
      }, reduceMotion ? 0 : 125);
    }

    function showOver(key) {
      overText.setAttribute("data-i18n", key);
      overText.textContent = t(current, key);
      over.classList.add("show");
    }

    // Клавиши — только когда поле в фокусе: иначе стрелки не листали бы страницу
    el.addEventListener("keydown", function (e) {
      var k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (!k) return;
      e.preventDefault();
      move(k[0], k[1]);
    });

    var start = null;
    el.addEventListener("pointerdown", function (e) {
      start = { x: e.clientX, y: e.clientY };
      el.focus({ preventScroll: true });
    });
    window.addEventListener("pointerup", function (e) {
      if (!start) return;
      var ddx = e.clientX - start.x, ddy = e.clientY - start.y;
      start = null;
      if (Math.max(Math.abs(ddx), Math.abs(ddy)) < 24) return;
      if (Math.abs(ddx) > Math.abs(ddy)) move(ddx > 0 ? 1 : -1, 0);
      else move(0, ddy > 0 ? 1 : -1);
    });
    window.addEventListener("pointercancel", function () { start = null; });

    document.querySelectorAll("[data-new-game]").forEach(function (b) { b.addEventListener("click", reset); });

    reset();
  }
})();
