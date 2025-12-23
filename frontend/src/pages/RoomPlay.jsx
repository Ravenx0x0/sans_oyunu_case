import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE, api, getToken } from "../api";

export default function RoomPlay() {
  const { id } = useParams();
  const roomId = id;

  const token = getToken();
  const wsRef = useRef(null);

  const [status, setStatus] = useState("connecting");
  const [snapshot, setSnapshot] = useState(null);
  const [events, setEvents] = useState([]);
  const [guess, setGuess] = useState("");
  const [err, setErr] = useState("");
  const [me, setMe] = useState(null);
  const [showDebug, setShowDebug] = useState(false);

  const wsUrl = useMemo(() => {
    return `ws://127.0.0.1:8000/ws/rooms/${roomId}/?token=${encodeURIComponent(token || "")}`;
  }, [roomId, token]);

  // me (username) -> turn kıyaslamak için
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const m = await api("/api/me/");
        if (!alive) return;
        setMe(m);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    setErr("");
    setStatus("connecting");
    setSnapshot(null);
    setEvents([]);

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setStatus("open");

    ws.onclose = (e) => {
      setStatus(`closed (${e.code})`);
      if (e.code !== 1000) {
        setEvents((p) => [
          { kind: "WS_CLOSED", payload: { code: e.code, reason: e.reason || "" }, ts: Date.now() },
          ...p,
        ]);
      }
    };

    ws.onerror = () => {
      setEvents((p) => [
        { kind: "WS_ERROR", payload: { detail: "WebSocket error" }, ts: Date.now() },
        ...p,
      ]);
    };

    ws.onmessage = (m) => {
      try {
        const msg = JSON.parse(m.data);

        if (msg.type === "SNAPSHOT") {
          setSnapshot(msg.payload);
          return;
        }

        if (msg.type === "INFO") {
          setEvents((p) => [{ kind: "INFO", payload: msg.payload, ts: Date.now() }, ...p]);
          return;
        }

        if (msg.type === "ERROR") {
          const detail = msg.payload?.detail || "Error";
          setErr(detail);
          setEvents((p) => [{ kind: "ERROR", payload: msg.payload, ts: Date.now() }, ...p]);
          return;
        }

        if (msg.type === "GAME_EVENT") {
          setEvents((p) => [{ kind: "GAME_EVENT", payload: msg.payload, ts: Date.now() }, ...p]);
          return;
        }
      } catch {
        // ignore
      }
    };

    return () => {
      try {
        ws.close();
      } catch {}
    };
  }, [wsUrl]);

  const roomStatus = String(snapshot?.status || "—").toLowerCase();
  const players = Array.isArray(snapshot?.players) ? snapshot.players.filter(Boolean) : [];
  const betAmount = snapshot?.bet_amount ?? snapshot?.bet ?? "—";
  const turn = snapshot?.turn ?? null;
  const winner = snapshot?.winner ?? null;
  const finishedAt = snapshot?.finished_at ?? null;

  const isFull = roomStatus === "full";
  const isFinished = roomStatus === "finished" || Boolean(finishedAt) || Boolean(winner);

  const myUsername = me?.username || null;
  const isMyTurn = Boolean(myUsername && turn && String(turn) === String(myUsername));

  const canGuess = isFull && !isFinished && isMyTurn;

  function sendGuess() {
    try {
      setErr("");
      const v = Number(guess);
      if (!Number.isFinite(v)) throw new Error("Tahmin sayı olmalı.");
      if (v < 1 || v > 100) throw new Error("Tahmin 1–100 arasında olmalı.");
      if (!isFull) throw new Error("Oyun başlamadı (oda full değil).");
      if (!isMyTurn) throw new Error("Sıra sende değil.");

      wsRef.current?.send(JSON.stringify({ type: "GUESS", payload: { value: v } }));
      setGuess("");
    } catch (e) {
      setErr(String(e.message || e));
    }
  }

  return (
    <div style={page}>
      {/* Header */}
      <div style={header}>
        <div>
          <div style={titleRow}>
            <h1 style={{ margin: 0, fontSize: 22 }}>Room #{roomId}</h1>
            <span style={pill(roomStatus)}>{roomStatus.toUpperCase()}</span>
          </div>
          <div style={subRow}>
            <span style={muted}>Bet:</span> <b>{betAmount}</b>
            <span style={dot}>•</span>
            <span style={muted}>Players:</span>{" "}
            <b>{players.length}/2</b>
            {turn ? (
              <>
                <span style={dot}>•</span>
                <span style={muted}>Turn:</span> <b>{turn}</b>
              </>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={ghostBtn} type="button" onClick={() => setShowDebug((s) => !s)}>
            {showDebug ? "Debug Gizle" : "Debug Göster"}
          </button>
          <Link style={primaryBtn} to="/lobby">
            Lobby
          </Link>
        </div>
      </div>

      {/* Alerts */}
      {err ? <div style={alert}>{err}</div> : null}

      {/* Main grid */}
      <div style={mainGrid}>
        {/* Left column */}
        <div style={{ display: "grid", gap: 12 }}>
          {/* Game card */}
          <div style={card}>
            <div style={cardHead}>
              <h3 style={cardTitle}>Oyun Paneli</h3>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={smallMuted}>WS:</span>
                <span style={smallMono}>{status}</span>
              </div>
            </div>

            {/* Players */}
            <div style={playersGrid}>
              <div style={playerCard(turn === players?.[0])}>
                <div style={smallMuted}>Player 1</div>
                <div style={playerName}>{players?.[0] || "—"}</div>
                {turn === players?.[0] ? <div style={turnBadge}>Sıra</div> : null}
              </div>
              <div style={playerCard(turn === players?.[1])}>
                <div style={smallMuted}>Player 2</div>
                <div style={playerName}>{players?.[1] || "—"}</div>
                {turn === players?.[1] ? <div style={turnBadge}>Sıra</div> : null}
              </div>
            </div>

            {/* Finished */}
            {isFinished ? (
              <div style={resultBox}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Oyun Bitti</div>
                <div style={muted}>
                  Kazanan: <b>{winner || "—"}</b>
                  {finishedAt ? (
                    <>
                      <span style={dot}>•</span>
                      {new Date(finishedAt).toLocaleString()}
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}

            {/* Guess */}
            <div style={guessRow}>
              <div style={{ flex: 1 }}>
                <div style={smallMuted}>Tahmin (1–100)</div>
                <input
                  value={guess}
                  onChange={(e) => setGuess(e.target.value)}
                  type="number"
                  min={1}
                  max={60}
                  placeholder="Örn: 42"
                  style={guessInput}
                  disabled={!isFull || isFinished}
                />
                {!isFull ? (
                  <div style={hint}>Oyun, 2 oyuncu olunca başlar.</div>
                ) : !isMyTurn ? (
                  <div style={hint}>Sıra sende değil.</div>
                ) : (
                  <div style={hint}>Sıra sende. Tahminini gönder.</div>
                )}
              </div>

              <button
                style={canGuess ? ctaBtn : ctaBtnDisabled}
                onClick={sendGuess}
                disabled={!canGuess}
                type="button"
              >
                Guess
              </button>
            </div>
          </div>

          {/* Debug snapshot */}
          {showDebug ? (
            <div style={card}>
              <div style={cardHead}>
                <h3 style={cardTitle}>Debug Snapshot</h3>
                <div style={smallMuted}>
                  API: {API_BASE}
                </div>
              </div>
              <pre style={pre}>{JSON.stringify(snapshot, null, 2)}</pre>
            </div>
          ) : null}
        </div>

        {/* Right column: Events */}
        <div style={card}>
          <div style={cardHead}>
            <h3 style={cardTitle}>Event Log</h3>
            <div style={smallMuted}>{events.length ? `Son ${Math.min(20, events.length)} event` : "—"}</div>
          </div>

          <div style={logWrap}>
            {events.slice(0, 20).map((e, i) => (
              <div key={i} style={logItem}>
                <div style={logMeta}>
                  <span style={logKind(e.kind)}>{e.kind}</span>
                  <span style={logTime}>{new Date(e.ts).toLocaleTimeString()}</span>
                </div>
                <pre style={logPre}>{JSON.stringify(e.payload, null, 2)}</pre>
              </div>
            ))}
            {!events.length ? <div style={muted}>Henüz event yok.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---- styles ---- */
const page = {
  maxWidth: 1280,
  margin: "0 auto",
  padding: 28,
  color: "#eaeaea",
};

const header = {
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  alignItems: "center",
  marginBottom: 16,
  flexWrap: "wrap",
};

const titleRow = { display: "flex", alignItems: "center", gap: 10 };
const subRow = { marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" };

const dot = { opacity: 0.35 };
const muted = { opacity: 0.75 };
const smallMuted = { opacity: 0.7, fontSize: 12 };
const smallMono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", fontSize: 12, opacity: 0.8 };

const mainGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
  alignItems: "start",
};


const card = {
  border: "1px solid #2a2a2a",
  borderRadius: 16,
  background: "#141414",
  padding: 18,
};

const cardHead = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 12 };
const cardTitle = { margin: 0, fontSize: 15 };

const alert = {
  marginBottom: 12,
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #5a2a2a",
  background: "#221111",
  color: "#ffb4b4",
};

const playersGrid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginBottom: 16 };

const playerCard = (active) => ({
  border: `1px solid ${active ? "#3b5bff" : "#2a2a2a"}`,
  borderRadius: 12,
  padding: 12,
  background: active ? "rgba(59,91,255,0.08)" : "#111",
  position: "relative",
});

const playerName = { fontSize: 16, fontWeight: 700, marginTop: 4 };

const turnBadge = {
  position: "absolute",
  top: 10,
  right: 10,
  fontSize: 12,
  padding: "4px 8px",
  borderRadius: 999,
  border: "1px solid #3b5bff",
  color: "#b8d6ff",
  background: "rgba(59,91,255,0.08)",
};

const resultBox = {
  borderRadius: 12,
  border: "1px solid #2f3a2f",
  background: "rgba(82,255,163,0.06)",
  padding: 12,
  marginBottom: 12,
};

const guessRow = { display: "flex", gap: 10, alignItems: "row" };

const guessInput = {
  marginTop: 6,
  width: "60%",
  padding: "12px 12px",
  borderRadius: 12,
  border: "1px solid #2a2a2a",
  background: "#0f0f0f",
  color: "#fff",
  fontSize: 14,
};

const hint = { marginTop: 6, fontSize: 12, opacity: 0.7 };

const logWrap = {
  display: "grid",
  gap: 12,
  maxHeight: 560,
  overflow: "auto",
  paddingRight: 6,
};
const logItem = { border: "1px solid #222", background: "#101010", borderRadius: 12, padding: 10 };
const logMeta = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 };
const logTime = { opacity: 0.7, fontSize: 12 };

const logKind = (k) => {
  const base = {
    fontSize: 12,
    padding: "3px 8px",
    borderRadius: 999,
    border: "1px solid #2a2a2a",
  };
  if (k === "ERROR") return { ...base, borderColor: "#5a2a2a", color: "#ffb4b4", background: "rgba(255,80,80,0.06)" };
  if (k === "GAME_EVENT") return { ...base, borderColor: "#2a4a5a", color: "#b8d6ff", background: "rgba(120,170,255,0.06)" };
  if (k === "INFO") return { ...base, borderColor: "#2f3a2f", color: "#b8ffcf", background: "rgba(82,255,163,0.06)" };
  return { ...base, opacity: 0.85 };
};

const logPre = { margin: 0, overflow: "auto", fontSize: 12, opacity: 0.9 };

const pre = { margin: 0, overflow: "auto", fontSize: 12, opacity: 0.9 };

const pill = (st) => {
  const base = {
    fontSize: 12,
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #2a2a2a",
    background: "#0f0f0f",
    opacity: 0.9,
  };
  if (st === "open") return { ...base, borderColor: "#2f3a2f", color: "#b8ffcf" };
  if (st === "full") return { ...base, borderColor: "#2a4a5a", color: "#b8d6ff" };
  if (st === "finished") return { ...base, borderColor: "#5a4a2a", color: "#ffd7a8" };
  return base;
};

const primaryBtn = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #3a3a3a",
  background: "#1d1d1d",
  color: "#fff",
  textDecoration: "none",
};

const ghostBtn = {
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid #2a2a2a",
  background: "transparent",
  color: "#d8d8d8",
  cursor: "pointer",
};

const ctaBtn = {
  padding: "12px 14px",
  borderRadius: 12,
  border: "1px solid #3b5bff",
  background: "rgba(59,91,255,0.14)",
  color: "#b8d6ff",
  cursor: "pointer",
  minWidth: 120,
  fontWeight: 700,
};

const ctaBtnDisabled = {
  ...ctaBtn,
  opacity: 0.45,
  cursor: "not-allowed",
};

