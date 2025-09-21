// ========= Réglages de base =========
const DIV_X = 10, DIV_Y = 8;
const CENTER_TWEAK_PX = -2;

// Calage horizontal : 50Hz @ 2ms/div ≈ 10 div (20 ms)
const TIME_SCALE_CORR = 1.039;

// Echelles disponibles
const VDIV_STEPS = [5, 2, 1, 0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001];
const TDIV_STEPS = [0.5, 0.2, 0.1, 0.05, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0005, 0.0002, 0.0001];

// Indices init
let vIndex = VDIV_STEPS.indexOf(1);
let tIndex = TDIV_STEPS.indexOf(0.002);

// Canvas
const cvs = document.getElementById('trace');
const ctx = cvs.getContext('2d');

// Panneau entraînement
const ui = {
    exoType: document.getElementById('exoType'),
    tolPct: document.getElementById('tolPct'),
    answers: document.getElementById('answers'),
    btnGen: document.getElementById('btnGen'),
    btnValidate: document.getElementById('btnValidate'),
    btnNew: document.getElementById('btnNew'),
    btnShow: document.getElementById('btnShow'),
    feedback: document.getElementById('feedback')
};

// Centres (en divisions)
let yCenterDiv = DIV_Y / 2; // vertical
let xCenterDiv = DIV_X / 2; // horizontal

// ========= Etat interne du signal (pas d'UI manuelle) =========
const state = {
    wave: 'sine',   // 'sine' | 'square' | 'triangle'
    duty: 0.5,      // (pour 'square')
    amp: 2,         // crête (V)
    offset: 0,      // V
    freq: 50        // Hz
};

// ====== Couplage AC/DC ======
let acCoupling = false; // false = DC (par défaut) ; true = AC (supprime la composante continue)

// ========= Helpers =========
function readNum(inputEl, fallback = 0) {
    const raw = String(inputEl?.value ?? '');
    const n = inputEl && Number.isFinite(inputEl.valueAsNumber)
        ? inputEl.valueAsNumber
        : parseFloat(raw.replace(',', '.'));
    return Number.isFinite(n) ? n : fallback;
}
function resizeCanvasToCSS() {
    const rect = cvs.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const dpr = window.devicePixelRatio || 1;
    cvs.width = Math.round(rect.width * dpr);
    cvs.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
}

// Génère les points du signal courant
function generateSamples(vPerDiv, sPerDiv) {
    const w = Math.max(2, cvs.getBoundingClientRect().width);
    const secTotal = sPerDiv * DIV_X * TIME_SCALE_CORR;

    const f = Math.max(0.000001, state.freq);
    const A = Math.abs(state.amp);
    const DC = state.offset;
    const dutyRatio = Math.max(0.05, Math.min(0.95, state.duty));

    const stepT = secTotal / (w - 1);
    const tOffset = xCenterDiv * sPerDiv;

    const pts = [];
    for (let x = 0; x < w; x++) {
        const t = (x * stepT) - tOffset;
        let y = 0;
        switch (state.wave) {
            case 'sine':
                y = A * Math.sin(2 * Math.PI * f * t);
                break;
            case 'square': {
                const T = 1 / f;
                let frac = (t / T) - Math.floor(t / T);
                if (frac < 0) frac += 1;
                y = (frac < dutyRatio) ? A : -A;
                break;
            }
            case 'triangle': {
                const T = 1 / f;
                const frac = (t / T) - Math.floor(t / T + 0.5);
                y = A * (2 * Math.abs(2 * frac) - 1);
                break;
            }
        }
        // Couplage AC => on supprime la composante continue à l'affichage
        y += (acCoupling ? 0 : DC);
        pts.push({ x, y });
    }
    return { pts, vPerDiv, DC, A };
}

function draw() {
    if (!resizeCanvasToCSS()) return;

    const rect = cvs.getBoundingClientRect();
    const W = rect.width, H = rect.height;

    const vPerDiv = VDIV_STEPS[vIndex];
    const sPerDiv = TDIV_STEPS[tIndex];

    const { pts, DC } = generateSamples(vPerDiv, sPerDiv);

    const pxPerDivY = H / DIV_Y;
    const centerY = yCenterDiv * pxPerDivY + CENTER_TWEAK_PX;
    const pxPerVolt = pxPerDivY / vPerDiv;

    ctx.clearRect(0, 0, W, H);

    // Ligne DC (seulement en mode DC et si offset ≠ 0)
    if (!acCoupling && Math.abs(DC) > 1e-6) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#d11';
        ctx.beginPath();
        const yDC = centerY - DC * pxPerVolt;
        ctx.moveTo(0, yDC); ctx.lineTo(W, yDC);
        ctx.stroke();
    }

    // Trace
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#0a7d2c';
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const x = p.x;
        const y = centerY - p.y * pxPerVolt;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
}

// ========= Knobs (V/div & s/div) =========
const MIN_ANGLE = 0, MAX_ANGLE = 330;
function stepAngle(list, idx) { return MIN_ANGLE + (MAX_ANGLE - MIN_ANGLE) * (idx / (list.length - 1)); }
function setNeedle(needle, list, idx) { needle.style.transform = `translate(-50%,-100%) rotate(${stepAngle(list, idx)}deg)`; }
function polarAngleCWdeg(x, y) { let a = Math.atan2(y, x) * 180 / Math.PI; return (a + 450) % 360; }
function angleFromEvent(e, el) {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const ex = (e.touches ? e.touches[0].clientX : e.clientX) - cx;
    const ey = (e.touches ? e.touches[0].clientY : e.clientY) - cy;
    return Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, polarAngleCWdeg(ex, ey)));
}
function idxFromAngle(ang, list) {
    const ratio = (ang - MIN_ANGLE) / (MAX_ANGLE - MIN_ANGLE);
    return Math.max(0, Math.min(list.length - 1, Math.round(ratio * (list.length - 1))));
}

const vNeedle = document.getElementById('vNeedle');
const tNeedle = document.getElementById('tNeedle');
const vLabel = document.getElementById('vdivVal');
const tLabel = document.getElementById('tdivVal');

function fmtV(v) { return v >= 1 ? `${v} V/div` : (v >= 1e-3 ? `${v * 1e3} mV/div` : `${v * 1e6} µV/div`); }
function fmtT(s) {
    if (s >= 1) return `${s} s/div`;
    if (s >= 1e-3) return `${s * 1e3} ms/div`;
    return `${s * 1e6} µs/div`;
}

function attachKnobDrag(el, list, getIdx, setIdx, labelEl, fmt, needleEl) {
    let dragging = false;
    function applyIndex(i) {
        const idx = Math.max(0, Math.min(list.length - 1, i));
        if (idx !== getIdx()) {
            setIdx(idx);
            if (labelEl) labelEl.textContent = fmt(list[idx]);
            setNeedle(needleEl, list, idx);
            draw();
        }
    }
    function onDown(e) { dragging = true; e.preventDefault(); onMove(e); }
    function onMove(e) { if (!dragging) return; e.preventDefault(); const ang = angleFromEvent(e, el); applyIndex(idxFromAngle(ang, list)); }
    function onUp() { dragging = false; }

    el.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    el.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);

    if (labelEl) labelEl.textContent = fmt(list[getIdx()]);
    setNeedle(needleEl, list, getIdx());
}
attachKnobDrag(document.getElementById('knobV'), VDIV_STEPS, () => vIndex, (i) => { vIndex = i; }, vLabel, fmtV, vNeedle);
attachKnobDrag(document.getElementById('knobT'), TDIV_STEPS, () => tIndex, (i) => { tIndex = i; }, tLabel, fmtT, tNeedle);

// ========= Décalage horizontal (bouton bas) =========
(function () {
    const h = document.getElementById('hShift');
    if (!h) return;
    let dragging = false, startX = 0, startCenter = DIV_X / 2;
    function onDown(e) { dragging = true; startX = (e.touches ? e.touches[0].clientX : e.clientX); startCenter = xCenterDiv; e.preventDefault(); }
    function onMove(e) {
        if (!dragging) return;
        const rect = cvs.getBoundingClientRect();
        const pxPerDivX = rect.width / DIV_X;
        const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
        const dx = clientX - startX;
        const deltaDiv = dx / pxPerDivX;
        xCenterDiv = Math.max(0, Math.min(DIV_X, startCenter + deltaDiv));
        draw(); e.preventDefault();
    }
    function onUp() { dragging = false; }
    h.addEventListener('dblclick', () => { xCenterDiv = DIV_X / 2; draw(); });
    h.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    h.addEventListener('touchstart', onDown, { passive: false });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
})();

// ========= Mode Entraînement =========
let currentExercise = null; // { kind, trueA, trueVpp, truePer, trueFreq, trueDC }

function randIn(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function buildAnswerFields(kind) {
    ui.answers.innerHTML = '';
    const add = (id, label, placeholder) => {
        const wrap = document.createElement('label');
        wrap.textContent = label;
        const inp = document.createElement('input');
        inp.id = id; inp.type = 'number'; inp.step = '0.001'; inp.placeholder = placeholder;
        wrap.appendChild(document.createElement('br'));
        wrap.appendChild(inp);
        ui.answers.appendChild(wrap);
    };
    if (kind === 'amp') add('ansVpp', 'Réponse Vpp (V)', 'ex: 4');
    else if (kind === 'per') add('ansPer', 'Réponse période (s)', 'ex: 0.02');
    else if (kind === 'freq') add('ansFreq', 'Réponse fréquence (Hz)', 'ex: 50');
    else {
        add('ansVpp', 'Réponse Vpp (V)', 'ex: 4');
        add('ansPer', 'Réponse période (s)', 'ex: 0.02');
        add('ansFreq', 'Réponse fréquence (Hz)', 'ex: 50');
    }
}

// Ajuste l’échelle pour un affichage confortable
function autoScale(A, f, DC) {
    const neededVdiv = Math.max((Math.abs(DC) + A) / 3, 0.001);
    let vi = VDIV_STEPS.length - 1;
    for (let i = 0; i < VDIV_STEPS.length; i++) { if (VDIV_STEPS[i] >= neededVdiv) { vi = i; break; } }
    vIndex = vi;

    const targetSdiv = (2 / f) / 10; // ~2 périodes visibles
    let ti = TDIV_STEPS.length - 1;
    for (let i = 0; i < TDIV_STEPS.length; i++) { if (TDIV_STEPS[i] >= targetSdiv) { ti = i; break; } }
    tIndex = ti;

    yCenterDiv = DIV_Y / 2; xCenterDiv = DIV_X / 2;

    setNeedle(vNeedle, VDIV_STEPS, vIndex);
    setNeedle(tNeedle, TDIV_STEPS, tIndex);
    vLabel.textContent = fmtV(VDIV_STEPS[vIndex]);
    tLabel.textContent = fmtT(TDIV_STEPS[tIndex]);
}

function generateExercise() {
    const kind = ui.exoType.value;
    buildAnswerFields(kind);

    // Choix signal (priorité sinus)
    state.wave = pick(['sine', 'sine', 'sine', 'triangle', 'square']);
    state.duty = randIn(0.3, 0.7);

    // Paramètres raisonnables
    const f = Math.round(randIn(10, 200));           // Hz
    const A = Math.round(randIn(0.5, 4) * 10) / 10;    // V crête
    const DC = Math.round(randIn(-1.5, 1.5) * 10) / 10;

    state.freq = f; state.amp = A; state.offset = DC;

    autoScale(A, f, DC);
    draw();

    currentExercise = {
        kind,
        trueA: A,
        trueVpp: 2 * A,
        truePer: 1 / f,
        trueFreq: f,
        trueDC: DC
    };

    // UI
    ui.btnValidate.disabled = false;
    ui.btnNew.disabled = false;
    ui.btnShow.disabled = true;
    ui.feedback.textContent = '';
    ui.feedback.className = 'feedback';
}

function withinTol(val, ref, tolPct) {
    if (!(ref > 0)) return Math.abs(val - ref) < 1e-9;
    return Math.abs(val - ref) <= (Math.abs(ref) * (tolPct / 100));
}

function validateExercise() {
    if (!currentExercise) return;
    const tol = Math.max(1, Math.min(20, readNum(ui.tolPct, 5)));

    let ok = true, messages = [];
    const get = id => {
        const el = document.getElementById(id);
        return el ? readNum(el, NaN) : NaN;
    };

    if (['amp', 'mix'].includes(currentExercise.kind)) {
        const vpp = get('ansVpp');
        const okV = withinTol(vpp, currentExercise.trueVpp, tol);
        ok &= okV;
        messages.push(okV ? 'Vpp ✅' : `Vpp ❌ (attendu ≈ ${currentExercise.trueVpp.toFixed(3)} V)`);
    }
    if (['per', 'mix'].includes(currentExercise.kind)) {
        const per = get('ansPer');
        const okP = withinTol(per, currentExercise.truePer, tol);
        ok &= okP;
        messages.push(okP ? 'Période ✅' : `Période ❌ (attendu ≈ ${currentExercise.truePer.toFixed(6)
    } s`);
  }
  if (['freq','mix'].includes(currentExercise.kind)){
    const fr = get('ansFreq');
    const okF = withinTol(fr, currentExercise.trueFreq, tol);
    ok &= okF;
    messages.push(okF ? 'Fréquence ✅' : `Fréquence ❌ (attendu ≈ ${ currentExercise.trueFreq.toFixed(3) } Hz)`);
  }

  ui.feedback.textContent = messages.join(' • ');
  ui.feedback.className = 'feedback ' + (ok ? 'ok' : 'ko');
  ui.btnShow.disabled = false;
}

function showSolution(){
  if (!currentExercise) return;
  const parts = [];
  if (['amp','mix'].includes(currentExercise.kind))
    parts.push(`Vpp = ${ currentExercise.trueVpp.toFixed(3) } V`);
  if (['per','mix'].includes(currentExercise.kind))
    parts.push(`Période = ${ currentExercise.truePer.toFixed(6) } s`);
  if (['freq','mix'].includes(currentExercise.kind))
    parts.push(`Fréquence = ${ currentExercise.trueFreq.toFixed(3) } Hz`);
  parts.push(`Décalage DC = ${ currentExercise.trueDC.toFixed(3) } V`);
  ui.feedback.textContent = parts.join(' • ');
  ui.feedback.className = 'feedback';
}

function newExercise(){
  currentExercise = null;
  ui.answers.innerHTML = '';
  ui.btnValidate.disabled = true;
  ui.btnNew.disabled = true;
  ui.btnShow.disabled = true;
  ui.feedback.textContent = '';
  ui.feedback.className = 'feedback';
}

// ========= Init / listeners =========
const bg = document.getElementById('bg');
const ro = new ResizeObserver(() => draw());

function init(){
  ro.observe(document.getElementById('scope'));
  ro.observe(cvs);
  requestAnimationFrame(() => { draw(); setTimeout(draw, 80); });
}
if (bg.complete) init(); else bg.addEventListener('load', init, { once:true });

window.addEventListener('resize', draw);

// Pan vertical à la molette + recentrage clic droit
cvs.addEventListener('wheel', (e) => {
  e.preventDefault();
  const deltaDiv = (e.deltaY > 0 ? 0.2 : -0.2);
  yCenterDiv = Math.max(0, Math.min(DIV_Y, yCenterDiv + deltaDiv));
  draw();
}, { passive:false });
cvs.addEventListener('contextmenu', (e) => { e.preventDefault(); yCenterDiv = DIV_Y / 2; draw(); });

// Boutons entraînement
ui.btnGen.addEventListener('click', generateExercise);
ui.btnValidate.addEventListener('click', validateExercise);
ui.btnShow.addEventListener('click', showSolution);
ui.btnNew.addEventListener('click', newExercise);

// ========= Hotspot AC sur l'image (sans changer le HTML/CSS) =========
// Coordonnées du bouton AC sur ton visuel (en % du conteneur .scope)
const AC_BTN_X = 13.0;   // pourcent depuis la gauche
const AC_BTN_Y = 90.8;   // pourcent depuis le haut
const AC_BTN_R = 2.6;    // rayon en pourcent (≈ clique dans le cercle)

document.getElementById('scope').addEventListener('click', (e)=>{
  const r = e.currentTarget.getBoundingClientRect();
  const xPct = ((e.clientX - r.left) / r.width) * 100;
  const yPct = ((e.clientY - r.top)  / r.height) * 100;

  // Toggle si le clic tombe dans le disque du bouton AC
  const dx = xPct - AC_BTN_X, dy = yPct - AC_BTN_Y;
  const dist = Math.hypot(dx, dy);
  if (dist <= AC_BTN_R) {
    acCoupling = !acCoupling;
    draw();
    if (ui.feedback) {
      ui.feedback.textContent = acCoupling ? 'Couplage AC (composante continue supprimée)' :
                                             'Couplage DC (composante continue visible)';
      ui.feedback.className = 'feedback';
    }
    // on stoppe là pour ne pas déclencher d’autres logiques de clic
    e.stopPropagation();
    return;
  }

  // (outil de repérage des % — utile si tu veux ajuster le hotspot)
  // console.log(`--left: ${ xPct.toFixed(1) }%; --top: ${ yPct.toFixed(1) }%; `);
});

// Raccourci clavier "A" pour basculer AC/DC
window.addEventListener('keydown', (e)=>{
  if (e.key.toLowerCase() === 'a') {
    acCoupling = !acCoupling;
    draw();
    if (ui.feedback) {
      ui.feedback.textContent = acCoupling ? 'Couplage AC (composante continue supprimée)' :
                                             'Couplage DC (composante continue visible)';
      ui.feedback.className = 'feedback';
    }
  }
});
