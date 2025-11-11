// js/admin.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, onSnapshot, updateDoc, deleteDoc, addDoc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// UI refs
const emailEl = document.getElementById('admin-email');
const passEl = document.getElementById('admin-pass');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const authMsg = document.getElementById('auth-msg');
const adminPanel = document.getElementById('admin-panel');
const ordersList = document.getElementById('orders-list');

const productEditList = document.getElementById('product-edit-list');
const btnRefreshProducts = document.getElementById('btn-refresh-products');

const newName = document.getElementById('new-name');
const newPrice = document.getElementById('new-price');
const newImage = document.getElementById('new-image');
const newAvailable = document.getElementById('new-available');
const btnAddProduct = document.getElementById('btn-add-product');
const productMsg = document.getElementById('product-msg');

let currentUser = null;
let ordersUnsub = null;

// Login
btnLogin.onclick = async () => {
  try {
    authMsg.textContent = 'Logging in...';
    const cred = await signInWithEmailAndPassword(auth, emailEl.value, passEl.value);
    authMsg.textContent = 'Eingeloggt';
  } catch(e) {
    console.error(e);
    authMsg.textContent = 'Login fehlgeschlagen: ' + (e.message || e);
  }
};

btnLogout.onclick = async () => {
  await signOut(auth);
};

// Auth state
onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    authMsg.textContent = `Angemeldet als ${user.email}`;
    btnLogout.style.display = 'inline-block';
    btnLogin.style.display = 'none';
    adminPanel.style.display = 'block';
    startOrdersListener();
    loadProductsForAdmin();
  } else {
    authMsg.textContent = 'Nicht eingeloggt';
    btnLogout.style.display = 'none';
    btnLogin.style.display = 'inline-block';
    adminPanel.style.display = 'none';
    if (ordersUnsub) ordersUnsub();
  }
});

// Bestellungen live laden
function startOrdersListener() {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  // onSnapshot für Live-Updates:
  ordersUnsub = onSnapshot(q, snapshot => {
    ordersList.innerHTML = '';
    snapshot.forEach(docSnap => {
      const o = { id: docSnap.id, ...docSnap.data() };
      ordersList.appendChild(renderOrderRow(o));
    });
  }, err => {
    console.error('orders snapshot error', err);
  });
}

function renderOrderRow(order) {
  const row = document.createElement('div'); row.className = 'order-row';
  const left = document.createElement('div');
  const created = order.createdAt && order.createdAt.toDate ? order.createdAt.toDate() : (order.createdAt? new Date(order.createdAt) : null);
  left.innerHTML = `<strong>${order.customerName}</strong><div class="small">${order.extras||''}</div>
    <div class="small">Gesamt: ${Number(order.total||0).toFixed(2)} € — ${created ? created.toLocaleString('de-DE', {timeZone:'Europe/Berlin'}) : 'Zeit unbekannt'}</div>
    <div class="small">Status: ${order.status || 'open'}</div>`;
  const right = document.createElement('div'); right.className = 'order-controls';
  const itemsList = document.createElement('div'); itemsList.className = 'small';
  (order.items || []).forEach(i => {
    const it = document.createElement('div'); it.textContent = `${i.qty} × ${i.name} (${i.price.toFixed(2)} €)`;
    itemsList.appendChild(it);
  });
  left.appendChild(itemsList);

  const btnDone = document.createElement('button'); btnDone.className='button small';
  btnDone.textContent = order.status === 'done' ? 'Als offen markieren' : 'Als erledigt markieren';
  btnDone.onclick = async () => {
    const ref = doc(db, 'orders', order.id);
    await updateDoc(ref, { status: order.status === 'done' ? 'open' : 'done' });
  };
  const btnDelete = document.createElement('button'); btnDelete.className='small';
  btnDelete.textContent = 'Löschen';
  btnDelete.onclick = async () => {
    if (!confirm('Bestellung löschen?')) return;
    await deleteDoc(doc(db, 'orders', order.id));
  };

  right.appendChild(btnDone); right.appendChild(btnDelete);
  row.appendChild(left); row.appendChild(right);
  return row;
}

// --- Produkte (Admin) ---
btnRefreshProducts.onclick = loadProductsForAdmin;

async function loadProductsForAdmin(){
  productEditList.innerHTML = 'Lade…';
  const snap = await getDocs(collection(db, 'products'));
  productEditList.innerHTML = '';
  snap.forEach(d => {
    const p = { id: d.id, ...d.data() };
    productEditList.appendChild(renderProductEditRow(p));
  });
}

function renderProductEditRow(p){
  const wrap = document.createElement('div'); wrap.className = 'card';
  wrap.style.display = 'flex'; wrap.style.flexDirection = 'column';
  wrap.innerHTML = `<div style="display:flex;gap:0.6rem;align-items:center;">
      <img src="${p.imageURL || 'assets/placeholder.png'}" style="width:90px;height:70px;object-fit:cover;border-radius:6px" />
      <div style="flex:1">
        <input data-id="${p.id}" class="edit-name" value="${p.name}" />
        <input data-id="${p.id}" class="edit-price" value="${Number(p.price).toFixed(2)}" />
      </div>
    </div>`;
  // image upload and save button
  const fileInput = document.createElement('input'); fileInput.type='file'; fileInput.accept='image/*';
  const btnSave = document.createElement('button'); btnSave.className = 'button small'; btnSave.textContent = 'Speichern';
  btnSave.onclick = async () => {
    const nameInput = wrap.querySelector('.edit-name');
    const priceInput = wrap.querySelector('.edit-price');
    const updates = { name: nameInput.value, price: Number(priceInput.value) };
    try {
      // wenn Datei gewählt -> hochladen
      if (fileInput.files && fileInput.files.length > 0) {
        const file = fileInput.files[0];
        const storageRef = sRef(storage, `product-images/${p.id}_${Date.now()}_${file.name}`);
        await uploadBytes(storageRef, file);
        const url = await getDownloadURL(storageRef);
        updates.imageURL = url;
      }
      // update firestore
      await updateDoc(doc(db, 'products', p.id), updates);
      btnSave.textContent = 'Gespeichert';
      setTimeout(()=> btnSave.textContent = 'Speichern', 2000);
    } catch(e) {
      console.error(e);
      productMsg.textContent = 'Fehler beim Speichern: ' + e.message;
    }
  };

  const btnDelete = document.createElement('button'); btnDelete.textContent = 'Löschen';
  btnDelete.onclick = async () => {
    if (!confirm('Produkt löschen?')) return;
    await deleteDoc(doc(db, 'products', p.id));
    loadProductsForAdmin();
  };

  wrap.appendChild(fileInput);
  wrap.appendChild(btnSave);
  wrap.appendChild(btnDelete);
  return wrap;
}

// Neues Produkt hinzufügen
btnAddProduct.onclick = async () => {
  productMsg.textContent = 'Hinzufügen…';
  const name = newName.value.trim();
  const price = parseFloat(newPrice.value);
  const available = newAvailable.checked;
  if (!name || isNaN(price)) { productMsg.textContent = 'Bitte Name und Preis angeben'; return; }

  try {
    const docRef = await addDoc(collection(db, 'products'), {
      name, price, available, imageURL: '', createdAt: new Date()
    });
    // wenn Bild gewählt -> upload
    if (newImage.files && newImage.files[0]) {
      const file = newImage.files[0];
      const sref = sRef(storage, `product-images/${docRef.id}_${Date.now()}_${file.name}`);
      await uploadBytes(sref, file);
      const url = await getDownloadURL(sref);
      await updateDoc(doc(db, 'products', docRef.id), { imageURL: url });
    }
    productMsg.textContent = 'Produkt hinzugefügt';
    newName.value=''; newPrice.value=''; newImage.value='';
    loadProductsForAdmin();
  } catch(e) {
    console.error(e);
    productMsg.textContent = 'Fehler: ' + e.message;
  }
};
