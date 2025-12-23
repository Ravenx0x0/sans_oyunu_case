import React from "react";

export default function Admin({ me }) {
  return (
    <div>
      <h2 style={{ margin: "0 0 12px" }}>Admin</h2>
      <div style={{ opacity: 0.8 }}>
        Bu sayfa şimdilik placeholder. (Me role: {me?.role || "-"})
      </div>
      <div style={{ marginTop: 12, fontFamily: "monospace", background: "#151515", padding: 12, borderRadius: 10 }}>
        {JSON.stringify(me, null, 2)}
      </div>
    </div>
  );
}
