// ==========================
// Config
// ==========================
const WHATSAPP_NUMBER = "50662943981"; // <-- CAMBIAR (sin +)
const CURRENCY_LOCALE = "es-CR";
const CURRENCY_CODE = "CRC";

// ==========================
// Data
// ==========================
const products = [
  {
    name: "Cheesecake de fresa",
    desc: "Elaborado a partir de crema dulce y leche condensada sin azúcares añadidos, queso crema y galleta de vainilla de manera manual y artesanal.",
    price: 750,
    imageMobile: "assets/fresa916.webp",
    imageDesktop: "assets/fresa169.webp",
  },
  {
    name: "Coco",
    desc: "Elaborado a partir de crema dulce y condensada sin azúcar añadido y rayadura de coco natural de manera manual y artesanal.",
    price: 600,
    imageMobile: "assets/coco916.webp",
    imageDesktop: "assets/coco169.webp",
  },
  {
    name: "Cookie Monster",
    desc: "Elaborado a partir de crema dulce y condensada sin azúcares añadidos, galleta oreo, colorantes en gel y saborizantes, de manera manual y artesanal.",
    price: 600,
    imageMobile: "assets/monster916.webp",
    imageDesktop: "assets/monster169.webp",
  },
  {
    name: "Dulce de leche",
    desc: "Elaborado a partir de crema dulce y condensada sin azúcares añadidos, dulce de luxe sucedáneo de manera manual y artesanal.",
    price: 600,
    imageMobile: "assets/dulce916.webp",
    imageDesktop: "assets/dulce169.webp",
  },
  {
    name: "Menta y Chispas de Chocolate",
    desc: "Elaborado a partir de crema dulce y condensada sin azúcares añadidos, colorantes en gel y saborizantes, Además  de chispas de chocolate amargo como añadido de manera manual y artesanal.",
    price: 600,
    imageMobile: "assets/menta916.webp",
    imageDesktop: "assets/menta169.webp",
  },
  {
    name: "Combinado",
    desc: "Elaborado a partir de crema dulce y condensada sin azúcares añadidos, cocoa dulce  como saborizante manera manual y artesanal.",
    price: 600,
    imageMobile: "assets/combinado916.webp",
    imageDesktop: "assets/combinado169.webp",
  },
  {
    name: "Maní con miel",
    desc: "Elaborado a partir de crema dulce y leche condensada sin azúcares añadidos, colorantes en gel y saborizantes, mani con miel tostado de manera manual y artesanal.",
    price: 600,
    imageMobile: "assets/mielmani916.webp",
    imageDesktop: "assets/mielmani169.webp",
  },
  {
    name: "Cookies and Cream",
    desc: "Elaborado a partir de crema dulce y condensada sin azúcares añadidos, galleta oreo de manera manual y artesanal.",
    price: 600,
    imageMobile: "assets/cookies916.webp",
    imageDesktop: "assets/cookies169.webp",
  },
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
// State
// ==========================
let index = 0;

// drag
let isPointerDown = false;
let isDragging = false;
let startX = 0;
let movedX = 0;
let width = 1;
let suppressClick = false;

// wheel
let wheelLock = false;

// Tuning
const SWIPE_THRESHOLD = 70;
const DRAG_ACTIVATION = 10;
const RESISTANCE = 0.35;
const WHEEL_COOLDOWN_MS = 380;

// Breakpoint (manténgalo alineado con su CSS)
const DESKTOP_MEDIA = "(min-width: 768px)";

// ==========================
// Helpers
// ==========================
const money = (n) =>
  n.toLocaleString(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY_CODE,
  });

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function waLink(product) {
  const text = `Hola! Quiero pedir el helado "${product.name}" (${money(product.price)}).`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
}

function isDesktopNow() {
  return window.matchMedia?.(DESKTOP_MEDIA).matches ?? window.innerWidth >= 768;
}

function getImageForBreakpoint(p) {
  return isDesktopNow() ? p.imageDesktop : p.imageMobile;
}

function updateWidth() {
  width = stories.getBoundingClientRect().width || window.innerWidth;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function setTrackTransition(enabled) {
  track.style.transition = enabled ? "" : "none";
}

function setIndex(next, { animate = true } = {}) {
  index = clamp(next, 0, products.length - 1);
  setTrackTransition(animate);
  track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
  [...dotsEl.children].forEach((d, i) =>
    d.classList.toggle("is-active", i === index),
  );
}

function dragOffsetPercent(px) {
  let offsetPct = (px / width) * 100;
  const atFirst = index === 0 && px > 0;
  const atLast = index === products.length - 1 && px < 0;
  if (atFirst || atLast) offsetPct *= RESISTANCE;
  return offsetPct;
}

function applyDrag(px) {
  const offsetPct = dragOffsetPercent(px);
  track.style.transform = `translate3d(${-index * 100 + offsetPct}%, 0, 0)`;
}

function updateAllBackgrounds() {
  [...track.children].forEach((slideEl, i) => {
    const p = products[i];
    const bg = slideEl.querySelector(".card__bg");
    if (bg) bg.style.backgroundImage = `url('${getImageForBreakpoint(p)}')`;
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
      <article class="card" role="group" aria-label="Helado ${i + 1} de ${products.length}">
        <div class="card__media">
          <div class="card__bg"></div>

          <picture>
            <source media="${DESKTOP_MEDIA}" srcset="${p.imageDesktop}">
            <img src="${p.imageMobile}" alt="${escapeHtml(p.name)}" loading="lazy" draggable="false">
          </picture>

          <div class="card__gradient"></div>

          <div class="card__content">
            <h2 class="card__title">${escapeHtml(p.name)}</h2>

            <p class="card__desc">${escapeHtml(p.desc)}</p>

            <!-- MISMA FILA: precio izquierda + whatsapp derecha -->
            <div class="card__metaRow">
              <div class="card__price">${money(p.price)}</div>

              <a class="btn btn--wa" href="${waLink(p)}" target="_blank" rel="noopener">
                Pedir por WhatsApp
              </a>
            </div>
          </div>
        </div>
      </article>
    `;

    track.appendChild(slide);

    const dot = document.createElement("span");
    dot.className = "dot" + (i === 0 ? " is-active" : "");
    dotsEl.appendChild(dot);
  });

  // set blur backgrounds according to breakpoint
  updateAllBackgrounds();
}

// ==========================
// Pointer handlers
// ==========================
function onPointerDown(e) {
  if (stories.classList.contains("is-hidden")) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;

  updateWidth();
  isPointerDown = true;
  isDragging = false;
  suppressClick = false;

  startX = e.clientX;
  movedX = 0;

  stories.classList.add("is-dragging");
  setTrackTransition(false);

  stories.setPointerCapture?.(e.pointerId);
}

function onPointerMove(e) {
  if (!isPointerDown) return;

  movedX = e.clientX - startX;

  if (!isDragging && Math.abs(movedX) > DRAG_ACTIVATION) {
    isDragging = true;
    suppressClick = true;
  }

  if (isDragging) {
    e.preventDefault?.();
    applyDrag(movedX);
  }
}

function onPointerUp() {
  if (!isPointerDown) return;

  isPointerDown = false;
  stories.classList.remove("is-dragging");
  setTrackTransition(true);

  if (!isDragging) {
    setIndex(index);
    return;
  }

  const abs = Math.abs(movedX);
  if (abs > SWIPE_THRESHOLD) {
    if (movedX < 0) setIndex(index + 1);
    else setIndex(index - 1);
  } else {
    setIndex(index);
  }

  isDragging = false;
  movedX = 0;
}

function onClickCapture(e) {
  if (suppressClick) {
    e.preventDefault();
    e.stopPropagation();
    suppressClick = false;
  }
}

// ==========================
// Wheel / Trackpad
// ==========================
function onWheel(e) {
  if (stories.classList.contains("is-hidden")) return;
  if (wheelLock) return;

  const dx = e.deltaX;
  const dy = e.deltaY;

  const primary = Math.abs(dx) > Math.abs(dy) ? dx : dy;
  if (Math.abs(primary) < 12) return;

  e.preventDefault();

  wheelLock = true;
  setTimeout(() => (wheelLock = false), WHEEL_COOLDOWN_MS);

  if (primary > 0) setIndex(index + 1);
  else setIndex(index - 1);
}

// ==========================
// Nav
// ==========================
startBtn.addEventListener("click", () => {
  splash.classList.add("is-hidden");
  stories.classList.remove("is-hidden");
  updateWidth();
  setIndex(0, { animate: false });
  requestAnimationFrame(() => setIndex(0, { animate: true }));
});

stories.addEventListener("pointerdown", onPointerDown);
stories.addEventListener("pointermove", onPointerMove);
stories.addEventListener("pointerup", onPointerUp);
stories.addEventListener("pointercancel", onPointerUp);

stories.addEventListener("click", onClickCapture, true);
stories.addEventListener("wheel", onWheel, { passive: false });

// Keyboard
window.addEventListener("keydown", (e) => {
  if (stories.classList.contains("is-hidden")) return;

  if (e.key === "ArrowRight") setIndex(index + 1);
  if (e.key === "ArrowLeft") setIndex(index - 1);

  if (e.key === "Escape") {
    stories.classList.add("is-hidden");
    splash.classList.remove("is-hidden");
    setIndex(0, { animate: false });
  }
});

// Resize
window.addEventListener("resize", () => {
  if (stories.classList.contains("is-hidden")) return;
  updateWidth();
  updateAllBackgrounds();
  setIndex(index, { animate: false });
});

// Optional: si el navegador soporta matchMedia events, reacciona al cambio de breakpoint sin resize
try {
  const mq = window.matchMedia(DESKTOP_MEDIA);
  mq.addEventListener?.("change", () => {
    updateAllBackgrounds();
    setIndex(index, { animate: false });
  });
} catch (_) {}

// ==========================
// Init
// ==========================
buildSlides();
setIndex(0, { animate: false });
