 # 🥐 Bäckerei Bestellsystem – Komplette Anleitung

Ein modernes, browserbasiertes **Bestellsystem für Bäckereien**, das ohne Installation funktioniert.  
Es ermöglicht Kunden, Backwaren zu bestellen, und Administratoren, Bestellungen und Produkte zu verwalten.  
Das System basiert auf **React**, **Firebase** und **TailwindCSS** – alles in einer einzigen HTML-Datei.

---

## 🚀 Überblick

Dieses Projekt ist komplett **clientseitig** und benötigt nur:
- Einen Browser 🧭  
- Ein kostenloses **Firebase-Projekt** 🔥  
- (Optional) ein **GitHub-Konto** für Hosting 🌍  

Nach dieser Anleitung kannst du das System in wenigen Minuten selbst starten und online bereitstellen.

---

## 🧩 Schritt 1: Firebase einrichten

### 1.1 Neues Projekt erstellen
1. Öffne [https://console.firebase.google.com](https://console.firebase.google.com)
2. Klicke auf **„Projekt hinzufügen“**
3. Gib einen Projektnamen ein (z. B. `baeckerei-bestellsystem`)
4. Klicke auf **„Erstellen“**

---

### 1.2 Firestore aktivieren
1. In der linken Seitenleiste: **„Firestore Database“ → „Datenbank erstellen“**
2. Wähle **Testmodus** (damit du lokal alles ausprobieren kannst)
3. Klicke auf **„Weiter“**  
   → Firestore ist nun aktiv

---

### 1.3 Authentication aktivieren
1. Menü links → **Authentication**
2. Reiter **„Anmeldemethoden“**
3. Aktiviere **E-Mail/Passwort**

Damit können Kunden Konten erstellen und sich anmelden.

---

### 1.4 Web-App hinzufügen
1. In den **Projekteinstellungen (⚙️ oben links)** → **„Allgemein“**
2. Scrolle zu **„Deine Apps“**
3. Klicke auf das **</> Symbol (Web-App hinzufügen)**
4. Gib der App einen Namen, z. B. `frontend`
5. Klicke auf **„App registrieren“**
6. Kopiere den angezeigten Konfigurationscode (z. B.):

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "baeckerei-app.firebaseapp.com",
  projectId: "baeckerei-app",
  storageBucket: "baeckerei-app.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
