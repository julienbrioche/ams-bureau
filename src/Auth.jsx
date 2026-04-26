import { useState, useEffect, createContext, useContext } from "react";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { getDatabase, ref, set, get } from "firebase/database";
import { initializeApp, getApps } from "firebase/app";

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
const auth = getAuth(app);
const db = getDatabase(app);

const COLORS = {
  primary: "#1a5c2e", accent: "#f0a500", dark: "#0f2d17",
  gray: "#6b7c6e", border: "#d1e0d5", white: "#ffffff",
  danger: "#c0392b", light: "#f4f9f5", greenPale: "#e8f5e9",
};

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const snap = await get(ref(db, `users/${u.uid}`));
        if (snap.exists()) setUserProfile(snap.val());
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: COLORS.accent, fontSize: 22, fontWeight: 700 }}>Chargement AMS...</div>
    </div>
  );

  if (!user) return <LoginScreen />;

  return (
    <AuthContext.Provider value={{ user, userProfile, signOut: () => signOut(auth) }}>
      {children}
    </AuthContext.Provider>
  );
}

function LoginScreen() {
  const [mode, setMode] = useState("login"); // login | register
  const [form, setForm] = useState({ email: "", password: "", prenom: "", nom: "", role: "technicien" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.email || !form.password) return setError("Email et mot de passe requis");
    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
    } catch (e) {
      setError("Email ou mot de passe incorrect");
    }
    setLoading(false);
  };

  const handleRegister = async () => {
    if (!form.email || !form.password || !form.prenom || !form.nom) return setError("Tous les champs sont requis");
    if (form.password.length < 6) return setError("Mot de passe minimum 6 caractères");
    setLoading(true);
    setError("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: `${form.prenom} ${form.nom}` });
      await set(ref(db, `users/${cred.user.uid}`), {
        uid: cred.user.uid,
        prenom: form.prenom,
        nom: form.nom,
        email: form.email,
        role: form.role,
        createdAt: new Date().toLocaleDateString("fr-FR"),
      });
    } catch (e) {
      setError(e.code === "auth/email-already-in-use" ? "Email déjà utilisé" : "Erreur lors de la création");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: COLORS.dark, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ background: COLORS.white, borderRadius: 20, width: "100%", maxWidth: 420, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        {/* Header */}
        <div style={{ background: COLORS.dark, padding: "28px 32px", textAlign: "center" }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: COLORS.accent, letterSpacing: 3 }}>AMS</div>
          <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 4 }}>Alliance Matériel Service</div>
        </div>

        <div style={{ padding: "28px 32px" }}>
          {/* Toggle */}
          <div style={{ display: "flex", background: COLORS.light, borderRadius: 10, padding: 4, marginBottom: 24 }}>
            {[["login", "Connexion"], ["register", "Créer un compte"]].map(([m, l]) => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "8px 0", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14, background: mode === m ? COLORS.primary : "transparent", color: mode === m ? "#fff" : COLORS.gray }}>
                {l}
              </button>
            ))}
          </div>

          {mode === "register" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              {[["prenom", "Prénom"], ["nom", "Nom"]].map(([f, l]) => (
                <div key={f}>
                  <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>{l} *</label>
                  <input value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
            </div>
          )}

          {[["email", "Email", "email"], ["password", mode === "login" ? "Mot de passe" : "Mot de passe (min. 6 car.)", "password"]].map(([f, l, t]) => (
            <div key={f} style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>{l} *</label>
              <input type={t} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                onKeyDown={e => e.key === "Enter" && (mode === "login" ? handleLogin() : handleRegister())}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
            </div>
          ))}

          {mode === "register" && (
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Rôle</label>
              <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                <option value="technicien">Technicien</option>
                <option value="commercial">Commercial</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
          )}

          {error && (
            <div style={{ background: "#fce4ec", color: COLORS.danger, padding: "10px 14px", borderRadius: 8, fontSize: 14, marginBottom: 14, fontWeight: 600 }}>
              ⚠️ {error}
            </div>
          )}

          <button onClick={mode === "login" ? handleLogin : handleRegister} disabled={loading}
            style={{ width: "100%", background: loading ? "#ccc" : COLORS.primary, color: "#fff", border: "none", borderRadius: 10, padding: "13px", cursor: loading ? "not-allowed" : "pointer", fontWeight: 800, fontSize: 16, marginTop: 4 }}>
            {loading ? "⏳ Chargement..." : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </div>
      </div>
    </div>
  );
}
