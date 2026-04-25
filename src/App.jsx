import { useState } from "react";
import ScannerBL from "./ScannerBL";

const COLORS = {
  primary: "#1a5c2e", secondary: "#2d7a45", accent: "#f0a500",
  dark: "#0f2d17", light: "#f4f9f5", gray: "#6b7c6e",
  border: "#d1e0d5", white: "#ffffff", danger: "#c0392b",
  info: "#2471a3", greenPale: "#e8f5e9",
};

const initialData = {
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
            <span style={{ fontSize: 12, color: COLORS.info }}>{(p.refsFournisseurs || []).length > 0 ? `${(p.refsFournisseurs || []).length} fournisseur(s)` : "—"}</span>,
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
        <ModalForm
          title={form.id ? "Modifier pièce" : "Nouvelle pièce"}
          fields={[["reference", "Référence fournisseur"], ["designation", "Désignation"], ["stock", "Stock", "number"], ["prixAchat", "Prix achat HT (€)", "number"], ["prix", "Prix vente HT (€)", "number"], ["fournisseur", "Fournisseur principal"], ["unite", "Unité"]]}
          values={form}
          onChange={(f, v) => setForm(p => ({ ...p, [f]: v }))}
          onSave={save}
          onClose={() => setForm(null)}
          selects={{ categorie: ["Mécanique", "Hydraulique", "Électrique", "Moteur", "Carrosserie", "Service", "Autre", "Importé BL"] }}
        />
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

const Clients = makeSimpleModule("clients", "Clients & Fournisseurs", "👥",
  ["Société", "Contact", "Email", "Tél", "Ville", "Type", ""],
  (c, edit) => [<strong>{c.nom}</strong>, c.contact, <a href={`mailto:${c.email}`} style={{ color: COLORS.info }}>{c.email}</a>, c.tel, c.ville, <Badge statut={c.type} />, <button onClick={edit} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>],
  [["nom", "Société"], ["contact", "Contact"], ["email", "Email"], ["tel", "Téléphone"], ["ville", "Ville"]],
  { nom: "", contact: "", email: "", tel: "", ville: "", type: "Client" },
  { type: ["Client", "Fournisseur"] }
);

const Devis = makeSimpleModule("devis", "Devis", "📄",
  ["N° Devis", "Client", "Date", "Description", "Montant HT", "Statut", ""],
  (d, edit) => [<strong>{d.id}</strong>, d.client, d.date, d.description, <strong>{Number(d.montant).toLocaleString("fr-FR")} €</strong>, <Badge statut={d.statut} />, <button onClick={edit} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>],
  [["client", "Client"], ["date", "Date"], ["montant", "Montant HT (€)", "number"], ["description", "Description"]],
  { client: "", date: new Date().toLocaleDateString("fr-FR"), montant: "", statut: "En attente", description: "" },
  { statut: ["En attente", "Accepté", "Refusé"] }
);

const Factures = ({ data, setData }) => {
  const [form, setForm] = useState(null);
  const save = () => {
    setData(d => ({ ...d, factures: form.id ? d.factures.map(x => x.id === form.id ? form : x) : [...d.factures, { ...form, id: `F-${Date.now()}` }] }));
    setForm(null);
  };
  const total = data.factures.reduce((s, f) => s + Number(f.montant), 0);
  const payees = data.factures.filter(f => f.statut === "Payée").reduce((s, f) => s + Number(f.montant), 0);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: COLORS.dark }}>💶 Factures</h2>
        <button onClick={() => setForm({ client: "", date: new Date().toLocaleDateString("fr-FR"), montant: "", statut: "En attente", devis: "" })}
          style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>+ Nouvelle</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 }}>
        <StatCard label="Total facturé" value={total.toLocaleString("fr-FR") + " €"} icon="📊" color={COLORS.primary} />
        <StatCard label="Encaissé" value={payees.toLocaleString("fr-FR") + " €"} icon="✅" color="#27ae60" />
        <StatCard label="À encaisser" value={(total - payees).toLocaleString("fr-FR") + " €"} icon="⏳" color="#f39c12" />
      </div>
      <Card>
        <TableComp
          headers={["N° Facture", "Client", "Date", "Montant HT", "Statut", "Devis lié", ""]}
          rows={data.factures.map(f => [
            <strong>{f.id}</strong>, f.client, f.date,
            <strong>{Number(f.montant).toLocaleString("fr-FR")} €</strong>,
            <Badge statut={f.statut} />, f.devis || "—",
            <button onClick={() => setForm(f)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>
          ])}
        />
      </Card>
      {form && <ModalForm title={form.id ? "Modifier facture" : "Nouvelle facture"}
        fields={[["client", "Client"], ["date", "Date"], ["montant", "Montant HT (€)", "number"], ["devis", "N° Devis lié"]]}
        values={form} onChange={(f, v) => setForm(p => ({ ...p, [f]: v }))}
        onSave={save} onClose={() => setForm(null)}
        selects={{ statut: ["En attente", "Payée"] }} />}
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
  const [form, setForm] = useState(null);
  const save = () => {
    setData(d => ({ ...d, locations: form.id ? d.locations.map(x => x.id === form.id ? form : x) : [...d.locations, { ...form, id: `LOC-${Date.now()}` }] }));
    setForm(null);
  };
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: COLORS.dark }}>📋 Locations</h2>
        <button onClick={() => setForm({ machine: "", client: "", debut: "", fin: "", prixJour: "", statut: "En cours" })}
          style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 600 }}>+ Nouvelle</button>
      </div>
      <Card>
        <TableComp
          headers={["N°", "Machine", "Client", "Début", "Fin", "Prix/j", "Total estimé", "Statut", ""]}
          rows={data.locations.map(l => {
            const d1 = new Date(l.debut.split("/").reverse().join("-"));
            const d2 = new Date(l.fin.split("/").reverse().join("-"));
            const j = Math.max(1, Math.round((d2 - d1) / 86400000));
            const tot = j * Number(l.prixJour);
            return [<strong>{l.id}</strong>, l.machine, l.client, l.debut, l.fin,
              Number(l.prixJour).toLocaleString("fr-FR") + " €",
              <strong>{isNaN(tot) ? "—" : tot.toLocaleString("fr-FR") + " €"}</strong>,
              <Badge statut={l.statut} />,
              <button onClick={() => setForm(l)} style={{ background: "none", border: `1px solid ${COLORS.border}`, borderRadius: 6, padding: "3px 10px", cursor: "pointer", fontSize: 12 }}>✏️</button>];
          })}
        />
      </Card>
      {form && <ModalForm title={form.id ? "Modifier location" : "Nouvelle location"}
        fields={[["machine", "Machine"], ["client", "Client"], ["debut", "Début (jj/mm/aaaa)"], ["fin", "Fin (jj/mm/aaaa)"], ["prixJour", "Prix/jour HT (€)", "number"]]}
        values={form} onChange={(f, v) => setForm(p => ({ ...p, [f]: v }))}
        onSave={save} onClose={() => setForm(null)}
        selects={{ statut: ["En cours", "Terminée", "Annulée"] }} />}
    </div>
  );
};

const MENU = [
  { id: "dashboard", label: "Tableau de bord", icon: "📊" },
  { id: "clients", label: "Clients", icon: "👥" },
  { id: "devis", label: "Devis", icon: "📄" },
  { id: "factures", label: "Factures", icon: "💶" },
  { id: "parc", label: "Parc matériel", icon: "🏗️" },
  { id: "sav", label: "SAV", icon: "🔧" },
  { id: "locations", label: "Locations", icon: "📋" },
  { id: "pieces", label: "Pièces & Magasin", icon: "📦" },
];

const PAGES = { dashboard: Dashboard, clients: Clients, devis: Devis, factures: Factures, parc: Parc, sav: SAV, locations: Locations, pieces: Pieces };

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [data, setData] = useState(initialData);
  const Page = PAGES[page] || Dashboard;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", background: COLORS.light }}>
      <div style={{ width: 220, background: COLORS.dark, color: "#fff", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: COLORS.accent, letterSpacing: 1 }}>AMS</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Alliance Matériel Service</div>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {MENU.map(m => (
            <button key={m.id} onClick={() => setPage(m.id)}
              style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 14, background: page === m.id ? COLORS.primary : "transparent", color: page === m.id ? "#fff" : "rgba(255,255,255,0.7)", marginBottom: 2, fontWeight: page === m.id ? 600 : 400 }}>
              <span>{m.icon}</span>{m.label}
            </button>
          ))}
        </nav>
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>AMS v1.0</div>
      </div>
      <div style={{ flex: 1, padding: 28, overflowY: "auto" }}>
        <Page data={data} setData={setData} />
      </div>
    </div>
  );
}
