import { initializeApp, getApps } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAUJ6kk1dY_8RBwq38QpXVA-iV3KkV0pzk",
  authDomain: "ams1-e37cc.firebaseapp.com",
  databaseURL: "https://ams1-e37cc-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ams1-e37cc",
  storageBucket: "ams1-e37cc.firebasestorage.app",
  messagingSenderId: "635616146543",
  appId: "1:635616146543:web:e07d1753c53d56faf2c99a"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { db, ref, set, onValue, auth };
