import { useState } from "react";
import { api, setToken } from "../api";
import { Link, useNavigate } from "react-router-dom";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });

      setToken(data.token);
      onLogin?.(data.user);
      nav("/lobby");
    } catch (err) {
      // DRF login hata formatın: { non_field_errors: [...] }
      const msg =
        err?.message && err.message !== "API Error"
          ? err.message
          : "Kullanıcı adı veya şifre hatalı";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={title}>Giriş Yap</h1>
          <div style={sub}>Hesabınla giriş yapıp lobby’ye geç.</div>
        </div>

        <form onSubmit={submit} style={{ display: "grid", gap: 12 }}>
          <div>
            <label style={label}>Kullanıcı Adı</label>
            <input
              style={input}
              placeholder="örn: melisa1"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div>
            <label style={label}>Şifre</label>
            <input
              style={input}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            style={loading ? btnDisabled : btn}
            type="submit"
            disabled={loading || !username || !password}
          >
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        {error ? <div style={errorBox}>{error}</div> : null}

        <div style={infoList}>
          <div style={infoItem}>
            <span style={bullet}>📌</span>
            <span>E-posta doğrulama bu projede <b>mock</b> kabul edilmiştir.</span>
          </div>
          <div style={infoItem}>
            <span style={bullet}>🚫</span>
            <span>18 yaş altı kullanıcıların kayıt olması engellenmiştir.</span>
          </div>
          <div style={infoItem}>
            <span style={bullet}>💰</span>
            <span>Yeni kullanıcı başlangıç bakiyesi: <b>1000</b></span>
          </div>
        </div>

        <div style={footerRow}>
          <span style={{ opacity: 0.75 }}>Hesabın yok mu?</span>
          <Link to="/signup" style={link}>
            Üye Ol
          </Link>
        </div>
      </div>
    </div>
  );
}

const page = {
  minHeight: "100vh",
  display: "grid",
  placeItems: "center",
  padding: 24,
  background:
    "radial-gradient(1200px 700px at 20% 10%, rgba(90,100,255,0.18), transparent 55%), radial-gradient(900px 600px at 80% 30%, rgba(255,120,200,0.10), transparent 50%), #0b0b0f",
  color: "#eaeaea",
};

const card = {
  width: "100%",
  maxWidth: 520,
  borderRadius: 20,
  padding: 22,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(18,18,22,0.72)",
  boxShadow: "0 20px 60px rgba(0,0,0,0.55)",
  backdropFilter: "blur(10px)",
};

const title = { margin: 0, fontSize: 40, letterSpacing: -0.5 };
const sub = { marginTop: 6, opacity: 0.75, lineHeight: 1.4 };

const label = { display: "block", fontSize: 12, opacity: 0.75, marginBottom: 6 };

const input = {
  width: "100%",
  borderRadius: 14,
  padding: "14px 14px",
  border: "1px solid rgba(255,255,255,0.10)",
  background: "rgba(255,255,255,0.04)",
  color: "#fff",
  outline: "none",
  fontSize: 15,
};

const btn = {
  width: "100%",
  borderRadius: 14,
  padding: "14px 14px",
  border: "1px solid rgba(90,100,255,0.55)",
  background: "rgba(90,100,255,0.35)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const btnDisabled = {
  ...btn,
  opacity: 0.5,
  cursor: "not-allowed",
};

const errorBox = {
  marginTop: 14,
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,80,80,0.35)",
  background: "rgba(255,80,80,0.08)",
  color: "#ffb4b4",
  fontWeight: 600,
};

const infoList = { marginTop: 16, display: "grid", gap: 10, opacity: 0.9 };
const infoItem = { display: "flex", gap: 10, alignItems: "flex-start", lineHeight: 1.35 };
const bullet = { width: 22, display: "inline-block", opacity: 0.9 };

const footerRow = {
  marginTop: 18,
  paddingTop: 14,
  borderTop: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const link = { color: "#b8d6ff", textDecoration: "none", fontWeight: 700 };
