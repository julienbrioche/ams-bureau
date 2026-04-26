import { useState, useEffect } from "react";
import { useAuth } from "./Auth.jsx";
import ScannerBL from "./ScannerBL";
import RechercheEntreprise from "./RechercheEntreprise";
import { db, ref, set, onValue } from "./firebase";
import Parametres from "./Parametres";
import DocumentEditor from "./DocumentEditor";

const COLORS = {
  primary: "#1a5c2e", secondary: "#2d7a45", accent: "#f0a500",
  dark: "#0f2d17", light: "#f4f9f5", gray: "#6b7c6e",
  border: "#d1e0d5", white: "#ffffff", danger: "#c0392b",
  info: "#2471a3", greenPale: "#e8f5e9",
};

// Auto-numérotation
const nextNum = (items, prefix, pad=4) => {
  const nums = (items||[]).map(x => {
    const m = (x.id||"").match(/(\d+)$/);
    return m ? parseInt(m[1]) : 0;
  });
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `${prefix}${String(next).padStart(pad, "0")}`;
};

const initialData = {
  documents: [],
  parametres: {
    typesMachine: ["Pelle", "Compacteur", "Chariot frontal élec", "Chariot frontal gaz", "Chariot frontal thermique", "Chariot rétractable", "Nacelle", "Télescopique", "Dumper", "Niveleuse", "Bulldozer", "Chargeuse", "Grue", "Autre"],
    marques: ["Caterpillar", "Komatsu", "JCB", "Manitou", "Toyota", "Still", "Linde", "BT", "Jungheinrich", "Volvo", "Bobcat", "Doosan", "Hyster", "Yale", "Crown", "Autre"],
    modeles: [],
    typesControle: ["VGP", "Contrôle technique", "Révision", "Contrôle électrique", "Contrôle hydraulique", "Autre"],
    categoriesPieces: ["Mécanique", "Hydraulique", "Électrique", "Moteur", "Carrosserie", "Service", "Autre"],
    conditionsLocation: "1. Le locataire est responsable du matériel durant toute la durée de la location.\n2. Le matériel doit être restitué dans l'état dans lequel il a été remis.\n3. Toute casse ou détérioration sera facturée au locataire.\n4. Le locataire doit souscrire une assurance couvrant le matériel loué.\n5. En cas de panne, contacter immédiatement AMS au 06.25.24.81.44.\n6. Tout retard de restitution fera l'objet d'une facturation supplémentaire.\n7. La caution sera restituée après vérification du matériel.",
    siret: "",
  },
  clients: [
    { id: 1, nom: "SAEP du Gaillacois", contact: "Laurent VINZELLE", email: "laurent.vinzelle@saepg81.fr", tel: "05.63.41.74.08", ville: "Rivières", type: "Client" },
    { id: 2, nom: "Mairie de Rabastens", contact: "MAGRE Cyril", email: "infrastructure.mairie@rabastens.fr", tel: "06.83.93.92.33", ville: "Rabastens", type: "Client" },
    { id: 3, nom: "Groupe Eychenne", contact: "Benoit PIGOT", email: "benoit.pigot@groupe-eychenne.com", tel: "", ville: "Plaisance du Touch", type: "Client" },
    { id: 4, nom: "Doumerc Pneus", contact: "Benoit Doumerc", email: "benoit@doumercpneus.net", tel: "", ville: "", type: "Fournisseur" },
  ],
  devis: [
    { id: "D-2024-001", client: "SAEP du Gaillacois", date: "15/05/2024", montant: 2450, statut: "Accepté", description: "Révision chariot élévateur gaz" },
    { id: "D-2024-002", client: "Mairie de Rabastens", date: "17/04/2026", montant: 1800, statut: "En attente", description: "Entretien matériel TP" },
  ],
  factures: [
    { id: "F-2024-0933", client: "CUMA Oenologique du Gaillacois", date: "05/01/2026", montant: 980, statut: "Payée", devis: "" },
    { id: "F-2024-0934", client: "SAEP du Gaillacois", date: "15/05/2024", montant: 2450, statut: "En attente", devis: "D-2024-001" },
    { id: "F-2025-0001", client: "Groupe Eychenne", date: "16/04/2026", montant: 394.46, statut: "Payée", devis: "" },
  ],
  parc: [
    { id: "M-001", designation: "Chariot élévateur Caterpillar 390", type: "Chariot", statut: "Disponible", client: "", dateEntree: "01/01/2024", immat: "CA390" },
    { id: "M-002", designation: "Mini-pelle Caterpillar", type: "TP", statut: "En location", client: "Groupe Eychenne", dateEntree: "15/03/2024", immat: "FJ-772-LB" },
    { id: "M-003", designation: "Chariot élévateur gaz 2001", type: "Chariot", statut: "En réparation", client: "", dateEntree: "10/11/2025", immat: "" },
  ],
  sav: [
    { id: "SAV-001", machine: "Chariot élévateur gaz 2001", client: "SAEP du Gaillacois", date: "24/11/2025", type: "Réparation", statut: "Terminé", description: "Remplacement sondes Nox moteur CUMMINS", technicien: "Brian Julien" },
    { id: "SAV-002", machine: "Mini-pelle Caterpillar", client: "Groupe Eychenne", date: "16/04/2026", type: "Entretien", statut: "En cours", description: "Révision complète + roue motrice", technicien: "Brian Julien" },
  ],
  locations: [
    { id: "LOC-001", machine: "Mini-pelle Caterpillar", client: "Groupe Eychenne", debut: "26/03/2026", fin: "30/04/2026", prixJour: 150, statut: "En cours" },
  ],
  pieces: [
    { id: "P-001", reference: "DEP3", referenceInterne: "AMS-0001", designation: "Déplacement technicien", stock: 0, prixAchat: 0, prix: 100, fournisseur: "Interne", categorie: "Service", unite: "forfait", refsFournisseurs: [] },
    { id: "P-002", reference: "3252", referenceInterne: "AMS-0002", designation: "Roue motrice", stock: 2, prixAchat: 170, prix: 212.46, fournisseur: "Groupe Eychenne", categorie: "Mécanique", unite: "unité", refsFournisseurs: [{ fournisseur: "Groupe Eychenne", reference: "3252", prixAchat: 170 }] },
    { id: "P-003", reference: "MOEX", referenceInterne: "AMS-0003", designation: "Main d'œuvre expertise", stock: 0, prixAchat: 0, prix: 82, fournisseur: "Interne", categorie: "Service", unite: "heure", refsFournisseurs: [] },
    { id: "P-004", reference: "NOX-CUMMINS", referenceInterne: "AMS-0004", designation: "Sonde Nox Cummins", stock: 1, prixAchat: 320, prix: 450, fournisseur: "benoit Aubonnet", categorie: "Moteur", unite: "unité", refsFournisseurs: [{ fournisseur: "benoit Aubonnet", reference: "NOX-CUMMINS", prixAchat: 320 }] },
  ],
};

const Badge = ({ statut }) => {
  const map = {
    "Disponible": ["#e8f5e9", "#1b5e20"], "En location": ["#e3f2fd", "#0d47a1"],
    "En réparation": ["#fff3e0", "#e65100"], "Payée": ["#e8f5e9", "#1b5e20"],
    "En attente": ["#fff8e1", "#f57f17"], "Accepté": ["#e8f5e9", "#1b5e20"],
    "Terminé": ["#e8f5e9", "#1b5e20"], "En cours": ["#e3f2fd", "#0d47a1"],
    "Client": ["#e8f5e9", "#1b5e20"], "Fournisseur": ["#fce4ec", "#880e4f"],
    "Importé BL": ["#f3e5f5", "#6a1b9a"],
  };
  const [bg, color] = map[statut] || ["#f5f5f5", "#333"];
  return <span style={{ background: bg, color, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{statut}</span>;
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: `1px solid ${COLORS.border}`, ...style }}>{children}</div>
);

const StatCard = ({ label, value, icon, color }) => (
  <Card style={{ display: "flex", alignItems: "center", gap: 16 }}>
    <div style={{ background: color + "20", borderRadius: 12, width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 26, fontWeight: 700, color: COLORS.dark }}>{value}</div>
      <div style={{ fontSize: 13, color: COLORS.gray }}>{label}</div>
    </div>
  </Card>
);

const TableComp = ({ headers, rows }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
      <thead>
        <tr style={{ background: COLORS.light }}>
          {headers.map((h, i) => <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: COLORS.gray, fontWeight: 600, borderBottom: `2px solid ${COLORS.border}`, whiteSpace: "nowrap" }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}`, background: i % 2 === 0 ? COLORS.white : COLORS.light }}>
            {row.map((cell, j) => <td key={j} style={{ padding: "10px 14px", color: COLORS.dark }}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ModalForm = ({ title, fields, values, onChange, onSave, onClose, selects = {} }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
    <Card style={{ width: 440, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
      <h3 style={{ marginBottom: 16 }}>{title}</h3>
      {fields.map(([f, l, t = "text"]) => (
        <div key={f} style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>{l}</label>
          {selects[f]
            ? <select value={values[f] || ""} onChange={e => onChange(f, e.target.value)} style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
              {selects[f].map(o => <option key={o}>{o}</option>)}
            </select>
            : <input type={t} value={values[f] || ""} onChange={e => onChange(f, e.target.value)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
          }
        </div>
      ))}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", cursor: "pointer" }}>Annuler</button>
        <button onClick={onSave} style={{ padding: "8px 16px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>Enregistrer</button>
      </div>
    </Card>
  </div>
);

// PAGES
const Dashboard = ({ data }) => {
  const caTotal = data.factures.filter(f => f.statut === "Payée").reduce((s, f) => s + f.montant, 0);
  const enAttente = data.factures.filter(f => f.statut === "En attente").reduce((s, f) => s + f.montant, 0);
  return (
    <div>
      <h2 style={{ marginBottom: 20, color: COLORS.dark }}>Tableau de bord</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <StatCard label="Clients" value={data.clients.length} icon="👥" color={COLORS.primary} />
        <StatCard label="Machines en parc" value={data.parc.length} icon="🏗️" color={COLORS.accent} />
        <StatCard label="SAV en cours" value={data.sav.filter(s => s.statut === "En cours").length} icon="🔧" color="#e74c3c" />
        <StatCard label="Locations actives" value={data.locations.filter(l => l.statut === "En cours").length} icon="📋" color={COLORS.info} />
        <StatCard label="CA encaissé" value={caTotal.toLocaleString("fr-FR") + " €"} icon="💶" color={COLORS.secondary} />
        <StatCard label="Factures en attente" value={enAttente.toLocaleString("fr-FR") + " €"} icon="⏳" color="#f39c12" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ marginBottom: 12, color: COLORS.dark, fontSize: 15 }}>🔧 SAV récents</h3>
          {data.sav.slice(0, 3).map((s, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{s.machine}</div><div style={{ fontSize: 12, color: COLORS.gray }}>{s.client} — {s.date}</div></div>
              <Badge statut={s.statut} />
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ marginBottom: 12, color: COLORS.dark, fontSize: 15 }}>📦 Stock faible</h3>
          {data.pieces.filter(p => p.stock <= 1 && p.categorie !== "Service").map((p, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between" }}>
              <div><div style={{ fontWeight: 600, fontSize: 13 }}>{p.designation}</div><div style={{ fontSize: 12, color: COLORS.gray }}>{p.referenceInterne}</div></div>
              <span style={{ color: p.stock === 0 ? COLORS.danger : "#f39c12", fontWeight: 700 }}>{p.stock} en stock</span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
};

const Pieces = ({ data, setData }) => {
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [detailPiece, setDetailPiece] = useState(null);

  const filtered = data.pieces.filter(p =>
    p.designation.toLowerCase().includes(search.toLowerCase()) ||
    (p.referenceInterne || "").toLowerCase().includes(search.toLowerCase()) ||
    p.reference.toLowerCase().includes(search.toLowerCase()) ||
    (p.refsFournisseurs || []).some(r => r.reference.toLowerCase().includes(search.toLowerCase()))
  );

  const save = () => {
    if (form.id) setData(d => ({ ...d, pieces: d.pieces.map(x => x.id === form.id ? form : x) }));
    else setData(d => ({ ...d, pieces: [...d.pieces, { ...form, id: `P-${Date.now()}`, referenceInterne: `AMS-${String(Date.now()).slice(-4)}`, refsFournisseurs: [] }] }));
    setForm(null);
  };

  const handleAddArticles = (nouveaux) => {
    setData(d => ({ ...d, pieces: [...d.pieces, ...nouveaux] }));
  };

  const handleUpdateArticle = (id, updates) => {
    setData(d => ({
      ...d, pieces: d.pieces.map(p => {
        if (p.id !== id) return p;
        return { ...p, refsFournisseurs: [...(p.refsFournisseurs || []), ...(updates.refsFournisseurs || [])] };
      })
    }));
  };

  if (showScanner) return (
    <div>
      <button onClick={() => setShowScanner(false)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", marginBottom: 20, fontSize: 14 }}>← Retour au catalogue</button>
      <ScannerBL catalogue={data.pieces} onAddArticles={handleAddArticles} onUpdateArticle={handleUpdateArticle} />
    </div>
  );

  if (detailPiece) {
    const p = data.pieces.find(x => x.id === detailPiece);
    return (
      <div>
        <button onClick={() => setDetailPiece(null)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", marginBottom: 20, fontSize: 14 }}>← Retour</button>
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: COLORS.gray }}>{p.referenceInterne}</div>
              <h2 style={{ margin: "4px 0", color: COLORS.dark }}>{p.designation}</h2>
              <Badge statut={p.categorie} />
            </div>
            <button onClick={() => { setDetailPiece(null); setForm(p); }} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, cursor: "pointer" }}>✏️ Modifier</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 24 }}>
            {[["Stock actuel", p.stock, p.stock === 0 ? COLORS.danger : p.stock <= 1 ? "#f39c12" : COLORS.primary],
              ["Prix achat HT", (p.prixAchat || 0).toLocaleString("fr-FR") + " €", COLORS.gray],
              ["Prix vente HT", (p.prix || 0).toLocaleString("fr-FR") + " €", COLORS.primary]
            ].map(([l, v, c]) => (
              <div key={l} style={{ background: COLORS.light, borderRadius: 10, padding: 16, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{v}</div>
                <div style={{ fontSize: 13, color: COLORS.gray }}>{l}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>🔗 Références fournisseurs</div>
          {(!p.refsFournisseurs || p.refsFournisseurs.length === 0)
            ? <div style={{ color: COLORS.gray, fontSize: 14 }}>Aucune référence fournisseur liée</div>
            : p.refsFournisseurs.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: COLORS.light, borderRadius: 8, marginBottom: 8 }}>
                <div><div style={{ fontWeight: 600 }}>{r.fournisseur}</div><div style={{ fontSize: 13, color: COLORS.gray }}>Réf : {r.reference}</div></div>
                <div style={{ fontWeight: 700, color: COLORS.gray }}>{r.prixAchat} € achat</div>
              </div>
            ))
          }
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: COLORS.dark }}>📦 Pièces & Magasin</h2>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => setShowScanner(true)}
            style={{ background: COLORS.accent, color: COLORS.dark, border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
            📷 Scanner BL/Facture
          </button>
          <button onClick={() => setForm({ reference: "", designation: "", stock: 0, prixAchat: 0, prix: "", fournisseur: "", categorie: "Mécanique", unite: "pièce" })}
            style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
            + Ajouter manuellement
          </button>
        </div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher par désignation, référence AMS ou référence fournisseur..."
        style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, marginBottom: 16, fontSize: 14, boxSizing: "border-box" }} />

      <Card>
        <TableComp
          headers={["Réf. AMS", "Désignation", "Catégorie", "Stock", "Prix achat", "Prix vente", "Fournisseurs liés", "Actions"]}
          rows={filtered.map(p => [
            <div><div style={{ fontWeight: 700, fontSize: 13 }}>{p.referenceInterne}</div><div style={{ fontSize: 11, color: COLORS.gray }}>{p.reference}</div></div>,
            <span style={{ fontWeight: 600 }}>{p.designation}</span>,
            <Badge statut={p.categorie} />,
            <span style={{ color: p.stock === 0 ? COLORS.danger : p.stock <= 1 ? "#f39c12" : "#27ae60", fontWeight: 700 }}>{p.stock}</span>,
            <span style={{ color: COLORS.gray }}>{(p.prixAchat || 0).toLocaleString("fr-FR")} €</span>,
            <strong style={{ color: COLORS.primary }}>{(p.prix || 0).toLocaleString("fr-FR")} €</strong>,
            <div>
                <span style={{ fontSize: 12, color: COLORS.info }}>{(p.refsFournisseurs || []).length > 0 ? `${(p.refsFournisseurs || []).length} fournisseur(s)` : "—"}</span>
                {p.refOrigine && <div style={{ fontSize: 11, color: COLORS.gray }}>Orig: {p.refOrigine}</div>}
              </div>,
            <div style={{ display: "flex", gap: 5 }}>
              <button onClick={() => setData(d => ({ ...d, pieces: d.pieces.map(x => x.id === p.id ? { ...x, stock: x.stock + 1 } : x) }))}
                style={{ background: "#e8f5e9", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontWeight: 700, color: "#27ae60" }}>+</button>
              <button onClick={() => setData(d => ({ ...d, pieces: d.pieces.map(x => x.id === p.id ? { ...x, stock: Math.max(0, x.stock - 1) } : x) }))}
                style={{ background: "#fce4ec", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontWeight: 700, color: COLORS.danger }}>-</button>
              <button onClick={() => setDetailPiece(p.id)}
                style={{ background: COLORS.light, border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>🔍</button>
              <button onClick={() => setForm(p)}
                style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>
            </div>
          ])}
        />
      </Card>

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
          <div style={{ background: COLORS.white, borderRadius: 16, width: "95vw", maxWidth: 700, maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ background: COLORS.dark, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ color: COLORS.accent, fontWeight: 800, fontSize: 16 }}>{form.id ? "✏️ Modifier" : "➕ Nouvelle"} pièce</div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={save} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700 }}>💾 Enregistrer</button>
                <button onClick={() => setForm(null)} style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 18 }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
              <div style={{ background: COLORS.light, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: COLORS.dark, marginBottom: 12, fontSize: 15 }}>🔖 Références</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  {[["referenceInterne","Référence interne AMS"],["refOrigine","Ref. constructeur / origine"],["reference","Référence fournisseur"]].map(([f,l]) => (
                    <div key={f}>
                      <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>{l}</label>
                      <input value={form[f]||""} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                        style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Fournisseur</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <select value={form.fournisseur||""} onChange={e => setForm(p => ({ ...p, fournisseur: e.target.value }))}
                        style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                        <option value="">-- Choisir --</option>
                        {(data.clients||[]).filter(c=>c.type==="Fournisseur").map(c => <option key={c.id}>{c.nom}</option>)}
                      </select>
                      <button onClick={() => {
                        const nom = prompt("Nom du fournisseur:");
                        if (nom) {
                          const newF = { id: Date.now(), nom, contact:"", email:"", tel:"", ville:"", type:"Fournisseur", numeroClient: nextNum(data.clients,"CLI-") };
                          setData(d => ({ ...d, clients: [...(d.clients||[]), newF] }));
                          setForm(p => ({ ...p, fournisseur: nom }));
                        }
                      }} style={{ background: COLORS.accent, border:"none", borderRadius:8, padding:"8px 10px", cursor:"pointer", fontWeight:700, fontSize:13, color:COLORS.dark, whiteSpace:"nowrap" }}>+ Nouveau</button>
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ background: COLORS.light, borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: COLORS.dark, marginBottom: 12, fontSize: 15 }}>📋 Informations</div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Désignation *</label>
                  <input value={form.designation||""} onChange={e => setForm(p => ({ ...p, designation: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `2px solid ${COLORS.accent}`, fontSize: 15, fontWeight: 600, boxSizing: "border-box" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Catégorie</label>
                    <select value={form.categorie||"Mécanique"} onChange={e => setForm(p => ({ ...p, categorie: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                      {(data.parametres?.categoriesPieces||["Mécanique","Hydraulique","Électrique","Moteur","Service","Autre"]).map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Unité</label>
                    <select value={form.unite||"pièce"} onChange={e => setForm(p => ({ ...p, unite: e.target.value }))}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                      {["pièce","litre","kg","m","forfait","heure"].map(u => <option key={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div style={{ background: COLORS.light, borderRadius: 12, padding: 16 }}>
                <div style={{ fontWeight: 700, color: COLORS.dark, marginBottom: 12, fontSize: 15 }}>💶 Prix & Stock</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Prix achat HT (€)</label>
                    <input type="number" value={form.prixAchat||""} onChange={e => setForm(p => ({ ...p, prixAchat: e.target.value }))}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 15, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: COLORS.danger, display: "block", marginBottom: 4, fontWeight: 700 }}>Prix vente HT (€) ★</label>
                    <input type="number" value={form.prix||""} onChange={e => setForm(p => ({ ...p, prix: e.target.value }))}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `2px solid ${form.prix ? COLORS.primary : COLORS.accent}`, fontSize: 15, fontWeight: 700, boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Stock actuel</label>
                    <input type="number" value={form.stock||0} onChange={e => setForm(p => ({ ...p, stock: e.target.value }))}
                      style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 15, boxSizing: "border-box" }} />
                  </div>
                </div>
                {form.prixAchat && form.prix && Number(form.prix) > 0 && (
                  <div style={{ marginTop: 12, background: COLORS.greenPale, borderRadius: 8, padding: "8px 14px", fontSize: 13 }}>
                    Marge : <strong style={{ color: COLORS.primary }}>{(((Number(form.prix)-Number(form.prixAchat))/Number(form.prix))*100).toFixed(1)}%</strong>
                    &nbsp;— Bénéfice unitaire : <strong style={{ color: COLORS.primary }}>{(Number(form.prix)-Number(form.prixAchat)).toLocaleString("fr-FR",{minimumFractionDigits:2})} €</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Autres modules simplifiés (réutilisent le même pattern)
const makeSimpleModule = (key, title, icon, headers, rowFn, formFields, defaultForm, selects = {}) => {
  return function Module({ data, setData }) {
    const [form, setForm] = useState(null);
    const save = () => {
      const newItem = { ...form, id: form.id || `${key.toUpperCase()}-${Date.now()}` };
      setData(d => ({ ...d, [key]: form.id ? d[key].map(x => x.id === form.id ? newItem : x) : [...d[key], newItem] }));
      setForm(null);
    };
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ color: COLORS.dark }}>{icon} {title}</h2>
          <button onClick={() => setForm({ ...defaultForm })} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>+ Nouveau</button>
        </div>
        <Card>
          <TableComp headers={headers} rows={data[key].map(item => rowFn(item, () => setForm(item)))} />
        </Card>
        {form && (
          <ModalForm
            title={form.id ? `Modifier` : `Nouveau`}
            fields={formFields}
            values={form}
            onChange={(f, v) => setForm(p => ({ ...p, [f]: v }))}
            onSave={save}
            onClose={() => setForm(null)}
            selects={selects}
          />
        )}
      </div>
    );
  };
};

const Clients = ({ data, setData }) => {
  const [form, setForm] = useState(null);
  const [search, setSearch] = useState("");
  const [ficheClient, setFicheClient] = useState(null);
  const [formMachine, setFormMachine] = useState(null);

  const filtered = data.clients.filter(c =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact || "").toLowerCase().includes(search.toLowerCase())
  );

  const save = () => {
    const isNew = !form.id;
    const newItem = { 
      ...form, 
      id: form.id || Date.now(),
      numeroClient: form.numeroClient || nextNum(data.clients, "CLI-")
    };
    setData(d => ({ ...d, clients: isNew ? [...d.clients, newItem] : d.clients.map(x => x.id === form.id ? newItem : x) }));
    setForm(null);
  };

  const [machineDetail, setMachineDetail] = useState(null);
  const [docEditor, setDocEditor] = useState(null);

  const saveMachine = () => {
    const m = { ...formMachine, id: formMachine.id || `M-${Date.now()}`, client: ficheClient.nom };
    setData(d => ({ ...d, parc: formMachine.id ? d.parc.map(x => x.id === m.id ? m : x) : [...d.parc, m] }));
    setFormMachine(null);
  };

  const saveDocument = (doc) => {
    setData(d => ({ ...d, documents: doc.id && (d.documents||[]).find(x=>x.id===doc.id) ? (d.documents||[]).map(x=>x.id===doc.id?doc:x) : [...(d.documents||[]), doc] }));
    setDocEditor(null);
  };

  const saveControle = (machineId, controle) => {
    setData(d => ({
      ...d, parc: d.parc.map(m => {
        if (m.id !== machineId) return m;
        const controles = [...(m.controles || [])];
        const idx = controles.findIndex(c => c.id === controle.id);
        if (idx >= 0) controles[idx] = controle;
        else controles.push({ ...controle, id: `C-${Date.now()}` });
        return { ...m, controles };
      })
    }));
  };

  const deleteControle = (machineId, controleId) => {
    setData(d => ({
      ...d, parc: d.parc.map(m => m.id !== machineId ? m : { ...m, controles: (m.controles || []).filter(c => c.id !== controleId) })
    }));
  };

  const TYPES_MACHINE = data.parametres?.typesMachine || ["Pelle", "Chariot frontal élec", "Autre"];
  const MARQUES = data.parametres?.marques || ["Caterpillar", "Toyota", "Autre"];
  const TYPES_CONTROLE = data.parametres?.typesControle || ["VGP", "Contrôle technique", "Révision", "Autre"];

  const joursRestants = (dateStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split("/");
    if (parts.length !== 3) return null;
    const date = new Date(parts[2], parts[1]-1, parts[0]);
    const diff = Math.round((date - new Date()) / 86400000);
    return diff;
  };

  if (machineDetail) {
    const machine = data.parc.find(m => m.id === machineDetail);
    const [tabMachine, setTabMachine] = useState("infos");
    const [formControle, setFormControle] = useState(null);
    const controles = machine?.controles || [];
    const alertes = controles.filter(c => { const j = joursRestants(c.prochaine); return j !== null && j <= 30; });

    return (
      <div>
        <button onClick={() => setMachineDetail(null)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", marginBottom: 16, fontSize: 14 }}>← Retour</button>

        {alertes.length > 0 && (
          <div style={{ background: "#fff3e0", border: "2px solid #f39c12", borderRadius: 12, padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: "#e65100", marginBottom: 6 }}>⚠️ {alertes.length} contrôle(s) à échéance proche !</div>
            {alertes.map((a, i) => {
              const j = joursRestants(a.prochaine);
              return <div key={i} style={{ fontSize: 14, color: "#e65100" }}>{a.type} — {j < 0 ? `Expiré depuis ${Math.abs(j)} jours` : `Dans ${j} jours`} ({a.prochaine})</div>;
            })}
          </div>
        )}

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <h2 style={{ margin: "0 0 4px", color: COLORS.dark }}>{machine?.marque} {machine?.modele}</h2>
              <div style={{ fontSize: 14, color: COLORS.gray }}>{machine?.type} — {machine?.client}</div>
            </div>
            <Badge statut={machine?.statut} />
          </div>
          <div style={{ display: "flex", gap: 8, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 16 }}>
            {[["infos", "📋 Infos"], ["controles", `🔍 Contrôles (${controles.length})`]].map(([id, label]) => (
              <button key={id} onClick={() => setTabMachine(id)}
                style={{ padding: "8px 16px", border: "none", background: "none", cursor: "pointer", fontWeight: tabMachine === id ? 700 : 400, borderBottom: tabMachine === id ? `3px solid ${COLORS.primary}` : "3px solid transparent", color: tabMachine === id ? COLORS.primary : COLORS.gray, fontSize: 14 }}>
                {label}
              </button>
            ))}
          </div>

          {tabMachine === "infos" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {[["Type", machine?.type], ["Marque", machine?.marque], ["Modèle", machine?.modele], ["N° série", machine?.numeroSerie || "—"], ["Année", machine?.annee || "—"], ["Heures", machine?.heures ? machine.heures + " h" : "—"], ["Immatriculation", machine?.immat || "—"], ["N° client", machine?.numeroClient || "—"], ["Client", machine?.client]].map(([l, v]) => (
                <div key={l} style={{ background: COLORS.light, borderRadius: 8, padding: "10px 14px" }}>
                  <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 2 }}>{l}</div>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{v}</div>
                </div>
              ))}
              <button onClick={() => setFormMachine(machine)} style={{ gridColumn: "1/-1", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "10px", cursor: "pointer", fontWeight: 600 }}>✏️ Modifier la machine</button>
            </div>
          )}

          {tabMachine === "controles" && (
            <div>
              <button onClick={() => setFormControle({ type: "VGP", derniere: "", prochaine: "", resultat: "Conforme", organisme: "", observations: "" })}
                style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, marginBottom: 16 }}>
                + Ajouter un contrôle
              </button>
              {controles.length === 0 && <div style={{ color: COLORS.gray, textAlign: "center", padding: 24 }}>Aucun contrôle enregistré</div>}
              {controles.map((c, i) => {
                const j = joursRestants(c.prochaine);
                const alertColor = j !== null && j < 0 ? COLORS.danger : j !== null && j <= 30 ? "#f39c12" : COLORS.green;
                return (
                  <div key={i} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 16, marginBottom: 12, borderLeft: `4px solid ${alertColor}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{c.type}</div>
                        <div style={{ fontSize: 13, color: COLORS.gray, marginTop: 4 }}>
                          Dernière visite : <strong>{c.derniere || "—"}</strong> | Prochaine : <strong>{c.prochaine || "—"}</strong>
                          {j !== null && <span style={{ marginLeft: 8, color: alertColor, fontWeight: 700 }}>({j < 0 ? `Expiré !` : `J-${j}`})</span>}
                        </div>
                        {c.organisme && <div style={{ fontSize: 13, color: COLORS.gray }}>Organisme : {c.organisme}</div>}
                        {c.observations && <div style={{ fontSize: 13, color: COLORS.gray, marginTop: 4 }}>{c.observations}</div>}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <span style={{ background: c.resultat === "Conforme" ? COLORS.greenPale : "#fce4ec", color: c.resultat === "Conforme" ? COLORS.primary : COLORS.danger, padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{c.resultat}</span>
                        <button onClick={() => setFormControle(c)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>
                        <button onClick={() => deleteControle(machine.id, c.id)} style={{ background: "#fce4ec", border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, color: COLORS.danger }}>🗑</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {formControle && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <Card style={{ width: 460, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
              <h3 style={{ marginBottom: 16 }}>{formControle.id ? "Modifier" : "Nouveau"} contrôle</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Type de contrôle</label>
                <select value={formControle.type} onChange={e => setFormControle(p => ({ ...p, type: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                  {TYPES_CONTROLE.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              {[["derniere", "Date dernière visite (jj/mm/aaaa)"], ["prochaine", "Date prochaine visite (jj/mm/aaaa)"], ["organisme", "Organisme de contrôle"], ["observations", "Observations"]].map(([f, l]) => (
                <div key={f} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>{l}</label>
                  <input value={formControle[f] || ""} onChange={e => setFormControle(p => ({ ...p, [f]: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Résultat</label>
                <select value={formControle.resultat} onChange={e => setFormControle(p => ({ ...p, resultat: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                  <option>Conforme</option><option>Non conforme</option><option>Avec réserves</option><option>En attente</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setFormControle(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", cursor: "pointer" }}>Annuler</button>
                <button onClick={() => { saveControle(machine.id, formControle); setFormControle(null); }}
                  style={{ padding: "8px 16px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>Enregistrer</button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  const handleSelectEntreprise = (s) => {
    setForm(f => ({
      ...f,
      nom: s.nom,
      ville: s.ville,
      adresse: s.adresse + " " + s.codePostal + " " + s.ville,
      siret: s.siret,
      siren: s.siren,
      contact: s.dirigeant || f?.contact || "",
      naf: s.naf,
    }));
  };

  if (ficheClient) {
    const c = data.clients.find(x => x.id === ficheClient.id) || ficheClient;
    const machines = data.parc.filter(m => m.client === c.nom);
    const savs = data.sav.filter(s => s.client === c.nom);
    return (
      <div>
        <button onClick={() => setFicheClient(null)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", marginBottom: 20, fontSize: 14 }}>← Retour</button>
        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ margin: "0 0 4px", color: COLORS.dark }}>{c.nom}</h2>
              <Badge statut={c.type} />
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 14 }}>
                {c.contact && <div>👤 {c.contact}</div>}
                {c.email && <div>✉️ <a href={`mailto:${c.email}`} style={{ color: COLORS.info }}>{c.email}</a></div>}
                {c.tel && <div>📞 {c.tel}</div>}
                {c.ville && <div>📍 {c.adresse || c.ville}</div>}
                {c.siret && <div style={{ color: COLORS.gray, fontSize: 12 }}>SIRET: {c.siret}</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setDocEditor({ type: "devis", id: `D-${Date.now()}`, date: new Date().toLocaleDateString("fr-FR"), statut: "Brouillon", clientNom: c.nom, clientAdresse: c.adresse||c.ville||"", clientSiret: c.siret||"", machine: "", titre: "", texteIntro: "", lignes: [], notes: "", conditions: "" })}
                style={{ background: COLORS.accent, color: COLORS.dark, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>+ Devis</button>
              <button onClick={() => setDocEditor({ type: "or", id: `OR-${Date.now()}`, date: new Date().toLocaleDateString("fr-FR"), statut: "Brouillon", clientNom: c.nom, clientAdresse: c.adresse||c.ville||"", clientSiret: c.siret||"", machine: "", titre: "", texteIntro: "", lignes: [], notes: "", conditions: "" })}
                style={{ background: COLORS.info, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>+ OR</button>
              <button onClick={() => setForm(c)} style={{ padding: "8px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, cursor: "pointer" }}>✏️</button>
            </div>
          </div>
        </Card>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ color: COLORS.dark, margin: 0 }}>🏗️ Parc matériel ({machines.length})</h3>
          <button onClick={() => setFormMachine({ designation: "", type: "", statut: "Disponible", immat: "", dateEntree: new Date().toLocaleDateString("fr-FR") })}
            style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
            + Ajouter machine
          </button>
        </div>
        {machines.length === 0
          ? <Card style={{ marginBottom: 16, textAlign: "center", color: COLORS.gray, padding: 24 }}>Aucune machine pour ce client</Card>
          : <Card style={{ marginBottom: 16 }}>
            <TableComp
              headers={["Marque/Modèle", "Type", "N° série", "Heures", "Immat.", "Statut", ""]}
              rows={machines.map(m => {
                const alertes = (m.controles || []).filter(ct => { const j = joursRestants(ct.prochaine); return j !== null && j <= 30; });
                return [
                  <div>
                    <div style={{ fontWeight: 700 }}>{m.marque} {m.modele}</div>
                    {alertes.length > 0 && <span style={{ fontSize: 11, color: "#f39c12", fontWeight: 700 }}>⚠️ {alertes.length} contrôle(s)</span>}
                  </div>,
                  m.type, m.numeroSerie || "—",
                  m.heures ? m.heures + " h" : "—",
                  m.immat || "—",
                  <Badge statut={m.statut} />,
                  <div style={{ display: "flex", gap: 5 }}>
                    <button onClick={() => setMachineDetail(m.id)} style={{ background: COLORS.greenPale, border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, color: COLORS.primary }}>🔍</button>
                    <button onClick={() => setFormMachine(m)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>
                  </div>
                ];
              })}
            />
          </Card>
        }
        <h3 style={{ color: COLORS.dark, marginBottom: 12 }}>🔧 Historique SAV ({savs.length})</h3>
        {savs.length === 0
          ? <Card style={{ textAlign: "center", color: COLORS.gray, padding: 24 }}>Aucun SAV pour ce client</Card>
          : <Card style={{ marginBottom: 16 }}>
            <TableComp
              headers={["N° SAV", "Machine", "Date", "Type", "Statut"]}
              rows={savs.map(s => [<strong>{s.id}</strong>, s.machine, s.date, s.type, <Badge statut={s.statut} />])}
            />
          </Card>
        }

        {(() => {
          const docsClient = (data.documents || []).filter(d => d.clientNom === c.nom);
          const typeLabel = (t) => t === "devis" ? "📄 Devis" : t === "facture" ? "💶 Facture" : t === "or" ? "🔧 OR" : "📦 BL";
          const totalDoc = (doc) => (doc.lignes||[]).reduce((s,l) => s + (Number(l.qte)*Number(l.prixUnit))*(1-(Number(l.remise)||0)/100), 0);
          return (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ color: COLORS.dark, margin: 0 }}>📂 Documents ({docsClient.length})</h3>
              </div>
              {docsClient.length === 0
                ? <Card style={{ textAlign: "center", color: COLORS.gray, padding: 24 }}>Aucun document pour ce client</Card>
                : <Card>
                  <TableComp
                    headers={["Type", "N°", "Date", "Titre", "Machine", "Total HT", "Statut", ""]}
                    rows={docsClient.map(doc => [
                      typeLabel(doc.type),
                      <strong>{doc.id}</strong>,
                      doc.date,
                      doc.titre || "—",
                      doc.machine || "—",
                      <strong>{totalDoc(doc).toLocaleString("fr-FR", {minimumFractionDigits:2})} €</strong>,
                      <span style={{ background: doc.statut==="Accepté"||doc.statut==="Payée" ? COLORS.greenPale : doc.statut==="Refusé" ? COLORS.dangerLight : "#fff8e1", color: doc.statut==="Accepté"||doc.statut==="Payée" ? COLORS.primary : doc.statut==="Refusé" ? COLORS.danger : "#f57f17", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{doc.statut}</span>,
                      <button onClick={() => setDocEditor(doc)} style={{ background: COLORS.greenPale, border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, color: COLORS.primary }}>✏️ Ouvrir</button>
                    ])}
                  />
                </Card>
              }
            </div>
          );
        })()}
        {docEditor && <DocumentEditor doc={docEditor} data={data} onSave={saveDocument} onClose={() => setDocEditor(null)} onUpdateStock={(pieceId, delta) => setData(d => ({ ...d, pieces: (d.pieces||[]).map(p => p.id===pieceId ? {...p, stock: Math.max(0,(p.stock||0)+delta)} : p) }))} />}

        {formMachine && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
            <Card style={{ width: 440, maxWidth: "95vw" }}>
              <h3 style={{ marginBottom: 16 }}>{formMachine.id ? "Modifier" : "Nouvelle"} machine</h3>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Type de machine</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={formMachine.type || ""} onChange={e => setFormMachine(p => ({ ...p, type: e.target.value }))}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                    <option value="">-- Choisir --</option>
                    {TYPES_MACHINE.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <button onClick={() => {
                    const val = prompt("Nouveau type de machine :");
                    if (val && val.trim()) {
                      const newList = [...TYPES_MACHINE, val.trim()];
                      setData(d => ({ ...d, parametres: { ...d.parametres, typesMachine: newList } }));
                      setFormMachine(p => ({ ...p, type: val.trim() }));
                    }
                  }} style={{ background: COLORS.accent, border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13, color: COLORS.dark, whiteSpace: "nowrap" }}>+ Nouveau</button>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Marque</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={formMachine.marque || ""} onChange={e => setFormMachine(p => ({ ...p, marque: e.target.value }))}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                    <option value="">-- Choisir --</option>
                    {MARQUES.map(m => <option key={m}>{m}</option>)}
                  </select>
                  <button onClick={() => {
                    const val = prompt("Nouvelle marque :");
                    if (val && val.trim()) {
                      const newList = [...MARQUES, val.trim()];
                      setData(d => ({ ...d, parametres: { ...d.parametres, marques: newList } }));
                      setFormMachine(p => ({ ...p, marque: val.trim() }));
                    }
                  }} style={{ background: COLORS.accent, border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13, color: COLORS.dark, whiteSpace: "nowrap" }}>+ Nouveau</button>
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Modèle</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={formMachine.modele || ""} onChange={e => setFormMachine(p => ({ ...p, modele: e.target.value }))}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                    <option value="">-- Choisir ou créer --</option>
                    {(data.parametres?.modeles || []).map(m => <option key={m}>{m}</option>)}
                  </select>
                  <button onClick={() => {
                    const val = prompt("Nouveau modèle :");
                    if (val && val.trim()) {
                      const newList = [...(data.parametres?.modeles || []), val.trim()];
                      setData(d => ({ ...d, parametres: { ...d.parametres, modeles: newList } }));
                      setFormMachine(p => ({ ...p, modele: val.trim() }));
                    }
                  }} style={{ background: COLORS.accent, border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13, color: COLORS.dark, whiteSpace: "nowrap" }}>+ Nouveau</button>
                </div>
              </div>
              {[["numeroSerie", "N° de série"], ["annee", "Année"], ["heures", "Heures compteur"], ["immat", "Immatriculation"], ["numeroClient", "N° client"], ["dateEntree", "Date entrée"]].map(([f, l]) => (
                <div key={f} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>{l}</label>
                  <input value={formMachine[f] || ""} onChange={e => setFormMachine(p => ({ ...p, [f]: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Statut</label>
                <select value={formMachine.statut || "Disponible"} onChange={e => setFormMachine(p => ({ ...p, statut: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                  <option>Disponible</option><option>En location</option><option>En réparation</option><option>Vendu</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button onClick={() => setFormMachine(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", cursor: "pointer" }}>Annuler</button>
                <button onClick={saveMachine} style={{ padding: "8px 16px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>Enregistrer</button>
              </div>
            </Card>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: COLORS.dark }}>👥 Clients & Fournisseurs</h2>
        <button onClick={() => setForm({ nom: "", contact: "", email: "", tel: "", ville: "", adresse: "", siret: "", siren: "", type: "Client" })}
          style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
          + Nouveau
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher..."
        style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, marginBottom: 16, fontSize: 14, boxSizing: "border-box" }} />

      <Card>
        <TableComp
          headers={["Société", "Contact", "Email", "Tél", "Ville", "SIRET", "Type", ""]}
          rows={filtered.map(c => [
            <strong>{c.nom}</strong>,
            c.contact,
            <a href={`mailto:${c.email}`} style={{ color: COLORS.info }}>{c.email}</a>,
            c.tel, c.ville,
            <span style={{ fontSize: 12, color: COLORS.gray }}>{c.siret || "—"}</span>,
            <Badge statut={c.type} />,
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setFicheClient(c)} style={{ background: COLORS.greenPale, border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, color: COLORS.primary }}>🔍</button>
              <button onClick={() => setForm(c)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>
            </div>
          ])}
        />
      </Card>

      {form && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <Card style={{ width: 480, maxWidth: "95vw", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: 16 }}>{form.id ? "Modifier" : "Nouveau"} client</h3>

            {!form.id && (
              <RechercheEntreprise onSelect={handleSelectEntreprise} />
            )}

            {form.nom && (
              <div style={{ background: COLORS.greenPale, borderRadius: 10, padding: "10px 14px", marginBottom: 14, fontSize: 13 }}>
                ✅ <strong>{form.nom}</strong>
                {form.siret && <span style={{ color: COLORS.gray, marginLeft: 8 }}>SIRET: {form.siret}</span>}
              </div>
            )}

            {[["nom", "Raison sociale"], ["contact", "Contact"], ["email", "Email"], ["tel", "Téléphone"], ["adresse", "Adresse"], ["ville", "Ville"]].map(([f, l]) => (
              <div key={f} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>{l}</label>
                <input value={form[f] || ""} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
              </div>
            ))}

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                <option>Client</option><option>Fournisseur</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setForm(null)} style={{ padding: "8px 16px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: "#fff", cursor: "pointer" }}>Annuler</button>
              <button onClick={save} style={{ padding: "8px 16px", borderRadius: 8, background: COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontWeight: 600 }}>Enregistrer</button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const Devis = ({ data, setData }) => {
  const [docEditor, setDocEditor] = useState(null);
  const [search, setSearch] = useState("");

  const updateStock = (pieceId, delta) => {
    setData(d => ({ ...d, pieces: (d.pieces||[]).map(p => p.id === pieceId ? { ...p, stock: Math.max(0, (p.stock||0) + delta) } : p) }));
  };

  const saveDocument = (doc) => {
    setData(d => ({ ...d, documents: doc.id && (d.documents||[]).find(x=>x.id===doc.id) ? (d.documents||[]).map(x=>x.id===doc.id?doc:x) : [...(d.documents||[]), doc] }));
    setDocEditor(null);
  };

  const devis = (data.documents || []).filter(d => d.type === "devis");
  const filtered = devis.filter(d =>
    (d.clientNom||"").toLowerCase().includes(search.toLowerCase()) ||
    (d.titre||"").toLowerCase().includes(search.toLowerCase()) ||
    (d.id||"").toLowerCase().includes(search.toLowerCase())
  );

  const totalDoc = (doc) => (doc.lignes||[]).reduce((s,l) => s + (Number(l.qte)*Number(l.prixUnit))*(1-(Number(l.remise)||0)/100), 0);

  return (
    <div>
      {docEditor && <DocumentEditor doc={docEditor} data={data} onSave={saveDocument} onClose={() => setDocEditor(null)} onUpdateStock={updateStock} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: COLORS.dark }}>📄 Devis</h2>
        <button onClick={() => setDocEditor({ type: "devis", id: nextNum(data.documents?.filter(d=>d.type==="devis"), "D-"), date: new Date().toLocaleDateString("fr-FR"), statut: "Brouillon", clientNom: "", clientAdresse: "", clientSiret: "", machine: "", titre: "", texteIntro: "", lignes: [], notes: "", conditions: "" })}
          style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
          + Nouveau devis
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par client, titre, numéro..."
        style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, marginBottom: 16, fontSize: 14, boxSizing: "border-box" }} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        {[["Brouillon/Envoyé", ["Brouillon","Envoyé"], "#f39c12", "#fff8e1"], ["Accepté", ["Accepté"], COLORS.primary, COLORS.greenPale], ["Refusé", ["Refusé"], COLORS.danger, COLORS.dangerLight]].map(([l, statuts, c, bg]) => (
          <div key={l} style={{ background: bg, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: c }}>{devis.filter(d => statuts.includes(d.statut)).length}</div>
            <div style={{ fontSize: 13, color: c, fontWeight: 600 }}>{l}</div>
          </div>
        ))}
      </div>

      <Card>
        <TableComp
          headers={["N°", "Client", "Date", "Titre", "Lié à", "Total HT", "Statut", ""]}
          rows={filtered.map(doc => [
            <strong style={{ cursor: "pointer", color: COLORS.primary }} onClick={() => setDocEditor(doc)}>{doc.id}</strong>,
            doc.clientNom, doc.date,
            doc.titre || <span style={{ color: COLORS.gray }}>—</span>,
            doc.docOrigineId ? <span style={{ fontSize: 12, color: COLORS.info }}>🔗 {doc.docOrigineId}</span> : "—",
            <strong>{totalDoc(doc).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong>,
            <span style={{ background: doc.statut==="Accepté" ? COLORS.greenPale : doc.statut==="Refusé" ? COLORS.dangerLight : "#fff8e1", color: doc.statut==="Accepté" ? COLORS.primary : doc.statut==="Refusé" ? COLORS.danger : "#f57f17", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{doc.statut}</span>,
            <button onClick={() => setDocEditor(doc)} style={{ background: COLORS.greenPale, border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, color: COLORS.primary }}>✏️ Ouvrir</button>
          ])}
        />
        {filtered.length === 0 && <div style={{ textAlign: "center", color: COLORS.gray, padding: 32 }}>Aucun devis</div>}
      </Card>
    </div>
  );
};

const Factures = ({ data, setData }) => {
  const [docEditor, setDocEditor] = useState(null);
  const [search, setSearch] = useState("");

  const updateStock = (pieceId, delta) => {
    setData(d => ({ ...d, pieces: (d.pieces||[]).map(p => p.id === pieceId ? { ...p, stock: Math.max(0, (p.stock||0) + delta) } : p) }));
  };

  const saveDocument = (doc) => {
    setData(d => ({ ...d, documents: doc.id && (d.documents||[]).find(x=>x.id===doc.id) ? (d.documents||[]).map(x=>x.id===doc.id?doc:x) : [...(d.documents||[]), doc] }));
    setDocEditor(null);
  };

  const factures = (data.documents || []).filter(d => d.type === "facture");
  const filtered = factures.filter(d =>
    (d.clientNom||"").toLowerCase().includes(search.toLowerCase()) ||
    (d.id||"").toLowerCase().includes(search.toLowerCase())
  );

  const totalDoc = (doc) => (doc.lignes||[]).reduce((s,l) => s + (Number(l.qte)*Number(l.prixUnit))*(1-(Number(l.remise)||0)/100), 0);
  const totalFacture = factures.reduce((s,f) => s + totalDoc(f), 0);
  const totalPayees = factures.filter(f => f.statut === "Payée").reduce((s,f) => s + totalDoc(f), 0);

  return (
    <div>
      {docEditor && <DocumentEditor doc={docEditor} data={data} onSave={saveDocument} onClose={() => setDocEditor(null)} onUpdateStock={updateStock} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: COLORS.dark }}>💶 Factures</h2>
        <button onClick={() => setDocEditor({ type: "facture", id: nextNum(data.documents?.filter(d=>d.type==="facture"), "F-"), date: new Date().toLocaleDateString("fr-FR"), statut: "Brouillon", clientNom: "", clientAdresse: "", clientSiret: "", machine: "", titre: "", texteIntro: "", lignes: [], notes: "", conditions: "" })}
          style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
          + Nouvelle facture
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total facturé" value={totalFacture.toLocaleString("fr-FR", {minimumFractionDigits:2}) + " €"} icon="📊" color={COLORS.primary} />
        <StatCard label="Encaissé" value={totalPayees.toLocaleString("fr-FR", {minimumFractionDigits:2}) + " €"} icon="✅" color="#27ae60" />
        <StatCard label="À encaisser" value={(totalFacture-totalPayees).toLocaleString("fr-FR", {minimumFractionDigits:2}) + " €"} icon="⏳" color="#f39c12" />
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par client, numéro..."
        style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, marginBottom: 16, fontSize: 14, boxSizing: "border-box" }} />

      <Card>
        <TableComp
          headers={["N°", "Client", "Date", "Titre", "Total HT", "Total TTC", "Statut", ""]}
          rows={filtered.map(doc => [
            <strong style={{ cursor: "pointer", color: COLORS.primary }} onClick={() => setDocEditor(doc)}>{doc.id}</strong>,
            doc.clientNom, doc.date,
            doc.titre || <span style={{ color: COLORS.gray }}>—</span>,
            <span>{totalDoc(doc).toLocaleString("fr-FR", {minimumFractionDigits:2})} €</span>,
            <strong>{(totalDoc(doc)*1.2).toLocaleString("fr-FR", {minimumFractionDigits:2})} €</strong>,
            <span style={{ background: doc.statut==="Payée" ? COLORS.greenPale : doc.statut==="Refusé" ? COLORS.dangerLight : "#fff8e1", color: doc.statut==="Payée" ? COLORS.primary : doc.statut==="Refusé" ? COLORS.danger : "#f57f17", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{doc.statut}</span>,
            <button onClick={() => setDocEditor(doc)} style={{ background: COLORS.greenPale, border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, color: COLORS.primary }}>✏️ Ouvrir</button>
          ])}
        />
        {filtered.length === 0 && <div style={{ textAlign: "center", color: COLORS.gray, padding: 32 }}>Aucune facture</div>}
      </Card>
    </div>
  );
};

const Parc = makeSimpleModule("parc", "Parc matériel", "🏗️",
  ["ID", "Désignation", "Type", "Immat.", "Statut", "Client", ""],
  (m, edit) => [m.id, <strong>{m.designation}</strong>, m.type, m.immat || "—", <Badge statut={m.statut} />, m.client || "—", <button onClick={edit} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>],
  [["designation", "Désignation"], ["type", "Type"], ["immat", "Immatriculation"], ["dateEntree", "Date entrée"], ["client", "Client affecté"]],
  { designation: "", type: "", statut: "Disponible", client: "", dateEntree: "", immat: "" },
  { statut: ["Disponible", "En location", "En réparation", "Vendu"] }
);

const SAV = makeSimpleModule("sav", "SAV & Interventions", "🔧",
  ["N° SAV", "Machine", "Client", "Date", "Type", "Technicien", "Statut", ""],
  (s, edit) => [<strong>{s.id}</strong>, s.machine, s.client, s.date, s.type, s.technicien, <Badge statut={s.statut} />, <button onClick={edit} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>],
  [["machine", "Machine"], ["client", "Client"], ["date", "Date"], ["technicien", "Technicien"], ["description", "Description"]],
  { machine: "", client: "", date: new Date().toLocaleDateString("fr-FR"), type: "Réparation", statut: "En cours", description: "", technicien: "" },
  { type: ["Réparation", "Entretien", "Diagnostic", "Livraison"], statut: ["En cours", "Terminé", "En attente pièces"] }
);

const Locations = ({ data, setData }) => {
  const [locEditor, setLocEditor] = useState(null);
  const locations = data.locations || [];

  const saveLoc = (loc) => {
    setData(d => ({ ...d, locations: loc.id && (d.locations||[]).find(x=>x.id===loc.id) ? (d.locations||[]).map(x=>x.id===loc.id?loc:x) : [...(d.locations||[]), loc] }));
    setLocEditor(null);
  };

  const joursLoc = (l) => {
    try {
      const d1 = new Date(l.debut.split("/").reverse().join("-"));
      const d2 = new Date(l.fin.split("/").reverse().join("-"));
      const j = Math.max(1, Math.round((d2 - d1) / 86400000));
      return isNaN(j) ? 0 : j;
    } catch { return 0; }
  };

  const totalLoc = (l) => {
    const lignes = l.lignes || [];
    if (lignes.length > 0) return lignes.reduce((s,ln) => s + (Number(ln.qte)*Number(ln.prixUnit))*(1-(Number(ln.remise)||0)/100), 0);
    return joursLoc(l) * Number(l.prixJour || 0);
  };

  const [showNewMachine, setShowNewMachine] = useState(false);
  const [formMachineNew, setFormMachineNew] = useState({ designation:"", marque:"", modele:"", type:"", numeroSerie:"", annee:"", heures:"", immat:"", numeroClient:"", statut:"Disponible" });

  if (locEditor) {
    const loc = locEditor;
    const machinesClient = (data.parc||[]).filter(m => m.client === loc.clientNom);
    const selectedMachine = (data.parc||[]).find(m => m.designation === loc.machine);
    const jours = joursLoc(loc);
    const total = totalLoc(loc);

    const updateLigne = (i, f, v) => {
      const newL = [...(loc.lignes||[])];
      newL[i] = { ...newL[i], [f]: v };
      setLocEditor(p => ({ ...p, lignes: newL }));
    };
    const deleteLigne = (i) => setLocEditor(p => ({ ...p, lignes: (p.lignes||[]).filter((_,j)=>j!==i) }));
    const addLigne = (designation, prixUnit, qte=1) => setLocEditor(p => ({ ...p, lignes: [...(p.lignes||[]), { id: Date.now(), designation, qte, prixUnit, remise: 0 }] }));

    const generatePDFLoc = () => {
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
        *{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;font-size:13px;padding:40px}
        .header{display:flex;justify-content:space-between;margin-bottom:28px;padding-bottom:16px;border-bottom:3px solid #1a5c2e}
        h1{font-size:26px;font-weight:900;color:#1a5c2e}.sub{font-size:11px;color:#666;margin-top:2px}
        .coords{margin-top:8px;font-size:11px;line-height:1.6}.doc-type{font-size:20px;font-weight:900;color:#1a5c2e}
        .parties{display:flex;justify-content:space-between;margin-bottom:20px}
        .partie{background:#f4f9f5;border-left:4px solid #1a5c2e;padding:12px 14px;width:48%;border-radius:4px}
        .partie h3{font-size:11px;text-transform:uppercase;color:#6b7c6e;margin-bottom:6px}
        .info-box{background:#fff8e1;border:1px solid #f0a500;border-radius:6px;padding:10px 14px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;margin-bottom:16px}
        thead tr{background:#1a5c2e;color:white}thead th{padding:9px 12px;text-align:left;font-size:12px}
        tbody tr:nth-child(even){background:#f4f9f5}tbody td{padding:8px 12px;border-bottom:1px solid #d1e0d5}
        .total-box{display:flex;justify-content:flex-end}.totaux{width:260px}
        .t-line{display:flex;justify-content:space-between;padding:6px 10px;font-size:13px}
        .t-ttc{background:#1a5c2e;color:white;font-weight:900;font-size:15px;border-radius:6px;padding:10px 12px;margin-top:4px}
        .conditions{background:#f4f9f5;border-radius:6px;padding:14px;font-size:11px;line-height:1.8;white-space:pre-wrap;margin-top:16px}
        .footer{border-top:2px solid #d1e0d5;padding-top:12px;font-size:10px;color:#888;text-align:center;margin-top:20px}
        @media print{body{padding:20px}}
      </style></head><body>
      <div class="header">
        <div><h1>AMS</h1><div class="sub">Alliance Matériel Service</div>
        <div class="coords">224 Rue de Fongrave — 81800 Rabastens<br>Tél. : 06.25.24.81.44</div></div>
        <div style="text-align:right"><div class="doc-type">CONTRAT DE LOCATION</div>
        <div style="font-size:14px;font-weight:700;margin-top:4px">N° ${loc.id}</div>
        <div style="font-size:12px;color:#666">Date : ${loc.date}</div></div>
      </div>
      <div class="parties">
        <div class="partie"><h3>Loueur</h3><p><strong>Alliance Matériel Service</strong><br>224 Rue de Fongrave<br>81800 Rabastens</p></div>
        <div class="partie"><h3>Locataire</h3><p><strong>${loc.clientNom||"—"}</strong><br>${loc.clientAdresse||""}</p></div>
      </div>
      <div class="info-box">🏗️ <strong>Matériel :</strong> ${loc.machine||"—"} ${selectedMachine?.immat ? "— Immat. "+selectedMachine.immat : ""}<br>
      📅 <strong>Période :</strong> Du ${loc.debut} au ${loc.fin} (${jours} jour${jours>1?"s":""})<br>
      ${loc.caution ? "💶 <strong>Caution :</strong> "+Number(loc.caution).toLocaleString("fr-FR")+" €" : ""}</div>
      ${loc.titre ? `<div style="font-size:16px;font-weight:700;margin-bottom:8px">${loc.titre}</div>` : ""}
      ${loc.texteIntro ? `<div style="margin-bottom:16px;line-height:1.6">${loc.texteIntro}</div>` : ""}
      <table><thead><tr><th style="width:45%">Désignation</th><th>Qté</th><th>Prix HT</th><th>Remise</th><th style="text-align:right">Total HT</th></tr></thead>
      <tbody>${(loc.lignes||[]).map(l => `<tr><td>${l.designation}</td><td style="text-align:right">${l.qte}</td><td style="text-align:right">${Number(l.prixUnit).toLocaleString("fr-FR",{minimumFractionDigits:2})} €</td><td style="text-align:right">${l.remise?l.remise+"%":"—"}</td><td style="text-align:right"><strong>${((Number(l.qte)*Number(l.prixUnit))*(1-(Number(l.remise)||0)/100)).toLocaleString("fr-FR",{minimumFractionDigits:2})} €</strong></td></tr>`).join("")}</tbody></table>
      <div class="total-box"><div class="totaux">
        <div class="t-line" style="border-top:2px solid #d1e0d5"><span>Total HT</span><strong>${total.toLocaleString("fr-FR",{minimumFractionDigits:2})} €</strong></div>
        <div class="t-line"><span>TVA 20%</span><span>${(total*0.2).toLocaleString("fr-FR",{minimumFractionDigits:2})} €</span></div>
        <div class="t-line t-ttc"><span>TOTAL TTC</span><span>${(total*1.2).toLocaleString("fr-FR",{minimumFractionDigits:2})} €</span></div>
      </div></div>
      ${loc.conditions ? `<div class="conditions"><strong>Conditions générales de location :</strong>
${loc.conditions}</div>` : ""}
      ${loc.notes ? `<div class="conditions"><strong>Notes :</strong>
${loc.notes}</div>` : ""}
      <div class="footer">Alliance Matériel Service — 224 Rue de Fongrave 81800 Rabastens — Tél. 06.25.24.81.44</div>
      </body></html>`;
      const win = window.open("", "_blank");
      win.document.write(html);
      win.document.close();
      setTimeout(() => win.print(), 500);
    };

    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
        <div style={{ background: COLORS.white, borderRadius: 16, width: "95vw", maxWidth: 900, maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ background: COLORS.dark, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div>
              <div style={{ color: COLORS.accent, fontWeight: 800, fontSize: 16 }}>🚜 CONTRAT DE LOCATION — {loc.id}</div>
              <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{loc.clientNom || "Nouveau contrat"}</div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={generatePDFLoc} style={{ background: COLORS.accent, color: COLORS.dark, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>🖨️ PDF</button>
              <button onClick={() => saveLoc(loc)} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>💾 Enregistrer</button>
              <button onClick={() => setLocEditor(null)} style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontSize: 18 }}>✕</button>
            </div>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Client *</label>
                <select value={loc.clientNom||""} onChange={e => { const c = (data.clients||[]).find(x=>x.nom===e.target.value); setLocEditor(p => ({ ...p, clientNom: e.target.value, clientAdresse: c?.adresse||c?.ville||"", machine: "" })); }}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `2px solid ${COLORS.accent}`, fontSize: 14 }}>
                  <option value="">-- Choisir --</option>
                  {(data.clients||[]).map(c => <option key={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Machine *</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <select value={loc.machine||""} onChange={e => setLocEditor(p => ({ ...p, machine: e.target.value }))}
                    style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                    <option value="">-- Tout le parc --</option>
                    {machinesClient.length > 0 && <optgroup label={`Machines de ${loc.clientNom}`}>{machinesClient.map(m => <option key={m.id} value={m.designation}>{m.marque} {m.modele} — {m.type} {m.immat?"("+m.immat+")":""}</option>)}</optgroup>}
                    <optgroup label="Tout le parc AMS">
                      {(data.parc||[]).filter(m => !machinesClient.find(mc=>mc.id===m.id)).map(m => <option key={m.id} value={m.designation}>{m.marque} {m.modele} — {m.type} {m.client?"("+m.client+")":""}</option>)}
                    </optgroup>
                    <option value="__saisie">Saisie libre...</option>
                  </select>
                  <button onClick={() => setShowNewMachine(true)}
                    style={{ background: COLORS.accent, border: "none", borderRadius: 8, padding: "8px 12px", cursor: "pointer", fontWeight: 700, fontSize: 13, color: COLORS.dark, whiteSpace: "nowrap" }}>+ Créer</button>
                </div>
                {loc.machine === "__saisie" && (
                  <input value={loc.machineSaisie||""} onChange={e => setLocEditor(p => ({ ...p, machineSaisie: e.target.value }))}
                    placeholder="Saisir le nom de la machine..." style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box", marginTop: 8 }} />
                )}
              </div>
              {/* Infos machine sélectionnée */}
              {selectedMachine && loc.machine && loc.machine !== "__saisie" && (
                <div style={{ gridColumn: "1/-1", background: "#fff8e1", border: `1px solid ${COLORS.accent}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.dark, marginBottom: 8 }}>🏗️ {selectedMachine.marque} {selectedMachine.modele} — {selectedMachine.type}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))", gap: 8 }}>
                    {[["N° série", selectedMachine.numeroSerie], ["Immatriculation", selectedMachine.immat], ["Année", selectedMachine.annee], ["Heures", selectedMachine.heures ? selectedMachine.heures+" h" : null], ["N° client", selectedMachine.numeroClient], ["Client habituel", selectedMachine.client]].filter(([,v])=>v).map(([l,v]) => (
                      <div key={l} style={{ background: "rgba(255,255,255,0.7)", borderRadius: 8, padding: "6px 10px" }}>
                        <div style={{ fontSize: 11, color: COLORS.gray }}>{l}</div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Formulaire nouvelle machine */}
              {showNewMachine && (
                <div style={{ gridColumn: "1/-1", background: COLORS.greenPale, border: `2px solid ${COLORS.primary}`, borderRadius: 12, padding: 16 }}>
                  <div style={{ fontWeight: 700, color: COLORS.dark, marginBottom: 12, fontSize: 15 }}>➕ Nouvelle machine</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, color: COLORS.gray, display: "block", marginBottom: 3 }}>Type</label>
                      <select value={formMachineNew.type} onChange={e => setFormMachineNew(p=>({...p,type:e.target.value}))}
                        style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${COLORS.border}`, fontSize:13 }}>
                        <option value="">-- Choisir --</option>
                        {(data.parametres?.typesMachine||[]).map(t=><option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: COLORS.gray, display: "block", marginBottom: 3 }}>Marque</label>
                      <select value={formMachineNew.marque} onChange={e => setFormMachineNew(p=>({...p,marque:e.target.value}))}
                        style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${COLORS.border}`, fontSize:13 }}>
                        <option value="">-- Choisir --</option>
                        {(data.parametres?.marques||[]).map(m=><option key={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: COLORS.gray, display: "block", marginBottom: 3 }}>Modèle</label>
                      <select value={formMachineNew.modele} onChange={e => setFormMachineNew(p=>({...p,modele:e.target.value}))}
                        style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${COLORS.border}`, fontSize:13 }}>
                        <option value="">-- Choisir --</option>
                        {(data.parametres?.modeles||[]).map(m=><option key={m}>{m}</option>)}
                      </select>
                    </div>
                    {[["designation","Désignation *"],["numeroSerie","N° de série"],["annee","Année"],["heures","Heures"],["immat","Immatriculation"],["numeroClient","N° client"]].map(([f,l])=>(
                      <div key={f}>
                        <label style={{ fontSize:12, color:COLORS.gray, display:"block", marginBottom:3 }}>{l}</label>
                        <input value={formMachineNew[f]||""} onChange={e=>setFormMachineNew(p=>({...p,[f]:e.target.value}))}
                          style={{ width:"100%", padding:"7px 10px", borderRadius:8, border:`1px solid ${f==="designation"?COLORS.accent:COLORS.border}`, fontSize:13, boxSizing:"border-box" }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ display:"flex", gap:10, marginTop:14 }}>
                    <button onClick={()=>setShowNewMachine(false)} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${COLORS.border}`, background:"#fff", cursor:"pointer" }}>Annuler</button>
                    <button onClick={()=>{
                      if (!formMachineNew.designation) return alert("Désignation requise");
                      const newM = { ...formMachineNew, id:`M-${Date.now()}`, client:loc.clientNom||"", dateEntree:new Date().toLocaleDateString("fr-FR"), statut:"Disponible", controles:[] };
                      setData(d=>({...d, parc:[...(d.parc||[]),newM]}));
                      setLocEditor(p=>({...p, machine:newM.designation}));
                      setShowNewMachine(false);
                      setFormMachineNew({designation:"",marque:"",modele:"",type:"",numeroSerie:"",annee:"",heures:"",immat:"",numeroClient:"",statut:"Disponible"});
                    }} style={{ padding:"8px 20px", borderRadius:8, background:COLORS.primary, color:"#fff", border:"none", cursor:"pointer", fontWeight:700 }}>✅ Créer la machine</button>
                  </div>
                </div>
              )}
              {[["date","Date contrat"],["debut","Début location (jj/mm/aaaa)"],["fin","Fin location (jj/mm/aaaa)"],["caution","Caution (€)"],["titre","Titre / Objet"]].map(([f,l]) => (
                <div key={f}>
                  <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>{l}</label>
                  <input value={loc[f]||""} onChange={e => setLocEditor(p => ({ ...p, [f]: e.target.value }))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Statut</label>
                <select value={loc.statut||"En cours"} onChange={e => setLocEditor(p => ({ ...p, statut: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                  <option>En cours</option><option>Terminée</option><option>Annulée</option>
                </select>
              </div>
            </div>
            {jours > 0 && <div style={{ background: "#fff8e1", border: `1px solid ${COLORS.accent}`, borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 14 }}>📅 Durée : <strong>{jours} jour{jours>1?"s":""}</strong></div>}

            <h3 style={{ marginBottom: 12, color: COLORS.dark }}>Lignes de facturation</h3>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <button onClick={() => addLigne("Location journalière", 0, jours||1)} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Loyer</button>
              <button onClick={() => addLigne("Transport / Livraison", 0, 1)} style={{ background: "#e3f2fd", color: COLORS.info, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Transport</button>
              <button onClick={() => addLigne("Carburant", 0, 1)} style={{ background: "#fff8e1", color: "#f57f17", border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Carburant</button>
              <button onClick={() => addLigne("Assurance", 0, 1)} style={{ background: COLORS.greenPale, color: COLORS.primary, border: "none", borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Assurance</button>
              <button onClick={() => addLigne("", 0, 1)} style={{ background: COLORS.light, color: COLORS.gray, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ligne libre</button>
            </div>
            <div style={{ background: COLORS.light, borderRadius: 8, padding: "6px 12px", marginBottom: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 1fr 0.7fr 1fr auto", gap: 8, fontSize: 12, fontWeight: 700, color: COLORS.gray }}>
                <span>Désignation</span><span>Qté</span><span>Prix HT</span><span>Remise%</span><span style={{ textAlign:"right" }}>Total HT</span><span></span>
              </div>
            </div>
            {(loc.lignes||[]).map((l,i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 1fr 0.7fr 1fr auto", gap: 8, alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                <input value={l.designation} onChange={e => updateLigne(i,"designation",e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13 }} />
                <input type="number" value={l.qte} onChange={e => updateLigne(i,"qte",e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13 }} />
                <input type="number" value={l.prixUnit} onChange={e => updateLigne(i,"prixUnit",e.target.value)} style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13 }} />
                <input type="number" value={l.remise} onChange={e => updateLigne(i,"remise",e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13 }} />
                <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: COLORS.primary }}>
                  {((Number(l.qte)*Number(l.prixUnit))*(1-(Number(l.remise)||0)/100)).toLocaleString("fr-FR",{minimumFractionDigits:2})} €
                </div>
                <button onClick={() => deleteLigne(i)} style={{ background: COLORS.dangerLight, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: COLORS.danger, fontWeight: 700 }}>✕</button>
              </div>
            ))}
            {(loc.lignes||[]).length > 0 && (
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12, marginBottom: 20 }}>
                <div style={{ width: 260, background: COLORS.light, borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}><span>Total HT</span><strong>{total.toLocaleString("fr-FR",{minimumFractionDigits:2})} €</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: COLORS.gray }}><span>TVA 20%</span><span>{(total*0.2).toLocaleString("fr-FR",{minimumFractionDigits:2})} €</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between", background: COLORS.primary, color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 16, fontWeight: 800 }}><span>TTC</span><span>{(total*1.2).toLocaleString("fr-FR",{minimumFractionDigits:2})} €</span></div>
                </div>
              </div>
            )}

            <h3 style={{ marginBottom: 8, color: COLORS.dark }}>Conditions de location</h3>
            <textarea value={loc.conditions||(data.parametres?.conditionsLocation||"")} onChange={e => setLocEditor(p => ({ ...p, conditions: e.target.value }))}
              rows={8} style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", lineHeight: 1.6 }} />
            
            <h3 style={{ marginBottom: 8, marginTop: 16, color: COLORS.dark }}>Notes internes</h3>
            <textarea value={loc.notes||""} onChange={e => setLocEditor(p => ({ ...p, notes: e.target.value }))}
              rows={3} style={{ width: "100%", padding: 12, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 13, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: COLORS.dark }}>🚜 Locations</h2>
        <button onClick={() => setLocEditor({ id: nextNum(locations, "LOC-"), date: new Date().toLocaleDateString("fr-FR"), debut: "", fin: "", clientNom: "", clientAdresse: "", machine: "", caution: "", statut: "En cours", titre: "", texteIntro: "", lignes: [], conditions: data.parametres?.conditionsLocation || "", notes: "" })}
          style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>+ Nouveau contrat</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
        {[["En cours",COLORS.info,"#e3f2fd"],["Terminée",COLORS.primary,COLORS.greenPale],["Annulée",COLORS.danger,COLORS.dangerLight]].map(([s,c,bg]) => (
          <div key={s} style={{ background: bg, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: c }}>{locations.filter(l=>l.statut===s).length}</div>
            <div style={{ fontSize: 13, color: c, fontWeight: 600 }}>{s}</div>
          </div>
        ))}
      </div>
      <Card>
        <TableComp
          headers={["N°", "Client", "Machine", "Début", "Fin", "Jours", "Total HT", "Statut", ""]}
          rows={locations.map(l => [
            <strong style={{ cursor:"pointer", color:COLORS.primary }} onClick={() => setLocEditor(l)}>{l.id}</strong>,
            l.clientNom||l.client||"—", l.machine||"—", l.debut, l.fin,
            <span>{joursLoc(l)} j</span>,
            <strong>{totalLoc(l).toLocaleString("fr-FR",{minimumFractionDigits:2})} €</strong>,
            <Badge statut={l.statut} />,
            <button onClick={() => setLocEditor(l)} style={{ background:COLORS.greenPale, border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:12, color:COLORS.primary }}>✏️ Ouvrir</button>
          ])}
        />
        {locations.length === 0 && <div style={{ textAlign:"center", color:COLORS.gray, padding:32 }}>Aucune location</div>}
      </Card>
    </div>
  );
};

const Documents = ({ data, setData }) => {
  const [docEditor, setDocEditor] = useState(null);
  const [search, setSearch] = useState("");
  const docs = data.documents || [];

  const saveDocument = (doc) => {
    setData(d => ({ ...d, documents: doc.id && (d.documents||[]).find(x=>x.id===doc.id) ? (d.documents||[]).map(x=>x.id===doc.id?doc:x) : [...(d.documents||[]), doc] }));
    setDocEditor(null);
  };

  const updateStock = (pieceId, delta) => {
    setData(d => ({ ...d, pieces: (d.pieces||[]).map(p => p.id === pieceId ? { ...p, stock: Math.max(0, (p.stock||0) + delta) } : p) }));
  };

  const filtered = docs.filter(d =>
    (d.clientNom||"").toLowerCase().includes(search.toLowerCase()) ||
    (d.titre||"").toLowerCase().includes(search.toLowerCase()) ||
    (d.id||"").toLowerCase().includes(search.toLowerCase())
  );

  const typeLabel = (t) => t === "devis" ? "📄 Devis" : t === "facture" ? "💶 Facture" : t === "or" ? "🔧 OR" : "📦 BL";
  const totalDoc = (doc) => (doc.lignes||[]).reduce((s,l) => s + (Number(l.qte)*Number(l.prixUnit))*(1-(Number(l.remise)||0)/100), 0);

  return (
    <div>
      {docEditor && <DocumentEditor doc={docEditor} data={data} onSave={saveDocument} onClose={() => setDocEditor(null)} onUpdateStock={updateStock} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: COLORS.dark }}>📂 Documents</h2>
        <div style={{ display: "flex", gap: 10 }}>
          {["devis","facture","or","bl"].map(t => (
            <button key={t} onClick={() => setDocEditor({ type: t, id: `${t.toUpperCase()}-${Date.now()}`, date: new Date().toLocaleDateString("fr-FR"), statut: "Brouillon", clientNom: "", clientAdresse: "", clientSiret: "", machine: "", titre: "", texteIntro: "", lignes: [], notes: "", conditions: "" })}
              style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              + {typeLabel(t)}
            </button>
          ))}
        </div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par client, titre, numéro..."
        style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, marginBottom: 16, fontSize: 14, boxSizing: "border-box" }} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px,1fr))", gap: 12, marginBottom: 20 }}>
        {["devis","facture","or","bl"].map(t => (
          <div key={t} style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: COLORS.primary }}>{docs.filter(d=>d.type===t).length}</div>
            <div style={{ fontSize: 13, color: COLORS.gray }}>{typeLabel(t)}</div>
          </div>
        ))}
      </div>

      <div style={{ background: COLORS.white, borderRadius: 12, border: `1px solid ${COLORS.border}`, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: COLORS.light }}>
              {["Type", "N°", "Client", "Date", "Titre", "Total HT", "Statut", ""].map((h,i) => (
                <th key={i} style={{ padding: "10px 14px", textAlign: "left", color: COLORS.gray, fontWeight: 600, borderBottom: `2px solid ${COLORS.border}` }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: 32, color: COLORS.gray }}>Aucun document</td></tr>}
            {filtered.map((doc, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${COLORS.border}`, background: i%2===0?COLORS.white:COLORS.light }}>
                <td style={{ padding: "10px 14px" }}>{typeLabel(doc.type)}</td>
                <td style={{ padding: "10px 14px" }}><strong>{doc.id}</strong></td>
                <td style={{ padding: "10px 14px" }}>{doc.clientNom}</td>
                <td style={{ padding: "10px 14px" }}>{doc.date}</td>
                <td style={{ padding: "10px 14px" }}>{doc.titre || "—"}</td>
                <td style={{ padding: "10px 14px" }}><strong>{totalDoc(doc).toLocaleString("fr-FR", {minimumFractionDigits:2})} €</strong></td>
                <td style={{ padding: "10px 14px" }}>
                  <span style={{ background: doc.statut==="Accepté"||doc.statut==="Payée" ? COLORS.greenPale : doc.statut==="Refusé" ? COLORS.dangerLight : "#fff8e1", color: doc.statut==="Accepté"||doc.statut==="Payée" ? COLORS.primary : doc.statut==="Refusé" ? COLORS.danger : "#f57f17", padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{doc.statut}</span>
                </td>
                <td style={{ padding: "10px 14px" }}>
                  <button onClick={() => setDocEditor(doc)} style={{ background: COLORS.greenPale, border: "none", borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12, color: COLORS.primary, marginRight: 4 }}>✏️ Éditer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const OrdresReparation = ({ data, setData }) => {
  const [docEditor, setDocEditor] = useState(null);
  const [detailOR, setDetailOR] = useState(null);
  const [search, setSearch] = useState("");
  const updateStock = (pieceId, delta) => setData(d => ({ ...d, pieces: (d.pieces||[]).map(p => p.id===pieceId ? {...p, stock: Math.max(0,(p.stock||0)+delta)} : p) }));
  const saveDoc = (doc) => { setData(d => ({ ...d, documents: doc.id && (d.documents||[]).find(x=>x.id===doc.id) ? (d.documents||[]).map(x=>x.id===doc.id?doc:x) : [...(d.documents||[]), doc] })); setDocEditor(null); };

  const ordres = (data.documents||[]).filter(d => d.type === "or");

  const filtered = ordres.filter(o =>
    (o.client || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.machine || "").toLowerCase().includes(search.toLowerCase()) ||
    (o.id || "").toLowerCase().includes(search.toLowerCase())
  );

  const saveOR = () => {
    const newOR = { ...form, id: form.id || `OR-${Date.now()}`, statut: form.statut || "En attente", mo: form.mo || [], pieces: form.pieces || [], deplacements: form.deplacements || [], notes: form.notes || "" };
    setData(d => ({ ...d, ordres: form.id ? (d.ordres || []).map(x => x.id === form.id ? newOR : x) : [...(d.ordres || []), newOR] }));
    setForm(null);
  };

  const totalOR = (or) => {
    const mo = (or.mo || []).reduce((s, m) => s + (m.heures * m.taux), 0);
    const pieces = (or.pieces || []).reduce((s, p) => {
      const ref = (data.pieces || []).find(x => x.id === p.pieceId);
      return s + (ref ? ref.prix * p.qte : 0);
    }, 0);
    const dep = (or.deplacements || []).reduce((s, d) => s + (d.km * d.tauxKm), 0);
    return mo + pieces + dep;
  };

  if (detailOR) {
    const or = ordres.find(o => o.id === detailOR);
    const client = (data.clients || []).find(c => c.nom === or?.client);
    const machinesClient = (data.parc || []).filter(m => m.client === or?.client);
    const historiquesMachine = ordres.filter(o => o.machine === or?.machine && o.id !== or?.id);
    const [tabOR, setTabOR] = useState("infos");

    const saveField = (field, value) => {
      setData(d => ({ ...d, ordres: (d.ordres || []).map(o => o.id === detailOR ? { ...o, [field]: value } : o) }));
    };

    return (
      <div>
        <button onClick={() => setDetailOR(null)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "7px 14px", cursor: "pointer", marginBottom: 16, fontSize: 14 }}>← Retour</button>

        <Card style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: COLORS.gray }}>{or?.id}</div>
              <h2 style={{ margin: "4px 0", color: COLORS.dark }}>{or?.client}</h2>
              <div style={{ fontSize: 15, color: COLORS.secondary, fontWeight: 600 }}>{or?.machine}</div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <select value={or?.statut} onChange={e => saveField("statut", e.target.value)}
                style={{ padding: "6px 10px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, fontWeight: 600 }}>
                <option>En attente</option><option>En cours</option><option>Terminé</option>
              </select>
              <div style={{ fontSize: 18, fontWeight: 800, color: COLORS.primary }}>{totalOR(or).toLocaleString("fr-FR")} € HT</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, borderBottom: `2px solid ${COLORS.border}`, marginBottom: 16 }}>
            {[["infos", "📋 Infos"], ["mo", `🔧 MO (${(or?.mo||[]).length})`], ["pieces", `📦 Pièces (${(or?.pieces||[]).length})`], ["dep", `🚗 Dépl. (${(or?.deplacements||[]).length})`], ["historique", `📅 Historique (${historiquesMachine.length})`], ["recap", "💶 Récap"]].map(([id, label]) => (
              <button key={id} onClick={() => setTabOR(id)}
                style={{ padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontWeight: tabOR === id ? 700 : 400, borderBottom: tabOR === id ? `3px solid ${COLORS.primary}` : "3px solid transparent", color: tabOR === id ? COLORS.primary : COLORS.gray, fontSize: 13, whiteSpace: "nowrap" }}>
                {label}
              </button>
            ))}
          </div>

          {tabOR === "infos" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                {[["Client", or?.client], ["Date", or?.date], ["Technicien", or?.technicien], ["Priorité", or?.priorite]].map(([l, v]) => (
                  <div key={l} style={{ background: COLORS.light, borderRadius: 8, padding: "10px 14px" }}>
                    <div style={{ fontSize: 12, color: COLORS.gray }}>{l}</div>
                    <div style={{ fontWeight: 600 }}>{v || "—"}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 6 }}>Machine</label>
                <select value={or?.machine || ""} onChange={e => saveField("machine", e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                  <option value="">-- Choisir une machine --</option>
                  {machinesClient.map(m => <option key={m.id} value={m.designation}>{m.marque} {m.modele} — {m.designation}</option>)}
                  <option value="__autre">Autre machine</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 6 }}>Description / Travaux</label>
                <textarea value={or?.description || ""} onChange={e => saveField("description", e.target.value)}
                  style={{ width: "100%", minHeight: 80, padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 6 }}>Notes</label>
                <textarea value={or?.notes || ""} onChange={e => saveField("notes", e.target.value)}
                  style={{ width: "100%", minHeight: 60, padding: 10, borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
            </div>
          )}

          {tabOR === "mo" && (
            <div>
              <button onClick={() => {
                const desc = prompt("Description travaux:");
                const h = prompt("Heures:");
                const t = prompt("Taux horaire (€/h):", "65");
                if (desc && h) {
                  const newMo = [...(or.mo || []), { id: Date.now(), description: desc, heures: Number(h), taux: Number(t) || 65 }];
                  saveField("mo", newMo);
                }
              }} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, marginBottom: 16 }}>+ Ajouter MO</button>
              {(or?.mo || []).map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: COLORS.light, borderRadius: 10, marginBottom: 8 }}>
                  <div><div style={{ fontWeight: 600 }}>{m.description}</div><div style={{ fontSize: 13, color: COLORS.gray }}>{m.heures}h × {m.taux} €/h</div></div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <strong style={{ color: COLORS.primary }}>{(m.heures * m.taux).toLocaleString("fr-FR")} €</strong>
                    <button onClick={() => saveField("mo", (or.mo || []).filter((_, j) => j !== i))} style={{ background: "#fce4ec", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: COLORS.danger }}>✕</button>
                  </div>
                </div>
              ))}
              {(or?.mo || []).length === 0 && <div style={{ color: COLORS.gray, textAlign: "center", padding: 24 }}>Aucune MO saisie</div>}
            </div>
          )}

          {tabOR === "pieces" && (
            <div>
              <button onClick={() => {
                const piecesList = (data.pieces || []).map((p, i) => (i+1) + ". " + p.designation + " (" + p.prix + "e)").join(", ");


                const choix = prompt("Choisir une piece (numero): " + piecesList);

                if (!isNaN(idx) && data.pieces[idx]) {
                  const qte = prompt("Quantité:", "1");
                  const piece = data.pieces[idx];
                  const newPieces = [...(or.pieces || []), { id: Date.now(), pieceId: piece.id, designation: piece.designation, qte: Number(qte) || 1, prix: piece.prix }];
                  saveField("pieces", newPieces);
                }
              }} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, marginBottom: 16 }}>+ Ajouter pièce</button>
              {(or?.pieces || []).map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: COLORS.light, borderRadius: 10, marginBottom: 8 }}>
                  <div><div style={{ fontWeight: 600 }}>{p.designation}</div><div style={{ fontSize: 13, color: COLORS.gray }}>{p.qte} × {p.prix} €</div></div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <strong style={{ color: COLORS.primary }}>{(p.qte * p.prix).toLocaleString("fr-FR")} €</strong>
                    <button onClick={() => saveField("pieces", (or.pieces || []).filter((_, j) => j !== i))} style={{ background: "#fce4ec", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: COLORS.danger }}>✕</button>
                  </div>
                </div>
              ))}
              {(or?.pieces || []).length === 0 && <div style={{ color: COLORS.gray, textAlign: "center", padding: 24 }}>Aucune pièce saisie</div>}
            </div>
          )}

          {tabOR === "dep" && (
            <div>
              <button onClick={() => {
                const desc = prompt("Description déplacement:");
                const km = prompt("Kilomètres:");
                const taux = prompt("Taux km (€/km):", "0.65");
                if (desc && km) {
                  const newDep = [...(or.deplacements || []), { id: Date.now(), description: desc, km: Number(km), tauxKm: Number(taux) || 0.65 }];
                  saveField("deplacements", newDep);
                }
              }} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600, marginBottom: 16 }}>+ Ajouter déplacement</button>
              {(or?.deplacements || []).map((d, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: COLORS.light, borderRadius: 10, marginBottom: 8 }}>
                  <div><div style={{ fontWeight: 600 }}>{d.description}</div><div style={{ fontSize: 13, color: COLORS.gray }}>{d.km} km × {d.tauxKm} €/km</div></div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <strong style={{ color: COLORS.primary }}>{(d.km * d.tauxKm).toLocaleString("fr-FR")} €</strong>
                    <button onClick={() => saveField("deplacements", (or.deplacements || []).filter((_, j) => j !== i))} style={{ background: "#fce4ec", border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: COLORS.danger }}>✕</button>
                  </div>
                </div>
              ))}
              {(or?.deplacements || []).length === 0 && <div style={{ color: COLORS.gray, textAlign: "center", padding: 24 }}>Aucun déplacement saisi</div>}
            </div>
          )}

          {tabOR === "historique" && (
            <div>
              <div style={{ fontSize: 14, color: COLORS.gray, marginBottom: 16 }}>Interventions précédentes sur <strong>{or?.machine}</strong></div>
              {historiquesMachine.length === 0 && <div style={{ color: COLORS.gray, textAlign: "center", padding: 24 }}>Aucune intervention précédente</div>}
              {historiquesMachine.map((h, i) => (
                <div key={i} style={{ border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <strong>{h.id}</strong>
                    <div style={{ display: "flex", gap: 8 }}>
                      <span style={{ fontSize: 13, color: COLORS.gray }}>{h.date}</span>
                      <Badge statut={h.statut} />
                    </div>
                  </div>
                  <div style={{ fontSize: 14, color: COLORS.gray }}>{h.description}</div>
                  <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13, color: COLORS.gray }}>
                    <span>🔧 {(h.mo||[]).length} MO</span>
                    <span>📦 {(h.pieces||[]).length} pièce(s)</span>
                    <span style={{ color: COLORS.primary, fontWeight: 700 }}>{totalOR(h).toLocaleString("fr-FR")} €</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tabOR === "recap" && (
            <div>
              {[["🔧 Main d'œuvre", (or?.mo||[]).reduce((s,m)=>s+m.heures*m.taux,0)],
                ["📦 Pièces", (or?.pieces||[]).reduce((s,p)=>s+p.qte*p.prix,0)],
                ["🚗 Déplacements", (or?.deplacements||[]).reduce((s,d)=>s+d.km*d.tauxKm,0)]
              ].map(([l, v]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${COLORS.border}`, fontSize: 15 }}>
                  <span style={{ color: COLORS.gray }}>{l}</span>
                  <strong>{v.toLocaleString("fr-FR")} €</strong>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", fontSize: 18, borderBottom: `1px solid ${COLORS.border}` }}>
                <strong>Total HT</strong>
                <strong style={{ color: COLORS.primary }}>{totalOR(or).toLocaleString("fr-FR")} €</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 16px", background: COLORS.greenPale, borderRadius: 10, marginTop: 10, fontSize: 17 }}>
                <strong>Total TTC</strong>
                <strong style={{ color: COLORS.primary }}>{(totalOR(or) * 1.2).toLocaleString("fr-FR")} €</strong>
              </div>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const totalDoc = (doc) => (doc.lignes||[]).reduce((s,l) => s + (Number(l.qte)*Number(l.prixUnit))*(1-(Number(l.remise)||0)/100), 0);
  const filteredOR = ordres.filter(o =>
    (o.clientNom||"").toLowerCase().includes(search.toLowerCase()) ||
    (o.machine||"").toLowerCase().includes(search.toLowerCase()) ||
    (o.id||"").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      {docEditor && <DocumentEditor doc={docEditor} data={data} onSave={saveDoc} onClose={() => setDocEditor(null)} onUpdateStock={updateStock} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: COLORS.dark }}>🔧 Ordres de Réparation</h2>
        <button onClick={() => setDocEditor({ type: "or", id: nextNum((data.documents||[]).filter(d=>d.type==="or"), "OR-"), date: new Date().toLocaleDateString("fr-FR"), statut: "Brouillon", clientNom: "", clientAdresse: "", clientSiret: "", machine: "", titre: "", texteIntro: "", lignes: [], notes: "", conditions: "", technicien: "", priorite: "Normal" })}
          style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>
          + Nouvel OR
        </button>
      </div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par client, machine, n° OR..."
        style={{ width: "100%", padding: "9px 14px", borderRadius: 8, border: `1px solid ${COLORS.border}`, marginBottom: 16, fontSize: 14, boxSizing: "border-box" }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, marginBottom: 20 }}>
        {[["Brouillon","#fff8e1","#f57f17"],["En cours","#e3f2fd",COLORS.info],["Terminé",COLORS.greenPale,COLORS.primary]].map(([s,bg,c]) => (
          <div key={s} style={{ background: bg, borderRadius: 12, padding: "14px 16px", textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: c }}>{ordres.filter(o=>o.statut===s).length}</div>
            <div style={{ fontSize: 13, color: c, fontWeight: 600 }}>{s}</div>
          </div>
        ))}
      </div>
      <Card>
        <TableComp
          headers={["N° OR", "Client", "Machine", "Date", "Technicien", "Total HT", "Statut", ""]}
          rows={filteredOR.map(or => [
            <strong style={{ cursor:"pointer", color:COLORS.primary }} onClick={() => setDocEditor(or)}>{or.id}</strong>,
            or.clientNom||"—", or.machine||"—", or.date, or.technicien||"—",
            <strong>{totalDoc(or).toLocaleString("fr-FR",{minimumFractionDigits:2})} €</strong>,
            <span style={{ background: or.statut==="Terminé"?COLORS.greenPale:or.statut==="En cours"?"#e3f2fd":"#fff8e1", color: or.statut==="Terminé"?COLORS.primary:or.statut==="En cours"?COLORS.info:"#f57f17", padding:"2px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{or.statut}</span>,
            <button onClick={() => setDocEditor(or)} style={{ background:COLORS.greenPale, border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:12, color:COLORS.primary }}>✏️ Ouvrir</button>
          ])}
        />
        {filteredOR.length === 0 && <div style={{ textAlign:"center", color:COLORS.gray, padding:32 }}>Aucun OR</div>}
      </Card>
    </div>
  );
};

const BonsLivraison = ({ data, setData }) => {
  const [docEditor, setDocEditor] = useState(null);
  const docs = (data.documents || []).filter(d => d.type === "bl");
  const totalDoc = (doc) => (doc.lignes||[]).reduce((s,l) => s + (Number(l.qte)*Number(l.prixUnit))*(1-(Number(l.remise)||0)/100), 0);
  const updateStock = (pieceId, delta) => setData(d => ({ ...d, pieces: (d.pieces||[]).map(p => p.id===pieceId ? {...p, stock: Math.max(0,(p.stock||0)+delta)} : p) }));
  const saveDoc = (doc) => { setData(d => ({ ...d, documents: doc.id && (d.documents||[]).find(x=>x.id===doc.id) ? (d.documents||[]).map(x=>x.id===doc.id?doc:x) : [...(d.documents||[]), doc] })); setDocEditor(null); };
  return (
    <div>
      {docEditor && <DocumentEditor doc={docEditor} data={data} onSave={saveDoc} onClose={() => setDocEditor(null)} onUpdateStock={updateStock} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: COLORS.dark }}>📦 Bons de livraison</h2>
        <button onClick={() => setDocEditor({ type: "bl", id: nextNum(data.documents?.filter(d=>d.type==="bl"), "BL-"), date: new Date().toLocaleDateString("fr-FR"), statut: "Brouillon", clientNom: "", clientAdresse: "", clientSiret: "", machine: "", titre: "", texteIntro: "", lignes: [], notes: "", conditions: "" })}
          style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>+ Nouveau BL</button>
      </div>
      <Card>
        <TableComp
          headers={["N°", "Client", "Date", "Titre", "Machine", "Total HT", "Statut", ""]}
          rows={docs.map(doc => [
            <strong style={{ cursor:"pointer", color:COLORS.primary }} onClick={() => setDocEditor(doc)}>{doc.id}</strong>,
            doc.clientNom, doc.date, doc.titre || "—", doc.machine || "—",
            <strong>{totalDoc(doc).toLocaleString("fr-FR",{minimumFractionDigits:2})} €</strong>,
            <span style={{ background:"#e3f2fd", color:COLORS.info, padding:"2px 10px", borderRadius:20, fontSize:12, fontWeight:600 }}>{doc.statut}</span>,
            <button onClick={() => setDocEditor(doc)} style={{ background:COLORS.greenPale, border:"none", borderRadius:6, padding:"3px 10px", cursor:"pointer", fontSize:12, color:COLORS.primary }}>✏️ Ouvrir</button>
          ])}
        />
        {docs.length === 0 && <div style={{ textAlign:"center", color:COLORS.gray, padding:32 }}>Aucun bon de livraison</div>}
      </Card>
    </div>
  );
};

const MENU = [
  { id: "dashboard", label: "Tableau de bord", icon: "📊" },
  { id: "clients", label: "Clients", icon: "👥" },
  { id: "parc", label: "Parc matériel", icon: "🏗️" },
  { id: "ordres", label: "Ordres de réparation", icon: "🔧" },
  { id: "devis", label: "Devis", icon: "📄" },
  { id: "factures", label: "Factures", icon: "💶" },
  { id: "bl", label: "Bons de livraison", icon: "📦" },
  { id: "locations", label: "Locations", icon: "🚜" },
  { id: "pieces", label: "Pièces & Magasin", icon: "📦" },
  { id: "documents", label: "Tous les documents", icon: "📂" },
  { id: "parametres", label: "Paramètres", icon: "⚙️" },
];

const PAGES = { dashboard: Dashboard, clients: Clients, devis: Devis, factures: Factures, bl: BonsLivraison, parc: Parc, sav: SAV, locations: Locations, pieces: Pieces, documents: Documents, ordres: OrdresReparation, parametres: Parametres };

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState(initialData);
  const [synced, setSynced] = useState(false);
  const { user, userProfile, signOut } = useAuth();
  const Page = PAGES[page] || Dashboard;
  const nomAffiche = userProfile ? `${userProfile.prenom} ${userProfile.nom}` : user?.displayName || user?.email || "Utilisateur";
  const roleAffiche = userProfile?.role || "utilisateur";

  // Charger données depuis Firebase au démarrage
  useEffect(() => {
    const dbRef = ref(db, "ams");
    onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        setData(prev => ({
          ...initialData,
          ...val,
          clients: val.clients ? Object.values(val.clients) : prev.clients,
          devis: val.devis ? Object.values(val.devis) : prev.devis,
          factures: val.factures ? Object.values(val.factures) : prev.factures,
          parc: val.parc ? Object.values(val.parc) : prev.parc,
          sav: val.sav ? Object.values(val.sav) : prev.sav,
          locations: val.locations ? Object.values(val.locations) : prev.locations,
          pieces: val.pieces ? Object.values(val.pieces) : prev.pieces,
          ordres: val.ordres ? Object.values(val.ordres) : prev.ordres || [],
          documents: val.documents ? Object.values(val.documents) : prev.documents || [],
        }));
      }
      setSynced(true);
    });
  }, []);

  // Sauvegarder dans Firebase à chaque modification
  const setDataAndSave = (updater) => {
    setData(prev => {
      const newData = typeof updater === "function" ? updater(prev) : updater;
      // Convertir arrays en objets pour Firebase
      const toSave = {};
      Object.keys(newData).forEach(key => {
        if (Array.isArray(newData[key])) {
          toSave[key] = {};
          newData[key].forEach(item => { toSave[key][item.id] = item; });
        } else {
          toSave[key] = newData[key];
        }
      });
      set(ref(db, "ams"), toSave).catch(console.error);
      return newData;
    });
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", background: COLORS.light }}>
      <div style={{ width: 220, background: COLORS.dark, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.accent, letterSpacing: 1 }}>AMS</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Alliance Matériel Service</div>
          <div style={{ fontSize: 10, color: synced ? "#4caf50" : "#f39c12", marginTop: 4 }}>{synced ? "🟢 Synchronisé" : "🟡 Connexion..."}</div>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {MENU.map(m => (
            <button key={m.id} onClick={() => setPage(m.id)}
              style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, background: page === m.id ? COLORS.primary : "transparent", color: page === m.id ? "#fff" : "rgba(255,255,255,0.7)", marginBottom: 2, fontWeight: page === m.id ? 600 : 400 }}>
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", marginBottom: 2 }}>👤 {nomAffiche}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 8, textTransform: "capitalize" }}>{roleAffiche}</div>
          <button onClick={signOut}
            style={{ width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "7px 0", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            🚪 Déconnexion
          </button>
        </div>
      </div>
      <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        <Page data={data} setData={setDataAndSave} />
      </div>
    </div>
  );
}
