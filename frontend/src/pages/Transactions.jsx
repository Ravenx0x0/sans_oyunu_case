import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Transactions() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/transactions/");
        setRows(Array.isArray(data) ? data : data?.results || []);
      } catch (e) {
        setErr(String(e.message || e));
      }
    })();
  }, []);

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Hesap Hareketleri</h2>
      {err ? <div style={{ color: "#ffb3b3", fontFamily: "monospace" }}>{err}</div> : null}

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", opacity: 0.8 }}>
            <th style={th}>ID</th>
            <th style={th}>Type</th>
            <th style={th}>Amount</th>
            <th style={th}>Balance After</th>
            <th style={th}>Created</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.id} style={{ borderTop: "1px solid #333" }}>
              <td style={td}>{t.id}</td>
              <td style={td}>{t.type}</td>
              <td style={td}>{t.amount}</td>
              <td style={td}>{t.balance_after}</td>
              <td style={td}>{t.created_at || "-"}</td>
            </tr>
          ))}
          {!rows.length ? <tr><td style={td} colSpan={5}>Kayıt yok.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

const th = { padding: "10px 8px" };
const td = { padding: "12px 8px" };
