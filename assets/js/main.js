/* =========================================================================
   MOTORA — логика и анимации. Весь контент — в assets/js/config.js
   ========================================================================= */
(function () {
  "use strict";

  const C = window.SITE_CONFIG || {};
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const get = (p) => p.split(".").reduce((o, k) => (o == null ? o : o[k]), C);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = (n, l = 2) => String(n).padStart(l, "0");
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const money = (n) => Math.round(n).toLocaleString("ru-RU");
  const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = matchMedia("(hover: hover) and (pointer: fine)").matches;
  const isDesktop = () => innerWidth > 960;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* недоступно */ } }
  };

  /* ---------- Единый цикл скролла (все эффекты подписываются сюда) ---------- */
  const onScrollFns = [];
  let ticking = false;
  const runScroll = () => { onScrollFns.forEach((f) => f()); ticking = false; };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(runScroll); } }, { passive: true });
  addEventListener("resize", () => requestAnimationFrame(runScroll));

  /* ===================== 1. Тема, SEO, привязки ===================== */
  function setup() {
    const t = C.theme || {}, st = document.documentElement.style;
    if (t.accent) st.setProperty("--accent", t.accent);
    if (t.bg) st.setProperty("--bg", t.bg);
    if (t.text) st.setProperty("--text", t.text);
    if (C.seo?.title) document.title = C.seo.title;
    if (C.seo?.description) $('meta[name="description"]').setAttribute("content", C.seo.description);

    $$("[data-bind]").forEach((el) => { const v = get(el.dataset.bind); if (v != null) el.textContent = v; });
    $$("[data-href-bind]").forEach((el) => { const v = get(el.dataset.hrefBind); if (v) el.href = v; });
    $$('[data-href="tel"]').forEach((el) => { el.href = "tel:" + String(get("contacts.phone") || "").replace(/[^\d+]/g, ""); });
    $$('[data-href="mailto"]').forEach((el) => { el.href = "mailto:" + (get("contacts.email") || ""); });
    $$("[data-year]").forEach((el) => { el.textContent = new Date().getFullYear(); });
  }

  /* ===================== 2. Рендер блоков из config ===================== */
  const R = {
    brands: () => { const s = (C.brands || []).map((b) => `<span>${esc(b)}</span>`).join(""); return s + s; },
    brandOptions: () => (C.brands || []).map((b) => `<option value="${esc(b)}">`).join(""),

    stats: () => (C.stats || []).map((s) => {
      const str = money(s.value);
      let i = 0;
      const cols = [...str].map((ch) => {
        if (!/\d/.test(ch)) return `<span class="odo__sep"></span>`;
        const digits = Array.from({ length: 20 }, (_, k) => `<span>${k % 10}</span>`).join("");
        return `<span class="odo__col" data-d="${ch}" style="--i:${i++}">${digits}</span>`;
      }).join("");
      return `<div class="odo__item reveal"><div class="odo__num" aria-label="${esc(str)}">${cols}</div><p>${esc(s.label)}</p></div>`;
    }).join(""),

    points: () => (C.systems || []).map((s, i) =>
      `<button type="button" class="pt" style="--x:${s.x}%;--y:${s.y}%" data-sys="${i}" aria-label="${esc(s.title)}"><span>${esc(s.title)}</span></button>`).join(""),

    systemTabs: () => (C.systems || []).map((s, i) =>
      `<button type="button" role="tab" data-sys="${i}" aria-selected="${i === 0}">${esc(s.title)}</button>`).join(""),

    process: () => (C.process || []).map((p, i) =>
      `<article class="pcard"><div class="pcard__time"><span>T+${esc(p.time)}</span><span>${pad(i + 1)}/${pad(C.process.length)}</span></div>
        <div><h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div><span class="pcard__n" aria-hidden="true">${pad(i + 1)}</span></article>`).join(""),

    classes: () => `<span class="seg__pill" aria-hidden="true"></span>` + (get("calculator.classes") || []).map((c, i) =>
      `<button type="button" role="radio" aria-checked="${i === 0}" data-k="${c.k}">${esc(c.name)}<small>×${c.k}</small></button>`).join(""),

    calcServices: () => (get("calculator.services") || []).map((s, i) =>
      `<label class="ck"><input type="checkbox" value="${i}"${i === 0 ? " checked" : ""}><span class="ck__box"><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg></span>
        <span class="ck__name">${esc(s.name)}</span><span class="ck__price">${money(s.price)} ₽</span></label>`).join(""),

    guarantees: () => (C.guarantees || []).map((g, i) =>
      `<article class="scard" style="--i:${i}"><span class="mono">${pad(i + 1)} / ${pad(C.guarantees.length)}</span>
        <div class="scard__num">${esc(g.num)}</div><div><h3>${esc(g.title)}</h3><p class="scard__text">${esc(g.text)}</p></div></article>`).join(""),

    reviews: () => (C.reviews || []).map((r, i) =>
      `<article class="rcard" data-i="${i}"><div class="rcard__stars" aria-label="5 из 5">★★★★★</div>
        <p class="rcard__text">«${esc(r.text)}»</p>
        <div class="rcard__who"><span class="rcard__ava" aria-hidden="true">${esc((r.name || "?")[0])}</span><div><b>${esc(r.name)}</b><span class="mono">${esc(r.car)}</span></div></div></article>`).join(""),

    faq: () => (C.faq || []).map((f, i) =>
      `<div class="qa reveal${i === 0 ? " open" : ""}"><button class="qa__btn" type="button" aria-expanded="${i === 0}" aria-controls="qa${i}">
        <span class="mono">${pad(i + 1)}</span><span>${esc(f.q)}</span><span class="qa__ic" aria-hidden="true"></span></button>
        <div class="qa__body" id="qa${i}" role="region"><div><p>${esc(f.a)}</p></div></div></div>`).join(""),

    serviceOptions: () => `<option value="Диагностика / не знаю">Не знаю — нужна диагностика</option>` + (C.systems || []).map((s) =>
      `<optgroup label="${esc(s.title)}">` + s.items.map(([n, p]) => `<option value="${esc(n)}">${esc(n)} — ${esc(p)}</option>`).join("") + `</optgroup>`).join(""),

    hours: () => (get("contacts.hoursText") || []).map((h) => `<div class="hours-row"><span>${esc(h.days)}</span><span>${esc(h.time)}</span></div>`).join(""),

    socials: () => (C.socials || []).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)}</a>`).join(""),

    footerLetters: () => [...String(get("brand.name") || "")].map((ch, i) => `<span style="--i:${i}">${esc(ch)}</span>`).join(""),

    map: () => {
      const src = get("contacts.mapEmbed");
      if (src) return `<iframe src="${esc(src)}" loading="lazy" title="Карта проезда" allowfullscreen></iframe>`;
      return `<svg viewBox="0 0 600 480" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <rect width="600" height="480" fill="#15171a"/>
        <g stroke="#23262b" stroke-width="18" fill="none"><path d="M-10 90 L620 130"/><path d="M-10 300 L620 250"/><path d="M120 -10 L180 490"/><path d="M450 -10 L400 490"/></g>
        <g stroke="#1d2024" stroke-width="7" fill="none"><path d="M-10 200 L620 190"/><path d="M290 -10 L300 490"/><path d="M-10 410 L620 380"/><path d="M540 -10 L560 490"/></g>
        <path d="M-10 380 C 120 360 160 420 260 400 S 480 330 620 360" stroke="#1b2a33" stroke-width="30" fill="none"/>
        <g fill="#1a1c20"><rect x="200" y="140" width="70" height="40" rx="4"/><rect x="320" y="210" width="60" height="70" rx="4"/><rect x="480" y="150" width="50" height="60" rx="4"/><rect x="200" y="310" width="80" height="50" rx="4"/></g>
        <path class="map__route" d="M150 470 L165 300 L300 280 L372 192" stroke="#ff5b14" stroke-width="4" fill="none" stroke-linecap="round"/>
        <circle cx="150" cy="470" r="7" fill="#ecebe6"/>
      </svg>
      <div class="map__pin"><b>${esc(get("brand.name"))} · ${esc(get("contacts.address"))}</b><i></i></div>
      <a class="btn btn--accent btn--sm" href="${esc(get("contacts.mapLink") || "#")}" target="_blank" rel="noopener"><span>Построить маршрут</span></a>`;
    }
  };
  const renderAll = () => $$("[data-render]").forEach((el) => { const f = R[el.dataset.render]; if (f) el.innerHTML = f(); });

  /* ===================== 3. Прелоадер «ворота гаража» ===================== */
  function preloader() {
    const g = $(".garage"), pct = $(".garage__pct"), bar = $(".garage__bar");
    const done = () => {
      g.classList.add("open");
      setTimeout(() => document.body.classList.add("ready"), 350);
      setTimeout(() => g.remove(), 1700);
    };
    if (REDUCED) { document.body.classList.add("ready"); g.remove(); return; }
    const t0 = performance.now(), dur = 1300;
    const step = (t) => {
      const p = clamp((t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      pct.textContent = pad(Math.round(e * 100), 3);
      bar.style.setProperty("--p", e);
      if (p < 1) requestAnimationFrame(step); else setTimeout(done, 150);
    };
    requestAnimationFrame(step);
  }

  /* ===================== 4. Разбивка заголовков на слова ===================== */
  function splitHeadings() {
    $$(".split").forEach((el) => {
      let i = 0;
      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
              const w = document.createElement("span"); w.className = "w";
              const inner = document.createElement("span"); inner.textContent = part; inner.style.setProperty("--i", i++);
              w.appendChild(inner); frag.appendChild(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1) walk(n);
        });
      };
      walk(el);
    });
  }

  /* ===================== 5. HERO: машина едет со скроллом ===================== */
  function hero() {
    const sec = $(".hero"), sticky = $(".hero__sticky"), car = $(".car");
    const wheels = $$("[data-wheel]");
    const speedEl = $(".gauge__speed"), gearEl = $(".gauge__gear"), rpmEl = $(".gauge__rpm");
    const max = +get("hero.maxSpeed") || 240;

    // деления спидометра
    const ticks = $(".gauge__ticks"), cx = 110, cy = 113;
    let html = "";
    for (let v = 0; v <= max; v += max / 12) {
      const a = (-129 + (v / max) * 258) * Math.PI / 180, major = Math.round(v) % Math.round(max / 6) === 0;
      const r1 = 84, r2 = major ? 72 : 77;
      html += `<line class="${major ? "major" : ""}" x1="${cx + r1 * Math.sin(a)}" y1="${cy - r1 * Math.cos(a)}" x2="${cx + r2 * Math.sin(a)}" y2="${cy - r2 * Math.cos(a)}"/>`;
      if (major) html += `<text x="${cx + 60 * Math.sin(a)}" y="${cy - 60 * Math.cos(a) + 3}">${Math.round(v)}</text>`;
    }
    ticks.innerHTML = html;

    let mx = 0, my = 0;
    if (FINE && !REDUCED) addEventListener("mousemove", (e) => { mx = e.clientX / innerWidth - .5; my = e.clientY / innerHeight - .5; requestAnimationFrame(update); });

    function update() {
      const r = sec.getBoundingClientRect(), vh = innerHeight, vw = innerWidth;
      const p = clamp(-r.top / (r.height - vh));
      const ease = p * p * (3 - 2 * p);
      const startX = vw * (vw > 960 ? 0.04 : -0.06);
      const dx = ease * vw * 1.05;
      const s = sticky.style;
      s.setProperty("--carx", startX + dx + "px");
      s.setProperty("--road", -p * 3200 + "px");
      s.setProperty("--cy", -Math.max(0, p - .3) * 160 + "px");
      s.setProperty("--co", clamp(1 - Math.max(0, p - .45) * 2.2));
      s.setProperty("--gx", -p * 400 + mx * -40 + "px");
      s.setProperty("--gy", my * -20 + "px");
      s.setProperty("--tilt", p * 35 + "deg");
      s.setProperty("--g", ease);
      // колёса: угол = пройденный путь / длина окружности
      const wheelR = (60 / 1000) * car.offsetWidth;
      const deg = (dx / (2 * Math.PI * wheelR)) * 360;
      wheels.forEach((w) => w.style.setProperty("--wr", deg + "deg"));
      const speed = Math.round(ease * max);
      speedEl.textContent = pad(speed, 3);
      const gear = speed === 0 ? "N" : Math.min(6, 1 + Math.floor(speed / (max / 6)));
      gearEl.textContent = gear;
      const inGear = speed === 0 ? 0 : (speed % (max / 6)) / (max / 6);
      rpmEl.textContent = (speed === 0 ? 0.8 : 1.5 + inGear * 5).toFixed(1);
    }
    onScrollFns.push(update);
    update();
  }

  /* ===================== 6. Шапка, меню, статус ===================== */
  function header() {
    const h = $(".header"), fab = $(".fab"), booking = $("#booking");
    let last = scrollY;
    onScrollFns.push(() => {
      const y = scrollY;
      h.classList.toggle("scrolled", y > 30);
      h.classList.toggle("hide", y > 500 && y > last && !document.body.classList.contains("locked"));
      last = y;
      const b = booking.getBoundingClientRect();
      fab.classList.toggle("on", y > innerHeight && (b.top > innerHeight || b.bottom < 0));
    });
    const links = $$(".nav a");
    const io = new IntersectionObserver((en) => en.forEach((e) => {
      if (e.isIntersecting) links.forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
    }), { rootMargin: "-45% 0px -50% 0px" });
    links.forEach((a) => { const t = $(a.getAttribute("href")); if (t) io.observe(t); });

    // мобильное меню
    const btn = $(".burger"), menu = $("#menu");
    const set = (o) => {
      btn.setAttribute("aria-expanded", o); btn.setAttribute("aria-label", o ? "Закрыть меню" : "Открыть меню");
      menu.classList.toggle("open", o); menu.setAttribute("aria-hidden", !o); document.body.classList.toggle("locked", o);
    };
    btn.addEventListener("click", () => set(btn.getAttribute("aria-expanded") !== "true"));
    $$("a", menu).forEach((a) => a.addEventListener("click", () => set(false)));
    addEventListener("keydown", (e) => { if (e.key === "Escape") set(false); });

    // «Открыто сейчас» по расписанию
    const sch = get("contacts.schedule") || {};
    const upd = () => {
      const d = new Date(), today = sch[d.getDay()], hh = d.getHours() + d.getMinutes() / 60;
      const open = today && hh >= today[0] && hh < today[1];
      let txt = open ? `Открыто до ${pad(today[1])}:00` : "Сейчас закрыто";
      if (!open) {
        for (let k = 0; k < 7; k++) {
          const dd = (d.getDay() + k) % 7, s = sch[dd];
          if (!s) continue;
          if (k === 0 && hh < s[0]) { txt = `Откроемся в ${pad(s[0])}:00`; break; }
          if (k > 0) { txt = `Откроемся ${k === 1 ? "завтра" : ""} в ${pad(s[0])}:00`.replace("  ", " "); break; }
        }
      }
      $$("[data-open-status]").forEach((el) => { el.classList.toggle("open", !!open); el.classList.toggle("closed", !open); $("span", el).textContent = txt; });
    };
    upd(); setInterval(upd, 60000);
  }

  /* ===================== 7. Курсор и магнитные кнопки ===================== */
  function cursor() {
    if (!FINE || REDUCED) return;
    const c = $(".cursor"), dot = $(".cursor__dot"), ring = $(".cursor__ring");
    let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
    addEventListener("mousemove", (e) => { x = e.clientX; y = e.clientY; dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`; });
    (function loop() { rx += (x - rx) * .18; ry += (y - ry) * .18; ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`; requestAnimationFrame(loop); })();
    document.addEventListener("mouseover", (e) => {
      const t = e.target.closest("a, button, label, input, select, textarea, .rcard");
      c.classList.toggle("hover", !!t);
      const lab = e.target.closest("[data-cursor]");
      c.classList.toggle("label", !!lab);
      ring.textContent = lab ? lab.dataset.cursor : "";
    });
    $$(".magnetic").forEach((b) => {
      b.addEventListener("mousemove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .2}px, ${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      b.addEventListener("mouseleave", () => { b.style.transform = ""; });
    });
  }

  /* ===================== 8. Появление, заголовки, одометр, футер ===================== */
  function reveals() {
    const targets = $$(".reveal, .split, .odo__item, .footer__big");
    const show = (el) => {
      el.classList.add("in");
      if (el.classList.contains("odo__item")) $$(".odo__col", el).forEach((col) => { col.style.transform = `translateY(-${(+col.dataset.d + 10)}em)`; });
    };
    if (REDUCED || !("IntersectionObserver" in window)) { targets.forEach(show); return; }
    const io = new IntersectionObserver((en) => en.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } }), { threshold: .15 });
    targets.forEach((t) => io.observe(t));
  }

  /* ===================== 9. Бренды: скорость зависит от скролла ===================== */
  function brands() {
    const track = $(".brands__track"); if (!track) return;
    let x = 0, vel = 0, lastY = scrollY;
    (function loop() {
      const dy = scrollY - lastY; lastY = scrollY;
      vel += (dy - vel) * .1;
      x -= (REDUCED ? 0 : 0.6) + Math.abs(vel) * .5;
      const half = track.scrollWidth / 2;
      if (half && -x >= half) x += half;
      track.style.transform = `translate3d(${x}px,0,0)`;
      track.style.setProperty("--skew", clamp(-vel * .4, -14, 14) + "deg");
      requestAnimationFrame(loop);
    })();
  }

  /* ===================== 10. Интерактивная диагностика ===================== */
  function diagnostics() {
    const sys = C.systems || []; if (!sys.length) return;
    const info = $(".diag__info"); let cur = 0, auto;
    const select = (i, user) => {
      cur = i; const s = sys[i];
      $$("[data-sys]").forEach((b) => {
        const on = +b.dataset.sys === i;
        if (b.classList.contains("pt")) b.classList.toggle("on", on); else b.setAttribute("aria-selected", on);
      });
      $('[data-diag="code"]').textContent = s.id.toUpperCase() + "-" + pad(i + 1, 3);
      $('[data-diag="title"]').textContent = s.title;
      $('[data-diag="text"]').textContent = s.text;
      $('[data-diag="list"]').innerHTML = s.items.map(([n, p]) => `<li><span>${esc(n)}</span><b>${esc(p)}</b></li>`).join("");
      info.classList.remove("swap"); void info.offsetWidth; info.classList.add("swap");
      if (user) clearInterval(auto);
    };
    $$("[data-sys]").forEach((b) => b.addEventListener("click", () => select(+b.dataset.sys, true)));
    $('[data-diag="cta"]').addEventListener("click", () => { const sel = $("#b-service"); if (sel) sel.value = sys[cur].items[0][0]; });
    select(0);
    if (!REDUCED) {
      const io = new IntersectionObserver((en) => {
        clearInterval(auto);
        if (en[0].isIntersecting) auto = setInterval(() => select((cur + 1) % sys.length), 4000);
      }, { threshold: .4 });
      io.observe($(".diag__grid"));
      $(".diag__grid").addEventListener("pointerdown", () => { clearInterval(auto); io.disconnect(); }, { once: true });
    }
  }

  /* ===================== 11. Процесс: горизонтальный скролл ===================== */
  function processScroll() {
    const sec = $(".process"), track = $(".process__track"), sticky = $(".process__sticky");
    onScrollFns.push(() => {
      if (!isDesktop()) { track.style.removeProperty("--px"); return; }
      const r = sec.getBoundingClientRect();
      const p = clamp(-r.top / (r.height - innerHeight));
      const dist = track.scrollWidth - innerWidth;
      track.style.setProperty("--px", -p * Math.max(0, dist) + "px");
      sticky.style.setProperty("--pp", p);
    });
  }

  /* ===================== 12. Калькулятор ===================== */
  function calculator() {
    const cfg = C.calculator || {}; if (!cfg.services) return;
    const seg = $(".seg"), pill = $(".seg__pill"), segBtns = $$("button", seg);
    const list = $(".receipt__list"), sumEl = $(".receipt__sum");
    $(".receipt__no").textContent = pad(Math.floor(Math.random() * 9000) + 1000, 4);
    let k = cfg.classes?.[0]?.k || 1, shown = 0, total = 0, raf;

    const movePill = () => {
      const a = segBtns.find((b) => b.getAttribute("aria-checked") === "true"); if (!a || !pill) return;
      pill.style.width = a.offsetWidth + "px"; pill.style.transform = `translateX(${a.offsetLeft - 4}px)`;
    };
    const animateSum = () => {
      cancelAnimationFrame(raf);
      const from = shown, t0 = performance.now();
      const step = (t) => {
        const p = clamp((t - t0) / 700), e = 1 - Math.pow(1 - p, 3);
        shown = from + (total - from) * e; sumEl.textContent = money(shown);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const calc = () => {
      const picked = $$(".ck input:checked").map((i) => cfg.services[+i.value]);
      total = picked.reduce((s, x) => s + x.price * k, 0);
      list.innerHTML = picked.length
        ? picked.map((x) => `<li><span>${esc(x.name)}</span><b>${money(x.price * k)} ₽</b></li>`).join("")
        : `<li class="receipt__empty">Выберите услуги слева</li>`;
      animateSum();
      return picked;
    };
    segBtns.forEach((b) => b.addEventListener("click", () => {
      segBtns.forEach((x) => x.setAttribute("aria-checked", x === b)); k = +b.dataset.k; movePill(); calc();
    }));
    $$(".ck input").forEach((i) => i.addEventListener("change", calc));
    addEventListener("resize", movePill);
    movePill(); calc();
    setTimeout(movePill, 600); // после загрузки шрифтов

    $("[data-calc-cta]").addEventListener("click", () => {
      const picked = calc();
      const cls = segBtns.find((b) => b.getAttribute("aria-checked") === "true");
      const cm = $("#b-comment");
      if (cm && picked.length) cm.value = `Расчёт с сайта (${cls ? cls.firstChild.textContent : ""}): ${picked.map((p) => p.name).join(", ")}. Итого ≈ ${money(total)} ₽`;
    });
  }

  /* ===================== 13. Гарантии: карточки уходят в стопку ===================== */
  function stack() {
    const cards = $$(".scard");
    onScrollFns.push(() => {
      cards.forEach((c, i) => {
        const next = cards[i + 1];
        if (!next) return;
        const a = c.getBoundingClientRect(), b = next.getBoundingClientRect();
        const p = clamp(1 - (b.top - a.top) / a.height);
        c.style.setProperty("--s", 1 - p * .06);
        c.style.setProperty("--br", 1 - p * .35);
      });
    });
  }

  /* ===================== 14. Отзывы: колода со свайпом ===================== */
  function deck() {
    const cards = $$(".rcard"); if (!cards.length) return;
    let order = cards.map((_, i) => i);
    const count = $(".reviews__count");
    const paint = () => {
      order.forEach((ci, k) => { cards[ci].style.setProperty("--k", Math.min(k, 3)); cards[ci].dataset.k = k; cards[ci].setAttribute("aria-hidden", k !== 0); });
      count.textContent = `${pad(order[0] + 1)} / ${pad(cards.length)}`;
    };
    const throwTop = (dir = 1) => {
      const top = cards[order[0]];
      top.classList.add("fly");
      top.style.transform = `translate(${dir * 130}%, -10%) rotate(${dir * 24}deg)`;
      setTimeout(() => {
        top.classList.remove("fly"); top.style.transform = "";
        order.push(order.shift()); paint();
      }, 420);
    };
    const back = () => { order.unshift(order.pop()); paint(); };
    $('[data-deck="next"]').addEventListener("click", () => throwTop(1));
    $('[data-deck="prev"]').addEventListener("click", back);

    // перетаскивание верхней карточки
    let sx = 0, dx = 0, dragging = null;
    cards.forEach((c) => {
      c.addEventListener("pointerdown", (e) => {
        if (c.dataset.k !== "0") return;
        dragging = c; sx = e.clientX; dx = 0; c.classList.add("drag"); c.setPointerCapture(e.pointerId);
      });
      c.addEventListener("pointermove", (e) => {
        if (dragging !== c) return;
        dx = e.clientX - sx;
        c.style.transform = `translate(${dx}px, 0) rotate(${dx / 18}deg)`;
      });
      const end = () => {
        if (dragging !== c) return;
        dragging = null; c.classList.remove("drag");
        if (Math.abs(dx) > 90) throwTop(Math.sign(dx)); else c.style.transform = "";
      };
      c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end);
    });
    paint();
  }

  /* ===================== 15. FAQ ===================== */
  function faq() {
    $$(".qa").forEach((q) => {
      const b = $(".qa__btn", q);
      b.addEventListener("click", () => {
        const open = !q.classList.contains("open");
        $$(".qa").forEach((x) => { x.classList.remove("open"); $(".qa__btn", x).setAttribute("aria-expanded", "false"); });
        q.classList.toggle("open", open); b.setAttribute("aria-expanded", open);
      });
    });
  }

  /* ===================== 16. Модалки ===================== */
  let lastFocus;
  const openModal = (m) => { lastFocus = document.activeElement; m.hidden = false; document.body.classList.add("locked"); setTimeout(() => { const f = $("button, input", m); if (f) f.focus(); }, 60); };
  const closeModal = (m) => { m.hidden = true; if (!$$(".modal").some((x) => !x.hidden)) document.body.classList.remove("locked"); if (lastFocus) lastFocus.focus(); };
  function modals() {
    $$(".modal").forEach((m) => $$("[data-close]", m).forEach((b) => b.addEventListener("click", () => closeModal(m))));
    addEventListener("keydown", (e) => { if (e.key === "Escape") $$(".modal").filter((m) => !m.hidden).forEach(closeModal); });
  }

  /* ===================== 17. Форма записи ===================== */
  function booking() {
    const form = $(".form"); if (!form) return;
    const name = $("#b-name"), phone = $("#b-phone"), plate = $("#b-plate"), region = $('[name="region"]'), date = $("#b-date");
    const d = new Date(), iso = (x) => `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`;
    date.min = iso(d); date.value = iso(d);

    phone.addEventListener("input", () => {
      let v = phone.value.replace(/\D/g, "");
      if (!v) { phone.value = ""; return; }
      if (v[0] === "8") v = "7" + v.slice(1);
      if (v[0] !== "7") v = "7" + v;
      v = v.slice(0, 11);
      let o = "+7";
      if (v.length > 1) o += " (" + v.slice(1, 4);
      if (v.length >= 4) o += ")";
      if (v.length > 4) o += " " + v.slice(4, 7);
      if (v.length > 7) o += "-" + v.slice(7, 9);
      if (v.length > 9) o += "-" + v.slice(9, 11);
      phone.value = o;
    });
    // госномер: только допустимые буквы, латиница → кириллица
    const map = { A: "А", B: "В", E: "Е", K: "К", M: "М", H: "Н", O: "О", P: "Р", C: "С", T: "Т", Y: "У", X: "Х" };
    plate.addEventListener("input", () => {
      plate.value = plate.value.toUpperCase().replace(/[A-Z]/g, (c) => map[c] || "").replace(/[^АВЕКМНОРСТУХ0-9 ]/g, "").slice(0, 9);
    });
    region.addEventListener("input", () => { region.value = region.value.replace(/\D/g, "").slice(0, 3); });

    const err = (i, bad) => i.closest(".f").classList.toggle("err", bad);
    [name, phone].forEach((i) => i.addEventListener("input", () => err(i, false)));

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const badN = name.value.trim().length < 2, badP = phone.value.replace(/\D/g, "").length < 11;
      err(name, badN); err(phone, badP);
      if (badN || badP) { (badN ? name : phone).focus(); return; }
      const data = {
        name: name.value.trim(), phone: phone.value, car: $("#b-car").value.trim(),
        plate: (plate.value + " " + region.value).trim(), service: $("#b-service").value,
        date: date.value.split("-").reverse().join("."), comment: $("#b-comment").value.trim()
      };
      const no = "MT-" + pad(Math.floor(Math.random() * 90000) + 10000, 5);
      const text = `Заявка ${no}\nИмя: ${data.name}\nТелефон: ${data.phone}\nАвто: ${data.car} ${data.plate}\nУслуга: ${data.service}\nДата: ${data.date}\n${data.comment}`;
      const b = C.booking || {}; let link = "";

      form.classList.add("sending");
      await new Promise((r) => setTimeout(r, REDUCED ? 0 : 900));
      try {
        if (b.mode === "endpoint" && b.endpoint) await fetch(b.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ no, ...data }) });
        else if (b.mode === "whatsapp" && b.whatsapp) link = `https://wa.me/${b.whatsapp}?text=${encodeURIComponent(text)}`;
        else if (b.mode === "telegram" && b.telegram) link = `https://t.me/${b.telegram}?text=${encodeURIComponent(text)}`;
      } catch (ex) { /* сеть недоступна — показываем подтверждение */ }
      form.classList.remove("sending");

      const rows = [["Номер", no], ["Клиент", data.name], ["Авто", [data.car, data.plate].filter(Boolean).join(" · ") || "—"], ["Услуга", data.service], ["Дата", data.date]];
      $(".ticket__dl").innerHTML = rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");
      $(".ticket__note").innerHTML = `Перезвоним на ${esc(data.phone)} в течение 10 минут.` + (link ? ` <a href="${esc(link)}" target="_blank" rel="noopener">Отправить в мессенджер →</a>` : "");
      if (link) { try { window.open(link, "_blank", "noopener"); } catch (ex) { /* ссылка в окне */ } }
      openModal($("#okModal"));
      form.reset(); date.value = iso(new Date());
    });
  }

  /* ===================== 18. Cookie ===================== */
  function cookies() {
    const KEY = "motora_cookie_v1", bar = $(".cookie"), modal = $("#cookieModal");
    const read = () => { try { return JSON.parse(store.get(KEY)) || null; } catch (e) { return null; } };
    const hide = () => { bar.classList.remove("on"); setTimeout(() => { bar.hidden = true; }, 600); };
    const save = (prefs) => {
      store.set(KEY, JSON.stringify({ necessary: true, ...prefs, date: new Date().toISOString() }));
      hide(); if (!modal.hidden) closeModal(modal);
      // if (prefs.analytics) { /* подключите здесь Яндекс Метрику */ }
    };
    const settings = () => { const c = read() || {}; $$("[data-cookie-type]", modal).forEach((i) => { i.checked = !!c[i.dataset.cookieType]; }); openModal(modal); };
    $$('[data-cookie="accept"]').forEach((b) => b.addEventListener("click", () => save({ analytics: true, marketing: true })));
    $$('[data-cookie="settings"], [data-open-cookies]').forEach((b) => b.addEventListener("click", settings));
    $$('[data-cookie="save"]').forEach((b) => b.addEventListener("click", () => {
      const p = {}; $$("[data-cookie-type]", modal).forEach((i) => { p[i.dataset.cookieType] = i.checked; }); save(p);
    }));
    if (!read()) setTimeout(() => { bar.hidden = false; requestAnimationFrame(() => requestAnimationFrame(() => bar.classList.add("on"))); }, REDUCED ? 0 : 3200);
  }

  /* ===================== Подвал: название всегда влезает в ширину экрана ===================== */
  function fitFooter() {
    const el = $(".footer__big"); if (!el) return;
    const fit = () => {
      el.style.fontSize = "";
      const avail = el.parentElement.clientWidth;
      const w = el.getBoundingClientRect().width;
      if (w > avail) el.style.fontSize = (parseFloat(getComputedStyle(el).fontSize) * avail / w * 0.98) + "px";
    };
    fit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    addEventListener("resize", fit);
  }

  /* ===================== Запуск ===================== */
  document.addEventListener("DOMContentLoaded", () => {
    setup();
    renderAll();
    splitHeadings();
    preloader();
    hero();
    header();
    cursor();
    reveals();
    brands();
    diagnostics();
    processScroll();
    calculator();
    stack();
    deck();
    faq();
    modals();
    booking();
    cookies();
    fitFooter();
    runScroll();
  });
})();
