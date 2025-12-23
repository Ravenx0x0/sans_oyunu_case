// frontend/src/components/Navbar.jsx
import { Link, useLocation, useNavigate } from "react-router-dom";
import { setToken } from "../api";

export default function Navbar() {
  const nav = useNavigate();
  const loc = useLocation();

  const logout = () => {
    setToken(null);
    nav("/login");
  };

  const Item = ({ to, children }) => (
    <Link
      to={to}
      style={{
        padding: "10px 14px",
        borderRadius: 12,
        border: "1px solid rgba(255,255,255,0.12)",
        background: loc.pathname === to ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.06)",
        textDecoration: "none",
        color: "white",
        fontWeight: 600,
      }}
    >
      {children}
    </Link>
  );

  return (
    <div style={{ padding: 24, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
      <div style={{ fontSize: 28, fontWeight: 800, marginRight: 14 }}>Şans Oyunu Case</div>

      <Item to="/">Lobby</Item>
      <Item to="/leaderboard">Leaderboard</Item>
      <Item to="/transactions">Hesap Hareketleri</Item>
      <Item to="/admin">Admin</Item>

      <div style={{ flex: 1 }} />
      <button
        onClick={logout}
        style={{
          padding: "10px 14px",
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.16)",
          background: "rgba(255,255,255,0.06)",
          color: "white",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
}
