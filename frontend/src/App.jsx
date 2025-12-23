import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getToken, api } from "./api";

import Login from "./pages/Login";
import Lobby from "./pages/Lobby";
import RoomPlay from "./pages/RoomPlay";

export default function App() {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);
  const token = getToken();

  useEffect(() => {
    let alive = true;

    async function boot() {
      if (!token) {
        if (!alive) return;
        setUser(null);
        setBooting(false);
        return;
      }

      try {
        const me = await api("/api/me/");
        if (!alive) return;
        setUser(me);
      } catch (e) {
        if (!alive) return;
        setUser(null);
      } finally {
        if (!alive) return;
        setBooting(false);
      }
    }

    setBooting(true);
    boot();

    return () => {
      alive = false;
    };
  }, [token]);

  // Token yoksa -> Login
  if (!token) {
    return (
      <HashRouter>
        <Routes>
          <Route path="*" element={<Login onLogin={() => {}} />} />
        </Routes>
      </HashRouter>
    );
  }

  if (booting) {
    return <div style={{ padding: 24, color: "white" }}>Yükleniyor…</div>;
  }

  // Token var ama me çekilemedi -> Login
  if (!user) {
    return (
      <HashRouter>
        <Routes>
          <Route path="*" element={<Login onLogin={() => {}} />} />
        </Routes>
      </HashRouter>
    );
  }

  return (
    <HashRouter>
      <Routes>
        {/* Lobby */}
        <Route path="/" element={<Lobby user={user} />} />
        <Route path="/lobby" element={<Lobby user={user} />} />

        {/* WS Oyun ekranı */}
        <Route path="/room/:id" element={<RoomPlay />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
}
