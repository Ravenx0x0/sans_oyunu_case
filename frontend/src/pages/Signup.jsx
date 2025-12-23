import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function Signup({ onSignup }) {
  const [form, setForm] = useState({
    username: "",
    password: "",
    email: "",
    age: 18,
  });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  function set(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const ageNum = useMemo(() => Number(form.age), [form.age]);
  const isUnder18 = Number.isFinite(ageNum) && ageNum < 18;

  async function submit(e) {
    e.preventDefault();
    setErr("");
    setOk("");

    if (!form.username || !form.password) {
      setErr("Kullanıcı adı ve şifre zorunlu.");
      return;
    }
    if (!Number.isFinite(ageNum)) {
      setErr("Yaş alanı sayı olmalı.");
      return;
    }
    if (ageNum < 18) {
      setErr("18 yaş altı kullanıcıların kayıt olması engellenmiştir.");
      return;
    }

    try {
      setLoading(true);
      await onSignup({ ...form, age: ageNum });
      setOk("Kayıt alındı. Şimdi giriş ekranına yönlendiriliyorsun.");
      setTimeout(() => nav("/login"), 600);
    } catch (e2) {
      setErr(String(e2.message || e2));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ marginBottom: 18 }}>
          <h1 style={title}>Üye Ol</h1>
          <div style={sub}>
            E-posta doğrulama bu projede <b>mock</b>. Kayıt sonrası 1000 başlangıç bakiyesi tanımlanır.
          </div>
        </div>

        {err ? <div style={errorBox}>{err}</div> : null}
        {ok ? <div style={okBox}>{ok}</div> : null}

        <form onSubmit={submit} style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div>
            <label style={label}>Kullanıcı Adı</label>
            <input
              style={input}
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              placeholder="örn: melisa1"
              autoComplete="username"
            />
          </div>

          <div>
            <label style={label}>E-posta (mock)</label>
            <input
              style={input}
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="örn: melisa@mail.com"
              autoComplete="email"
            />
            <div style={hint}>Bu proje kapsamında e-posta doğrulama mock kabul edilir.</div>
          </div>

          <div>
            <label style={label}>Yaş</label>
            <input
              style={{
                ...input,
                borderColor: isUnder18 ? "rgba(255,80,80,0.45)" : "rgba(255,255,255,0.10)",
              }}
              value={form.age}
              onChange={(e) => set("age", e.target.value)}
              placeholder="örn: 25"
              inputMode="numeric"
            />
            {isUnder18 ? <div style={{ ...hint, color: "#ffb4b4" }}>18 yaş altı kayıt engellidir.</div> : null}
          </div>

          <div>
            <label style={label}>Şifre</label>
            <input
              style={input}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete="new-password"
            />
          </div>

          <button style={loading ? btnDisabled : btn} type="submit" disabled={loading}>
            {loading ? "Kayıt alınıyor..." : "Hesap Oluştur"}
          </button>
        </form>

        <div style={footerRow}>
          <span style={{ opacity: 0.75 }}>Zaten hesabın var mı?</span>
          <Link to="/login" style={link}>
            Giriş Yap
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
  maxWidth: 620,
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

const hint = { marginTop: 6, fontSize: 12, opacity: 0.7 };

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

const btnDisabled = { ...btn, opacity: 0.5, cursor: "not-allowed" };

const errorBox = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(255,80,80,0.35)",
  background: "rgba(255,80,80,0.08)",
  color: "#ffb4b4",
  fontWeight: 600,
};

const okBox = {
  padding: "10px 12px",
  borderRadius: 14,
  border: "1px solid rgba(82,255,163,0.30)",
  background: "rgba(82,255,163,0.08)",
  color: "#b8ffcf",
  fontWeight: 700,
  marginTop: 10,
};

const footerRow = {
  marginTop: 18,
  paddingTop: 14,
  borderTop: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const link = { color: "#b8d6ff", textDecoration: "none", fontWeight: 700 };
