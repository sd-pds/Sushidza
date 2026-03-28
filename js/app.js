/* PROЖАРИМ — магазин (GitHub Pages front)
   Корзина: localStorage
   Доставка: Yandex Maps + GeoJSON зоны + point-in-polygon
   Отправка заказа: через API (Cloudflare Worker / Netlify Function)
*/

let ORDER_API_URL = "https://api.полихов.рф";



const THEME_PRESETS = {
  red: { accent:'#ff2b2b', accent2:'#ff5a2b', accentSoft:'#ffcc7a' },
  orange: { accent:'#ff7a18', accent2:'#ff9f1a', accentSoft:'#ffd68a' },
  yellow: { accent:'#e8b100', accent2:'#ffd000', accentSoft:'#fff0a6' },
  green: { accent:'#12b76a', accent2:'#24d17e', accentSoft:'#a4f4c5' },
  cyan: { accent:'#00bcd4', accent2:'#22d3ee', accentSoft:'#a5f3fc' },
  blue: { accent:'#2563eb', accent2:'#3b82f6', accentSoft:'#93c5fd' },
  purple: { accent:'#7c3aed', accent2:'#a855f7', accentSoft:'#d8b4fe' },
  gray: { accent:'#6b7280', accent2:'#9ca3af', accentSoft:'#d1d5db' },
  black: { accent:'#111111', accent2:'#2b2b2b', accentSoft:'#999999' }
};
const THEME_MODES = {
  dark: { bg:'#070708', bg2:'#0b0b0d', card:'rgba(255,255,255,.06)', card2:'rgba(255,255,255,.08)', stroke:'rgba(255,255,255,.12)', txt:'#f3f3f4', muted:'rgba(243,243,244,.72)', shadow:'0 20px 60px rgba(0,0,0,.55)' },
  light: { bg:'#f4f5f7', bg2:'#ffffff', card:'rgba(255,255,255,.85)', card2:'rgba(255,255,255,.95)', stroke:'rgba(15,23,42,.10)', txt:'#111827', muted:'rgba(17,24,39,.68)', shadow:'0 20px 60px rgba(15,23,42,.12)' }
};
let SITE_CONFIG = null;
let THEME_CONFIG = null;
let NOTIFICATIONS_CONFIG = null;

function hexToRgbTriplet(hex) {
  const clean = String(hex || '').replace('#', '');
  if (clean.length !== 6) return '255,43,43';
  const int = parseInt(clean, 16);
  return `${(int >> 16) & 255},${(int >> 8) & 255},${int & 255}`;
}
async function loadJsonSafe(path, fallback = null) {
  try {
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(path);
    return await res.json();
  } catch {
    return fallback;
  }
}
function applyMeta(id, value, attr = 'content') {
  const el = document.getElementById(id);
  if (el && value) el.setAttribute(attr, value);
}
function htmlEscape(value) {
  return String(value ?? '').replace(/[&<>"]/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));
}
function normalizePhone(phone) {
  return String(phone || '').replace(/[^\d+]/g, '');
}
function socialButtonMarkup(item = {}) {
  const isDownload = item.download ? ' download' : '';
  return `<a class="socialBtn" href="${htmlEscape(item.href || '#')}"${isDownload} aria-label="${htmlEscape(item.label || 'Ссылка')}"><span>${htmlEscape(item.label || 'Ссылка')}</span></a>`;
}
function promoMarkup(item = {}) {
  const img = item.image ? `<img class="promoSlide__img" src="${htmlEscape(item.image)}" alt="${htmlEscape(item.title || 'Акция')}">` : '';
  const content = item.title || item.text || item.badge ? `<div class="promoSlide__content">${item.badge ? `<div class="promoSlide__badge">${htmlEscape(item.badge)}</div>` : ''}${item.title ? `<div class="promoSlide__title">${htmlEscape(item.title)}</div>` : ''}${item.text ? `<div class="promoSlide__text">${htmlEscape(item.text)}</div>` : ''}${item.link ? `<a class="btn btn--ghost" href="${htmlEscape(item.link)}">Подробнее</a>` : ''}</div>` : '';
  return `<article class="promoSlide">${img}${content}</article>`;
}
function renderHeroStats(stats = []) {
  const wrap = document.getElementById('heroStats');
  if (!wrap) return;
  wrap.innerHTML = (stats || []).map(item => `<div class="stat"><div class="stat__num">${htmlEscape(item.value || '')}</div><div class="stat__txt">${htmlEscape(item.label || '')}</div></div>`).join('');
}
function applyThemeConfig(theme = {}) {
  THEME_CONFIG = theme || {};
  const preset = THEME_PRESETS[theme.preset] || THEME_PRESETS.red;
  const mode = THEME_MODES[theme.mode] || THEME_MODES.dark;
  const root = document.documentElement;
  root.dataset.themePreset = theme.preset || 'red';
  root.dataset.themeMode = theme.mode || 'dark';
  root.style.setProperty('--accent', preset.accent);
  root.style.setProperty('--accent2', preset.accent2);
  root.style.setProperty('--accentSoft', preset.accentSoft);
  root.style.setProperty('--accentRgb', hexToRgbTriplet(preset.accent));
  root.style.setProperty('--accent2Rgb', hexToRgbTriplet(preset.accent2));
  root.style.setProperty('--accentSoftRgb', hexToRgbTriplet(preset.accentSoft));
  for (const [k, v] of Object.entries(mode)) root.style.setProperty(`--${k}`, v);
  if (theme.radius) root.style.setProperty('--r', `${theme.radius}px`);
  if (theme.radiusLarge) root.style.setProperty('--r2', `${theme.radiusLarge}px`);
  const customCss = document.getElementById('customThemeStylesheet');
  if (customCss && theme.customCssPath) customCss.href = `${theme.customCssPath}?v=${Date.now()}`;
}
function applySiteConfig(cfg = {}) {
  SITE_CONFIG = cfg || {};
  const seo = cfg.seo || {};
  if (seo.title) document.title = seo.title;
  applyMeta('metaDescription', seo.description);
  applyMeta('metaKeywords', seo.keywords);
  applyMeta('canonicalLink', seo.canonical, 'href');
  applyMeta('ogTitle', seo.title);
  applyMeta('ogDescription', seo.description);
  applyMeta('ogSiteName', cfg.brand?.name || '');
  applyMeta('ogUrl', seo.canonical);
  const ogImage = new URL(cfg.brand?.logo || 'assets/logo.png', location.href).href;
  applyMeta('ogImage', ogImage);
  applyMeta('twitterTitle', seo.title);
  applyMeta('twitterDescription', seo.description);
  applyMeta('twitterImage', ogImage);
  const fav = document.getElementById('faviconLink');
  if (fav && cfg.brand?.logo) fav.href = cfg.brand.logo;
  const logo = document.getElementById('brandLogo');
  if (logo && cfg.brand?.logo) { logo.src = cfg.brand.logo; logo.alt = cfg.brand?.name || 'logo'; }
  const brandLink = document.querySelector('.brand');
  if (brandLink && cfg.brand?.name) brandLink.setAttribute('aria-label', cfg.brand.name);
  const setText = (id, value) => { const el = document.getElementById(id); if (el && value !== undefined) el.textContent = value; };
  setText('brandName', cfg.brand?.name);
  setText('brandSub', cfg.brand?.sub);
  setText('navMenuLink', cfg.navigation?.menu);
  setText('navPromotionsLink', cfg.navigation?.promotions);
  setText('navDeliveryLink', cfg.navigation?.delivery);
  setText('navContactsLink', cfg.navigation?.contacts);
  setText('heroPill', cfg.brand?.cityPill);
  setText('heroTitleText', cfg.hero?.title);
  setText('heroAccent', cfg.hero?.accent);
  setText('heroDesc', cfg.hero?.description);
  setText('heroPrimaryBtn', cfg.hero?.ctaPrimary);
  setText('heroSecondaryBtn', cfg.hero?.ctaSecondary);
  setText('hitsBadge', cfg.hero?.hitsBadge);
  setText('hitsTitle', cfg.hero?.hitsTitle);
  setText('hitsHint', cfg.hero?.hitsHint);
  renderHeroStats(cfg.stats || []);
  setText('deliveryTitle', cfg.delivery?.title);
  setText('pickupTitle', cfg.delivery?.pickupTitle);
  setText('pickupText', cfg.delivery?.pickupText);
  const pp = document.getElementById('pickupPoints');
  if (pp && Array.isArray(cfg.delivery?.pickupPoints)) pp.innerHTML = cfg.delivery.pickupPoints.map(x => `<li>${htmlEscape(x)}</li>`).join('');
  const pickupSelect = document.querySelector('select[name="pickupAddress"]');
  if (pickupSelect && Array.isArray(cfg.delivery?.pickupPoints)) pickupSelect.innerHTML = cfg.delivery.pickupPoints.map(x => `<option>${htmlEscape(x)}</option>`).join('');
  setText('deliveryCardTitle', cfg.delivery?.deliveryTitle);
  setText('deliveryCardText', cfg.delivery?.deliveryText);
  setText('paymentTitle', cfg.delivery?.paymentTitle);
  const paymentText = document.getElementById('paymentText');
  if (paymentText && Array.isArray(cfg.delivery?.paymentItems)) paymentText.innerHTML = cfg.delivery.paymentItems.map(x => `• ${htmlEscape(x)}`).join('<br>');
  const contactTitle = document.getElementById('contactsTitle'); if (contactTitle && cfg.contacts?.title) contactTitle.textContent = cfg.contacts.title;
  const cards = document.getElementById('contactsCards');
  if (cards && Array.isArray(cfg.contacts?.phones)) cards.innerHTML = cfg.contacts.phones.map(phone => `<div class="contactCard"><div class="contactCard__label">Телефон</div><a class="contactCard__value" href="tel:${htmlEscape(normalizePhone(phone))}">${htmlEscape(phone)}</a></div>`).join('');
  const actions = document.getElementById('contactActions');
  if (actions && Array.isArray(cfg.contacts?.socialButtons)) actions.innerHTML = cfg.contacts.socialButtons.map(socialButtonMarkup).join('');
  const footerText = document.getElementById('footerText'); if (footerText && cfg.footer?.text) footerText.innerHTML = cfg.footer.text;
  const footerPolicy = document.getElementById('footerPolicyLink'); if (footerPolicy && cfg.footer?.policyLabel) footerPolicy.textContent = cfg.footer.policyLabel;
  const promoSlider = document.getElementById('promoSlider'); if (promoSlider && Array.isArray(cfg.promotions)) promoSlider.innerHTML = cfg.promotions.filter(item => item && (item.image || item.title || item.text)).map(promoMarkup).join('');
  const seoTitle = document.getElementById('seoTitle'); if (seoTitle && cfg.seoText?.title) seoTitle.textContent = cfg.seoText.title;
  const seoParagraphs = document.getElementById('seoParagraphs'); if (seoParagraphs && Array.isArray(cfg.seoText?.paragraphs)) seoParagraphs.innerHTML = cfg.seoText.paragraphs.map(p => `<p>${htmlEscape(p)}</p>`).join('');
  if (cfg.businessRules) {
    MIN_DELIVERY_SUBTOTAL = Number(cfg.businessRules.minDeliverySubtotal ?? MIN_DELIVERY_SUBTOTAL);
    SMALL_ORDER_DELIVERY_SURCHARGE = Number(cfg.businessRules.smallOrderDeliverySurcharge ?? SMALL_ORDER_DELIVERY_SURCHARGE);
    BUSINESS_RULES = { ...BUSINESS_RULES, ...cfg.businessRules };
  }
}
async function loadRuntimeConfig() {
  const [siteCfg, themeCfg, notificationsCfg] = await Promise.all([
    loadJsonSafe('config/site.json', {}),
    loadJsonSafe('config/theme.json', {}),
    loadJsonSafe('config/notifications.json', {})
  ]);
  NOTIFICATIONS_CONFIG = notificationsCfg || {};
  if (notificationsCfg?.orderApiUrl) ORDER_API_URL = notificationsCfg.orderApiUrl;
  applyThemeConfig(themeCfg || {});
  applySiteConfig(siteCfg || {});
}

const els = {
  products: document.getElementById("products"),
  tabs: document.getElementById("categoryTabs"),
  search: document.getElementById("search"),
  hits: document.getElementById("hits"),

  openCart: document.getElementById("openCart"),
  cartDrawer: document.getElementById("cartDrawer"),
  closeCart: document.getElementById("closeCart"),
  closeCart2: document.getElementById("closeCart2"),
  cartItems: document.getElementById("cartItems"),
  cartCount: document.getElementById("cartCount"),
  cartSubtotal: document.getElementById("cartSubtotal"),
  goCheckout: document.getElementById("goCheckout"),

  checkoutModal: document.getElementById("checkoutModal"),
  closeCheckout: document.getElementById("closeCheckout"),
  closeCheckout2: document.getElementById("closeCheckout2"),
  checkoutForm: document.getElementById("checkoutForm"),

  pickupBlock: document.getElementById("pickupBlock"),
  deliveryBlock: document.getElementById("deliveryBlock"),

  sumProducts: document.getElementById("sumProducts"),
  sumDelivery: document.getElementById("sumDelivery"),
  sumTotal: document.getElementById("sumTotal"),
  sumCutlery: document.getElementById("sumCutlery"),
  sumNight: document.getElementById("sumNight"),
  nightMarkupRow: document.getElementById("nightMarkupRow"),

  toast: document.getElementById("toast"),
  mapInfo: document.getElementById("mapInfo"),
  phoneInput: document.getElementById("phoneInput") || document.querySelector('input[name="phone"]'),
  timeBlock: document.getElementById("timeBlock"),
  cutlerySelect: document.getElementById("cutlerySelect") || document.getElementById("cutleryInput") || document.querySelector('select[name="cutlery"]'),
  paymentSelect: document.getElementById("paymentSelect") || document.querySelector('select[name="payment"]'),
  cashChangeBlock: document.getElementById("cashChangeBlock"),
  promoCodeInput: document.getElementById("promoCodeInput"),
  applyPromoBtn: document.getElementById("applyPromoBtn"),
  promoHint: document.getElementById("promoHint"),
  promoDiscountRow: document.getElementById("promoDiscountRow"),
  sumPromoDiscount: document.getElementById("sumPromoDiscount"),
  promoBadge: document.getElementById("promoBadge"),
  backToTop: document.getElementById("backToTop")
};

const addressInput = document.getElementById("addressInput");
const suggestBox = document.getElementById("addressSuggest");

const STORAGE_KEY = "prozharim_local_v1";
const ORENBURG_UTC_OFFSET_MS = 5 * 60 * 60 * 1000;
let MIN_DELIVERY_SUBTOTAL = 700;
let SMALL_ORDER_DELIVERY_SURCHARGE = 150;
let BUSINESS_RULES = {
  nightStart: 23 * 60,
  nightEnd: 3 * 60,
  closedStart: 3 * 60 + 1,
  closedEnd: 11 * 60 - 1,
  preorderBlockedStart: 3 * 60 + 1,
  preorderBlockedEnd: 12 * 60 + 29
};

let MENU = [];
let ZONES = null;
let ZONES_DAY = null;
let ZONES_NIGHT = null;
let PROMOS = [];

let state = {
  category: "Все",
  query: "",
  cart: loadCart(),
  mode: "delivery",
  delivery: {
    lat: null,
    lng: null,
    address: "",
    zone: null,
    restaurant: null,
    price: null,
    available: false
  },
  when: {
    type: "now",
    date: null
  },
  pricing: {
    tariff: "day",
    tariffLabel: "Дневной",
    nightMarkup: 0
  },
  promo: {
    code: "",
    title: "",
    percent: 0,
    discount: 0,
    applied: false
  }
};

function rub(n) {
  return `${Math.round(Number(n) || 0)} ₽`;
}

function showToast(msg) {
  if (!els.toast) {
    alert(msg);
    return;
  }
  els.toast.textContent = msg;
  els.toast.classList.add("isOn");
  setTimeout(() => els.toast.classList.remove("isOn"), 2600);
}

function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCart() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cart));
  renderCartBadge();
}

function normalizeVariantIndex(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

function getCartKey(id, variantIndex = 1) {
  return `${id}__v${normalizeVariantIndex(variantIndex)}`;
}

function parseCartKey(key) {
  const raw = String(key || "");
  const match = raw.match(/^(.*)__v(\d+)$/);
  if (match) {
    return {
      id: match[1],
      variantIndex: normalizeVariantIndex(match[2])
    };
  }

  return {
    id: raw,
    variantIndex: 1
  };
}

function getProductVariants(product) {
  if (!product) return [];

  const variants = [];
  const pushVariant = (index) => {
    const suffix = index === 1 ? "" : String(index);
    const priceValue = product[`price${suffix}`];
    const weightValue = product[`weight${suffix}`];
    const labelValue = product[`label${suffix}`] || product[`variant${suffix}`] || product[`size${suffix}`];

    if (index !== 1 && (priceValue == null && weightValue == null && labelValue == null)) {
      return;
    }

    variants.push({
      index,
      price: Number(priceValue ?? product.price ?? 0),
      weight: String(weightValue ?? product.weight ?? "").trim(),
      label: String(labelValue ?? weightValue ?? `Вариант ${index}`).trim(),
      img: product[`img${suffix}`] || product.img || ""
    });
  };

  pushVariant(1);

  for (let i = 2; i <= 20; i += 1) {
    const hasAny = product[`price${i}`] != null || product[`weight${i}`] != null || product[`label${i}`] != null || product[`variant${i}`] != null || product[`size${i}`] != null || product[`img${i}`] != null;
    if (!hasAny) continue;
    pushVariant(i);
  }

  return variants.filter(v => Number.isFinite(v.price));
}

function getVariantByIndex(product, variantIndex = 1) {
  const variants = getProductVariants(product);
  return variants.find(v => v.index === normalizeVariantIndex(variantIndex)) || variants[0] || {
    index: 1,
    price: Number(product?.price || 0),
    weight: String(product?.weight || ""),
    label: String(product?.weight || ""),
    img: product?.img || ""
  };
}

function getCartEntry(key) {
  const { id, variantIndex } = parseCartKey(key);
  const product = MENU.find(x => x.id === id);
  const variant = getVariantByIndex(product, variantIndex);
  return { id, variantIndex, product, variant, key };
}

function cartCount() {
  return Object.values(state.cart).reduce((a, b) => a + b, 0);
}

function cartSum() {
  let sum = 0;
  for (const [key, qty] of Object.entries(state.cart)) {
    const entry = getCartEntry(key);
    if (entry.product) sum += Number(entry.variant.price || 0) * qty;
  }
  return Math.round(sum);
}

function openDrawer() {
  els.cartDrawer.classList.add("isOn");
  els.cartDrawer.setAttribute("aria-hidden", "false");
  renderCart();
}

function closeDrawer() {
  els.cartDrawer.classList.remove("isOn");
  els.cartDrawer.setAttribute("aria-hidden", "true");
}

function openCheckout() {
  if (cartCount() === 0) {
    showToast("Корзина пуста");
    return;
  }

  els.checkoutModal.classList.add("isOn");
  els.checkoutModal.setAttribute("aria-hidden", "false");
  renderTotals();

  if (state.mode === "delivery") {
    ensureMap().catch(() => {});
  }
}

function closeCheckout() {
  els.checkoutModal.classList.remove("isOn");
  els.checkoutModal.setAttribute("aria-hidden", "true");
}

function renderCartBadge() {
  els.cartCount.textContent = String(cartCount());
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function addToCart(id, variantIndex = 1, sourceEl = null) {
  const key = getCartKey(id, variantIndex);
  state.cart[key] = (state.cart[key] || 0) + 1;
  saveCart();

  if (sourceEl) {
    animateToCart(sourceEl);
  }

  showToast("Добавлено в корзину");
}

function decFromCart(key) {
  if (!state.cart[key]) return;
  state.cart[key] -= 1;
  if (state.cart[key] <= 0) delete state.cart[key];
  saveCart();
  renderCart();
  renderTotals();
}

function incFromCart(key) {
  state.cart[key] = (state.cart[key] || 0) + 1;
  saveCart();
  renderCart();
  renderTotals();
}

function renderCart() {
  els.cartItems.innerHTML = "";
  const keys = Object.keys(state.cart);

  if (keys.length === 0) {
    els.cartItems.innerHTML = `<div class="muted">Корзина пуста. Выберите блюда в каталоге.</div>`;
  } else {
    for (const key of keys) {
      const entry = getCartEntry(key);
      const p = entry.product;
      if (!p) continue;
      const qty = state.cart[key];

      const row = document.createElement("div");
      row.className = "cartItem";
      row.innerHTML = `
        <img src="${entry.variant.img || p.img}" alt="">
        <div>
          <div class="cartItem__name">${escapeHtml(p.name)}</div>
          <div class="cartItem__meta">${rub(entry.variant.price)}${entry.variant.weight ? ` • ${escapeHtml(entry.variant.weight)}` : ""}</div>
        </div>
        <div class="qty">
          <button type="button" data-act="dec">−</button>
          <span>${qty}</span>
          <button type="button" data-act="inc">+</button>
        </div>
      `;

      row.querySelector('[data-act="dec"]').addEventListener("click", () => decFromCart(key));
      row.querySelector('[data-act="inc"]').addEventListener("click", () => incFromCart(key));

      els.cartItems.appendChild(row);
    }
  }

  els.cartSubtotal.textContent = rub(cartSum());
}

function makeCard(p) {
  const variants = getProductVariants(p);
  const hasVariants = variants.length > 1;
  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <img class="card__img" src="${p.img}" alt="${escapeHtml(p.name)}">
    <div class="card__body">
      <div class="card__cat">${escapeHtml(p.category)}</div>
      <div class="card__nameRow">
        <div class="card__name">${escapeHtml(p.name)}</div>
        ${hasVariants ? `<select class="variantSelect" aria-label="Выбор варианта для ${escapeHtml(p.name)}">${variants.map(v => `<option value="${v.index}">${escapeHtml(v.label || v.weight || `Вариант ${v.index}`)}</option>`).join("")}</select>` : ""}
      </div>
      <div class="card__desc">${escapeHtml(p.desc || "")}</div>
      <div class="card__row">
        <div>
          <div class="price">${rub(variants[0]?.price ?? p.price)}</div>
          <div class="meta">${escapeHtml(variants[0]?.weight || p.weight || "")}</div>
        </div>
        <button class="btn btn--primary" type="button">В корзину</button>
      </div>
    </div>
  `;

  const priceEl = el.querySelector(".price");
  const metaEl = el.querySelector(".meta");
  const imgEl = el.querySelector(".card__img");
  const btn = el.querySelector("button");
  const select = el.querySelector(".variantSelect");

  const syncVariant = () => {
    const variantIndex = normalizeVariantIndex(select?.value || 1);
    const variant = getVariantByIndex(p, variantIndex);
    priceEl.textContent = rub(variant.price);
    metaEl.textContent = variant.weight || "";
    if (variant.img) imgEl.src = variant.img;
    return variantIndex;
  };

  if (select) {
    select.addEventListener("change", syncVariant);
    syncVariant();
  }

  btn.addEventListener("click", () => {
    const variantIndex = syncVariant();
    addToCart(p.id, variantIndex, imgEl);
  });

  return el;
}

function renderTabs() {
  const cats = ["Все", ...Array.from(new Set(MENU.map(x => x.category)))];
  els.tabs.innerHTML = "";

  for (const c of cats) {
    const b = document.createElement("button");
    b.className = "tab" + (c === state.category ? " isOn" : "");
    b.type = "button";
    b.textContent = c;
    b.addEventListener("click", () => {
      state.category = c;
      renderTabs();
      renderProducts();
    });
    els.tabs.appendChild(b);
  }
}

function renderProducts() {
  const q = state.query.trim().toLowerCase();
  let list = MENU.slice();

  if (state.category !== "Все") {
    list = list.filter(x => x.category === state.category);
  }

  if (q) {
    list = list.filter(x =>
      (x.name || "").toLowerCase().includes(q) ||
      (x.desc || "").toLowerCase().includes(q) ||
      (x.category || "").toLowerCase().includes(q)
    );
  }

  els.products.innerHTML = "";
  for (const p of list) {
    els.products.appendChild(makeCard(p));
  }
}

function renderHits() {
  const hits = MENU.filter(x => x.hit).slice(0, 4);

  if (!hits.length) {
    els.hits.innerHTML = `<div class="muted">Добавь пометку "hit": true в menu.json</div>`;
    return;
  }

  els.hits.innerHTML = "";
  for (const p of hits) {
    const variants = getProductVariants(p);
    const hasVariants = variants.length > 1;
    const it = document.createElement("div");
    it.className = "cartItem";
    it.innerHTML = `
      <img src="${p.img}" alt="">
      <div>
        <div class="hitRow">
          <div class="cartItem__name">${escapeHtml(p.name)}</div>
          ${hasVariants ? `<select class="variantSelect variantSelect--small" aria-label="Выбор варианта для ${escapeHtml(p.name)}">${variants.map(v => `<option value="${v.index}">${escapeHtml(v.label || v.weight || `Вариант ${v.index}`)}</option>`).join("")}</select>` : ""}
        </div>
        <div class="cartItem__meta">${rub(variants[0]?.price ?? p.price)}${(variants[0]?.weight || p.weight) ? ` • ${escapeHtml(variants[0]?.weight || p.weight || "")}` : ""}</div>
      </div>
      <div><button class="btn btn--primary" type="button">+</button></div>
    `;

    const img = it.querySelector("img");
    const meta = it.querySelector(".cartItem__meta");
    const select = it.querySelector(".variantSelect");
    const btn = it.querySelector("button");

    const syncVariant = () => {
      const variantIndex = normalizeVariantIndex(select?.value || 1);
      const variant = getVariantByIndex(p, variantIndex);
      meta.textContent = `${rub(variant.price)}${variant.weight ? ` • ${variant.weight}` : ""}`;
      if (variant.img) img.src = variant.img;
      return variantIndex;
    };

    if (select) {
      select.addEventListener("change", syncVariant);
      syncVariant();
    }

    btn.addEventListener("click", () => addToCart(p.id, syncVariant(), img));

    els.hits.appendChild(it);
  }
}

/* ===== UI helpers ===== */

function animateToCart(sourceEl) {
  const cartEl = els.openCart;
  if (!sourceEl || !cartEl) return;

  const sourceRect = sourceEl.getBoundingClientRect();
  const cartRect = cartEl.getBoundingClientRect();

  const fly = document.createElement("div");
  fly.className = "flyToCart";
  fly.style.position = "fixed";
  fly.style.left = `${sourceRect.left}px`;
  fly.style.top = `${sourceRect.top}px`;
  fly.style.width = `${sourceRect.width}px`;
  fly.style.height = `${sourceRect.height}px`;
  fly.style.borderRadius = "16px";
  fly.style.backgroundImage = `url("${sourceEl.currentSrc || sourceEl.src}")`;
  fly.style.backgroundSize = "cover";
  fly.style.backgroundPosition = "center";
  fly.style.zIndex = "9999";
  fly.style.pointerEvents = "none";
  fly.style.transition = "transform .7s cubic-bezier(.2,.8,.2,1), opacity .7s ease, width .7s ease, height .7s ease";
  document.body.appendChild(fly);

  requestAnimationFrame(() => {
    const dx = cartRect.left - sourceRect.left + cartRect.width / 2 - sourceRect.width / 2;
    const dy = cartRect.top - sourceRect.top + cartRect.height / 2 - sourceRect.height / 2;
    fly.style.transform = `translate(${dx}px, ${dy}px) scale(.15)`;
    fly.style.opacity = "0.15";
    fly.style.width = "24px";
    fly.style.height = "24px";
  });

  setTimeout(() => {
    fly.remove();
  }, 750);
}


function getChangeFromValue(form = els.checkoutForm?.elements) {
  return (form?.changeFrom?.value || form?.cashChange?.value || "").trim();
}

function parsePromos(raw) {
  const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.promocodes) ? raw.promocodes : []);
  return list
    .map(item => ({
      code: String(item?.code || "").trim(),
      title: String(item?.title || item?.name || item?.label || item?.code || "").trim(),
      percent: Number(item?.percent || item?.discountPercent || 0),
      active: item?.active !== false
    }))
    .filter(item => item.code && item.percent > 0 && item.active);
}

function normalizePromoCode(value) {
  return String(value || "").trim().toLowerCase();
}

function findPromoByCode(value) {
  const code = normalizePromoCode(value);
  if (!code) return null;
  return PROMOS.find(item => normalizePromoCode(item.code) === code) || null;
}

function getBaseTotalBeforePromo() {
  const subtotal = cartSum();
  const cutleryPrice = getCutleryPrice();
  const nightMarkup = getNightMarkup();
  const deliveryPrice = getEffectiveDeliveryPrice();
  return subtotal + cutleryPrice + nightMarkup + deliveryPrice;
}

function getPromoDiscount() {
  if (!state.promo.applied || !state.promo.percent) return 0;
  return Math.min(getBaseTotalBeforePromo(), Math.round(getBaseTotalBeforePromo() * state.promo.percent / 100));
}

function clearPromoState(resetInput = false) {
  state.promo = {
    code: "",
    title: "",
    percent: 0,
    discount: 0,
    applied: false
  };

  if (resetInput && els.promoCodeInput) {
    els.promoCodeInput.value = "";
  }

  if (els.promoHint) {
    els.promoHint.textContent = "Скидка применяется ко всей стоимости заказа, если промокод активен.";
  }

  renderTotals();
}

function applyPromoCode(showSuccessToast = true) {
  const inputValue = els.promoCodeInput?.value || "";
  const promo = findPromoByCode(inputValue);

  if (!inputValue.trim()) {
    clearPromoState();
    return true;
  }

  if (!promo) {
    clearPromoState(false);
    if (els.promoHint) {
      els.promoHint.textContent = "Промокод не найден или не активен.";
    }
    showToast("Промокод не найден");
    return false;
  }

  state.promo.code = promo.code;
  state.promo.title = promo.title || promo.code;
  state.promo.percent = promo.percent;
  state.promo.applied = true;
  state.promo.discount = getPromoDiscount();

  if (els.promoHint) {
    els.promoHint.textContent = `Промокод применён: ${state.promo.title} — ${promo.percent}%`;
  }

  renderTotals();

  if (showSuccessToast) {
    showToast(`Промокод применён: ${promo.percent}%`);
  }

  return true;
}

function setupPromoControls() {
  if (els.applyPromoBtn) {
    els.applyPromoBtn.addEventListener("click", () => applyPromoCode(true));
  }

  if (els.promoCodeInput) {
    els.promoCodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        applyPromoCode(true);
      }
    });

    els.promoCodeInput.addEventListener("input", () => {
      const current = normalizePromoCode(els.promoCodeInput.value);
      if (!current) {
        clearPromoState(false);
        return;
      }

      if (state.promo.applied && current !== normalizePromoCode(state.promo.code)) {
        state.promo = {
          code: "",
          title: "",
          percent: 0,
          discount: 0,
          applied: false
        };
        if (els.promoHint) {
          els.promoHint.textContent = "Код изменён. Нажмите «Применить», чтобы пересчитать скидку.";
        }
        renderTotals();
      }
    });
  }
}

function setupPaymentVisibility() {
  const form = els.checkoutForm?.elements;
  if (!form?.payment) return;

  const sync = () => {
    const isCash = form.payment.value === "cash";
    if (els.cashChangeBlock) {
      els.cashChangeBlock.hidden = !isCash;
      els.cashChangeBlock.style.display = isCash ? "block" : "none";
    }
  };

  form.payment.addEventListener("change", sync);
  sync();
}

/* ===== Phone mask ===== */

function setupPhoneMask() {
  const input = els.phoneInput;
  if (!input) return;

  input.setAttribute("inputmode", "numeric");
  input.setAttribute("autocomplete", "tel");
  input.setAttribute("maxlength", "12");
  if (!input.placeholder) input.placeholder = "+79999999999";

  const normalizePhone = (raw) => {
    let digits = String(raw || "").replace(/\D/g, "");

    if (digits.startsWith("8")) digits = "7" + digits.slice(1);
    if (digits.startsWith("9")) digits = "7" + digits;
    if (!digits.startsWith("7")) digits = "7" + digits;

    digits = digits.slice(0, 11);

    return "+" + digits;
  };

  const setToEnd = () => {
    try {
      const pos = input.value.length;
      input.setSelectionRange(pos, pos);
    } catch {}
  };

  const fixValue = () => {
    input.value = normalizePhone(input.value);
    if (input.value.length < 2) input.value = "+7";

    requestAnimationFrame(() => {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;
      if (start < 2 || end < 2) setToEnd();
    });
  };

  if (!input.value || input.value === "+") {
    input.value = "+7";
  } else {
    input.value = normalizePhone(input.value);
  }

  input.addEventListener("focus", () => {
    if (!input.value || input.value.length < 2) input.value = "+7";
    setToEnd();
  });

  input.addEventListener("input", fixValue);

  input.addEventListener("click", () => {
    if ((input.selectionStart ?? 0) < 2) setToEnd();
  });

  input.addEventListener("keydown", (e) => {
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? 0;

    if (
      (e.key === "Backspace" && start <= 2) ||
      (e.key === "Delete" && start < 2) ||
      (e.key === "ArrowLeft" && start <= 2) ||
      e.key === "Home"
    ) {
      e.preventDefault();
      setToEnd();
      return;
    }

    if (e.key.length === 1 && /\D/.test(e.key) && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      return;
    }

    if (start < 2 && end < 2) {
      requestAnimationFrame(setToEnd);
    }
  });

  input.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text");
    input.value = normalizePhone(text);
    setToEnd();
  });

  input.addEventListener("blur", () => {
    if (!input.value || input.value === "+") input.value = "+7";
  });
}

/* ===== When selector ===== */

function setupWhenSelector() {
  const btns = document.querySelectorAll("[data-time]");
  const timeBlock = document.getElementById("timeBlock");
  const whenTypeInput = els.checkoutForm?.elements?.whenType;
  const whenDateInput = els.checkoutForm?.elements?.whenDate;

  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("isOn"));
      btn.classList.add("isOn");

      const type = btn.dataset.time;
      state.when.type = type;

      if (whenTypeInput) whenTypeInput.value = type;

      if (timeBlock) {
        timeBlock.hidden = type !== "later";
        timeBlock.style.display = type === "later" ? "block" : "none";
      }

      updateZonesByEffectiveTime().then(() => renderTotals());
    });
  });

  syncWhenRestrictions();

  if (whenDateInput) {
    whenDateInput.addEventListener("input", () => {
      state.when.date = whenDateInput.value || null;
      updateZonesByEffectiveTime().then(() => renderTotals());
    });

    whenDateInput.addEventListener("change", () => {
      state.when.date = whenDateInput.value || null;
      updateZonesByEffectiveTime().then(() => renderTotals());
    });
  }
}

/* ===== Cutlery ===== */

function getCutleryCount() {
  return Number(els.checkoutForm?.elements?.cutlery?.value || 1);
}

function getCutleryPaidCount() {
  return Math.max(0, getCutleryCount() - 5);
}

function getCutleryPrice() {
  return getCutleryPaidCount() * 6;
}

function getSmallOrderDeliverySurcharge() {
  if (state.mode !== "delivery") return 0;
  return cartSum() < MIN_DELIVERY_SUBTOTAL ? SMALL_ORDER_DELIVERY_SURCHARGE : 0;
}

function getEffectiveDeliveryPrice() {
  const baseDelivery = state.mode === "delivery" && typeof state.delivery.price === "number"
    ? state.delivery.price
    : 0;
  return baseDelivery + getSmallOrderDeliverySurcharge();
}

/* ===== Time / tariff ===== */

function toOrenburgDate(dateLike = null) {
  const base = dateLike ? new Date(dateLike) : new Date();
  const utc = base.getTime() + base.getTimezoneOffset() * 60000;
  return new Date(utc + ORENBURG_UTC_OFFSET_MS);
}

function getMinutesOfDay(date = new Date()) {
  const d = toOrenburgDate(date);
  return d.getHours() * 60 + d.getMinutes();
}

function formatBusinessTime(minutes) {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function isNightMinutes(totalMin) {
  return totalMin >= BUSINESS_RULES.nightStart || totalMin <= BUSINESS_RULES.nightEnd;
}

function isClosedMinutes(totalMin) {
  return totalMin >= BUSINESS_RULES.closedStart && totalMin <= BUSINESS_RULES.closedEnd;
}

function isBlockedPreorderMinutes(totalMin) {
  return totalMin >= BUSINESS_RULES.preorderBlockedStart && totalMin <= BUSINESS_RULES.preorderBlockedEnd;
}

function getEffectiveOrderDate() {
  const form = els.checkoutForm?.elements;
  const whenType = form?.whenType?.value || "now";
  const whenDate = form?.whenDate?.value || "";

  if (whenType === "later" && whenDate) {
    const d = new Date(whenDate);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return new Date();
}

function getTariffInfo(date = getEffectiveOrderDate()) {
  const totalMin = getMinutesOfDay(date);
  const isNight = isNightMinutes(totalMin);

  return {
    tariff: isNight ? "night" : "day",
    tariffLabel: isNight ? "Ночной" : "Дневной",
    totalMin
  };
}

function isNightTariff(date = getEffectiveOrderDate()) {
  return getTariffInfo(date).tariff === "night";
}

function getNightMarkup() {
  const subtotal = cartSum();
  const cutleryPrice = getCutleryPrice();

  if (!isNightTariff(getEffectiveOrderDate())) return 0;

  return Math.round((subtotal + cutleryPrice) * 0.10);
}

function validateOrderWindow({ whenType, whenDate } = {}) {
  const type = whenType || (els.checkoutForm?.elements?.whenType?.value || "now");
  const rawDate = whenDate || (els.checkoutForm?.elements?.whenDate?.value || "");
  const baseDate = type === "later" && rawDate ? new Date(rawDate) : new Date();

  if (Number.isNaN(baseDate.getTime())) {
    return { ok: false, message: "Некорректная дата и время" };
  }

  const totalMin = getMinutesOfDay(baseDate);

  if (type === "now") {
    if (isClosedMinutes(totalMin)) {
      return {
        ok: false,
        message: `Ресторан закрыт до ${formatBusinessTime(11 * 60)}. Оформите заказ как предзаказ.`
      };
    }

    return { ok: true };
  }

  if (isBlockedPreorderMinutes(totalMin)) {
    return {
      ok: false,
      message: "Предзаказ можно оформить только на время с 00:00 до 03:00 или с 12:30 и позже."
    };
  }

  return { ok: true };
}

function syncWhenRestrictions() {
  const whenDateInput = els.checkoutForm?.elements?.whenDate;
  if (!whenDateInput) return;

  const now = toOrenburgDate(new Date());
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  whenDateInput.min = `${yyyy}-${mm}-${dd}T${hh}:${min}`;

  const timeButtons = document.querySelectorAll('[data-time]');
  const nowBtn = document.querySelector('[data-time="now"]');
  const laterBtn = document.querySelector('[data-time="later"]');
  const currentMinutes = getMinutesOfDay(new Date());
  const closedNow = isClosedMinutes(currentMinutes);

  if (closedNow) {
    if (nowBtn) {
      nowBtn.disabled = true;
      nowBtn.classList.add('isDisabled');
      nowBtn.title = 'Недоступно с 03:01 до 11:00';
    }

    if ((els.checkoutForm?.elements?.whenType?.value || 'now') === 'now' && laterBtn) {
      timeButtons.forEach(b => b.classList.remove('isOn'));
      laterBtn.classList.add('isOn');
      els.checkoutForm.elements.whenType.value = 'later';
      state.when.type = 'later';
      if (els.timeBlock) {
        els.timeBlock.hidden = false;
        els.timeBlock.style.display = 'block';
      }
    }
  } else if (nowBtn) {
    nowBtn.disabled = false;
    nowBtn.classList.remove('isDisabled');
    nowBtn.title = '';
  }
}

async function updateZonesByEffectiveTime() {
  const tariffInfo = getTariffInfo(getEffectiveOrderDate());

  state.pricing.tariff = tariffInfo.tariff;
  state.pricing.tariffLabel = tariffInfo.tariffLabel;
  state.pricing.nightMarkup = getNightMarkup();

  if (tariffInfo.tariff === "night" && ZONES_NIGHT) {
    ZONES = ZONES_NIGHT;
  } else if (tariffInfo.tariff === "day" && ZONES_DAY) {
    ZONES = ZONES_DAY;
  }

  syncWhenRestrictions();

  if (
    state.mode === "delivery" &&
    state.delivery.lat != null &&
    state.delivery.lng != null
  ) {
    await setDeliveryPoint(
      state.delivery.lat,
      state.delivery.lng,
      state.delivery.address || "",
      false
    );
  }
}

/* ===== Delivery: Yandex map + zones ===== */

let ymap = null;
let ymarker = null;

function ymapsReady() {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    (function wait() {
      if (window.ymaps && typeof window.ymaps.ready === "function") {
        window.ymaps.ready(() => resolve(window.ymaps));
        return;
      }

      if (Date.now() - start > 20000) {
        reject(new Error("Yandex Maps не загрузилась"));
        return;
      }

      setTimeout(wait, 50);
    })();
  });
}

async function ensureMap() {
  if (ymap) return;

  const ymaps = await ymapsReady();
  const center = [51.7682, 55.0968];

  ymap = new ymaps.Map("map", {
    center,
    zoom: 12,
    controls: ["zoomControl"]
  }, {
    suppressMapOpenBlock: true
  });

  ymap.events.add("click", async (e) => {
    const coords = e.get("coords");
    await setDeliveryPoint(coords[0], coords[1], null, true);
  });
}

async function reverseGeocode(lat, lng) {
  const ymaps = await ymapsReady();
  const res = await ymaps.geocode([lat, lng], { results: 1 });
  const first = res.geoObjects.get(0);
  if (!first) return "";
  return first.getAddressLine ? first.getAddressLine() : (first.get("text") || "");
}

function pointInPolygon(point, vs) {
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = vs[i][0];
    const yi = vs[i][1];
    const xj = vs[j][0];
    const yj = vs[j][1];

    const intersect =
      ((yi > y) !== (yj > y)) &&
      (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

function findZone(lat, lng) {
  if (!ZONES) return null;
  const pt = [lng, lat];

  for (const f of ZONES.features || []) {
    if (!f.geometry) continue;

    if (f.geometry.type === "Polygon") {
      const ring = f.geometry.coordinates?.[0];
      if (ring && pointInPolygon(pt, ring)) return f;
    } else if (f.geometry.type === "MultiPolygon") {
      const polys = f.geometry.coordinates || [];
      for (const poly of polys) {
        const ring = poly?.[0];
        if (ring && pointInPolygon(pt, ring)) return f;
      }
    }
  }

  return null;
}

async function setDeliveryPoint(lat, lng, addressStr, doReverse = false) {
  state.delivery.lat = lat;
  state.delivery.lng = lng;

  const ymaps = await ymapsReady();

  if (!ymarker) {
    ymarker = new ymaps.Placemark([lat, lng], {}, { preset: "islands#redDotIcon" });
    ymap.geoObjects.add(ymarker);
  } else {
    ymarker.geometry.setCoordinates([lat, lng]);
  }

  const zone = findZone(lat, lng);

  if (!zone) {
    state.delivery.zone = null;
    state.delivery.restaurant = null;
    state.delivery.price = null;
    state.delivery.available = false;
  } else {
    state.delivery.zone = zone.properties?.zone ?? "—";
    state.delivery.restaurant = zone.properties?.restaurant ?? "—";
    const price = Number(zone.properties?.deliveryPrice ?? 0);
    state.delivery.price = Number.isFinite(price) ? price : 0;
    state.delivery.available = true;
  }

  if (addressStr) {
    state.delivery.address = addressStr;
    if (addressInput) addressInput.value = addressStr;
    if (els.checkoutForm?.elements?.address) {
      els.checkoutForm.elements.address.value = addressStr;
    }
  } else if (doReverse) {
    try {
      const a = await reverseGeocode(lat, lng);
      if (a) {
        state.delivery.address = a;
        if (addressInput) addressInput.value = a;
        if (els.checkoutForm?.elements?.address) {
          els.checkoutForm.elements.address.value = a;
        }
      }
    } catch {}
  }

  renderTotals();
}

/* ===== Totals ===== */

function renderTotals() {
  const subtotal = cartSum();
  const cutleryPrice = getCutleryPrice();
  const nightMarkup = getNightMarkup();
  const promoDiscount = getPromoDiscount();
  const smallOrderSurcharge = getSmallOrderDeliverySurcharge();

  state.pricing.tariff = getTariffInfo(getEffectiveOrderDate()).tariff;
  state.pricing.tariffLabel = getTariffInfo(getEffectiveOrderDate()).tariffLabel;
  state.pricing.nightMarkup = nightMarkup;
  state.promo.discount = promoDiscount;

  if (els.sumProducts) els.sumProducts.textContent = rub(subtotal);
  if (els.sumCutlery) els.sumCutlery.textContent = rub(cutleryPrice);

  if (els.nightMarkupRow && els.sumNight) {
    if (nightMarkup > 0) {
      els.nightMarkupRow.hidden = false;
      els.nightMarkupRow.style.display = "flex";
      els.sumNight.textContent = rub(nightMarkup);
    } else {
      els.nightMarkupRow.hidden = true;
      els.nightMarkupRow.style.display = "none";
      els.sumNight.textContent = "0 ₽";
    }
  }

  if (els.promoDiscountRow && els.sumPromoDiscount && els.promoBadge) {
    if (promoDiscount > 0 && state.promo.applied) {
      els.promoDiscountRow.hidden = false;
      els.promoDiscountRow.style.display = "flex";
      els.sumPromoDiscount.textContent = `−${rub(promoDiscount)}`;
      els.promoBadge.textContent = state.promo.code;
    } else {
      els.promoDiscountRow.hidden = true;
      els.promoDiscountRow.style.display = "none";
      els.sumPromoDiscount.textContent = "0 ₽";
      els.promoBadge.textContent = "—";
    }
  }

  const deliveryBasePrice = state.mode === "delivery" && typeof state.delivery.price === "number" ? state.delivery.price : 0;
  const deliveryPrice = deliveryBasePrice + smallOrderSurcharge;
  const finalTotal = Math.max(0, subtotal + cutleryPrice + nightMarkup + deliveryPrice - promoDiscount);

  if (state.mode === "delivery") {
    if (state.delivery.available && typeof state.delivery.price === "number") {
      if (els.sumDelivery) {
        els.sumDelivery.textContent = rub(deliveryPrice);
      }
      if (els.sumTotal) els.sumTotal.textContent = rub(finalTotal);
    } else {
      if (els.sumDelivery) els.sumDelivery.textContent = "Недоступно";
      if (els.sumTotal) els.sumTotal.textContent = rub(Math.max(0, subtotal + cutleryPrice + nightMarkup - promoDiscount));
    }
  } else {
    if (els.sumDelivery) els.sumDelivery.textContent = "0 ₽";
    if (els.sumTotal) els.sumTotal.textContent = rub(Math.max(0, subtotal + cutleryPrice + nightMarkup - promoDiscount));
  }
}

/* ===== Checkout mode ===== */

function setMode(mode) {
  state.mode = mode;
  els.checkoutForm.elements.mode.value = mode;

  const btns = els.checkoutForm.querySelectorAll(".seg__btn[data-mode]");
  btns.forEach(b => b.classList.toggle("isOn", b.dataset.mode === mode));

  if (mode === "pickup") {
    if (els.pickupBlock) {
      els.pickupBlock.hidden = false;
      els.pickupBlock.style.display = "block";
    }
    if (els.deliveryBlock) {
      els.deliveryBlock.hidden = true;
      els.deliveryBlock.style.display = "none";
    }
  } else {
    if (els.pickupBlock) {
      els.pickupBlock.hidden = true;
      els.pickupBlock.style.display = "none";
    }
    if (els.deliveryBlock) {
      els.deliveryBlock.hidden = false;
      els.deliveryBlock.style.display = "block";
    }
    ensureMap().catch(() => {});
  }

  renderTotals();
}

/* ===== Payload ===== */

function buildOrderPayload(form) {
  const items = Object.entries(state.cart).map(([key, qty]) => {
    const entry = getCartEntry(key);
    const p = entry.product;
    const variant = entry.variant;
    return {
      id: entry.id,
      cartKey: key,
      variant: variant.index,
      name: p?.name || entry.id,
      price: Number(variant.price || 0),
      qty,
      sum: Number(variant.price || 0) * qty,
      weight: variant.weight || ""
    };
  });

  const subtotal = items.reduce((a, b) => a + b.sum, 0);

  let delivery = {
    type: "pickup",
    price: 0,
    address: form.pickupAddress?.value || "",
    zone: null,
    restaurant: form.pickupAddress?.value || ""
  };

  if (state.mode === "delivery") {
    delivery = {
      type: "delivery",
      available: !!state.delivery.available,
      price: typeof state.delivery.price === "number" ? getEffectiveDeliveryPrice() : null,
      basePrice: typeof state.delivery.price === "number" ? state.delivery.price : null,
      minimumOrderSurcharge: getSmallOrderDeliverySurcharge(),
      address: (form.address?.value?.trim() || state.delivery.address || "").trim(),
      entrance: form.entrance?.value?.trim() || "",
      floor: form.floor?.value?.trim() || "",
      flat: form.flat?.value?.trim() || "",
      lat: state.delivery.lat,
      lng: state.delivery.lng,
      zone: state.delivery.zone,
      restaurant: state.delivery.restaurant
    };
  }

  const paymentMap = {
    cash: "Наличными",
    card: "Картой при получении",
    transfer: "Переводом курьеру"
  };

  const cutleryCount = getCutleryCount();
  const cutleryPaid = getCutleryPaidCount();
  const cutleryPrice = getCutleryPrice();
  const nightMarkup = getNightMarkup();
  const promoDiscount = getPromoDiscount();

  const total = Math.max(0, subtotal + cutleryPrice + nightMarkup + (delivery.price || 0) - promoDiscount);

  return {
    createdAt: new Date().toISOString(),
    when: {
      type: form.whenType?.value || "now",
      date: form.whenDate?.value || null
    },
    customer: {
      name: form.name.value.trim(),
      phone: form.phone.value.trim()
    },
    payment: form.payment.value,
    paymentLabel: paymentMap[form.payment.value] || form.payment.value,
    changeFrom: getChangeFromValue(form),
    comment: form.comment.value.trim(),
    items,
    subtotal,
    cutlery: {
      count: cutleryCount,
      paidCount: cutleryPaid,
      price: cutleryPrice
    },
    pricing: {
      tariff: getTariffInfo(getEffectiveOrderDate()).tariff,
      tariffLabel: getTariffInfo(getEffectiveOrderDate()).tariffLabel,
      nightMarkup
    },
    promo: state.promo.applied ? {
      code: state.promo.code,
      title: state.promo.title,
      percent: state.promo.percent,
      discount: promoDiscount
    } : null,
    delivery,
    total,
    meta: {
      userAgent: navigator.userAgent
    }
  };
}

/* ===== Send order ===== */

async function sendOrder(payload) {
  const res = await fetch(ORDER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Order-Secret": "sytnay_dostavka_prozharim_secret_teatralnaya_liniya_kichigina_order_new"
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(
      data?.details?.description ||
      data?.details?.error_code ||
      data?.error ||
      "Ошибка отправки"
    );
  }

  return data;
}

/* ===== Suggestions ===== */

let suggestTimer = null;
let blurTimer = null;

function clearSuggest() {
  if (!suggestBox) return;
  suggestBox.innerHTML = "";
}

function renderSuggest(items) {
  if (!suggestBox) return;
  suggestBox.innerHTML = "";

  items.forEach(({ text, coords }) => {
    const div = document.createElement("div");
    div.className = "suggest__item";
    div.textContent = text;

    div.addEventListener("click", async () => {
      clearSuggest();

      addressInput.value = text;
      els.checkoutForm.elements.address.value = text;

      await ensureMap().catch(() => {});
      if (ymap) ymap.setCenter(coords, 16, { duration: 250 });
      await setDeliveryPoint(coords[0], coords[1], text, false);
    });

    suggestBox.appendChild(div);
  });
}

async function suggestAddress(q) {
  const ymaps = await ymapsReady();
  const res = await ymaps.geocode(q, { results: 6 });
  const out = [];

  res.geoObjects.each(obj => {
    const text = obj.getAddressLine ? obj.getAddressLine() : (obj.get("text") || "");
    const coords = obj.geometry.getCoordinates();
    if (text && coords) out.push({ text, coords });
  });

  return out;
}

async function commitAddressFromInput() {
  if (state.mode !== "delivery") return;

  const q = (addressInput?.value || "").trim();
  if (q.length < 5) return;

  try {
    const ymaps = await ymapsReady();
    const res = await ymaps.geocode(q, { results: 1 });
    const first = res.geoObjects.get(0);

    if (!first) {
      state.delivery.available = false;
      state.delivery.price = null;
      renderTotals();
      return;
    }

    const coords = first.geometry.getCoordinates();
    const text = first.getAddressLine ? first.getAddressLine() : (first.get("text") || q);

    await ensureMap().catch(() => {});
    if (ymap) ymap.setCenter(coords, 16, { duration: 250 });
    await setDeliveryPoint(coords[0], coords[1], text, false);
  } catch {
    state.delivery.available = false;
    state.delivery.price = null;
    renderTotals();
  }
}

/* ===== Success ===== */

function showCheckoutSuccess() {
  els.checkoutForm.innerHTML = `
    <div style="display:grid; place-items:center; gap:14px; padding:26px 10px; text-align:center;">
      <div style="
        width:72px;height:72px;border-radius:999px;
        display:grid;place-items:center;
        border:1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.04);
        box-shadow: 0 18px 55px rgba(0,0,0,.45);
        font-size:34px;
      ">✅</div>
      <div style="font-weight:950; font-size:18px;">Заказ оформлен!</div>
      <div style="color:rgba(243,243,244,.72); max-width:52ch;">
        Ожидайте звонка от оператора для подтверждения заказа.
      </div>
      <button class="btn btn--primary w100" type="button" id="closeSuccessBtn">Закрыть</button>
    </div>
  `;

  const btn = document.getElementById("closeSuccessBtn");
  if (btn) btn.addEventListener("click", closeCheckout);
}


function setupBackToTop() {
  const btn = els.backToTop;
  if (!btn) return;

  const sync = () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    btn.classList.toggle("isOn", y > 520);
  };

  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  window.addEventListener("scroll", sync, { passive: true });
  sync();
}

/* ===== Init ===== */

async function init() {
  await loadRuntimeConfig();
  els.openCart.addEventListener("click", openDrawer);
  els.closeCart.addEventListener("click", closeDrawer);
  els.closeCart2.addEventListener("click", closeDrawer);
  els.goCheckout.addEventListener("click", () => {
    closeDrawer();
    openCheckout();
  });

  els.closeCheckout.addEventListener("click", closeCheckout);
  els.closeCheckout2.addEventListener("click", closeCheckout);

  els.search.addEventListener("input", (e) => {
    state.query = e.target.value || "";
    renderProducts();
  });

  setupPhoneMask();
  setupWhenSelector();
  setupPaymentVisibility();
  setupBackToTop();
  setupPromoControls();

  const segBtns = els.checkoutForm.querySelectorAll(".seg__btn[data-mode]");
  segBtns.forEach(b => b.addEventListener("click", () => setMode(b.dataset.mode)));

  if (els.cutlerySelect) {
    els.cutlerySelect.addEventListener("change", renderTotals);
  }

  if (els.paymentSelect) {
    els.paymentSelect.addEventListener("change", renderTotals);
  }

  if (addressInput && suggestBox) {
    addressInput.addEventListener("input", () => {
      const q = addressInput.value.trim();
      clearTimeout(suggestTimer);

      if (q.length < 3) {
        clearSuggest();
        return;
      }

      suggestTimer = setTimeout(async () => {
        try {
          const items = await suggestAddress(q);
          renderSuggest(items);
        } catch {
          clearSuggest();
        }
      }, 250);
    });

    addressInput.addEventListener("blur", () => {
      clearTimeout(blurTimer);
      blurTimer = setTimeout(() => commitAddressFromInput(), 220);
    });

    addressInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commitAddressFromInput();
        clearSuggest();
      }
    });

    document.addEventListener("click", (e) => {
      if (e.target === addressInput) return;
      if (suggestBox.contains(e.target)) return;
      clearSuggest();
    });
  }

  els.checkoutForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (cartCount() === 0) return showToast("Корзина пуста");

    const phone = (els.checkoutForm.elements.phone?.value || "").trim();
    if (!/^\+7\d{10}$/.test(phone)) {
      return showToast("Введите телефон в формате +79999999999");
    }

    const whenType = els.checkoutForm.elements.whenType?.value || "now";
    const whenDate = els.checkoutForm.elements.whenDate?.value || "";

    if (whenType === "later") {
      if (!whenDate) return showToast("Укажите дату и время");
      const selected = new Date(whenDate);
      if (Number.isNaN(selected.getTime())) return showToast("Некорректная дата и время");
      if (selected.getTime() < Date.now()) return showToast("Укажите будущую дату и время");
    }

    const businessWindowCheck = validateOrderWindow({ whenType, whenDate });
    if (!businessWindowCheck.ok) {
      return showToast(businessWindowCheck.message);
    }

    if (els.checkoutForm.elements.payment?.value === "cash") {
      const changeFrom = getChangeFromValue(els.checkoutForm.elements);
      if (changeFrom) {
        const changeNumber = Number(changeFrom.replace(/[^\d.]/g, ""));
        const currentTotal = parseInt((els.sumTotal?.textContent || "0").replace(/[^\d]/g, ""), 10) || 0;
        if (!Number.isFinite(changeNumber) || changeNumber < currentTotal) {
          return showToast("Сдача должна быть не меньше суммы заказа");
        }
      }
    }

    if (state.mode === "delivery") {
      const addr = (els.checkoutForm.elements.address?.value || "").trim();
      if (!addr) return showToast("Укажите адрес доставки");
      if (!state.delivery.available || typeof state.delivery.price !== "number") {
        return showToast("Доставка по этому адресу недоступна");
      }
    }

    const promoInputValue = (els.promoCodeInput?.value || "").trim();
    if (promoInputValue) {
      const activeCode = normalizePromoCode(state.promo.code);
      if (!state.promo.applied || activeCode !== normalizePromoCode(promoInputValue)) {
        const applied = applyPromoCode(false);
        if (!applied) return;
      }
    }

    const payload = buildOrderPayload(els.checkoutForm.elements);

    const btn = document.getElementById("submitOrder");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Отправляем…";
    }

    try {
      await sendOrder(payload);

      state.cart = {};
      saveCart();
      renderCart();
      renderTotals();

      showCheckoutSuccess();
    } catch (err) {
      showToast(String(err.message || err));
      if (btn) {
        btn.disabled = false;
        btn.textContent = "Отправить заказ";
      }
    }
  });

  MENU = await fetch("data/menu.json").then(r => r.json());
  PROMOS = await fetch("data/promokod.json").then(r => r.json()).then(parsePromos).catch(() => []);
  ZONES_DAY = await fetch("data/zones_day.geojson").then(r => r.json()).catch(() => null);
  ZONES_NIGHT = await fetch("data/zones_night.geojson").then(r => r.json()).catch(() => null);
  ZONES = ZONES_DAY || ZONES_NIGHT || await fetch("data/zones.geojson").then(r => r.json()).catch(() => null);

  await updateZonesByEffectiveTime();
  syncWhenRestrictions();

  renderTabs();
  renderProducts();
  renderHits();
  renderCartBadge();
  renderTotals();

  setMode("delivery");
}

document.addEventListener("DOMContentLoaded", init);
