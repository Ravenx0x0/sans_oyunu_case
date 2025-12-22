import { useEffect, useMemo, useRef, useState } from "react";

export default function RoomPlay({ roomId, token }) {
  const wsRef = useRef(null);
  const [wsStatus, setWsStatus] = useState("connecting");
  const [snapshot, setSnapshot] = useState(null);
  const [events, setEvents] = useState([]);
  const [guess, setGuess] = useState("");

  const wsUrl = useMemo(() => {
    // token URL parametresi olarak gidiyor (senin yazdığın satırın doğru hali)
    return `ws://127.0.0.1:8001/ws/rooms/${roomId}/?token=${encodeURIComponent(
      token
    )}`;
  }, [roomId, token]);

  useEffect(() => {
    if (!roomId || !token) return;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsStatus("connected");

    ws.onmessage = (e) => {
      let msg;
      try {
        msg = JSON.parse(e.data);
      } catch {
        return;
      }

      if (msg.type === "SNAPSHOT") {
        setSnapshot(msg.payload);
        return;
      }

      if (msg.type === "INFO") {
        setEvents((prev) => [...prev, { type: "INFO", ...msg.payload }]);
        return;
      }

      if (msg.type === "ERROR") {
        setEvents((prev) => [...prev, { type: "ERROR", ...msg.payload }]);
        return;
      }

      if (msg.type === "GAME_EVENT") {
        setEvents((prev) => [...prev, msg.payload]);
        return;
      }
    };

    ws.onclose = () => setWsStatus("closed");
    ws.onerror = () => setWsStatus("error");

    return () => {
      ws.close();
    };
  }, [wsUrl, roomId, token]);

  const sendGuess = () => {
    const v = Number(guess);
    if (!Number.isInteger(v)) return;

    wsRef.current?.send(
      JSON.stringify({
        type: "GUESS",
        payload: { value: v },
      })
    );
    setGuess("");
  };

  return (
    <div style={{ marginTop: 16, padding: 16, border: "1px solid #333", borderRadius: 12 }}>
      <h2>Room #{roomId}</h2>
      <div>WS: {wsStatus}</div>

      <h3 style={{ marginTop: 16 }}>Snapshot</h3>
      <pre style={{ background: "#111", padding: 12, borderRadius: 8 }}>
        {snapshot ? JSON.stringify(snapshot, null, 2) : "Bekleniyor..."}
      </pre>

      <h3 style={{ marginTop: 16 }}>Guess</h3>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={guess}
          onChange={(e) => setGuess(e.target.value)}
          placeholder="1-100"
          style={{ padding: 8, minWidth: 140 }}
        />
        <button onClick={sendGuess} disabled={wsStatus !== "connected"} style={{ padding: "8px 12px" }}>
          Gönder
        </button>
      </div>

      <h3 style={{ marginTop: 16 }}>Events</h3>
      <div style={{ display: "grid", gap: 8 }}>
        {events.slice().reverse().map((ev, idx) => (
          <pre key={idx} style={{ background: "#111", padding: 12, borderRadius: 8 }}>
            {JSON.stringify(ev, null, 2)}
          </pre>
        ))}
      </div>
    </div>
  );
}
export default function RoomPlay({ roomId, token }) {
  return (
    <div>
      <h2>Room {roomId}</h2>
    </div>
  );
}
