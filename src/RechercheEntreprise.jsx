import { useState, useEffect, useRef } from "react";

const COLORS = {
  primary: "#1a5c2e", light: "#f4f9f5", gray: "#6b7c6e",
  border: "#d1e0d5", white: "#ffffff", accent: "#f0a500",
  greenPale: "#e8f5e9", dark: "#0f2d17", info: "#2471a3",
};

export default function RechercheEntreprise({ onSelect }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(query)}&limit=6`
        );
        const data = await res.json();
        const results = (data.results || []).map(r => ({
          siret: r.siege?.siret || "",
          siren: r.siren || "",
          nom: r.nom_complet || r.nom_raison_sociale || "",
          adresse: r.siege?.adresse || "",
          ville: r.siege?.libelle_commune || "",
          codePostal: r.siege?.code_postal || "",
          naf: r.activite_principale || "",
          dirigeant: r.dirigeants?.[0] ? `${r.dirigeants[0].prenom || ""} ${r.dirigeants[0].nom || ""}`.trim() : "",
        }));
        setSuggestions(results);
        setShowDropdown(true);
      } catch (e) {
        setSuggestions([]);
      }
      setLoading(false);
    }, 400);
  }, [query]);

  const handleSelect = (s) => {
    onSelect(s);
    setQuery(s.nom);
    setShowDropdown(false);
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", marginBottom: 16 }}>
      <label style={{ fontSize: 13, color: COLORS.gray, display: "block", marginBottom: 4 }}>
        🔍 Rechercher une entreprise (auto-complétion)
      </label>
      <div style={{ position: "relative" }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tapez le nom de la société..."
          style={{
            width: "100%", padding: "10px 14px", borderRadius: 10,
            border: `2px solid ${COLORS.accent}`, fontSize: 15,
            boxSizing: "border-box", fontWeight: 600,
          }}
        />
        {loading && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}>⏳</div>
        )}
      </div>

      {showDropdown && suggestions.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
          background: COLORS.white, border: `1px solid ${COLORS.border}`,
          borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.15)", overflow: "hidden",
        }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => handleSelect(s)}
              style={{
                width: "100%", textAlign: "left", padding: "12px 16px",
                border: "none", background: "none", cursor: "pointer",
                borderBottom: i < suggestions.length - 1 ? `1px solid ${COLORS.border}` : "none",
              }}
              onMouseEnter={e => e.currentTarget.style.background = COLORS.greenPale}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.dark }}>{s.nom}</div>
              <div style={{ fontSize: 12, color: COLORS.gray, marginTop: 2 }}>
                {s.adresse} {s.codePostal} {s.ville}
                {s.siren && <span style={{ marginLeft: 8, color: COLORS.info }}>SIREN: {s.siren}</span>}
              </div>
              {s.naf && <div style={{ fontSize: 11, color: COLORS.gray }}>NAF: {s.naf}</div>}
            </button>
          ))}
        </div>
      )}

      {showDropdown && suggestions.length === 0 && !loading && query.length >= 3 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 200,
          background: COLORS.white, border: `1px solid ${COLORS.border}`,
          borderRadius: 10, padding: 12, fontSize: 14, color: COLORS.gray,
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}>
          Aucune entreprise trouvée
        </div>
      )}
    </div>
  );
}
