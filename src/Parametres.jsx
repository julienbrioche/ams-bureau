import { useState } from "react";

const COLORS = {
  primary: "#1a5c2e", secondary: "#2d7a45", accent: "#f0a500",
  dark: "#0f2d17", light: "#f4f9f5", gray: "#6b7c6e",
  border: "#d1e0d5", white: "#ffffff", danger: "#c0392b",
  greenPale: "#e8f5e9", dangerLight: "#fce4ec",
};

const Card = ({ children, style = {} }) => (
  <div style={{ background: COLORS.white, borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.07)", border: `1px solid ${COLORS.border}`, ...style }}>
    {children}
  </div>
);

function ListeEditable({ titre, icone, items, onAdd, onDelete, onRename }) {
  const [newItem, setNewItem] = useState("");
  const [editIndex, setEditIndex] = useState(null);
  const [editValue, setEditValue] = useState("");

  const handleAdd = () => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      onAdd(newItem.trim());
      setNewItem("");
    }
  };

  const handleRename = (i) => {
    if (editValue.trim() && editValue.trim() !== items[i]) {
      onRename(i, editValue.trim());
    }
    setEditIndex(null);
    setEditValue("");
  };

  return (
    <Card style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 22 }}>{icone}</span>
        <h3 style={{ margin: 0, color: COLORS.dark, fontSize: 16 }}>{titre}</h3>
        <span style={{ marginLeft: "auto", background: COLORS.greenPale, color: COLORS.primary, borderRadius: 20, padding: "2px 12px", fontSize: 13, fontWeight: 700 }}>{items.length}</span>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          placeholder={`Ajouter un élément...`}
          style={{ flex: 1, padding: "8px 12px", borderRadius: 8, border: `2px solid ${COLORS.accent}`, fontSize: 14 }}
        />
        <button onClick={handleAdd}
          style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          + Ajouter
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 6, background: COLORS.light, borderRadius: 20, padding: "4px 4px 4px 12px", border: `1px solid ${COLORS.border}` }}>
            {editIndex === i ? (
              <>
                <input
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleRename(i); if (e.key === "Escape") { setEditIndex(null); } }}
                  autoFocus
                  style={{ width: 120, padding: "3px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, fontSize: 13 }}
                />
                <button onClick={() => handleRename(i)} style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 6, padding: "3px 8px", cursor: "pointer", fontSize: 12 }}>✓</button>
                <button onClick={() => setEditIndex(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: COLORS.gray }}>✕</button>
              </>
            ) : (
              <>
                <span style={{ fontSize: 14, fontWeight: 500 }}>{item}</span>
                <button onClick={() => { setEditIndex(i); setEditValue(item); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: COLORS.gray, padding: "2px 4px" }}>✏️</button>
                <button onClick={() => onDelete(i)}
                  style={{ background: COLORS.dangerLight, border: "none", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, color: COLORS.danger, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function Parametres({ data, setData }) {
  const params = data.parametres || {};

  const updateListe = (cle, newList) => {
    setData(d => ({ ...d, parametres: { ...d.parametres, [cle]: newList } }));
  };

  const handleAdd = (cle, item) => {
    const list = [...(params[cle] || [])];
    if (!list.includes(item)) updateListe(cle, [...list, item]);
  };

  const handleDelete = (cle, index) => {
    const list = [...(params[cle] || [])];
    list.splice(index, 1);
    updateListe(cle, list);
  };

  const handleRename = (cle, index, newVal) => {
    const list = [...(params[cle] || [])];
    list[index] = newVal;
    updateListe(cle, list);
  };

  const listes = [
    { cle: "typesMachine", titre: "Types de machine", icone: "🏗️" },
    { cle: "marques", titre: "Marques", icone: "🏷️" },
    { cle: "typesControle", titre: "Types de contrôle", icone: "🔍" },
    { cle: "categoriesPieces", titre: "Catégories de pièces", icone: "📦" },
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 8, color: "#0f2d17" }}>⚙️ Paramètres</h2>
      <p style={{ color: COLORS.gray, marginBottom: 24, fontSize: 14 }}>
        Personnalisez les listes déroulantes de l'application. Les modifications sont sauvegardées automatiquement.
      </p>

      {listes.map(({ cle, titre, icone }) => (
        <ListeEditable
          key={cle}
          titre={titre}
          icone={icone}
          items={params[cle] || []}
          onAdd={item => handleAdd(cle, item)}
          onDelete={i => handleDelete(cle, i)}
          onRename={(i, v) => handleRename(cle, i, v)}
        />
      ))}
    </div>
  );
}
