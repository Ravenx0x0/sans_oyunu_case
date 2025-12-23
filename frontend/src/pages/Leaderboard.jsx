import React, { useEffect, useState } from "react";
import { api } from "../api.js";

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/leaderboard/");
        setRows(Array.isArray(data) ? data : data?.results || []);
      } catch (e) {
        setErr(String(e.message || e));
      }
    })();
  }, []);

  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Leaderboard</h2>
      {err ? <div style={{ color: "#ffb3b3", fontFamily: "monospace" }}>{err}</div> : null}
      <pre style={{ background: "#151515", padding: 12, borderRadius: 10, overflow: "auto" }}>
        {JSON.stringify(rows, null, 2)}
      </pre>
    </div>
  );
}
