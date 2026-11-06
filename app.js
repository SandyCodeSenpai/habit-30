"use strict";
// Clean 30: renders data.js. Everything you log stays in localStorage on this device.

const STORE = "clean30-v1";
const DEFAULT = { start: START_DEFAULT, days: {}, urges: [], why: "", setup: {} };
let S = load();
let tab = "today";
let viewDay = null;
let sos = null; // { g, end, trig, steps, done }
let sosTick = null;
let wake = null;

function load() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(STORE)); } catch {}
  return Object.assign(structuredClone(DEFAULT), s || {});
}
let saveT;
function save() { clearTimeout(saveT); saveT = setTimeout(saveNow, 150); }
function saveNow() { clearTimeout(saveT); try { localStorage.setItem(STORE, JSON.stringify(S)); } catch {} }

const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const H = id => HABITS.find(h => h.id === id);
const plural = (n, w) => `${n} ${w}${n === 1 ? "" : "s"}`;

/* ---------- dates ---------- */
const MS = 86400000;
const parseD = iso => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d, 12); };
const isoD = dt => `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
const todayNoon = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12); };
const dayNum = () => Math.round((todayNoon() - parseD(S.start)) / MS) + 1;
const dayOfTs = ts => { const t = new Date(ts); return Math.round((new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12) - parseD(S.start)) / MS) + 1; };
const dateOf = d => new Date(parseD(S.start).getTime() + (d - 1) * MS);
const fmt = (dt, o = { weekday: "short", month: "short", day: "numeric" }) => dt.toLocaleDateString(undefined, o);
const clampDay = d => Math.max(1, Math.min(DAYS, d));
const lastLoggable = () => Math.min(DAYS, dayNum()); // can't log the future

/* ---------- logs & streaks ---------- */
function log(d) { return (S.days[d] ||= { porn: null, nut: null, sugar: null, trig: {}, fix: "", mood: null, note: "" }); }
const st = (d, h) => S.days[d]?.[h] ?? null;
const allClean = d => HABITS.every(h => st(d, h.id) === "clean");
const isClean = (d, h) => (h === "all" ? allClean(d) : st(d, h) === "clean");
const anySlip = d => HABITS.some(h => st(d, h.id) === "slip");

function streak(h) {
  let k = lastLoggable();
  if (k < 1) return 0;
  // Tonight's check-in may not be done yet; don't break the streak for it.
  if (!isClean(k, h) && !(h === "all" ? anySlip(k) : st(k, h) === "slip")) k--;
  let n = 0;
  while (k >= 1 && isClean(k, h)) { n++; k--; }
  return n;
}
function best(h) {
  let b = 0, run = 0;
  for (let d = 1; d <= lastLoggable(); d++) { run = isClean(d, h) ? run + 1 : 0; b = Math.max(b, run); }
  return b;
}
function count(h, v) {
  let n = 0;
  for (let d = 1; d <= lastLoggable(); d++) n += h === "all" ? (v === "clean" ? allClean(d) : anySlip(d)) : st(d, h) === v;
  return n;
}
const urgesOn = (d, g) => S.urges.filter(u => u.won && u.d === d && (!g || u.g === g)).length;
const urgesWon = g => S.urges.filter(u => u.won && (!g || u.g === g)).length;

/* ---------- ui helpers ---------- */
function toast(t) {
  const el = $("#toast"); el.textContent = t; el.classList.add("show");
  clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove("show"), 2200);
}
function vibrate(p) { try { navigator.vibrate?.(p); } catch {} }
function beep() {
  try {
    const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator(), g = a.createGain();
    o.connect(g); g.connect(a.destination); o.frequency.value = 660; g.gain.value = 0.15;
    o.start(); o.stop(a.currentTime + 0.35); setTimeout(() => a.close(), 600);
  } catch {}
}
async function keepAwake(on) {
  try {
    if (on && !wake && "wakeLock" in navigator && document.visibilityState === "visible") {
      wake = await navigator.wakeLock.request("screen"); wake.addEventListener("release", () => (wake = null));
    } else if (!on && wake) { await wake.release(); wake = null; }
  } catch {}
}
const ICON_OK = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;
const ICON_X = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`;

function ring(frac, big, sub) {
  const r = 52, c = 2 * Math.PI * r;
  return `<div class="ring"><svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="${r}" class="rbg"/>
    <circle cx="60" cy="60" r="${r}" class="rfg" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.max(0, Math.min(1, frac)))}"/></svg>
    <div class="rc"><b>${big}</b><span>${sub}</span></div></div>`;
}
function dots(d) {
  return `<span class="dots">${HABITS.map(h => {
    const v = st(d, h.id);
    return `<i class="${v || "none"}" style="${v === "clean" ? `background:${h.color}` : ""}"></i>`;
  }).join("")}</span>`;
}

/* ---------- views ---------- */
function render() {
  const t = dayNum();
  $("#pill").textContent = t < 1 ? `Starts in ${plural(1 - t, "day")}` : t > DAYS ? "Done" : `Day ${t}/${DAYS}`;
  document.querySelectorAll(".dock [data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  const v = { today: viewToday, calendar: viewCalendar, stats: viewStats, guide: viewGuide }[tab];
  $("#view").innerHTML = v();
  if (tab !== "today") window.scrollTo(0, 0);
}

function viewToday() {
  const t = dayNum();
  if (t < 1) {
    return `<section class="hero"><div class="eyebrow">Get ready</div><h1>Day 1 is ${fmt(dateOf(1), { weekday: "long", month: "short", day: "numeric" })}</h1>
      <p class="lead">Use the time before then to do the setup checklist in Guide.</p></section>
      <button class="cta" data-tab="guide">Open setup checklist</button>`;
  }
  const d = viewDay ?? clampDay(t);
  const isToday = d === t;
  const future = d > t;
  const L = S.days[d] || {};
  const allS = streak("all");
  let out = `<section class="hero">
    <div class="daynav">
      <button class="nav" data-act="prev" ${d <= 1 ? "disabled" : ""} aria-label="Previous day">‹</button>
      <div class="grow"><div class="eyebrow">${isToday ? "Today" : future ? "Coming up" : "Past day"} · ${fmt(dateOf(d))}</div><h1>Day ${d} <span class="of">of ${DAYS}</span></h1></div>
      <button class="nav" data-act="next" ${d >= DAYS ? "disabled" : ""} aria-label="Next day">›</button>
    </div>
    ${!isToday && t <= DAYS ? `<button class="link" data-act="gotoday">Back to today</button>` : ""}
  </section>`;

  if (isToday || (t > DAYS && d === DAYS)) {
    out += `<div class="card hero-card">
      ${ring(count("all", "clean") / DAYS, allS, "day streak")}
      <div class="hs">
        <div class="hs-t">All three, in a row</div>
        ${HABITS.map(h => `<div class="hs-r"><i style="background:${h.color}"></i><span>${h.short}</span><b>${streak(h.id)}</b></div>`).join("")}
        <div class="hs-f">${count("all", "clean")} of ${DAYS} days fully clean</div>
      </div>
    </div>`;
  }

  if (t > DAYS && d === DAYS) {
    out += `<div class="callout ok">30 days are over. Check Stats for your full numbers, and keep the filter and the phone rule going.</div>`;
  }

  out += `<h2 class="sec">Check-in <span class="muted">· ${future ? "opens on the day" : "before bed, only if the whole day was clean"}</span></h2>`;
  for (const h of HABITS) {
    const v = L[h.id] ?? null;
    const trig = v === "slip" ? L.trig?.[h.group] : null;
    out += `<div class="habit ${v || ""}" style="--hc:${h.color}">
      <div class="hrow">
        <div class="grow"><h3>${h.name}</h3><div class="meta">${v === "clean" ? "Clean ✓" : v === "slip" ? `Slipped${trig ? ` · ${esc(trig)}` : ""}` : isToday ? `Streak: ${plural(streak(h.id), "day")}` : "Not logged"}</div></div>
        <div class="yn">
          <button class="y ${v === "clean" ? "on" : ""}" data-act="mark" data-h="${h.id}" data-v="clean" ${future ? "disabled" : ""} aria-label="${h.name}: clean">${ICON_OK}<span>Clean</span></button>
          <button class="n ${v === "slip" ? "on" : ""}" data-act="mark" data-h="${h.id}" data-v="slip" ${future ? "disabled" : ""} aria-label="${h.name}: slipped">${ICON_X}<span>Slip</span></button>
        </div>
      </div>
      <details><summary>What counts</summary><p>${h.rule}</p></details>
    </div>`;
  }

  if (!future) {
    out += `<h2 class="sec">Urges beaten <span class="muted">· every one makes the next weaker</span></h2>
    <div class="card urges">
      ${[["urge", "Porn / nut urges"], ["sugar", "Sugar cravings"]].map(([g, l]) => `
        <div class="ur"><div class="grow"><b>${l}</b></div>
          <button class="mini" data-act="urge-" data-g="${g}" aria-label="Remove one">−</button>
          <span class="un">${urgesOn(d, g)}</span>
          <button class="mini plus" data-act="urge+" data-g="${g}" aria-label="Add one">+</button></div>`).join("")}
      <button class="sos-inline" data-tab="sos">Urge right now? Open SOS</button>
    </div>`;
  }

  const setupDone = SETUP.filter(s => S.setup[s.id]).length;
  if (setupDone < SETUP.length && d <= 7) {
    out += `<button class="card setup-card" data-tab="guide"><div class="grow"><b>Setup checklist</b><div class="meta">${setupDone} of ${SETUP.length} done · filter, phone out of the bedroom, sugar out of the house</div></div><span class="chev">›</span></button>`;
  }

  out += `<h2 class="sec">Day ${d} tip</h2><div class="card tip">${esc(TIPS[d - 1])}</div>`;

  if (!future) {
    out += `<h2 class="sec">How was today</h2><div class="card">
      <div class="moods">${MOODS.map((m, i) => `<button class="${L.mood === i ? "on" : ""}" data-act="mood" data-v="${i}">${m}</button>`).join("")}</div>
      <textarea id="note" rows="3" placeholder="Note: what was hard, what helped, what's different from day 1">${esc(L.note || "")}</textarea>
    </div>`;
  }
  return out;
}

function viewCalendar() {
  const t = dayNum();
  const off = dateOf(1).getDay();
  let cells = ["S", "M", "T", "W", "T", "F", "S"].map(w => `<div class="wd">${w}</div>`).join("");
  cells += `<div></div>`.repeat(off);
  for (let d = 1; d <= DAYS; d++) {
    const cls = [allClean(d) ? "full" : "", anySlip(d) ? "slipd" : "", d === t ? "today" : "", d > t ? "future" : ""].join(" ");
    cells += `<button class="cell ${cls}" data-act="day" data-d="${d}"><span class="dn">${d}</span>${dots(d)}<span class="dt">${fmt(dateOf(d), { month: "short", day: "numeric" })}</span></button>`;
  }
  return `<section class="hero"><div class="eyebrow">${fmt(dateOf(1), { month: "short", day: "numeric" })} → ${fmt(dateOf(DAYS), { month: "short", day: "numeric" })}</div><h1>30 days</h1></section>
    <div class="legend">${HABITS.map(h => `<span class="lg"><i style="background:${h.color}"></i>${h.short}</span>`).join("")}<span class="lg"><i class="slip"></i>Slip</span><span class="lg"><i class="full"></i>All clean</span></div>
    <div class="grid30">${cells}</div>
    <p class="muted small center">Tap a day to open it. You can fill in missed check-ins for past days.</p>`;
}

function viewStats() {
  const days = Math.max(0, lastLoggable());
  let out = `<section class="hero"><div class="eyebrow">Your numbers</div><h1>Stats</h1></section>
  <div class="stats">
    <div class="stat"><b>${count("all", "clean")}<small>/${DAYS}</small></b><span>fully clean days</span></div>
    <div class="stat"><b>${streak("all")}</b><span>current streak</span></div>
    <div class="stat"><b>${urgesWon()}</b><span>urges beaten</span></div>
  </div>`;

  out += `<h2 class="sec">By habit</h2>`;
  for (const h of HABITS) {
    out += `<div class="card hcard" style="--hc:${h.color}">
      <div class="hc-top"><h3>${h.name}</h3><span class="muted small">best ${plural(best(h.id), "day")}</span></div>
      <div class="hc-nums"><div><b>${streak(h.id)}</b><span>streak</span></div><div><b>${count(h.id, "clean")}</b><span>clean</span></div><div><b>${count(h.id, "slip")}</b><span>slips</span></div><div><b>${urgesWon(h.group)}</b><span>${h.group === "sugar" ? "cravings beaten" : "urges beaten"}</span></div></div>
      <div class="strip">${Array.from({ length: DAYS }, (_, i) => { const v = st(i + 1, h.id); return `<i class="${v || (i + 1 <= days ? "miss" : "")}"></i>`; }).join("")}</div>
    </div>`;
  }

  // when urges hit
  const buckets = ["12–4 am", "4–8 am", "8–12 pm", "12–4 pm", "4–8 pm", "8–12 am"];
  const bc = buckets.map(() => ({ urge: 0, sugar: 0 }));
  const timed = S.urges.filter(u => u.t);
  timed.forEach(u => { bc[Math.floor(new Date(u.t).getHours() / 4)][u.g]++; });
  const bmax = Math.max(1, ...bc.map(b => b.urge + b.sugar));
  out += `<h2 class="sec">When urges hit <span class="muted">· from SOS and the + buttons</span></h2><div class="card">`;
  out += timed.length
    ? bc.map((b, i) => `<div class="bar"><span class="bl">${buckets[i]}</span><div class="bt"><i class="u" style="width:${(b.urge / bmax) * 100}%"></i><i class="s" style="width:${(b.sugar / bmax) * 100}%"></i></div><span class="bn">${b.urge + b.sugar}</span></div>`).join("") +
      `<div class="legend in"><span class="lg"><i style="background:var(--urge)"></i>Porn / nut</span><span class="lg"><i style="background:${H("sugar").color}"></i>Sugar</span></div>`
    : `<p class="muted small">Nothing yet. Every urge you log shows up here, so you can see your danger hours.</p>`;
  out += `</div>`;

  // triggers
  const tc = {};
  for (let d = 1; d <= days; d++) Object.entries(S.days[d]?.trig || {}).forEach(([g, x]) => { if (x) tc[x] = (tc[x] || 0) + 2; });
  S.urges.forEach(u => { if (u.trig) tc[u.trig] = (tc[u.trig] || 0) + 1; });
  const top = Object.entries(tc).sort((a, b) => b[1] - a[1]).slice(0, 6);
  out += `<h2 class="sec">Top triggers <span class="muted">· slips count double</span></h2><div class="card">`;
  out += top.length
    ? top.map(([k, n]) => `<div class="bar"><span class="bl wide">${esc(k)}</span><div class="bt"><i class="t" style="width:${(n / top[0][1]) * 100}%"></i></div></div>`).join("")
    : `<p class="muted small">Pick a trigger when you log a slip or use SOS, and your top triggers show up here.</p>`;
  out += `</div>`;

  // mood
  const moods = [];
  for (let d = 1; d <= days; d++) if (S.days[d]?.mood != null) moods.push([d, S.days[d].mood]);
  out += `<h2 class="sec">Mood</h2><div class="card">${moods.length > 1 ? spark(moods) : `<p class="muted small">Log your mood on the Today tab and you'll see a trend here.</p>`}</div>`;

  out += `<h2 class="sec">My why <span class="muted">· shown every time you hit SOS</span></h2>
  <div class="card"><textarea id="why" rows="4" placeholder="Why are you doing this? Be specific. Who do you want to be on day 30?">${esc(S.why)}</textarea></div>`;

  out += `<h2 class="sec">Settings</h2><div class="card list">
    <div class="row"><div class="grow"><b>Start date</b><div class="meta">Day 1. Default is Nov 6.</div></div><input type="date" id="startIn" value="${S.start}"></div>
    <div class="row" id="installRow" ${deferredInstall ? "" : "hidden"}><div class="grow"><b>Install app</b><div class="meta">Adds it to your home screen, works offline</div></div><button class="pill solid" data-act="install">Install</button></div>
    <div class="row"><div class="grow"><b>Backup</b><div class="meta">Your data lives only on this phone</div></div><button class="pill" data-act="export">Export</button><label class="pill">Import<input type="file" accept="application/json" id="importIn" hidden></label></div>
    <div class="row"><div class="grow"><b>Reset everything</b><div class="meta">Deletes all check-ins and urges</div></div><button class="pill danger" data-act="reset">Reset</button></div>
  </div>`;
  return out;
}

function spark(pts) {
  const w = 300, h = 60, xs = d => ((d - 1) / (DAYS - 1)) * (w - 8) + 4, ys = m => h - 6 - (m / 4) * (h - 12);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts.map(([d, m]) => `${xs(d)},${ys(m)}`).join(" ")}"/></svg>
    <div class="sparkl"><span>Rough</span><span>Great</span></div>`;
}

function viewGuide() {
  const n = SETUP.filter(s => S.setup[s.id]).length;
  return `<section class="hero"><div class="eyebrow">Read once, come back when needed</div><h1>Guide</h1></section>
  <h2 class="sec">Setup checklist <span class="muted">· ${n}/${SETUP.length}</span></h2>
  <div class="card list">${SETUP.map(s => `
    <label class="chk row"><input type="checkbox" data-setup="${s.id}" ${S.setup[s.id] ? "checked" : ""}><div class="grow"><b>${s.t}</b><div class="meta">${s.d}</div></div></label>`).join("")}
  </div>
  <p class="muted small pad">The filters can be switched off in ten seconds. They're there to slow you down, not to stop you.</p>
  <div class="card list guide">${GUIDE.map(g => `<details><summary>${g.t}</summary>${g.html}</details>`).join("")}</div>`;
}

/* ---------- slip sheet ---------- */
let sheetCtx = null; // { d, g }
function openSlip(d, g) {
  sheetCtx = { d, g };
  renderSheet();
  $("#sheet").hidden = false;
  document.body.classList.add("noscroll");
}
function renderSheet() {
  const { d, g } = sheetCtx;
  const L = log(d);
  const hs = HABITS.filter(h => h.group === g);
  $("#sheetIn").innerHTML = `
    <div class="grab"></div>
    <h2>Logged. The streak resets, the 30 days don't.</h2>
    <p class="muted">Day ${d}. Being honest here is what makes this tracker worth anything.</p>
    ${hs.length > 1 ? `<div class="lbl2">What slipped</div><div class="chips2">${hs.map(h => `<button class="chip ${L[h.id] === "slip" ? "on" : ""}" style="--hc:${h.color}" data-act="sliph" data-h="${h.id}">${h.name.replace("No ", "")}</button>`).join("")}</div>` : ""}
    <div class="lbl2">What triggered it</div>
    <div class="chips2">${TRIGGERS[g].map(x => `<button class="chip ${L.trig[g] === x ? "on" : ""}" data-act="trig" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div>
    <div class="lbl2">One thing I'll change tonight</div>
    <input id="fix" type="text" value="${esc(L.fix)}" placeholder="e.g. phone charges in the kitchen">
    <ol class="proto"><li><b>Never miss twice.</b> The next 24 hours matter more than this slip.</li>
      <li>No \"might as well\" binge. That's how one slip becomes a lost week.</li>
      <li>Don't restart. Keep going from day ${d}.</li></ol>
    <button class="cta" data-act="sheetdone">Done</button>`;
}
function closeSheet() { $("#sheet").hidden = true; document.body.classList.remove("noscroll"); sheetCtx = null; render(); }

/* ---------- SOS ---------- */
function openSOS(g = null) {
  sos = { g, end: g ? Date.now() + 10 * 60000 : 0, trig: null, steps: {}, rang: false };
  $("#sos").hidden = false;
  document.body.classList.add("noscroll");
  renderSOS();
  if (g) { keepAwake(true); clearInterval(sosTick); sosTick = setInterval(tickSOS, 500); }
}
function startSOS(g) { sos.g = g; sos.end = Date.now() + 10 * 60000; renderSOS(); keepAwake(true); clearInterval(sosTick); sosTick = setInterval(tickSOS, 500); }
function closeSOS() { clearInterval(sosTick); sos = null; $("#sos").hidden = true; document.body.classList.remove("noscroll"); keepAwake(false); render(); }
function tickSOS() {
  if (!sos?.g) return;
  const left = Math.max(0, sos.end - Date.now());
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  const tt = $("#sos .tt"); if (tt) tt.textContent = `${m}:${String(s).padStart(2, "0")}`;
  const fg = $("#sos .tfg"); if (fg) fg.style.strokeDashoffset = String(fg.dataset.c * (left / 600000));
  if (left === 0 && !sos.rang) {
    sos.rang = true; vibrate([200, 100, 200]); beep();
    const msg = $("#sos .tmsg"); if (msg) msg.textContent = "Timer done. The peak has passed.";
  }
}
function renderSOS() {
  const el = $("#sos");
  if (!sos.g) {
    el.innerHTML = `<div class="sos-in">
      <button class="sos-x" data-act="sosclose" aria-label="Close">${ICON_X}</button>
      <div class="eyebrow">SOS</div><h1>What's hitting you?</h1>
      <p class="lead">Pick one. A 10-minute timer starts and walks you through it.</p>
      <button class="sos-pick" data-act="sosgo" data-g="urge"><b>Porn / nut urge</b><span>Stand up, move, cold water, breathe</span></button>
      <button class="sos-pick sugar" data-act="sosgo" data-g="sugar"><b>Sugar craving</b><span>Water, protein, brush your teeth, wait</span></button>
    </div>`;
    return;
  }
  const P = SOS[sos.g], r = 70, c = 2 * Math.PI * r;
  el.innerHTML = `<div class="sos-in">
    <button class="sos-x" data-act="sosclose" aria-label="Close">${ICON_X}</button>
    <div class="eyebrow">${P.title}</div>
    <div class="tring"><svg viewBox="0 0 160 160"><circle cx="80" cy="80" r="${r}" class="rbg"/><circle cx="80" cy="80" r="${r}" class="tfg" data-c="${c}" stroke-dasharray="${c}" stroke-dashoffset="${c}"/></svg>
      <div class="rc"><b class="tt">10:00</b><span class="tmsg">Ride it out</span></div></div>
    <p class="lead">${P.lead}</p>
    <ol class="ssteps">${P.steps.map((s, i) => `<li class="${sos.steps[i] ? "done" : ""}" data-act="sosstep" data-i="${i}"><span class="tick">${ICON_OK}</span><span>${esc(s)}</span></li>`).join("")}</ol>
    ${S.why ? `<div class="why"><div class="eyebrow">My why</div>${esc(S.why).replace(/\n/g, "<br>")}</div>` : `<div class="why muted">Write your why in Stats → My why. It shows up here.</div>`}
    <div class="lbl2">What triggered it</div>
    <div class="chips2">${TRIGGERS[sos.g].map(x => `<button class="chip ${sos.trig === x ? "on" : ""}" data-act="sostrig" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div>
    <button class="cta" data-act="soswon">Urge passed. I won.</button>
    <button class="ghost" data-act="soslost">I gave in</button>
  </div>`;
  tickSOS();
}

/* ---------- events ---------- */
document.addEventListener("click", e => {
  const tb = e.target.closest("[data-tab]");
  if (tb) {
    if (tb.dataset.tab === "sos") { openSOS(); return; }
    tab = tb.dataset.tab; if (tab === "today") viewDay = null; render(); return;
  }
  const el = e.target.closest("[data-act]");
  if (!el) {
    if (e.target.id === "sheet") closeSheet();
    return;
  }
  const t = dayNum();
  const d = viewDay ?? clampDay(t);
  switch (el.dataset.act) {
    case "prev": viewDay = clampDay(d - 1); render(); break;
    case "next": viewDay = clampDay(d + 1); render(); break;
    case "gotoday": viewDay = null; render(); break;
    case "day": viewDay = +el.dataset.d; tab = "today"; render(); break;
    case "mark": {
      const h = el.dataset.h, v = el.dataset.v, L = log(d);
      if (d > t) return;
      if (L[h] === v) { L[h] = null; save(); render(); return; } // tap again to clear
      L[h] = v; save();
      if (v === "slip") { vibrate(30); openSlip(d, H(h).group); }
      else { vibrate(15); if (allClean(d)) toast(d === t ? `Day ${d} clean. ${plural(streak("all"), "day")} in a row.` : `Day ${d} fully clean`); render(); }
      break;
    }
    case "urge+": // past-day entries get no time, so they stay out of the "when urges hit" chart
      S.urges.push({ t: d === t ? Date.now() : null, d, g: el.dataset.g, won: true, trig: null }); save(); vibrate(15); render(); break;
    case "urge-": {
      const i = S.urges.findLastIndex(u => u.d === d && u.g === el.dataset.g && u.won);
      if (i >= 0) { S.urges.splice(i, 1); save(); render(); }
      break;
    }
    case "mood": { const L = log(d), v = +el.dataset.v; L.mood = L.mood === v ? null : v; save(); render(); break; }
    case "sliph": { const L = log(sheetCtx.d), h = el.dataset.h; L[h] = L[h] === "slip" ? null : "slip"; save(); renderSheet(); break; }
    case "trig": { const L = log(sheetCtx.d); L.trig[sheetCtx.g] = L.trig[sheetCtx.g] === el.dataset.v ? null : el.dataset.v; save(); renderSheet(); break; }
    case "sheetdone": {
      const L = log(sheetCtx.d);
      if (!HABITS.some(h => h.group === sheetCtx.g && L[h.id] === "slip")) { toast("Pick what slipped"); return; }
      closeSheet(); break;
    }
    case "sosgo": startSOS(el.dataset.g); break;
    case "sosstep": sos.steps[el.dataset.i] = !sos.steps[el.dataset.i]; el.classList.toggle("done"); break;
    case "sostrig": sos.trig = sos.trig === el.dataset.v ? null : el.dataset.v; renderSOS(); break;
    case "sosclose": closeSOS(); break;
    case "soswon": {
      if (t >= 1) S.urges.push({ t: Date.now(), d: t, g: sos.g, won: true, trig: sos.trig });
      save(); vibrate([20, 60, 20]);
      const g = sos.g; closeSOS(); toast(g === "sugar" ? "Craving beaten. Logged." : "Urge beaten. Logged."); break;
    }
    case "soslost": {
      const g = sos.g, trig = sos.trig;
      if (t >= 1) S.urges.push({ t: Date.now(), d: t, g, won: false, trig });
      closeSOS();
      if (t < 1 || t > DAYS) return;
      viewDay = null; tab = "today";
      const L = log(t);
      if (trig) L.trig[g] = trig;
      if (g === "sugar") L.sugar = "slip";
      save(); render(); openSlip(t, g); break;
    }
    case "export": {
      const blob = new Blob([JSON.stringify(S, null, 1)], { type: "application/json" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `clean30-backup-${isoD(new Date())}.json`; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000); break;
    }
    case "reset":
      if (confirm("Delete every check-in, urge and note? This can't be undone.")) { S = structuredClone(DEFAULT); saveNow(); viewDay = null; render(); toast("Reset done"); }
      break;
    case "install":
      if (deferredInstall) { deferredInstall.prompt(); deferredInstall.userChoice.finally(() => { deferredInstall = null; render(); }); }
      break;
  }
});

document.addEventListener("change", e => {
  const el = e.target;
  if (el.dataset.setup) { S.setup[el.dataset.setup] = el.checked; save(); render(); }
  else if (el.id === "startIn" && el.value) { S.start = el.value; viewDay = null; save(); render(); toast("Start date updated"); }
  else if (el.id === "importIn" && el.files[0]) {
    el.files[0].text().then(txt => {
      const x = JSON.parse(txt);
      if (!x || typeof x !== "object" || !x.days) throw new Error("bad file");
      S = Object.assign(structuredClone(DEFAULT), x); saveNow(); render(); toast("Backup restored");
    }).catch(() => toast("That file isn't a Clean 30 backup"));
  }
});

document.addEventListener("input", e => {
  const el = e.target;
  if (el.id === "note") { log(viewDay ?? clampDay(dayNum())).note = el.value; save(); }
  else if (el.id === "why") { S.why = el.value; S.setup.why = !!el.value.trim(); save(); }
  else if (el.id === "fix" && sheetCtx) { log(sheetCtx.d).fix = el.value; save(); }
});

addEventListener("pagehide", saveNow);
let lastDay = dayNum();
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    if (sos?.g) keepAwake(true);
    if (dayNum() !== lastDay) { lastDay = dayNum(); viewDay = null; render(); }
  } else saveNow();
});

let deferredInstall = null;
addEventListener("beforeinstallprompt", e => {
  e.preventDefault(); deferredInstall = e;
  const r = document.getElementById("installRow"); if (r) r.hidden = false;
});
addEventListener("appinstalled", () => { deferredInstall = null; toast("Installed"); });
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

render();
