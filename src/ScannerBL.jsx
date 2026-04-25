import { useState, useRef } from "react";

const T = {
  green: "#1a5c2e", greenLight: "#2d7a45", greenPale: "#e8f5e9",
  accent: "#f0a500", accentLight: "#fff8e1", dark: "#0f2d17",
  gray: "#6b7c6e", light: "#f4f9f5", border: "#d1e0d5",
  white: "#ffffff", danger: "#c0392b", dangerLight: "#fce4ec",
  info: "#1565c0", infoLight: "#e3f2fd",
};

const Btn = ({ children, onClick, color = T.green, outline = false, small = false, disabled = false, style = {} }) => (
  <button onClick={onClick} disabled={disabled}
    style={{
      background: outline ? T.white : disabled ? "#ccc" : color,
      color: outline ? color : T.white,
      border: outline ? `2px solid ${color}` : "none",
      borderRadius: 10, padding: small ? "7px 14px" : "11px 20px",
      fontSize: small ? 13 : 15, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer",
      display: "inline-flex", alignItems: "center", gap: 7, ...style
    }}>{children}</button>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: T.white, borderRadius: 14, padding: 20, border: `1px solid ${T.border}`, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", ...style }}>{children}</div>
);

// Normalise une désignation pour comparaison floue
const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, "").trim();

// Cherche des correspondances potentielles dans le catalogue existant
const findSimilar = (designation, catalogue) => {
  const words = normalize(designation).split(/\s+/).filter(w => w.length > 3);
  return catalogue.filter(item => {
    const itemNorm = normalize(item.designation);
    return words.some(w => itemNorm.includes(w));
  });
};

export default function ScannerBL({ catalogue, onAddArticles, onUpdateArticle }) {
  const [step, setStep] = useState("upload"); // upload | analyse | validation | doublons | done
  const [imageBase64, setImageBase64] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lignes, setLignes] = useState([]);
  const [doublonsPending, setDoublonsPending] = useState([]);
  const [currentDublon, setCurrentDublon] = useState(null);
  const [fournisseur, setFournisseur] = useState("");
  const [docType, setDocType] = useState("BL");
  const fileRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target.result.split(",")[1];
      setImageBase64(base64);
      setImagePreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  const analyser = async () => {
    if (!imageBase64) return;
    setLoading(true);
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: "image/jpeg", data: imageBase64 }
              },
              {
                type: "text",
                text: `Analyse ce ${docType} et extrait toutes les lignes d'articles. 
Réponds UNIQUEMENT en JSON valide, sans aucun texte avant ou après, sans balises markdown.
Format exact:
{
  "fournisseur": "nom du fournisseur si visible sinon vide",
  "date": "date du document si visible sinon vide",
  "lignes": [
    {
      "reference": "référence article",
      "designation": "désignation complète",
      "quantite": 1,
      "prixUnitaire": 0.00,
      "unite": "unité (pièce/litre/kg/m/etc)"
    }
  ]
}`
              }
            ]
          }]
        })
      });

      const data = await response.json();
      const text = data.content?.find(b => b.type === "text")?.text || "{}";
      const clean = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      if (parsed.fournisseur) setFournisseur(parsed.fournisseur);

      // Pour chaque ligne extraite, chercher des doublons potentiels
      const lignesAvecStatut = (parsed.lignes || []).map((l, i) => ({
        ...l,
        id: i,
        prixVente: "",
        statut: "nouveau", // nouveau | doublon_confirme | lier_existant | ignorer
        articleExistantId: null,
        similaires: findSimilar(l.designation, catalogue),
      }));

      setLignes(lignesAvecStatut);

      // Identifier celles avec similaires
      const avecSimilaires = lignesAvecStatut.filter(l => l.similaires.length > 0);
      if (avecSimilaires.length > 0) {
        setDoublonsPending(avecSimilaires);
        setCurrentDublon(avecSimilaires[0]);
        setStep("doublons");
      } else {
        setStep("validation");
      }
    } catch (err) {
      alert("Erreur d'analyse : " + err.message);
    }
    setLoading(false);
  };

  const handleDublonChoice = (choice, articleExistantId = null) => {
    const updated = lignes.map(l =>
      l.id === currentDublon.id
        ? { ...l, statut: choice, articleExistantId }
        : l
    );
    setLignes(updated);

    const restants = doublonsPending.filter(d => d.id !== currentDublon.id);
    setDoublonsPending(restants);
    if (restants.length > 0) {
      setCurrentDublon(restants[0]);
    } else {
      setStep("validation");
      setCurrentDublon(null);
    }
  };

  const updateLigne = (id, field, value) => {
    setLignes(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const valider = () => {
    const aAjouter = lignes.filter(l => l.statut !== "ignorer" && l.statut !== "lier_existant");
    const aLier = lignes.filter(l => l.statut === "lier_existant");

    // Ajouter nouveaux articles au catalogue
    const nouveaux = aAjouter.map(l => ({
      id: `P-${Date.now()}-${l.id}`,
      reference: l.reference,
      referenceInterne: `AMS-${String(Date.now()).slice(-4)}`,
      designation: l.designation,
      stock: l.quantite,
      prixAchat: l.prixUnitaire,
      prix: l.prixVente ? Number(l.prixVente) : l.prixUnitaire * 2,
      fournisseur: fournisseur,
      unite: l.unite || "pièce",
      categorie: "Importé BL",
      refsFournisseurs: [{ fournisseur, reference: l.reference, prixAchat: l.prixUnitaire }],
    }));

    // Ajouter référence fournisseur aux articles existants
    aLier.forEach(l => {
      if (l.articleExistantId) {
        onUpdateArticle(l.articleExistantId, {
          refsFournisseurs: [{ fournisseur, reference: l.reference, prixAchat: l.prixUnitaire }]
        });
      }
    });

    if (nouveaux.length > 0) onAddArticles(nouveaux);
    setStep("done");
  };

  // STEP: UPLOAD
  if (step === "upload") return (
    <div>
      <h3 style={{ marginBottom: 20, color: T.dark }}>📷 Scanner un BL / Facture fournisseur</h3>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          {["BL", "Facture", "Devis"].map(t => (
            <button key={t} onClick={() => setDocType(t)}
              style={{ padding: "8px 20px", borderRadius: 20, border: `2px solid ${docType === t ? T.green : T.border}`, background: docType === t ? T.greenPale : T.white, color: docType === t ? T.green : T.gray, fontWeight: 600, cursor: "pointer" }}>
              {t}
            </button>
          ))}
        </div>

        <div onClick={() => fileRef.current.click()}
          style={{ border: `2px dashed ${imagePreview ? T.green : T.border}`, borderRadius: 14, padding: 32, textAlign: "center", cursor: "pointer", background: imagePreview ? T.greenPale : T.light, transition: "all 0.2s" }}>
          {imagePreview
            ? <img src={imagePreview} alt="doc" style={{ maxHeight: 300, maxWidth: "100%", borderRadius: 10 }} />
            : <div>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: T.gray }}>Cliquez pour sélectionner une photo</div>
              <div style={{ fontSize: 13, color: T.gray, marginTop: 6 }}>BL, facture ou devis fournisseur</div>
            </div>
          }
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

        {imagePreview && (
          <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
            <Btn onClick={() => { setImageBase64(null); setImagePreview(null); }} outline color={T.gray} small>🗑 Changer</Btn>
            <Btn onClick={analyser} disabled={loading} style={{ flex: 1, justifyContent: "center" }}>
              {loading ? "⏳ Analyse en cours..." : "🔍 Analyser avec l'IA"}
            </Btn>
          </div>
        )}
      </Card>
    </div>
  );

  // STEP: DOUBLONS
  if (step === "doublons" && currentDublon) return (
    <div>
      <h3 style={{ marginBottom: 6, color: T.dark }}>🔍 Référence similaire détectée</h3>
      <p style={{ color: T.gray, marginBottom: 20, fontSize: 14 }}>
        {doublonsPending.length} article(s) à vérifier
      </p>

      <Card style={{ marginBottom: 16, border: `2px solid ${T.accent}` }}>
        <div style={{ fontSize: 13, color: T.gray, marginBottom: 4 }}>Article sur le document :</div>
        <div style={{ fontSize: 17, fontWeight: 700, color: T.dark }}>{currentDublon.designation}</div>
        <div style={{ fontSize: 14, color: T.gray }}>Réf. {currentDublon.reference} — {currentDublon.prixUnitaire} € / {currentDublon.unite}</div>
      </Card>

      <div style={{ fontSize: 14, fontWeight: 700, color: T.gray, marginBottom: 10 }}>Articles similaires dans votre catalogue :</div>

      {currentDublon.similaires.map(s => (
        <Card key={s.id} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{s.designation}</div>
              <div style={{ fontSize: 13, color: T.gray }}>Réf. interne : {s.referenceInterne || s.reference} — Vente : {s.prix} €</div>
              {s.refsFournisseurs?.length > 0 && (
                <div style={{ fontSize: 12, color: T.info }}>
                  Fournisseurs liés : {s.refsFournisseurs.map(r => r.reference).join(", ")}
                </div>
              )}
            </div>
            <Btn onClick={() => handleDublonChoice("lier_existant", s.id)} small color={T.info}>
              🔗 Lier
            </Btn>
          </div>
        </Card>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Btn onClick={() => handleDublonChoice("nouveau")} outline color={T.green} style={{ flex: 1, justifyContent: "center" }}>
          ➕ Créer comme nouveau
        </Btn>
        <Btn onClick={() => handleDublonChoice("ignorer")} outline color={T.danger} style={{ flex: 1, justifyContent: "center" }}>
          🚫 Ignorer
        </Btn>
      </div>
    </div>
  );

  // STEP: VALIDATION
  if (step === "validation") return (
    <div>
      <h3 style={{ marginBottom: 6, color: T.dark }}>✅ Valider les articles extraits</h3>
      <p style={{ color: T.gray, marginBottom: 16, fontSize: 14 }}>{lignes.filter(l => l.statut !== "ignorer").length} article(s) à intégrer</p>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.gray, marginBottom: 8 }}>Fournisseur</div>
        <input value={fournisseur} onChange={e => setFournisseur(e.target.value)}
          style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, boxSizing: "border-box" }} />
      </Card>

      {lignes.map(l => (
        <Card key={l.id} style={{ marginBottom: 12, opacity: l.statut === "ignorer" ? 0.5 : 1, border: l.statut === "lier_existant" ? `2px solid ${T.info}` : `1px solid ${T.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                <span style={{ background: T.greenPale, color: T.green, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{l.reference}</span>
                {l.statut === "lier_existant" && <span style={{ background: T.infoLight, color: T.info, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>🔗 Lié à existant</span>}
                {l.statut === "ignorer" && <span style={{ background: T.dangerLight, color: T.danger, padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>Ignoré</span>}
              </div>
              <input value={l.designation} onChange={e => updateLigne(l.id, "designation", e.target.value)}
                style={{ width: "100%", padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, fontWeight: 600, boxSizing: "border-box", marginBottom: 8 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: T.gray, marginBottom: 3 }}>Qté reçue</div>
                  <input type="number" value={l.quantite} onChange={e => updateLigne(l.id, "quantite", e.target.value)}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                <div>
                  <div style={{ fontSize: 11, color: T.gray, marginBottom: 3 }}>Prix achat HT</div>
                  <input type="number" value={l.prixUnitaire} onChange={e => updateLigne(l.id, "prixUnitaire", e.target.value)}
                    style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: `1px solid ${T.border}`, fontSize: 14, boxSizing: "border-box" }} />
                </div>
                {l.statut !== "lier_existant" && (
                  <div>
                    <div style={{ fontSize: 11, color: T.danger, marginBottom: 3, fontWeight: 700 }}>Prix vente HT ★</div>
                    <input type="number" value={l.prixVente} onChange={e => updateLigne(l.id, "prixVente", e.target.value)}
                      placeholder={l.prixUnitaire ? String(Math.round(l.prixUnitaire * 2)) : ""}
                      style={{ width: "100%", padding: "6px 10px", borderRadius: 8, border: `2px solid ${l.prixVente ? T.green : T.accent}`, fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                )}
              </div>
            </div>
            <button onClick={() => updateLigne(l.id, "statut", l.statut === "ignorer" ? "nouveau" : "ignorer")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, marginLeft: 10, padding: 4 }}>
              {l.statut === "ignorer" ? "↩️" : "🚫"}
            </button>
          </div>
        </Card>
      ))}

      <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
        <Btn onClick={() => setStep("upload")} outline color={T.gray}>← Retour</Btn>
        <Btn onClick={valider} style={{ flex: 1, justifyContent: "center" }} color={T.green}>
          ✅ Intégrer dans le catalogue ({lignes.filter(l => l.statut !== "ignorer").length} articles)
        </Btn>
      </div>
    </div>
  );

  // STEP: DONE
  if (step === "done") return (
    <div style={{ textAlign: "center", padding: 40 }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: T.green, marginBottom: 8 }}>Articles intégrés !</div>
      <div style={{ color: T.gray, marginBottom: 24 }}>Votre catalogue a été mis à jour.</div>
      <Btn onClick={() => { setStep("upload"); setImageBase64(null); setImagePreview(null); setLignes([]); setFournisseur(""); }}
        style={{ justifyContent: "center" }}>
        📷 Scanner un autre document
      </Btn>
    </div>
  );

  return null;
}
