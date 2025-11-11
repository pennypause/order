// js/app.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getFirestore, collection, doc, getDocs, onSnapshot, addDoc, updateDoc, serverTimestamp, getDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-storage.js";

// ---------- Firebase config ----------
const firebaseConfig = {
  apiKey: "TODO_apiKey",
  authDomain: "TODO_authDomain",
  projectId: "TODO_projectId",
  storageBucket: "TODO_storageBucket",
  messagingSenderId: "TODO_messagingSenderId",
  appId: "TODO_appId"
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// ---------- UI references ----------
const productListEl = document.getElementById('product-list');
const cartItemsEl = document.getElementById('cart-items');
const subtotalEl = document.getElementById('subtotal');
const deliveryEl = document.getElementById('delivery');
const totalEl = document.getElementById('total');
const nameEl = document.getElementById('customer-name');
const extrasEl = document.getElementById('extras');
const placeOrderBtn = document.getElementById('place-order');
const messageEl = document.getElementById('message');

let products = [];
let cart = {}; // { productId: {product, qty} }
let deliveryCost = 2.50; // default, kann aus Firestore geladen werden

// Lade Einstellungen (Lieferkosten)
async function loadSettings() {
  try {
    const docRef = await getDoc(doc(db, 'settings', 'general'));
    if (docRef.exists()) {
      const data = docRef.data();
      if (data.deliveryCost !== undefined) deliveryCost = Number(data.deliveryCost);
    }
  } catch(e) {
    console.warn('Settings load failed', e);
  }
  deliveryEl.textContent = `${deliveryCost.toFixed(2)} €`;
}
loadSettings();

// Produkte live laden
async function loadProducts() {
  productListEl.innerHTML = 'Lade Produkte…';
  const q = collection(db, 'products');
  // einfacher einmaliger fetch:
  const snap = await getDocs(q);
  products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  renderProducts();
}
loadProducts();

// Rendert Produkt-Karten
function renderProducts(){
  productListEl.innerHTML = '';
  products.forEach(p => {
    const card = document.createElement('div'); card.className = 'card';
    const img = document.createElement('img'); img.src = p.imageURL || 'assets/placeholder.png';
    const h = document.createElement('div'); h.className = 'meta';
    const name = document.createElement('div'); name.innerHTML = `<strong>${p.name}</strong><div class="small">${p.description||''}</div>`;
    const price = document.createElement('div'); price.innerHTML = `<div>${Number(p.price).toFixed(2)} €</div>`;
    h.appendChild(name); h.appendChild(price);
    const btn = document.createElement('button'); btn.className = 'button';
    btn.textContent = 'Wählen';
    btn.onclick = () => openProductPicker(p);
    card.appendChild(img); card.appendChild(h); card.appendChild(btn);
    productListEl.appendChild(card);
  });
}

// Produkt-Anzahl auswählen
function openProductPicker(product){
  const qty = prompt(`Anzahl für "${product.name}" eingeben:`, "1");
  if (!qty) return;
  const qn = parseInt(qty);
  if (isNaN(qn) || qn <= 0) { alert('Ungültige Anzahl'); return; }
  addToCart(product, qn);
}

// Warenkorb-Operationen
function addToCart(product, qty){
  if (!cart[product.id]) cart[product.id] = { product, qty:0 };
  cart[product.id].qty += qty;
  renderCart();
}

function renderCart(){
  cartItemsEl.innerHTML = '';
  let subtotal = 0;
  Object.values(cart).forEach(item => {
    const row = document.createElement('div'); row.className = 'cart-item';
    const left = document.createElement('div'); left.innerHTML = `<strong>${item.product.name}</strong><div class="small">${Number(item.product.price).toFixed(2)} €</div>`;
    const right = document.createElement('div');
    right.innerHTML = `<input type="number" min="1" value="${item.qty}" style="width:70px" /> <button class="button small">Entfernen</button>`;
    const input = right.querySelector('input');
    input.onchange = (e) => {
      const v = parseInt(e.target.value);
      if (v <= 0) { delete cart[item.product.id]; renderCart(); return; }
      cart[item.product.id].qty = v; renderCart();
    };
    right.querySelector('button').onclick = () => { delete cart[item.product.id]; renderCart(); };
    row.appendChild(left); row.appendChild(right);
    cartItemsEl.appendChild(row);
    subtotal += Number(item.product.price) * item.qty;
  });

  subtotalEl.textContent = `${subtotal.toFixed(2)} €`;
  const total = subtotal + deliveryCost;
  totalEl.textContent = `${total.toFixed(2)} €`;
}

// Bestellung absenden
placeOrderBtn.onclick = async () => {
  messageEl.textContent = '';
  const name = nameEl.value.trim();
  if (!name) { messageEl.textContent = 'Bitte Name angeben.'; return; }
  if (Object.keys(cart).length === 0) { messageEl.textContent = 'Warenkorb ist leer.'; return; }

  const orderItems = Object.values(cart).map(it => ({
    productId: it.product.id,
    name: it.product.name,
    price: Number(it.product.price),
    qty: it.qty
  }));

  const order = {
    customerName: name,
    extras: extrasEl.value || '',
    items: orderItems,
    deliveryCost: deliveryCost,
    subtotal: orderItems.reduce((s,i)=> s + i.price*i.qty, 0),
    total: orderItems.reduce((s,i)=> s + i.price*i.qty, 0) + deliveryCost,
    createdAt: serverTimestamp(),
    status: 'open'
  };

  try {
    await addDoc(collection(db, 'orders'), order);
    messageEl.textContent = 'Bestellung erfolgreich abgesendet — danke!';
    // reset
    cart = {}; renderCart();
    nameEl.value = ''; extrasEl.value = '';
  } catch(e) {
    console.error(e);
    messageEl.textContent = 'Fehler beim Absenden. Bitte später erneut versuchen.';
  }
};
