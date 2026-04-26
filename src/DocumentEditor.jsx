import { useState, useRef } from "react";

const COLORS = {
  primary: "#1a5c2e", secondary: "#2d7a45", accent: "#f0a500",
  dark: "#0f2d17", light: "#f4f9f5", gray: "#6b7c6e",
  border: "#d1e0d5", white: "#ffffff", danger: "#c0392b",
  greenPale: "#e8f5e9", dangerLight: "#fce4ec", info: "#1565c0",
};

const TVA = 0.20;

function Recherchepiece({ pieces, onSelect }) {
  const [query, setQuery] = useState("");
  const [showList, setShowList] = useState(false);

  const results = query.length >= 2
    ? pieces.filter(p =>
        p.reference?.toLowerCase().includes(query.toLowerCase()) ||
        p.referenceInterne?.toLowerCase().includes(query.toLowerCase()) ||
        p.designation?.toLowerCase().includes(query.toLowerCase()) ||
        (p.refsFournisseurs || []).some(r => r.reference?.toLowerCase().includes(query.toLowerCase()))
      ).slice(0, 8)
    : [];

  return (
    <div style={{ position: "relative", marginBottom: 12 }}>
      <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>🔍 Rechercher une pièce (réf. ou désignation)</label>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setShowList(true); }}
        onFocus={() => setShowList(true)}
        placeholder="Tapez une référence ou un nom..."
        style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `2px solid ${COLORS.accent}`, fontSize: 14, boxSizing: "border-box" }}
      />
      {showList && results.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 300, background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden" }}>
          <div style={{ padding: "6px 12px", background: COLORS.light, fontSize: 11, color: COLORS.gray, fontWeight: 600 }}>
            {results.length} résultat(s)
          </div>
          {results.map((p, i) => (
            <button key={i} onClick={() => { onSelect(p); setQuery(""); setShowList(false); }}
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", border: "none", background: "none", cursor: "pointer", borderBottom: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.greenPale}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{p.designation}</div>
                <div style={{ fontSize: 12, color: COLORS.gray }}>
                  {p.referenceInterne} {p.reference !== p.referenceInterne ? "— " + p.reference : ""}
                  {p.fournisseur ? " — " + p.fournisseur : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                <div style={{ fontWeight: 700, color: COLORS.primary, fontSize: 14 }}>{p.prix} €</div>
                <div style={{ fontSize: 12, color: p.stock <= 0 ? COLORS.danger : p.stock <= 2 ? "#f39c12" : COLORS.gray, fontWeight: 600 }}>
                  Stock : {p.stock}
                  {p.stock <= 0 ? " ⚠️ Rupture" : p.stock <= 2 ? " ⚠️ Faible" : ""}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      {showList && query.length >= 2 && results.length === 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 300, background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.gray }}>
          Aucune pièce trouvée pour "{query}"
        </div>
      )}
    </div>
  );
}

function LigneEditor({ ligne, index, onUpdate, onDelete, pieces }) {
  const piece = pieces.find(p => p.id === ligne.pieceId);
  const stockDisponible = piece ? piece.stock : null;
  const stockInsuffisant = stockDisponible !== null && ligne.qte > stockDisponible;

  return (
    <div style={{ padding: "10px 0", borderBottom: `1px solid ${COLORS.border}` }}>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 0.7fr 1fr 0.7fr 1fr auto", gap: 8, alignItems: "center" }}>
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 4 }}>
            <input value={ligne.reference || ""} onChange={e => onUpdate(index, "reference", e.target.value)}
              placeholder="Référence" style={{ width: 120, padding: "5px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 12, color: COLORS.gray }} />
            <input value={ligne.designation} onChange={e => onUpdate(index, "designation", e.target.value)}
              placeholder="Désignation" style={{ flex: 1, padding: "5px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13, boxSizing: "border-box" }} />
          </div>
          {piece && (
            <div style={{ fontSize: 11, color: stockInsuffisant ? COLORS.danger : COLORS.gray }}>
              {piece.referenceInterne} — Stock : <strong style={{ color: stockInsuffisant ? COLORS.danger : "#27ae60" }}>{stockDisponible}</strong>
              {stockInsuffisant && " ⚠️ Stock insuffisant !"}
            </div>
          )}
        </div>
        <input type="number" value={ligne.qte} onChange={e => onUpdate(index, "qte", e.target.value)}
          min="1" style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${stockInsuffisant ? COLORS.danger : COLORS.border}`, fontSize: 13, textAlign: "center" }} />
        <input type="number" value={ligne.prixUnit} onChange={e => onUpdate(index, "prixUnit", e.target.value)}
          placeholder="Prix HT" style={{ padding: "6px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13 }} />
        <input type="number" value={ligne.remise} onChange={e => onUpdate(index, "remise", e.target.value)}
          placeholder="%" style={{ padding: "6px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13, textAlign: "center" }} />
        <div style={{ textAlign: "right", fontWeight: 700, fontSize: 13, color: COLORS.primary }}>
          {((Number(ligne.qte) * Number(ligne.prixUnit)) * (1 - (Number(ligne.remise) || 0) / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
        </div>
        <button onClick={() => onDelete(index)} style={{ background: COLORS.dangerLight, border: "none", borderRadius: 6, padding: "4px 8px", cursor: "pointer", color: COLORS.danger, fontWeight: 700 }}>✕</button>
      </div>
    </div>
  );
}

function calculTotaux(lignes) {
  const totalHT = lignes.reduce((s, l) => s + (Number(l.qte) * Number(l.prixUnit)) * (1 - (Number(l.remise) || 0) / 100), 0);
  const tva = totalHT * TVA;
  const totalTTC = totalHT + tva;
  return { totalHT, tva, totalTTC };
}

function generatePDF(doc, data) {
  const { totalHT, tva, totalTTC } = calculTotaux(doc.lignes || []);
  const typeLabel = doc.type === "devis" ? "DEVIS" : doc.type === "facture" ? "FACTURE" : "ORDRE DE RÉPARATION";

  const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #222; padding: 40px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; padding-bottom: 20px; border-bottom: 3px solid #1a5c2e; }
  .logo-area h1 { font-size: 28px; font-weight: 900; color: #1a5c2e; letter-spacing: 2px; }
  .logo-area p { font-size: 11px; color: #666; margin-top: 2px; }
  .logo-area .coords { margin-top: 8px; font-size: 11px; color: #444; line-height: 1.6; }
  .doc-info { text-align: right; }
  .doc-type { font-size: 22px; font-weight: 900; color: #1a5c2e; }
  .doc-num { font-size: 14px; font-weight: 700; color: #444; margin-top: 4px; }
  .doc-date { font-size: 12px; color: #666; margin-top: 2px; }
  .parties { display: flex; justify-content: space-between; margin-bottom: 28px; }
  .partie { background: #f4f9f5; border-left: 4px solid #1a5c2e; padding: 14px 16px; width: 48%; border-radius: 4px; }
  .partie h3 { font-size: 11px; text-transform: uppercase; color: #6b7c6e; margin-bottom: 8px; letter-spacing: 1px; }
  .partie p { font-size: 13px; line-height: 1.6; }
  .machine-box { background: #fff8e1; border: 1px solid #f0a500; border-radius: 6px; padding: 10px 14px; margin-bottom: 20px; font-size: 13px; }
  .machine-box strong { color: #1a5c2e; }
  .titre-doc { font-size: 16px; font-weight: 700; color: #0f2d17; margin-bottom: 8px; }
  .texte-intro { font-size: 13px; color: #444; margin-bottom: 20px; line-height: 1.6; white-space: pre-wrap; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead tr { background: #1a5c2e; color: white; }
  thead th { padding: 10px 12px; text-align: left; font-size: 12px; }
  thead th:last-child, thead th:nth-child(3), thead th:nth-child(4), thead th:nth-child(5) { text-align: right; }
  tbody tr:nth-child(even) { background: #f4f9f5; }
  tbody td { padding: 9px 12px; font-size: 13px; border-bottom: 1px solid #d1e0d5; }
  tbody td:nth-child(3), tbody td:nth-child(4), tbody td:nth-child(5), tbody td:last-child { text-align: right; }
  .totaux { display: flex; justify-content: flex-end; margin-bottom: 24px; }
  .totaux-box { width: 280px; }
  .total-line { display: flex; justify-content: space-between; padding: 6px 12px; font-size: 13px; }
  .total-line.ht { border-top: 2px solid #d1e0d5; }
  .total-line.ttc { background: #1a5c2e; color: white; font-weight: 900; font-size: 15px; border-radius: 6px; padding: 10px 12px; margin-top: 4px; }
  .notes { background: #f4f9f5; border-radius: 6px; padding: 14px 16px; font-size: 12px; color: #555; line-height: 1.6; margin-bottom: 24px; }
  .footer { border-top: 2px solid #d1e0d5; padding-top: 14px; font-size: 11px; color: #888; text-align: center; line-height: 1.8; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="logo-area">
      <h1>AMS</h1>
      <p>Alliance Matériel Service</p>
      <div class="coords">
        224 Rue de Fongrave — 81800 Rabastens<br>
        Tél. : 06.25.24.81.44<br>
        Email : contact@ams-materiels.fr<br>
        SIRET : ${data?.parametres?.siret || "En cours d'immatriculation"}
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-type">${typeLabel}</div>
      <div class="doc-num">N° ${doc.numero || doc.id}</div>
      <div class="doc-date">Date : ${doc.date}</div>
      ${doc.dateEcheance ? `<div class="doc-date">Échéance : ${doc.dateEcheance}</div>` : ""}
      ${doc.technicien ? `<div class="doc-date">Technicien : ${doc.technicien}</div>` : ""}
    </div>
  </div>

  <div class="parties">
    <div class="partie">
      <h3>Émetteur</h3>
      <p><strong>Alliance Matériel Service (AMS)</strong><br>
      224 Rue de Fongrave<br>81800 Rabastens</p>
    </div>
    <div class="partie">
      <h3>Client</h3>
      <p><strong>${doc.clientNom || "—"}</strong><br>
      ${doc.clientAdresse || ""}<br>
      ${doc.clientSiret ? "SIRET : " + doc.clientSiret : ""}
      </p>
    </div>
  </div>

  ${doc.machine ? `<div class="machine-box">🏗️ <strong>Machine concernée :</strong> ${doc.machine}${doc.immat ? " — Immat. : " + doc.immat : ""}${doc.numeroSerie ? " — N° série : " + doc.numeroSerie : ""}</div>` : ""}

  ${doc.titre ? `<div class="titre-doc">${doc.titre}</div>` : ""}
  ${doc.texteIntro ? `<div class="texte-intro">${doc.texteIntro}</div>` : ""}

  <table>
    <thead>
        <th style="width:12%">Référence</th>
        <th style="width:33%">Désignation</th>
        <th style="width:10%">Qté</th>
        <th style="width:15%">Prix unit. HT</th>
        <th style="width:10%">Remise</th>
        <th style="width:15%">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${(doc.lignes || []).map(l => `
        <tr>
          <td style="color:#666;font-size:12px">${l.reference || "—"}</td>
          <td>${l.designation}</td>
          <td style="text-align:right">${l.qte}</td>
          <td style="text-align:right">${Number(l.prixUnit).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</td>
          <td style="text-align:right">${l.remise ? l.remise + "%" : "—"}</td>
          <td style="text-align:right"><strong>${((Number(l.qte) * Number(l.prixUnit)) * (1 - (Number(l.remise) || 0) / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong></td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="totaux">
    <div class="totaux-box">
      <div class="total-line ht">
        <span>Total HT</span><span><strong>${totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong></span>
      </div>
      <div class="total-line">
        <span>TVA (20%)</span><span>${tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
      </div>
      <div class="total-line ttc">
        <span>TOTAL TTC</span><span>${totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
      </div>
    </div>
  </div>

  ${doc.notes ? `<div class="notes"><strong>Notes :</strong><br>${doc.notes}</div>` : ""}
  ${doc.conditions ? `<div class="notes"><strong>Conditions :</strong><br>${doc.conditions}</div>` : ""}

  <div class="footer">
    Alliance Matériel Service — SARL au capital de ___ € — RCS Albi — SIRET ${data?.parametres?.siret || "En cours"}<br>
    ${doc.type === "devis" ? "Devis valable 30 jours — Validité soumise à acceptation écrite" : ""}
    ${doc.type === "facture" ? "Règlement à réception de facture — Tout retard entraîne des pénalités de 3 fois le taux légal" : ""}
  </div>
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export default function DocumentEditor({ doc: docInit, data, onSave, onClose, onUpdateStock = () => {} }) {
  const [doc, setDoc] = useState({
    type: "devis",
    id: `D-${Date.now()}`,
    numero: "",
    date: new Date().toLocaleDateString("fr-FR"),
    dateEcheance: "",
    statut: "Brouillon",
    clientNom: "",
    clientAdresse: "",
    clientSiret: "",
    machine: "",
    immat: "",
    numeroSerie: "",
    technicien: "",
    titre: "",
    texteIntro: "",
    lignes: [],
    notes: "",
    conditions: "",
    ...docInit,
  });

  const [tab, setTab] = useState("infos");

  const selectedClient = (data.clients || []).find(c => c.nom === doc.clientNom);
  const machinesClient = (data.parc || []).filter(m => m.client === doc.clientNom);
  const selectedMachine = (data.parc || []).find(m => m.designation === doc.machine && m.client === doc.clientNom);

  const { totalHT, tva, totalTTC } = calculTotaux(doc.lignes || []);

  const updateLigne = (index, field, value) => {
    const newLignes = [...(doc.lignes || [])];
    newLignes[index] = { ...newLignes[index], [field]: value };
    setDoc(d => ({ ...d, lignes: newLignes }));
  };

  const deleteLigne = (index) => {
    setDoc(d => ({ ...d, lignes: (d.lignes || []).filter((_, i) => i !== index) }));
  };

  const addLigneLibre = () => {
    setDoc(d => ({ ...d, lignes: [...(d.lignes || []), { id: Date.now(), designation: "", qte: 1, prixUnit: 0, remise: 0, type: "libre" }] }));
  };

  const addLignePiece = (piece) => {
    setDoc(d => ({ ...d, lignes: [...(d.lignes || []), { id: Date.now(), designation: piece.designation, qte: 1, prixUnit: piece.prix, remise: 0, type: "piece", pieceId: piece.id }] }));
  };

  // Décrémenter stock quand statut passe à Payée/Validée
  const handleStatutChange = (newStatut) => {
    const oldStatut = doc.statut;
    const wasValidated = ["Payée", "Validée"].includes(oldStatut);
    const isValidated = ["Payée", "Validée"].includes(newStatut);
    
    if (!wasValidated && isValidated) {
      // Décrémenter le stock pour chaque pièce
      (doc.lignes || []).filter(l => l.pieceId).forEach(l => {
        onUpdateStock(l.pieceId, -Number(l.qte));
      });
    } else if (wasValidated && !isValidated) {
      // Remettre le stock si on annule
      (doc.lignes || []).filter(l => l.pieceId).forEach(l => {
        onUpdateStock(l.pieceId, Number(l.qte));
      });
    }
    setDoc(d => ({ ...d, statut: newStatut }));
  };

  const addLigneMO = () => {
    setDoc(d => ({ ...d, lignes: [...(d.lignes || []), { id: Date.now(), designation: "Main d'œuvre", qte: 1, prixUnit: 65, remise: 0, type: "mo" }] }));
  };

  const addLigneDeplacement = () => {
    setDoc(d => ({ ...d, lignes: [...(d.lignes || []), { id: Date.now(), designation: "Déplacement", qte: 1, prixUnit: 0, remise: 0, type: "dep" }] }));
  };

  const handleClientChange = (nom) => {
    const client = (data.clients || []).find(c => c.nom === nom);
    setDoc(d => ({
      ...d,
      clientNom: nom,
      clientAdresse: client?.adresse || client?.ville || "",
      clientSiret: client?.siret || "",
      machine: "",
    }));
  };

  const handleMachineChange = (designation) => {
    const m = (data.parc || []).find(x => x.designation === designation && x.client === doc.clientNom);
    setDoc(d => ({
      ...d,
      machine: designation,
      immat: m?.immat || "",
      numeroSerie: m?.numeroSerie || "",
    }));
  };

  const TABS = [
    { id: "infos", label: "📋 Infos" },
    { id: "lignes", label: `📝 Lignes (${(doc.lignes || []).length})` },
    { id: "textes", label: "💬 Textes" },
    { id: "recap", label: "💶 Récap" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: COLORS.white, borderRadius: 16, width: "95vw", maxWidth: 900, maxHeight: "95vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {/* Header */}
        <div style={{ background: COLORS.dark, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <select value={doc.type} onChange={e => setDoc(d => ({ ...d, type: e.target.value }))}
              style={{ background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 8, padding: "6px 12px", color: COLORS.accent, fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
              <option value="devis">DEVIS</option>
              <option value="facture">FACTURE</option>
              <option value="or">ORDRE DE RÉPARATION</option>
              <option value="bl">BON DE LIVRAISON</option>
            </select>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{doc.clientNom || "Nouveau document"}</span>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => generatePDF(doc, data)}
              style={{ background: COLORS.accent, color: COLORS.dark, border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
              🖨️ PDF / Imprimer
            </button>
            {/* Bouton Convertir */}
            {doc.type !== "facture" && (
              <div style={{ position: "relative" }}>
                <select onChange={e => {
                  if (!e.target.value) return;
                  const cible = e.target.value;
                  const prefixes = { devis:"D-", facture:"F-", or:"OR-", bl:"BL-" };
                  const newDoc = {
                    ...doc,
                    id: `${prefixes[cible]}${Date.now()}`,
                    type: cible,
                    statut: "Brouillon",
                    docOrigineId: doc.id,
                    docOrigineType: doc.type,
                  };
                  onSave(newDoc);
                  e.target.value = "";
                }} style={{ background: "#e3f2fd", color: COLORS.info, border: `2px solid ${COLORS.info}`, borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
                  <option value="">🔄 Convertir en...</option>
                  {doc.type === "devis" && <option value="or">→ Ordre de réparation</option>}
                  {doc.type === "devis" && <option value="bl">→ Bon de livraison</option>}
                  {doc.type === "devis" && <option value="facture">→ Facture</option>}
                  {doc.type === "or" && <option value="facture">→ Facture</option>}
                  {doc.type === "bl" && <option value="facture">→ Facture</option>}
                </select>
              </div>
            )}
            <button onClick={() => onSave(doc)}
              style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
              💾 Enregistrer
            </button>
            <button onClick={onClose}
              style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontSize: 18 }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 4, padding: "0 24px", background: COLORS.light, borderBottom: `2px solid ${COLORS.border}`, flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ padding: "12px 18px", border: "none", background: "none", cursor: "pointer", fontWeight: tab === t.id ? 700 : 400, borderBottom: tab === t.id ? `3px solid ${COLORS.primary}` : "3px solid transparent", color: tab === t.id ? COLORS.primary : COLORS.gray, fontSize: 14 }}>
              {t.label}
            </button>
          ))}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8, padding: "0 4px" }}>
            <select value={doc.statut} onChange={e => setDoc(d => ({ ...d, statut: e.target.value }))}
              style={{ padding: "5px 10px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13, fontWeight: 600 }}>
              <option>Brouillon</option><option>Envoyé</option><option>Accepté</option><option>Refusé</option><option>Payée</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

          {/* INFOS */}
          {tab === "infos" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Numéro</label>
                <input value={doc.numero || doc.id} onChange={e => setDoc(d => ({ ...d, numero: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Date</label>
                <input value={doc.date} onChange={e => setDoc(d => ({ ...d, date: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Client *</label>
                <select value={doc.clientNom} onChange={e => handleClientChange(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `2px solid ${COLORS.accent}`, fontSize: 14 }}>
                  <option value="">-- Choisir un client --</option>
                  {(data.clients || []).map(c => <option key={c.id}>{c.nom}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Date échéance</label>
                <input value={doc.dateEcheance} onChange={e => setDoc(d => ({ ...d, dateEcheance: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
              </div>
              {doc.clientNom && (
                <div style={{ gridColumn: "1/-1" }}>
                  <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Machine concernée</label>
                  <select value={doc.machine} onChange={e => handleMachineChange(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                    <option value="">-- Aucune machine / Machine libre --</option>
                    {machinesClient.map(m => <option key={m.id} value={m.designation}>{m.marque} {m.modele} — {m.type} {m.immat ? "(" + m.immat + ")" : ""}</option>)}
                  </select>
                </div>
              )}
              {doc.docOrigineId && (
                <div style={{ gridColumn: "1/-1", background: "#e3f2fd", border: `1px solid ${COLORS.info}`, borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
                  🔗 Converti depuis <strong>{doc.docOrigineType?.toUpperCase()} N° {doc.docOrigineId}</strong>
                </div>
              )}
              {selectedClient && (
                <div style={{ gridColumn: "1/-1", background: COLORS.greenPale, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>{selectedClient.nom}</div>
                  <div style={{ fontSize: 13, color: COLORS.gray }}>{selectedClient.adresse || selectedClient.ville} {selectedClient.tel ? "— " + selectedClient.tel : ""}</div>
                  {selectedClient.siret && <div style={{ fontSize: 12, color: COLORS.gray }}>SIRET: {selectedClient.siret}</div>}
                </div>
              )}
              {selectedMachine && (
                <div style={{ gridColumn: "1/-1", background: "#fff8e1", border: `1px solid ${COLORS.accent}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: COLORS.dark }}>🏗️ {selectedMachine.marque} {selectedMachine.modele}</div>
                  <div style={{ fontSize: 13, color: COLORS.gray }}>
                    {selectedMachine.type} {selectedMachine.immat ? "— Immat. " + selectedMachine.immat : ""} {selectedMachine.numeroSerie ? "— N° série " + selectedMachine.numeroSerie : ""}
                  </div>
                </div>
              )}
              <div>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Technicien</label>
                <input value={doc.technicien} onChange={e => setDoc(d => ({ ...d, technicien: e.target.value }))}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, boxSizing: "border-box" }} />
              </div>
            </div>
          )}

          {/* LIGNES */}
          {tab === "lignes" && (
            <div>
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                <button onClick={addLigneLibre} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Ligne libre</button>
                <button onClick={addLigneMO} style={{ background: "#e3f2fd", color: COLORS.info, border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Main d'œuvre</button>
                <button onClick={addLigneDeplacement} style={{ background: "#fff8e1", color: "#f57f17", border: "none", borderRadius: 8, padding: "8px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>+ Déplacement</button>
                <div style={{ flex: 1, minWidth: 280 }}>
                  <Recherchepiece pieces={data.pieces || []} onSelect={addLignePiece} />
                </div>
              </div>

              <div style={{ background: COLORS.light, borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr auto", gap: 8, fontSize: 12, fontWeight: 700, color: COLORS.gray }}>
                  <span>Désignation</span><span>Qté</span><span>Prix HT</span><span>Remise %</span><span style={{ textAlign: "right" }}>Total HT</span><span></span>
                </div>
              </div>

              {(doc.lignes || []).length === 0 && (
                <div style={{ textAlign: "center", color: COLORS.gray, padding: 32 }}>Aucune ligne — utilisez les boutons ci-dessus pour ajouter</div>
              )}

              {(doc.lignes || []).map((ligne, i) => (
                <LigneEditor key={i} ligne={ligne} index={i} onUpdate={updateLigne} onDelete={deleteLigne} pieces={data.pieces || []} />
              ))}

              {(doc.lignes || []).length > 0 && (
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <div style={{ width: 280, background: COLORS.light, borderRadius: 10, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 14 }}>
                      <span style={{ color: COLORS.gray }}>Total HT</span>
                      <strong>{totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, color: COLORS.gray }}>
                      <span>TVA 20%</span><span>{tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", background: COLORS.primary, color: "#fff", borderRadius: 8, padding: "10px 12px", fontSize: 16, fontWeight: 800 }}>
                      <span>TOTAL TTC</span><span>{totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TEXTES */}
          {tab === "textes" && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Titre du document</label>
                <input value={doc.titre} onChange={e => setDoc(d => ({ ...d, titre: e.target.value }))}
                  placeholder="Ex: Révision 500h — Chariot élévateur CAT"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `2px solid ${COLORS.accent}`, fontSize: 15, fontWeight: 600, boxSizing: "border-box" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Texte d'introduction</label>
                <textarea value={doc.texteIntro} onChange={e => setDoc(d => ({ ...d, texteIntro: e.target.value }))}
                  placeholder="Suite à votre demande, nous vous adressons notre devis pour..."
                  rows={4} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Notes</label>
                <textarea value={doc.notes} onChange={e => setDoc(d => ({ ...d, notes: e.target.value }))}
                  placeholder="Notes complémentaires..."
                  rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
              <div>
                <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>Conditions</label>
                <textarea value={doc.conditions} onChange={e => setDoc(d => ({ ...d, conditions: e.target.value }))}
                  placeholder="Conditions de paiement, garantie, validité du devis..."
                  rows={3} style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: `1px solid ${COLORS.border}`, fontSize: 14, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
              </div>
            </div>
          )}

          {/* RECAP */}
          {tab === "recap" && (
            <div>
              {doc.docOrigineId && (
                <div style={{ background: "#e3f2fd", border: `1px solid ${COLORS.info}`, borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 14, color: COLORS.info }}>
                  🔗 Converti depuis <strong>{doc.docOrigineType?.toUpperCase()} {doc.docOrigineId}</strong>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
                <div style={{ background: COLORS.light, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>Type</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{doc.type === "devis" ? "DEVIS" : doc.type === "facture" ? "FACTURE" : doc.type === "or" ? "OR" : "BON DE LIVRAISON"}</div>
                </div>
                <div style={{ background: COLORS.light, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>Statut</div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{doc.statut}</div>
                </div>
                <div style={{ background: COLORS.light, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>Client</div>
                  <div style={{ fontWeight: 700 }}>{doc.clientNom || "—"}</div>
                </div>
                <div style={{ background: COLORS.light, borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 12, color: COLORS.gray, marginBottom: 4 }}>Machine</div>
                  <div style={{ fontWeight: 700 }}>{doc.machine || "—"}</div>
                </div>
              </div>

              <div style={{ background: COLORS.white, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: 20, marginBottom: 16 }}>
                <h3 style={{ marginBottom: 16, color: COLORS.dark }}>Résumé financier</h3>
                {(doc.lignes || []).map((l, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${COLORS.border}`, fontSize: 14 }}>
                    <span>{l.designation} × {l.qte}</span>
                    <span>{((Number(l.qte) * Number(l.prixUnit)) * (1 - (Number(l.remise) || 0) / 100)).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                  </div>
                ))}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0 6px", fontSize: 16, fontWeight: 700 }}>
                  <span>Total HT</span><span>{totalHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 14, color: COLORS.gray }}>
                  <span>TVA 20%</span><span>{tva.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", background: COLORS.primary, color: "#fff", borderRadius: 10, padding: "14px 16px", marginTop: 10, fontSize: 18, fontWeight: 800 }}>
                  <span>TOTAL TTC</span><span>{totalTTC.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
                </div>
              </div>

              <button onClick={() => generatePDF(doc, data)}
                style={{ width: "100%", background: COLORS.accent, color: COLORS.dark, border: "none", borderRadius: 10, padding: "14px", cursor: "pointer", fontWeight: 800, fontSize: 16 }}>
                🖨️ Générer le PDF / Imprimer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
