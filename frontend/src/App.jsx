import { useEffect, useState } from "react";
import RoomPlay from "./RoomPlay.jsx";

const API_BASE = "http://127.0.0.1:8001";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token") || "");
  const [username, setUsername] = useState("mel"); // istersen boş bırak
  const [password, setPassword] = useState("");    // şifreni yaz
  const [me, setMe] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomIdToPlay, setRoomIdToPlay] = useState("");
  const [err, setErr] = useState("");

  // token varsa kullanıcı + oda listesini çek
  useEffect(() => {
    if (!token) return;

    fetch(`${API_BASE}/api/me/`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((r) => r.json())
      .then(setMe)
      .catch(() => {});

    fetch(`${API_BASE}/api/rooms/`, {
      headers: { Authorization: `Token ${token}` },
    })
      .then((r) => r.json())
      .then(setRooms)
      .catch(() => {});
  }, [token]);

  const login = async () => {
    setErr("");
    try {
      const r = await fetch(`${API_BASE}/api/auth/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await r.json();
      if (!r.ok) {
        setErr(JSON.stringify(data));
        return;
      }

      localStorage.setItem("token", data.token);
      setToken(data.token);
    } catch (e) {
      setErr(String(e));
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setMe(null);
    setRooms([]);
    setRoomIdToPlay("");
  };

  if (!token) {
    return (
      <div style={{ padding: 24, maxWidth: 520 }}>
        <h1>Login</h1>

        <div style={{ display: "grid", gap: 8 }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="username"
            style={{ padding: 10 }}
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            type="password"
            style={{ padding: 10 }}
          />
          <button onClick={login} style={{ padding: 10 }}>
            Login
          </button>
        </div>

        {err && (
          <pre style={{ marginTop: 12, background: "#111", padding: 12 }}>
            {err}
          </pre>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Rooms</h1>
        <button onClick={logout}>Logout</button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <strong>Me:</strong>{" "}
        {me ? `${me.username} (balance: ${me.balance})` : "loading..."}
      </div>

      <h3>Oda listesi</h3>
      <pre style={{ background: "#111", padding: 12, borderRadius: 8 }}>
        {JSON.stringify(rooms, null, 2)}
      </pre>

      <div style={{ marginTop: 16 }}>
        <h3>RoomPlay aç</h3>
        <input
          value={roomIdToPlay}
          onChange={(e) => setRoomIdToPlay(e.target.value)}
          placeholder="room id (örn 6)"
          style={{ padding: 10, minWidth: 200 }}
        />
      </div>

      {roomIdToPlay && <RoomPlay roomId={roomIdToPlay} token={token} />}
    </div>
  );
}
