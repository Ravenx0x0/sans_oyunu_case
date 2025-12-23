import React, { useEffect, useState } from "react";
import { api } from "../api";

export default function AdminBetSettings({ token, me, onError }) {
  const [data, setData] = useState(null);
  const [info, setInfo] = useState("");

  useEffect(() => {
    async function load() {
      onError("");
      setInfo("");
      try {
        const res = await api.betSettings(token);
        setData(res);
      } catch (e) {
        if (e.status === 404) {
          setInfo("BetSettings endpoint yok. Django Admin üzerinden yönetiliyor (mock kabul).");
          return;
        }
        onError(e.message || "BetSettings failed");
      }
    }
    load();
  }, [token, onError]);

  const isAdmin = (me?.role || "user") === "admin";

  return (
    <div className="card">
      <h2>Admin – Bet Settings</h2>
      <div className="hint">
        Role: <b>{me?.role}</b> | Bu ekran minimum admin UI’ı temsil eder.
      </div>

      {!isAdmin ? (
        <div className="infoBox">
          Admin değilsin. Case gereği admin ekranı gösterildi (read-only/mocked).
        </div>
      ) : null}

      {info ? <div className="infoBox">{info}</div> : null}

      <pre className="preBox">
        {data ? JSON.stringify(data, null, 2) : "No data"}
      </pre>
    </div>
  );
}
