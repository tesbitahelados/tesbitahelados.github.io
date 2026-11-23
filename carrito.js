// Carrito de pedido: se carga DESPUÉS de app.js y reutiliza sus variables
(() => {
  const KEY = "tesbita_pedido_v1";
  const MAX_QTY = 20;
  const byName = new Map(products.map((p) => [p.name, p]));
  const cart = new Map(); // nombre -> cantidad
  const app = qs("#app");

  // ---------- Persistencia ----------
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    Object.entries(saved).forEach(([n, q]) => {
      if (byName.has(n) && Number.isInteger(q) && q > 0) cart.set(n, Math.min(q, MAX_QTY));
    });
  } catch (_) {}

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(cart))); } catch (_) {}
  };

  const count = () => [...cart.values()].reduce((a, b) => a + b, 0);
  const total = () => [...cart].reduce((s, [n, q]) => s + byName.get(n).price * q, 0);

  // ---------- DOM ----------
  const fab = document.createElement("button");
  fab.type = "button";
  fab.className = "cart-fab is-empty";
  fab.innerHTML = `
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8zM9 8V6a3 3 0 016 0v2" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
    <span class="cart-fab__label">Mi pedido</span>
    <span class="cart-fab__count" aria-hidden="true">0</span>`;

  const sheet = document.createElement("div");
  sheet.className = "cart";
  sheet.hidden = true;
  sheet.innerHTML = `
    <div class="cart__backdrop" data-close></div>
    <section class="cart__sheet" role="dialog" aria-modal="true" aria-labelledby="cartTitle">
      <header class="cart__head">
        <h2 id="cartTitle">Mi pedido</h2>
        <button type="button" class="cart__x" data-close aria-label="Cerrar pedido">×</button>
      </header>
      <ul class="cart__list"></ul>
      <div class="cart__form">
        <label>Nombre <input id="cartName" type="text" autocomplete="name" maxlength="60" placeholder="Opcional"></label>
        <label>Nota <textarea id="cartNote" rows="2" maxlength="240" placeholder="Ej: hora de entrega, dirección…"></textarea></label>
      </div>
      <footer class="cart__foot">
        <div class="cart__total"><span>Total</span><strong id="cartTotal"></strong></div>
        <a class="btn btn--wa cart__send" id="cartSend" target="_blank" rel="noopener noreferrer">Enviar pedido por WhatsApp</a>
        <button type="button" class="cart__clear">Vaciar pedido</button>
      </footer>
    </section>`;

  const toast = document.createElement("div");
  toast.className = "cart-toast";
  toast.setAttribute("role", "status");

  app.append(fab, sheet, toast);

  const list = sheet.querySelector(".cart__list");
  const nameIn = sheet.querySelector("#cartName");
  const noteIn = sheet.querySelector("#cartNote");
  const sendBtn = sheet.querySelector("#cartSend");
  const totalEl = sheet.querySelector("#cartTotal");
  const countEl = fab.querySelector(".cart-fab__count");

  // ---------- Botón "Agregar" en cada tarjeta ----------
  const addBtns = [];
  slides.forEach((slideEl, i) => {
    const p = products[i];
    const row = slideEl.querySelector(".card__metaRow");
    const wa = row.querySelector(".btn--wa");
    const actions = document.createElement("div");
    actions.className = "card__actions";

    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn--add";
    add.addEventListener("click", () => {
      change(p.name, 1);
      showToast(`${p.name} agregado al pedido`);
    });

    actions.append(add, wa);
    row.append(actions);
    addBtns.push(add);
  });

  // ---------- Lógica ----------
  function change(name, delta) {
    const q = clamp((cart.get(name) || 0) + delta, 0, MAX_QTY);
    if (q === 0) cart.delete(name);
    else cart.set(name, q);
    save();
    render();
  }

  function message() {
    const lines = [...cart].map(([n, q]) => `• ${q} × ${n} — ${money(byName.get(n).price * q)}`);
    const name = nameIn.value.trim();
    const note = noteIn.value.trim();
    const parts = ["Hola! Quiero hacer este pedido:", "", ...lines, "", `Total: ${money(total())}`];
    if (name) parts.push(`Nombre: ${name}`);
    if (note) parts.push(`Nota: ${note}`);
    return parts.join("\n");
  }

  function updateSend() {
    sendBtn.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message())}`;
  }

  function render() {
    const n = count();
    countEl.textContent = n;
    fab.classList.toggle("is-empty", n === 0);
    fab.setAttribute("aria-label", `Ver mi pedido, ${n} ${n === 1 ? "helado" : "helados"}, ${money(total())}`);

    addBtns.forEach((b, i) => {
      const q = cart.get(products[i].name) || 0;
      b.innerHTML = q ? `Agregar otro <span class="chip">${q}</span>` : "Agregar al pedido";
      b.setAttribute("aria-label", `Agregar ${products[i].name} al pedido${q ? `, ya tiene ${q}` : ""}`);
    });

    list.innerHTML = [...cart]
      .map(([name, q]) => {
        const p = byName.get(name);
        const nm = escapeHtml(name);
        return `<li class="cart__item">
          <div class="cart__info"><strong>${nm}</strong><span>${money(p.price)} c/u</span></div>
          <div class="cart__qty" role="group" aria-label="Cantidad de ${nm}">
            <button type="button" data-act="dec" data-name="${nm}" aria-label="Quitar uno de ${nm}">−</button>
            <output>${q}</output>
            <button type="button" data-act="inc" data-name="${nm}" aria-label="Agregar uno de ${nm}" ${q >= MAX_QTY ? "disabled" : ""}>+</button>
          </div>
          <div class="cart__sub">${money(p.price * q)}</div>
        </li>`;
      })
      .join("");

    totalEl.textContent = money(total());
    updateSend();
    if (n === 0 && !sheet.hidden) closeCart();
  }

  let toastTimer;
  function showToast(text) {
    toast.textContent = text;
    toast.classList.add("is-on");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-on"), 1600);
  }

  // ---------- Abrir / cerrar ----------
  function openCart() {
    if (!count()) return;
    sheet.hidden = false;
    stories.inert = true;
    fab.inert = true;
    sheet.querySelector(".cart__x").focus();
  }

  function closeCart() {
    sheet.hidden = true;
    stories.inert = false;
    fab.inert = false;
    fab.focus({ preventScroll: true });
  }

  fab.addEventListener("click", openCart);
  sheet.addEventListener("click", (e) => {
    if (e.target.closest("[data-close]")) closeCart();
    if (e.target.closest(".cart__clear") && confirm("¿Vaciar todo el pedido?")) {
      cart.clear();
      save();
      render();
    }
    const b = e.target.closest("[data-act]");
    if (b) change(b.dataset.name, b.dataset.act === "inc" ? 1 : -1);
  });

  [nameIn, noteIn].forEach((el) => el.addEventListener("input", updateSend));

  // Teclado dentro del pedido: no debe mover el carrusel; Escape cierra; Tab queda atrapado
  sheet.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Escape") return closeCart();
    if (e.key !== "Tab") return;
    const f = [...sheet.querySelectorAll("button:not([disabled]), a[href], input, textarea")];
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  render();
})();