// Enhanced storefront logic with premium features (updated fixes)
// Uses existing PRODUCTS from script2.js

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const formatPrice = v => '₹' + Number(v).toLocaleString('en-IN');

// ---------- State ----------
let state = {
  products: PRODUCTS.slice(),
  query: '',
  category: '',
  maxPrice: null,
  sort: 'relevance',
  cart: load('fk_cart_v1', {}),
  wishlist: load('fk_wishlist_v1', []),
  compare: load('fk_compare_v1', []),
  page: 1,
  perPage: 12
};

// ---------- Elements ----------
const productsGrid = $('#productsGrid');
const categoryList = $('#categoryList');
const searchInput = $('#searchInput');
const searchBtn = $('#searchBtn');
const sortSelect = $('#sortSelect');
const cartBtn = $('#cartBtn');
const cartCount = $('#cartCount');
const productModal = $('#productModal');
const modalBody = $('#modalBody');
const modalClose = $('#modalClose');
const cartDrawer = $('#cartDrawer');
const cartItemsEl = $('#cartItems');
const closeCart = $('#closeCart');
const cartSubtotalEl = $('#cartSubtotal');
const checkoutBtn = $('#checkoutBtn');
const clearCartBtn = $('#clearCartBtn');
const noResults = $('#noResults');
const mobileCategoryBtns = $$('.mobile-category-btn');
const mobileNavToggle = $('#mobileNavToggle');
const sidebarClose = $('#sidebarClose');
const themeToggle = $('#themeToggle');
const loadMoreBtn = $('#loadMore');
const wishlistPanel = $('#wishlistPanel');
const comparePanel = $('#comparePanel');
const compareModal = $('#compareModal');
const compareBody = $('#compareBody');
const compareClose = $('#compareClose');
const openCompareBtn = $('#openCompare');
const toastStack = $('#toastStack');
const brandEl = document.querySelector('.brand');
const overlay = document.querySelector('.overlay');

// ---------- Init ----------
init();
function init(){
  hydrateTheme();
  renderCategories();
  renderProducts(true);
  bindEvents();
  updateCartUI();
  renderWishlistPanel();
  renderComparePanel();
  // brand click should go home / reset filters
  if (brandEl) brandEl.addEventListener('click', ()=>{
    // if already on home, just reset and scroll top
    state.query = ''; state.category=''; state.maxPrice=null; state.sort='relevance'; state.page=1;
    searchInput.value=''; document.getElementById('categoryDropdown').value='';
    renderProducts(true);
    window.scrollTo({top:0, behavior:'smooth'});
  });
}

// ---------- Storage helpers ----------
function load(key, fallback){
  try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch(e){ return fallback; }
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

// ---------- Render ----------
function uniqueCategories(){ return Array.from(new Set(PRODUCTS.map(p => p.category))); }

function renderCategories(){
  // left list
  if (categoryList){
    categoryList.innerHTML = '';
    ['All', ...uniqueCategories()].forEach(cat => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.textContent = cat;
      btn.className = (state.category === '' && cat==='All') || state.category === cat ? 'active' : '';
      btn.addEventListener('click', ()=>{
        state.category = (cat === 'All') ? '' : cat;
        state.page = 1;
        renderProducts(true);
      });
      li.appendChild(btn); categoryList.appendChild(li);
    });
  }

  // top dropdown (handled in existing file)
  const dropdown = document.getElementById('categoryDropdown');
  if (dropdown){
    dropdown.innerHTML = '<option value="">All</option>' + uniqueCategories().map(c=>`<option value="${c}">${c}</option>`).join('');
    dropdown.value = state.category || '';
    dropdown.onchange = function(){ state.category = this.value; state.page = 1; renderProducts(true); };
  }

  // --- Add compare box below price range ---
  // Find the price filter container
  const priceFilters = document.querySelector('.price-filters');
  if (priceFilters && !document.getElementById('sidebarCompareBox')) {
    const compareBox = document.createElement('div');
    compareBox.id = 'sidebarCompareBox';
    compareBox.style = "margin-top:18px; padding:14px 10px; background:var(--card-bg,#181f2a); border-radius:10px; box-shadow:0 1px 4px rgba(0,0,0,0.07);";
    compareBox.innerHTML = `
      <div style="font-weight:700; margin-bottom:8px; font-size:15px;">Compare Products</div>
      <div id="sidebarCompareList" style="min-height:32px; margin-bottom:8px;"></div>
      <button id="sidebarOpenCompare" class="btn btn-outline" style="width:100%;${state.compare.length<2?'opacity:.6;pointer-events:none;':''}">Compare (${state.compare.length})</button>
    `;
    priceFilters.parentNode.insertBefore(compareBox, priceFilters.nextSibling);

    // Attach event
    document.getElementById('sidebarOpenCompare').addEventListener('click', ()=>{
      if (state.compare.length < 2) { toast('Add at least two items'); return; }
      openCompareBtn?.click();
    });
  }
  renderSidebarCompareList();
}

// Helper to update the compare list in sidebar box
function renderSidebarCompareList() {
  const sidebarCompareList = document.getElementById('sidebarCompareList');
  const sidebarOpenCompare = document.getElementById('sidebarOpenCompare');
  if (!sidebarCompareList || !sidebarOpenCompare) return;
  if (!state.compare.length) {
    sidebarCompareList.innerHTML = `<span style="color:#94a3b8;">Add products to compare.</span>`;
    sidebarOpenCompare.style.opacity = "0.6";
    sidebarOpenCompare.style.pointerEvents = "none";
  } else {
    sidebarCompareList.innerHTML = state.compare.map(id=>{
      const p = PRODUCTS.find(x => x.id === id);
      return p ? `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
        <img src="${p.img}" alt="" style="width:22px;height:22px;object-fit:cover;border-radius:4px;">
        <span style="font-size:13px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.title)}</span>
        <button data-id="${p.id}" title="Remove" style="background:none;border:none;color:#e11d48;font-size:15px;cursor:pointer;">✕</button>
      </div>` : '';
    }).join('');
    sidebarOpenCompare.style.opacity = state.compare.length<2 ? "0.6" : "1";
    sidebarOpenCompare.style.pointerEvents = state.compare.length<2 ? "none" : "auto";
    // Remove buttons
    sidebarCompareList.querySelectorAll('button[data-id]').forEach(btn=>{
      btn.addEventListener('click', e=>{
        const id = btn.dataset.id;
        const idx = state.compare.indexOf(id);
        if (idx >= 0) state.compare.splice(idx,1);
        save('fk_compare_v1', state.compare);
        renderProducts();
        renderComparePanel();
        renderSidebarCompareList();
      });
    });
  }
}

function showSkeletons(count=8){
  productsGrid.innerHTML = '';
  for(let i=0;i<count;i++){
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `<div class="skeleton" style="width:100%; aspect-ratio:1/1; border-radius:12px"></div>
      <div class="skeleton" style="height:16px; width:70%; border-radius:8px"></div>
      <div class="skeleton" style="height:14px; width:40%; border-radius:8px"></div>
      <div class="skeleton" style="height:44px; border-radius:12px"></div>`;
    productsGrid.appendChild(card);
  }
}

function filteredList(){
  let list = PRODUCTS.slice();
  if (state.category) list = list.filter(p => p.category === state.category);
  if (state.maxPrice) list = list.filter(p => p.price <= state.maxPrice);
  if (state.query && state.query.trim().length){
    const q = state.query.trim().toLowerCase();
    list = list.filter(p => (p.title + ' ' + p.category).toLowerCase().includes(q));
  }
  if (state.sort === 'price-asc') list.sort((a,b) => a.price - b.price);
  if (state.sort === 'price-desc') list.sort((a,b) => b.price - a.price);
  if (state.sort === 'rating-desc') list.sort((a,b) => b.rating - a.rating);
  return list;
}

function renderProducts(reset=false){
  if (reset){ state.page = 1; showSkeletons(6); }
  const list = filteredList();
  setTimeout(()=>{ // mimic loading
    const start = 0;
    const end = state.page * state.perPage;
    const pageItems = list.slice(start, end);
    productsGrid.innerHTML = '';
    if (!pageItems.length){ noResults.hidden = false; return; } else { noResults.hidden = true; }
    pageItems.forEach(p => productsGrid.appendChild(productCard(p)));
    if (loadMoreBtn) loadMoreBtn.style.display = end < list.length ? 'block' : 'none';
    observeImages();
  }, 200);
}

function productCard(product){
  const card = document.createElement('article');
  card.className = 'product-card';
  const inWish = state.wishlist.includes(product.id);
  const inCompare = state.compare.includes(product.id);
  card.innerHTML = `
    <div class="product-badge" style="display:${product.mrp && product.mrp>product.price ? 'inline-block':'none'}">-${Math.round((1 - product.price/product.mrp)*100)}%</div>
    <img loading="lazy" data-src="${product.img}" alt="${escapeHtml(product.title)}" class="product-image lazy" />
    <div class="product-title">${escapeHtml(product.title)}</div>
    <div class="product-meta">
      <div>
        <span class="product-price">${formatPrice(product.price)}</span>
        ${product.mrp ? `<span class="product-mrp" style="margin-left:6px; color:#94a3b8; text-decoration:line-through">${formatPrice(product.mrp)}</span>`:''}
      </div>
      <div class="product-rating">⭐ ${Number(product.rating).toFixed(1)}</div>
    </div>
    <div class="card-actions">
      <button class="btn btn-outline viewBtn">Quick View</button>
      <button class="btn btn-primary addBtn">Add to Cart</button>
    </div>
    <div style="display:flex; gap:8px; margin-top:6px">
      <button class="muted wishBtn">${inWish ? '❤️ In Wishlist' : '♡ Wishlist'}</button>
      <button class="muted compareBtn">${inCompare ? '✓ Added to Compare' : '⇄ Compare'}</button>
    </div>
  `;
  card.querySelector('.viewBtn').addEventListener('click', () => openProductModal(product.id));
  card.querySelector('.addBtn').addEventListener('click', () => { addToCart(product.id, 1); flashCart(); toast('Added to cart'); });
  card.querySelector('.wishBtn').addEventListener('click', () => toggleWishlist(product.id));
  card.querySelector('.compareBtn').addEventListener('click', () => toggleCompare(product.id));
  return card;
}

// Lazy images
function observeImages(){
  const lazy = $$('.lazy');
  const io = new IntersectionObserver((entries, obs)=>{
    entries.forEach(e=>{
      if (e.isIntersecting){
        const img = e.target;
        img.src = img.dataset.src;
        obs.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });
  lazy.forEach(img => io.observe(img));
}

// ---------- Product modal ----------
function openProductModal(id){
  const p = PRODUCTS.find(x => x.id === id);
  if (!p) return;
  productModal.setAttribute('aria-hidden','false');
  modalBody.innerHTML = `
    <div style="display:flex; gap:18px; align-items:flex-start; flex-wrap:wrap;">
      <div style="flex:1; min-width:260px;">
        <img src="${p.img}" alt="${escapeHtml(p.title)}" style="width:100%; height:360px; object-fit:cover; border-radius:12px;">
      </div>
      <div style="flex:1.2; min-width:260px;">
        <h2 style="margin:0 0 8px; font-weight:900">${escapeHtml(p.title)}</h2>
        <div style="font-weight:900; color:white; margin-bottom:8px;">${formatPrice(p.price)} <span style="font-weight:500; color:#94a3b8; text-decoration:line-through; font-size:13px; margin-left:8px;">${p.mrp?formatPrice(p.mrp):''}</span></div>
        <div style="color:#a5b4fc; margin-bottom:12px;">Rating: ⭐ ${p.rating} • Category: ${p.category}</div>
        <ul style="color:#cbd5e1; margin:0 0 12px 18px">
          <li>Fast delivery eligible</li>
          <li>7-day replacement</li>
          <li>Pay on delivery available</li>
        </ul>
        <div style="margin-top:16px; display:flex; gap:8px; flex-wrap:wrap">
          <button id="modalAdd" class="btn btn-primary">Add to Cart</button>
          <button id="modalBuy" class="btn btn-outline">Buy Now</button>
          <button id="modalWish" class="muted">${state.wishlist.includes(id)?'❤️ In Wishlist':'♡ Wishlist'}</button>
          <button id="modalCompare" class="muted">${state.compare.includes(id)?'✓ In Compare':'⇄ Compare'}</button>
        </div>
      </div>
    </div>
  `;
  $('#modalAdd').addEventListener('click', () => { addToCart(p.id, 1); updateCartUI(); productModal.setAttribute('aria-hidden','true'); flashCart(); toast('Added to cart'); });
  $('#modalBuy').addEventListener('click', () => { addToCart(p.id, 1); productModal.setAttribute('aria-hidden','true'); openCart(); });
  $('#modalWish').addEventListener('click', () => toggleWishlist(p.id));
  $('#modalCompare').addEventListener('click', () => toggleCompare(p.id));
}
modalClose.addEventListener('click', ()=> productModal.setAttribute('aria-hidden','true'));
productModal.addEventListener('click', (e) => { if (e.target === productModal) productModal.setAttribute('aria-hidden','true'); });

// ---------- Wishlist ----------
function toggleWishlist(id){
  const idx = state.wishlist.indexOf(id);
  if (idx >= 0){ state.wishlist.splice(idx,1); toast('Removed from wishlist'); }
  else { state.wishlist.push(id); toast('Saved to wishlist ❤️'); }
  save('fk_wishlist_v1', state.wishlist);
  renderProducts();
  renderWishlistPanel();
}

function renderWishlistPanel(){
  if (!wishlistPanel) return;
  if (!state.wishlist.length){ wishlistPanel.className='wishlist-panel--empty'; wishlistPanel.textContent = 'Your favourites will appear here.'; return; }
  wishlistPanel.className = 'wishlist-panel';
  wishlistPanel.innerHTML = state.wishlist.map(id=>{
    const p = PRODUCTS.find(x => x.id === id);
    return p ? `<div class="mini"><img src="${p.img}" alt=""><div><div>${escapeHtml(p.title)}</div><div style="opacity:.8">${formatPrice(p.price)}</div></div></div>` : '';
  }).join('');
}

// ---------- Compare ----------
function toggleCompare(id){
  const set = new Set(state.compare);
  if (set.has(id)) { set.delete(id); toast('Removed from compare'); }
  else {
    if (set.size >= 4){ toast('Compare limit reached (4)'); return; }
    set.add(id); toast('Added to compare');
  }
  state.compare = Array.from(set);
  save('fk_compare_v1', state.compare);
  renderProducts();
  renderComparePanel();
}

function renderComparePanel(){
  if (!comparePanel) return;
  if (!state.compare.length){ comparePanel.className='compare-panel--empty'; comparePanel.textContent='Add 2–4 products to compare.'; renderSidebarCompareList(); return; }
  comparePanel.className='compare-panel';
  comparePanel.innerHTML = state.compare.map(id=>{
    const p = PRODUCTS.find(x => x.id === id);
    return p ? `<div class="mini" data-id="${p.id}"><img src="${p.img}" alt=""><div><div style="font-weight:800">${escapeHtml(p.title)}</div><div style="opacity:.8">${formatPrice(p.price)}</div></div><button class="remove-compare" data-id="${p.id}" title="Remove">✕</button></div>` : '';
  }).join('');

  // attach remove listeners
  $$('.remove-compare').forEach(b => b.addEventListener('click', (e)=>{
    const id = e.currentTarget.dataset.id;
    const idx = state.compare.indexOf(id);
    if (idx >= 0) state.compare.splice(idx,1);
    save('fk_compare_v1', state.compare);
    renderProducts();
    renderComparePanel();
    renderSidebarCompareList();
  }));
  renderSidebarCompareList();
}

openCompareBtn?.addEventListener('click', ()=>{
  if (state.compare.length < 2){ toast('Add at least two items'); return; }
  compareModal.setAttribute('aria-hidden','false');
  const items = state.compare.map(id => PRODUCTS.find(p=>p.id===id)).filter(Boolean);
  compareBody.innerHTML = `
    <div style="display:grid; grid-template-columns: repeat(${items.length}, 1fr); gap:12px">
      ${items.map(p=>`
        <div class="section" style="text-align:center; position:relative">
          <button class="remove-compare-modal" data-id="${p.id}" title="Remove" style="position:absolute; right:8px; top:8px; border:0; background:transparent; color:var(--muted); font-weight:900; cursor:pointer">✕</button>
          <img src="${p.img}" alt="" style="width:100%; height:180px; object-fit:cover; border-radius:12px">
          <h4 style="margin:6px 0">${escapeHtml(p.title)}</h4>
          <div>${formatPrice(p.price)} ${p.mrp?`<span style="text-decoration:line-through; opacity:.7">${formatPrice(p.mrp)}</span>`:''}</div>
          <div style="opacity:.8">⭐ ${p.rating} • ${p.category}</div>
        </div>
      `).join('')}
    </div>
  `;

  // modal remove buttons
  $$('.remove-compare-modal').forEach(b => b.addEventListener('click', (e)=>{
    const id = e.currentTarget.dataset.id;
    const idx = state.compare.indexOf(id);
    if (idx >= 0) state.compare.splice(idx,1);
    save('fk_compare_v1', state.compare);
    renderProducts();
    renderComparePanel();
    // update modal view
    openCompareBtn.click();
  }));
});
compareClose?.addEventListener('click', ()=> compareModal.setAttribute('aria-hidden','true'));
compareModal?.addEventListener('click', (e)=>{ if (e.target === compareModal) compareModal.setAttribute('aria-hidden','true'); });

// ---------- Cart ----------
function loadCart(){ return load('fk_cart_v1', {}); }
function saveCart(){ save('fk_cart_v1', state.cart); }

function addToCart(id, qty=1){
  if (!state.cart[id]) state.cart[id]=0;
  state.cart[id]+=qty;
  if (state.cart[id] <= 0) delete state.cart[id];
  saveCart(); updateCartUI();
}

function setCartQty(id, qty){
  if (qty <= 0) delete state.cart[id]; else state.cart[id] = qty;
  saveCart(); updateCartUI();
}

function clearCart(){ state.cart = {}; saveCart(); updateCartUI(); }

function cartItemsArray(){
  return Object.entries(state.cart).map(([id, qty]) => {
    const p = PRODUCTS.find(x => x.id === id);
    return p ? { ...p, qty } : null;
  }).filter(Boolean);
}

function updateCartUI(){
  const items = cartItemsArray();
  cartItemsEl.innerHTML = '';
  if (!items.length) {
    cartItemsEl.innerHTML = '<div style="padding:18px;color:#9aa4b2">Your cart is empty</div>';
  } else {
    items.forEach(item => {
      const div = document.createElement('div');
      div.className = 'cart-item';
      div.innerHTML = `
        <img src="${item.img}" alt="${escapeHtml(item.title)}" />
        <div style="flex:1;">
          <div style="font-weight:800">${escapeHtml(item.title)}</div>
          <div style="opacity:.8; margin-top:6px;">${formatPrice(item.price)} ${item.mrp?`• <span style="text-decoration:line-through">${formatPrice(item.mrp)}</span>`:''}</div>
          <div style="margin-top:8px; display:flex; gap:8px; align-items:center;">
            <div class="qty-controls">
              <button data-id="${item.id}" class="qty-btn dec">−</button>
              <div style="padding:6px 10px; border:1px solid var(--border); border-radius:6px;">${item.qty}</div>
              <button data-id="${item.id}" class="qty-btn inc">+</button>
            </div>
            <button data-id="${item.id}" class="btn btn-outline remove">Remove</button>
          </div>
        </div>
      `;
      cartItemsEl.appendChild(div);
    });
    $$('.qty-btn.inc').forEach(b => b.addEventListener('click', e => setCartQty(e.currentTarget.dataset.id, (state.cart[e.currentTarget.dataset.id]||0)+1)));
    $$('.qty-btn.dec').forEach(b => b.addEventListener('click', e => setCartQty(e.currentTarget.dataset.id, (state.cart[e.currentTarget.dataset.id]||0)-1)));
    $$('.remove').forEach(b => b.addEventListener('click', e => setCartQty(e.currentTarget.dataset.id, 0)));
  }
  const subtotal = items.reduce((s, it) => s + (it.price * it.qty), 0);
  cartSubtotalEl.textContent = formatPrice(subtotal);
  const count = items.reduce((s, it) => s + it.qty, 0);
  cartCount.textContent = count;
}

function createOverlay(){
  let ov = document.getElementById('overlay');
  if (!ov){
    ov = document.createElement('div');
    ov.id = 'overlay';
    ov.className = 'overlay';
    document.body.appendChild(ov);
  }
  // ensure click closes drawer
  ov.removeEventListener('click', closeCartDrawer);
  ov.addEventListener('click', closeCartDrawer);
  return ov;
}

function onCartKeyDown(e){
  if (e.key === 'Escape') { closeCartDrawer(); return; }
  if (e.key !== 'Tab') return;
  // simple focus trap inside drawer
  const focusable = Array.from(cartDrawer.querySelectorAll('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(el => el.offsetParent !== null);
  if (!focusable.length) return;
  const first = focusable[0], last = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
}

function openCart(){
  updateCartUI(); // ensure UI up-to-date
  createOverlay().classList.add('active');
  cartDrawer.classList.add('open');
  cartDrawer.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  // attach keyboard trap
  document.addEventListener('keydown', onCartKeyDown);
  // focus first actionable element in drawer
  const first = cartDrawer.querySelector('button, a, [tabindex]:not([tabindex="-1"])');
  if (first) first.focus();
}

function closeCartDrawer(){
  cartDrawer.classList.remove('open');
  const ov = document.getElementById('overlay');
  if (ov) ov.classList.remove('active');
  cartDrawer.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onCartKeyDown);
  // return focus to cart button for accessibility
  if (cartBtn) cartBtn.focus();
}

// ensure closeCart click handler exists (already used in file)
closeCart.addEventListener('click', closeCartDrawer);
cartBtn.addEventListener('click', openCart);
clearCartBtn.addEventListener('click', () => { if (confirm('Clear cart?')) clearCart(); });
checkoutBtn.addEventListener('click', () => { if (!Object.keys(state.cart).length) { alert('Cart is empty.'); return; } alert('Demo checkout'); });

// ---------- Events ----------
loadMoreBtn.addEventListener('click', ()=>{ state.page++; renderProducts(); });
loadMoreBtn.addEventListener('click', ()=>{ state.page++; renderProducts(); });

function bindEvents(){
    // helper to attach only when element exists
    const safe = (el, evt, fn) => { if (el) el.addEventListener(evt, fn); };

    safe(searchBtn, 'click', () => { state.page = 1; renderProducts(true); });
    safe(searchInput, 'keydown', (e) => { if (e.key === 'Enter') searchBtn?.click(); });

    safe(sortSelect, 'change', (e) => { state.sort = e.target.value; state.page = 1; renderProducts(true); });

    safe(loadMoreBtn, 'click', () => { state.page += 1; renderProducts(); });

    safe(cartBtn, 'click', openCart);
    safe(closeCart, 'click', closeCartDrawer);
    safe(clearCartBtn, 'click', () => { clearCart(); });
    safe(checkoutBtn, 'click', () => { /* existing checkout flow */ });

    safe(openCompareBtn, 'click', () => {
      if (state.compare.length < 2) { toast('Add at least two items'); return; }
      compareModal?.setAttribute('aria-hidden', 'false');
    });

    safe(compareClose, 'click', () => compareModal?.setAttribute('aria-hidden', 'true'));

    safe(themeToggle, 'click', toggleTheme);

    // mobile / sidebar toggles (guarded)
    safe(mobileNavToggle, 'click', () => document.body.classList.toggle('mobile-nav-open'));
    safe(sidebarClose, 'click', () => document.body.classList.remove('mobile-nav-open'));

    // accessibility: close modals/drawers with Esc
    document.removeEventListener('keydown', onGlobalKeyDown);
    document.addEventListener('keydown', onGlobalKeyDown);

    // small helper for missing elements debugging (optional)
    /* Uncomment to log missing elements during dev
    [
      ['searchBtn', searchBtn],
      ['searchInput', searchInput],
      ['sortSelect', sortSelect],
      ['cartBtn', cartBtn],
      ['loadMoreBtn', loadMoreBtn],
      ['themeToggle', themeToggle]
    ].forEach(([name, el]) => { if (!el) console.warn(`${name} missing from DOM`); });
    */
}

function onGlobalKeyDown(e){
  if (e.key === 'Escape'){
    // close any open UI
    closeCartDrawer();
    compareModal?.setAttribute('aria-hidden','true');
    productModal?.setAttribute('aria-hidden','true');
  }
}

// ---------- Theme ----------
function hydrateTheme(){
  const theme = load('fk_theme','dark');
  if (theme === 'light'){
    document.documentElement.classList.add('light');
    document.documentElement.setAttribute('data-theme','light');
    if (themeToggle) themeToggle.textContent = '🌞';
  } else {
    document.documentElement.classList.remove('light');
    document.documentElement.setAttribute('data-theme','dark');
    if (themeToggle) themeToggle.textContent = '🌙';
  }
}
function toggleTheme(){
  const isLight = document.documentElement.classList.toggle('light');
  document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
  save('fk_theme', isLight ? 'light' : 'dark');
  if (themeToggle) themeToggle.textContent = isLight ? '🌞' : '🌙';
}

// ---------- Small helpers ----------
function flashCart(){ cartBtn.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 300 }); }
function escapeHtml(str){ return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function toast(msg, type = "info") {
  const container = document.getElementById('toast-container');
  if (!container) return; // Prevent error if container is missing
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  el.style.cssText = "background:#222;color:#fff;padding:12px 20px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-weight:600;opacity:0.97;";
  container.appendChild(el);
  setTimeout(() => {
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 400);
  }, 2200);
}
