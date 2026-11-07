const reduce = matchMedia('(prefers-reduced-motion: reduce)');
const money = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

/* The month: each ledger row is a state. Scrolling a row past the line applies it. */
function month() {
  const tank = document.querySelector('.tank');
  const entries = [...document.querySelectorAll('.entry')];
  if (!tank || !entries.length) return;

  const base = tank.querySelector('[data-readout]');
  const fill = base.cloneNode(true);
  fill.classList.add('tank__layer--fill');
  fill.setAttribute('aria-hidden', 'true');
  tank.append(fill);

  const INCOME = 5000;
  let left = 0;
  let save = 12000;
  // Running totals are derived from the rows so the page can't disagree with its own ledger.
  const states = entries.map((el) => {
    const { day, days, delta, save: toSavings } = el.dataset;
    left += Number(delta);
    save += Number(toSavings || 0);
    const remaining = Number(days) - Number(day) + 1;
    return { el, left, save, allow: left / remaining, label: el.querySelector('.entry__day').textContent };
  });

  const all = (attr) => tank.querySelectorAll(`[data-${attr}]`);
  const set = (attr, text) => all(attr).forEach((n) => { n.textContent = text; });
  const shown = { left: 0, allow: 0, save: 12000 };
  let raf = 0;

  function paint() {
    set('left', money(shown.left));
    set('allow', money(shown.allow));
    set('save', money(shown.save));
  }

  function apply(state) {
    states.forEach((s) => s.el.classList.toggle('is-now', s === state));
    set('day', state.label);
    fill.style.clipPath = `inset(${(1 - Math.min(state.left / INCOME, 1)) * 100}% 0 0 0)`;

    cancelAnimationFrame(raf);
    const from = { ...shown };
    const start = performance.now();
    const dur = reduce.matches ? 0 : 480;
    const step = (now) => {
      const t = dur ? Math.min((now - start) / dur, 1) : 1;
      const eased = 1 - (1 - t) ** 3;
      for (const k of Object.keys(shown)) shown[k] = from[k] + (state[k] - from[k]) * eased;
      paint();
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }

  const io = new IntersectionObserver((seen) => {
    const hit = seen.filter((s) => s.isIntersecting).pop();
    if (hit) apply(states.find((s) => s.el === hit.target));
  }, { rootMargin: '-62% 0px -37% 0px' });
  entries.forEach((el) => io.observe(el));
}

/* Runs `tick` every `ms` while on screen. The pause key is the off switch: pausing on
   hover read as broken, since a resting mouse froze it. Returns a function that pauses. */
function rotator(root, button, ms, tick) {
  if (reduce.matches) return () => {};
  let inView = false;
  let held = false;
  let timer = 0;
  const paused = () => button.getAttribute('aria-pressed') === 'true';
  const sync = () => {
    clearTimeout(timer);
    if (inView && !held && !paused() && !document.hidden) timer = setTimeout(() => { tick(); sync(); }, ms);
  };
  button.hidden = false;
  button.addEventListener('click', () => {
    const now = !paused();
    button.setAttribute('aria-pressed', now);
    button.setAttribute('aria-label', button.getAttribute('aria-label').replace(/^(Pause|Play)/, now ? 'Play' : 'Pause'));
    sync();
  });
  // Keyboard users still get a hold while tabbing through; a mouse click never sets one.
  root.addEventListener('focusin', (e) => { held = e.target !== button && e.target.matches(':focus-visible'); sync(); });
  root.addEventListener('focusout', () => { held = false; sync(); });
  document.addEventListener('visibilitychange', sync);
  new IntersectionObserver(([e]) => { inView = e.isIntersecting; sync(); }).observe(root);
  return () => { if (!paused()) button.click(); };
}

/* Hero: the next screenshot wipes across the current one. */
function heroShots() {
  const root = document.querySelector('[data-rotator]');
  if (!root) return;
  const slides = [...root.querySelectorAll('.slide')];
  let i = 0;
  let busy = false;
  if (reduce.matches) return;
  // Unhide and fetch the rest once the page has loaded, so they never compete with the first paint.
  const prepare = () => slides.slice(1).forEach((s) => { s.hidden = false; s.loading = 'eager'; s.setAttribute('aria-hidden', 'true'); });
  if (document.readyState === 'complete') prepare(); else addEventListener('load', prepare, { once: true });

  rotator(root, root.querySelector('.pausekey'), 3200, () => {
    if (busy) return;
    const next = slides[(i + 1) % slides.length];
    if (!next.complete || !next.naturalWidth) return;
    const cur = slides[i];
    busy = true;
    next.classList.add('is-next');
    const wipe = next.animate(
      [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)' }],
      { duration: 700, easing: EASE },
    );
    wipe.onfinish = () => {
      cur.classList.remove('is-on');
      cur.setAttribute('aria-hidden', 'true');
      next.classList.remove('is-next');
      next.classList.add('is-on');
      next.removeAttribute('aria-hidden');
      i = slides.indexOf(next);
      busy = false;
    };
  });
}

/* Strings are the app's own, copied from app/locale/<lang>/LC_MESSAGES/django.po. */
const LANGS = [
  ['en', 'English', ['Transactions', 'Expenses', 'Calendar', 'Rules']],
  ['fr', 'Français', ['Transactions', 'Dépenses', 'Calendrier', 'Règles']],
  ['pt-BR', 'Português', ['Transações', 'Despesas', 'Calendário', 'Regras']],
  ['nl', 'Nederlands', ['Verrichtingen', 'Uitgaven', 'Kalender', 'Regels']],
  ['es', 'Español', ['Transacciones', 'Gastos', 'Calendario', 'Reglas']],
  ['zh-Hant', '繁體中文', ['交易', '支出', '行事曆', '規則']],
  ['it', 'Italiano', ['Transazioni', 'Spese', 'Calendario', 'Regole']],
  ['de', 'Deutsch', ['Transaktionen', 'Ausgaben', 'Kalender', 'Regeln']],
  ['ru', 'Русский', ['Транзакции', 'Расходы', 'Календарь', 'Правила']],
  ['pl', 'Polski', ['Transakcje', 'Wydatki', 'Kalendarz', 'Reguły']],
];

function board() {
  const root = document.querySelector('[data-board]');
  const wrap = document.querySelector('[data-langs]');
  if (!root || !wrap) return;
  const flaps = [...root.querySelectorAll('.flap')];
  let cur = 0;
  let stop = () => {};

  const flip = (i) => {
    if (i === cur) return;
    cur = i;
    const [lang, , words] = LANGS[i];
    [...wrap.children].forEach((b, j) => b.setAttribute('aria-pressed', j === i));
    flaps.forEach((flap, row) => {
      const swap = () => { flap.textContent = words[row]; flap.lang = lang; };
      if (reduce.matches) return swap();
      flap.getAnimations().forEach((a) => a.cancel());
      const delay = row * 70;
      const out = flap.animate(
        [{ transform: 'none', opacity: 1 }, { transform: 'translateY(-35%) rotateX(78deg)', opacity: 0 }],
        { duration: 190, delay, easing: 'cubic-bezier(0.7, 0, 0.84, 0)', fill: 'forwards' },
      );
      out.onfinish = () => {
        swap();
        out.cancel();
        flap.animate(
          [{ transform: 'translateY(35%) rotateX(-78deg)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 340, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' },
        );
      };
    });
  };

  LANGS.forEach(([lang, name], i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.lang = lang;
    b.textContent = name;
    b.setAttribute('aria-pressed', i === 0);
    b.addEventListener('click', () => { flip(i); stop(); }); // a choice sticks: don't flip away from it
    wrap.append(b);
  });
  wrap.hidden = false;

  const pause = document.querySelector('[data-board-pause]');
  wrap.append(pause);
  stop = rotator(root.parentElement, pause, 1500, () => flip((cur + 1) % LANGS.length));
}

function tabs() {
  document.querySelectorAll('[data-tabs]').forEach((list) => {
    list.hidden = false;
    const btns = [...list.querySelectorAll('[role="tab"]')];
    const bar = list.querySelector('.tabs__bar');
    const views = btns.map((b) => document.getElementById(b.getAttribute('aria-controls')));

    const moveBar = (b) => { bar.style.transform = `translateX(${b.offsetLeft}px) scaleX(${b.offsetWidth / 100})`; };
    const select = (i, focus) => {
      btns.forEach((b, j) => {
        const on = i === j;
        b.setAttribute('aria-selected', on);
        b.tabIndex = on ? 0 : -1;
        views[j].classList.toggle('is-on', on);
      });
      moveBar(btns[i]);
      btns[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (focus) btns[i].focus();
    };

    btns.forEach((b, i) => b.addEventListener('click', () => select(i)));
    list.addEventListener('keydown', (e) => {
      const i = btns.indexOf(document.activeElement);
      const next = { ArrowRight: (i + 1) % btns.length, ArrowLeft: (i - 1 + btns.length) % btns.length, Home: 0, End: btns.length - 1 }[e.key];
      if (next === undefined) return;
      e.preventDefault();
      select(next, true);
    });
    const current = () => moveBar(btns.find((b) => b.getAttribute('aria-selected') === 'true'));
    addEventListener('resize', current, { passive: true });
    document.fonts?.ready.then(current);
    current();
  });
}

function copy() {
  document.querySelectorAll('.copy').forEach((btn) => {
    let timer;
    const label = btn.getAttribute('aria-label');
    btn.addEventListener('click', async () => {
      const from = btn.dataset.copyFrom && document.getElementById(btn.dataset.copyFrom);
      try {
        await navigator.clipboard.writeText(from ? from.textContent : btn.dataset.copy);
      } catch {
        btn.setAttribute('aria-label', 'Copy failed, select the text by hand');
        return;
      }
      btn.classList.add('is-done');
      btn.setAttribute('aria-label', 'Copied');
      clearTimeout(timer);
      timer = setTimeout(() => { btn.classList.remove('is-done'); btn.setAttribute('aria-label', label); }, 1600);
    });
  });
}

/* Live star count. Anonymous GitHub calls are limited per visitor, so it is cached for an hour;
   if the call fails the nav just says GitHub. */
async function stars() {
  const link = document.querySelector('[data-gh]');
  if (!link) return;
  const KEY = 'wygiwyh-stars';
  const HOUR = 36e5;
  const show = (n) => {
    link.querySelector('[data-stars-count]').textContent = new Intl.NumberFormat('en', { notation: n < 1000 ? 'standard' : 'compact', maximumFractionDigits: 1 }).format(n);
    link.querySelector('[data-stars]').classList.add('is-set');
    link.setAttribute('aria-label', `GitHub, ${n.toLocaleString('en')} stars`);
  };
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(KEY)); } catch {}
  if (Number.isFinite(cached?.n)) show(cached.n);
  if (cached && Date.now() - cached.at < HOUR) return;
  try {
    const res = await fetch('https://api.github.com/repos/eitchtee/WYGIWYH');
    if (!res.ok) return;
    const n = (await res.json()).stargazers_count;
    if (!Number.isFinite(n)) return;
    show(n);
    try { localStorage.setItem(KEY, JSON.stringify({ n, at: Date.now() })); } catch {}
  } catch {}
}

stars();
month();
heroShots();
board();
tabs();
copy();
