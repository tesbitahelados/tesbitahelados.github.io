// ==========================
// Config
// ==========================
const WHATSAPP_NUMBER = "50662943981"; // sin +
const CURRENCY_LOCALE = "es-CR";
const CURRENCY_CODE = "CRC";
const BASE_TEXT = "Base: Crema dulce y leche condensada.";

// ==========================
// Datos
// ==========================
const img = (name) => ({
  imageMobile: `assets/${name}916.webp`,
  imageDesktop: `assets/${name}169.webp`,
});

const products = [
  { name: "Pie de limón", badge: "Nuevo", price: 750, ...img("pielimon"),
    desc: "Queso crema suave con jugo y ralladura de limón mesino, equilibrado con un toque de vainilla clara." },
  { name: "Choco maní", badge: "Nuevo", price: 750, ...img("maniChoco"),
    desc: "Chocolate cremoso, toque de maní y maní tostado sin sal. Peligrosamente bueno." },
  { name: "Cheesecake de fresa", price: 750, ...img("fresa"),
    desc: "Queso crema y vainilla sobre base de galleta, con fresa para un final fresco y cremoso." },
  { name: "Coco", price: 600, ...img("coco"),
    desc: "Cremoso y tropical, con coco natural rallado y un aroma suave que se queda." },
  { name: "Cookie Monster", price: 600, ...img("monster"),
    desc: "Oreo intensa y textura crujiente, con un toque divertido de color. Adictivo, punto." },
  { name: "Dulce de leche", price: 600, ...img("dulce"),
    desc: "Sedoso, acaramelado y profundo. El sabor que no necesita presentación." },
  { name: "Menta y Chispas de Chocolate", price: 600, ...img("menta"),
    desc: "Menta fresca con chispas de chocolate amargo. Limpio, elegante y con carácter." },
  { name: "Combinado", price: 600, ...img("combinado"),
    desc: "Suave y balanceado, con cacao dulce para un final redondo y reconfortante." },
  { name: "Maní con miel", price: 600, ...img("mielmani"),
    desc: "Maní tostado con miel: crujiente, dorado y con un final naturalmente dulce." },
  { name: "Cookies and Cream", price: 600, ...img("cookies"),
    desc: "Cremoso con trozos de Oreo. El clásico, pero bien hecho." },
];

// ==========================
// DOM
// ==========================
const qs = (s) => document.querySelector(s);
const splash = qs("#splash");
const stories = qs("#stories");
const track = qs("#track");
const dotsEl = qs("#dots");
const startBtn = qs("#startBtn");

// ==========================
// Estado y ajustes
// ==========================
let index = 0;
let width = 1;
let isPointerDown = false;
let isDragging = false;
let startX = 0;
let startY = 0;
let movedX = 0;
let activePointerId = null;
let suppressClick = false;
let wheelLock = false;

const SWIPE_THRESHOLD = 70;
const DRAG_ACTIVATION = 10;
const RESISTANCE = 0.35;
const WHEEL_COOLDOWN_MS = 380;
const DESKTOP_MEDIA = "(min-width: 768px)";
const mq = window.matchMedia(DESKTOP_MEDIA);

let slides = [];
let dots = [];
let liveEl, prevBtn, nextBtn;

// ==========================
// Helpers
// ==========================
const money = (n) =>
  n.toLocaleString(CURRENCY_LOCALE, { style: "currency", currency: CURRENCY_CODE });

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const isOpen = () => !stories.classList.contains("is-hidden");

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function waLink(p) {
  const text = `Hola! Quiero pedir el helado "${p.name}" (${money(p.price)}).`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

const imageFor = (p) => (mq.matches ? p.imageDesktop : p.imageMobile);

function updateWidth() {
  width = stories.getBoundingClientRect().width || window.innerWidth;
}

function setTrackTransition(enabled) {
  track.style.transition = enabled ? "" : "none";
}

// Precarga la imagen del slide vecino para que no "parpadee" al llegar
const preloaded = new Set();
function preload(i) {
  const p = products[i];
  if (!p) return;
  const src = imageFor(p);
  if (preloaded.has(src)) return;
  preloaded.add(src);
  new Image().src = src;
}

// ==========================
// Navegación central
// ==========================
function setIndex(next, { animate = true, announce = true } = {}) {
  index = clamp(next, 0, products.length - 1);
  setTrackTransition(animate);
  track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;

  dots.forEach((d, i) => {
    d.classList.toggle("is-active", i === index);
    if (i === index) d.setAttribute("aria-current", "true");
    else d.removeAttribute("aria-current");
  });

  // Solo el slide visible es accesible/enfocable (evita tabular a botones ocultos)
  slides.forEach((s, i) => {
    const active = i === index;
    s.toggleAttribute("inert", !active);
    s.setAttribute("aria-hidden", active ? "false" : "true");
  });

  if (prevBtn) prevBtn.disabled = index === 0;
  if (nextBtn) nextBtn.disabled = index === products.length - 1;

  preload(index - 1);
  preload(index + 1);

  if (announce && liveEl) {
    const p = products[index];
    liveEl.textContent = `${p.name}, ${money(p.price)}. Helado ${index + 1} de ${products.length}.`;
  }
}

const go = (delta) => setIndex(index + delta);

function applyDrag(px) {
  let pct = (px / width) * 100;
  const atEdge =
    (index === 0 && px > 0) || (index === products.length - 1 && px < 0);
  if (atEdge) pct *= RESISTANCE;
  track.style.transform = `translate3d(${-index * 100 + pct}%, 0, 0)`;
}

function updateAllBackgrounds() {
  slides.forEach((slideEl, i) => {
    const bg = slideEl.querySelector(".card__bg");
    if (bg) bg.style.backgroundImage = `url('${imageFor(products[i])}')`;
  });
}

// ==========================
// Render
// ==========================
function buildSlides() {
  track.innerHTML = "";
  dotsEl.innerHTML = "";

  products.forEach((p, i) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    slide.innerHTML = `
      <article class="card" role="group" aria-roledescription="diapositiva" aria-label="Helado ${i + 1} de ${products.length}">
        <div class="card__media">
          <div class="card__bg"></div>

          <picture>
            <source media="${DESKTOP_MEDIA}" srcset="${p.imageDesktop}">
            <img src="${p.imageMobile}" alt="Helado de ${escapeHtml(p.name)}"
                 ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" draggable="false">
          </picture>

          ${
            p.badge
              ? `<div class="ribbon ${p.badge.toLowerCase() === "nuevo" ? "ribbon--new" : ""}" role="img" aria-label="${escapeHtml(p.badge)}">
                   <span class="ribbon__text" aria-hidden="true">${escapeHtml(p.badge)}</span>
                 </div>`
              : ""
          }

          <div class="card__gradient"></div>

          <div class="card__content">
            <h2 class="card__title">${escapeHtml(p.name)}</h2>
            <p class="card__subtitle">${escapeHtml(BASE_TEXT)}</p>
            <p class="card__desc">${escapeHtml(p.desc)}</p>

            <div class="card__metaRow">
              <div class="card__price">${money(p.price)}</div>
              <a class="btn btn--wa" href="${waLink(p)}" target="_blank" rel="noopener noreferrer"
                 aria-label="Pedir ${escapeHtml(p.name)} por WhatsApp">
                Pedir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </article>
    `;
    track.appendChild(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "dot";
    dot.setAttribute("aria-label", `Ir a ${p.name}`);
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      setIndex(i);
    });
    dotsEl.appendChild(dot);
  });

  slides = [...track.children];
  dots = [...dotsEl.children];

  // Región en vivo para lectores de pantalla
  liveEl = document.createElement("div");
  liveEl.className = "sr-only";
  liveEl.setAttribute("aria-live", "polite");
  stories.appendChild(liveEl);

  // Flechas (se muestran solo en escritorio vía CSS)
  const mkArrow = (cls, label, delta, svgPath) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `nav ${cls}`;
    b.setAttribute("aria-label", label);
    b.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="${svgPath}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      go(delta);
    });
    stories.appendChild(b);
    return b;
  };
  prevBtn = mkArrow("nav--prev", "Helado anterior", -1, "M15 5l-7 7 7 7");
  nextBtn = mkArrow("nav--next", "Helado siguiente", 1, "M9 5l7 7-7 7");

  stories.setAttribute("role", "region");
  stories.setAttribute("aria-roledescription", "carrusel");
  stories.setAttribute("aria-label", "Menú de helados");

  updateAllBackgrounds();
}

// ==========================
// Arrastre (pointer events)
// ==========================
function onPointerDown(e) {
  if (!isOpen()) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (e.target.closest(".nav, .dot")) return;

  updateWidth();
  isPointerDown = true;
  isDragging = false;
  suppressClick = false;
  activePointerId = e.pointerId;
  startX = e.clientX;
  startY = e.clientY;
  movedX = 0;
}

function onPointerMove(e) {
  if (!isPointerDown || e.pointerId !== activePointerId) return;

  movedX = e.clientX - startX;
  const movedY = e.clientY - startY;

  if (!isDragging) {
    // Si el gesto es más vertical que horizontal, se ignora (no secuestra el scroll)
    if (Math.abs(movedY) > Math.abs(movedX) && Math.abs(movedY) > DRAG_ACTIVATION) {
      isPointerDown = false;
      return;
    }
    if (Math.abs(movedX) > DRAG_ACTIVATION) {
      isDragging = true;
      suppressClick = true;
      stories.classList.add("is-dragging");
      setTrackTransition(false);
      // Se captura el puntero SOLO al arrastrar: así los clics en los botones siguen funcionando
      stories.setPointerCapture?.(e.pointerId);
    }
  }

  if (isDragging) applyDrag(movedX);
}

function onPointerUp(e) {
  if (!isPointerDown || (e && e.pointerId !== activePointerId)) return;
  isPointerDown = false;
  stories.classList.remove("is-dragging");

  if (!isDragging) return;

  isDragging = false;
  const abs = Math.abs(movedX);
  if (abs > SWIPE_THRESHOLD) setIndex(index + (movedX < 0 ? 1 : -1));
  else setIndex(index, { announce: false });
  movedX = 0;

  // Libera la supresión de clic tras el evento actual
  setTimeout(() => (suppressClick = false), 0);
}

function onClickCapture(e) {
  if (suppressClick) {
    e.preventDefault();
    e.stopPropagation();
    suppressClick = false;
  }
}

// ==========================
// Rueda / trackpad
// ==========================
function onWheel(e) {
  if (!isOpen()) return;
  const primary = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
  if (Math.abs(primary) < 12) return;

  e.preventDefault();
  if (wheelLock) return;
  wheelLock = true;
  setTimeout(() => (wheelLock = false), WHEEL_COOLDOWN_MS);

  go(primary > 0 ? 1 : -1);
}

// ==========================
// Apertura / cierre
// ==========================
function openStories() {
  splash.classList.add("is-hidden");
  stories.classList.remove("is-hidden");
  updateWidth();
  setIndex(0, { animate: false });
  stories.focus({ preventScroll: true });
}

function closeStories() {
  stories.classList.add("is-hidden");
  splash.classList.remove("is-hidden");
  setIndex(0, { animate: false, announce: false });
  startBtn.focus({ preventScroll: true });
}

// ==========================
// Eventos
// ==========================
startBtn.addEventListener("click", openStories);

stories.tabIndex = -1;
stories.addEventListener("pointerdown", onPointerDown);
stories.addEventListener("pointermove", onPointerMove);
stories.addEventListener("pointerup", onPointerUp);
stories.addEventListener("pointercancel", onPointerUp);
stories.addEventListener("click", onClickCapture, true);
stories.addEventListener("wheel", onWheel, { passive: false });

window.addEventListener("keydown", (e) => {
  if (!isOpen()) return;
  if (e.key === "ArrowRight") go(1);
  else if (e.key === "ArrowLeft") go(-1);
  else if (e.key === "Home") setIndex(0);
  else if (e.key === "End") setIndex(products.length - 1);
  else if (e.key === "Escape") closeStories();
});

// Un solo manejador para resize, rotación y cambio de breakpoint
let rafId = 0;
function onViewportChange() {
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(() => {
    updateAllBackgrounds();
    if (!isOpen()) return;
    updateWidth();
    setIndex(index, { animate: false, announce: false });
  });
}
window.addEventListener("resize", onViewportChange);
mq.addEventListener?.("change", onViewportChange);

// ==========================
// Init
// ==========================
buildSlides();
setIndex(0, { animate: false, announce: false });
