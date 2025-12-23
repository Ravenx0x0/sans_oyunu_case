import { useEffect, useMemo, useRef, useState } from "react";

const WS_BASE = "ws://127.0.0.1:8001";

export default function RoomPlay({ roomId, token }) {
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState("");

  const [guess, setGuess] = useState("");
  const wsRef = useRef(null);

  const wsUrl = useMemo(() => {
    // Senin backend tarafında token query ile auth yoksa da bu url çalışır;
    // token’ı kullanmak istiyorsan backend AuthMiddleware’i token’a göre genişletmen gerekir.
    // Şimdilik mevcut consumer AuthMiddlewareStack ile session auth bekliyor.
    return `${WS_BASE}/ws/rooms/${roomId}/`;
  }, [roomId]);

  useEffect(() => {
    setError("");
    setSnapshot(null);
    setEvents([]);
    setConnected(false);

    // Önce varsa eski bağlantıyı kapat
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch (e) {}
      wsRef.current = null;
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
    };

    ws.onclose = () => {
      setConnected(false);
    };

    ws.onerror = () => {
      setError("WebSocket error");
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);

        if (msg.type === "SNAPSHOT") {
          setSnapshot(msg.payload);
          return;
        }

        if (msg.type === "INFO") {
          setEvents((prev) => [
            ...prev,
            { ts: Date.now(), kind: "INFO", payload: msg.payload },
          ]);
          return;
        }

        if (msg.type === "ERROR") {
          setError(msg?.payload?.detail || "Unknown error");
          setEvents((prev) => [
            ...prev,
            { ts: Date.now(), kind: "ERROR", payload: msg.payload },
          ]);
          return;
        }

        if (msg.type === "GAME_EVENT") {
          setEvents((prev) => [
            ...prev,
            { ts: Date.now(), kind: "GAME_EVENT", payload: msg.payload },
          ]);
          return;
        }

        // bilinmeyen tipler
        setEvents((prev) => [
          ...prev,
          { ts: Date.now(), kind: "RAW", payload: msg },
        ]);
      } catch (err) {
        setError("WS message parse error");
      }
    };

    return () => {
      try {
        ws.close();
      } catch (e) {}
    };
  }, [wsUrl]);

  const sendGuess = () => {
    setError("");
    const ws = wsRef.current;
    if (!ws || ws.readyState !== 1) {
      setError("WebSocket bağlı değil.");
      return;
    }

    const v = parseInt(guess, 10);
    if (Number.isNaN(v)) {
      setError("Tahmin sayı olmalı.");
      return;
    }

    ws.send(
      JSON.stringify({
        type: "GUESS",
        payload: { value: v },
      })
    );

    setGuess("");
  };

  return (
    <div style={{ marginTop: 16 }}>
      <h2>Room {roomId}</h2>

      <div style={{ opacity: 0.8, marginBottom: 8 }}>
        WS: {connected ? "connected" : "disconnected"}{" "}
        <span style={{ marginLeft: 10 }}>URL: {wsUrl}</span>
      </div>

      {error ? (
        <div
          style={{
            border: "1px solid #b91c1c",
            padding: 10,
            borderRadius: 8,
            marginBottom: 12,
          }}
        >
          <strong>Hata:</strong> {error}
        </div>
      ) : null}

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.15)",
          padding: 12,
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <h3>Snapshot</h3>
        <pre style={{ whiteSpace: "pre-wrap" }}>
          {snapshot ? JSON.stringify(snapshot, null, 2) : "No snapshot yet."}
        </pre>
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.15)",
          padding: 12,
          borderRadius: 10,
          marginBottom: 16,
        }}
      >
        <h3>Guess</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="1-100"
            style={{ padding: 8, width: 120 }}
          />
          <button onClick={sendGuess} style={{ padding: "8px 12px" }}>
            Send
          </button>
        </div>
        <div style={{ opacity: 0.7, marginTop: 8 }}>
          Not: Consumer tarafın AuthMiddlewareStack ile session auth bekliyor.
          React token ile WS auth istiyorsan, backend’te token doğrulayan middleware
          eklememiz gerekecek.
        </div>
      </div>

      <div
        style={{
          border: "1px solid rgba(255,255,255,0.15)",
          padding: 12,
          borderRadius: 10,
        }}
      >
        <h3>Events</h3>
        {events.length === 0 ? (
          <div style={{ opacity: 0.7 }}>No events yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {events
              .slice()
              .reverse()
              .map((ev) => (
                <div
                  key={ev.ts + "_" + ev.kind}
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    padding: 10,
                  }}
                >
                  <div style={{ opacity: 0.8, marginBottom: 6 }}>
                    {new Date(ev.ts).toLocaleTimeString()} — {ev.kind}
                  </div>
                  <pre style={{ whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
