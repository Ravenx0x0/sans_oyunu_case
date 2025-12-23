import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";

const STATUS = ["all", "open", "full", "finished"];

export default function Lobby({ user }) {
  const navigate = useNavigate();

  const [me, setMe] = useState(user || null);
  const [rooms, setRooms] = useState([]);
  const [status, setStatus] = useState("all");

  const [leaderboard, setLeaderboard] = useState([]);
  const [txs, setTxs] = useState([]);
  const [error, setError] = useState("");

  // yeni oda açma
  const [bet, setBet] = useState(50);
  const [creating, setCreating] = useState(false);

  const filteredRooms = useMemo(() => {
    if (status === "all") return rooms;
    return rooms.filter((r) => String(r.status).toLowerCase() === status);
  }, [rooms, status]);

  const finishedRooms = useMemo(() => {
    return rooms
      .filter((r) => String(r.status).toLowerCase() === "finished")
      .slice()
      .sort((a, b) => (b.finished_at || "").localeCompare(a.finished_at || ""));
  }, [rooms]);

  async function refreshAll() {
    setError("");
    try {
      const [meRes, roomsRes, lbRes, txRes] = await Promise.all([
        api("/api/me/"),
        api("/api/rooms/"),
        api("/api/leaderboard/"),
        api("/api/transactions/"),
      ]);

      setMe(meRes);
      setRooms(Array.isArray(roomsRes) ? roomsRes : roomsRes.results || []);
      setLeaderboard(Array.isArray(lbRes) ? lbRes : lbRes.results || []);
      setTxs(Array.isArray(txRes) ? txRes : txRes.results || []);
    } catch (e) {
      setError(e?.message || "Veri çekilemedi.");
    }
  }

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onJoinOrPlay(room) {
    const st = String(room.status).toLowerCase();
    if (st !== "open") return;

    setError("");
    try {
      await api(`/api/rooms/${room.id}/join/`, { method: "POST" });
      await refreshAll();
      navigate(`/room/${room.id}`);
    } catch (e) {
      setError(e?.message || "Odaya katılınamadı.");
    }
  }

  async function onCreateRoom() {
    setCreating(true);
    setError("");

    try {
      const betValue = Number(bet);

      if (!Number.isFinite(betValue) || betValue <= 0) {
        throw new Error("Bet tutarı geçersiz.");
      }

      // ODA OLUŞTURMA: backend'e POST
      // Eğer backend "bet" alanı bekliyorsa: bet_amount yerine bet yaz.
      const created = await api("/api/rooms/", {
        method: "POST",
        body: { bet_amount: betValue },
      });

      // Listeyi güncelle
      await refreshAll();

      // Odaya direkt yönlendir (created response farklıysa id fallback)
      const newId = created?.id;
      if (newId) navigate(`/room/${newId}`);
    } catch (e) {
      setError(e?.message || "Oda oluşturulamadı.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div style={wrap}>
      <div style={topRow}>
        <div>
          <h1 style={{ margin: 0 }}>Lobby</h1>
          <div style={{ opacity: 0.8, marginTop: 6 }}>
            Profil: <b>{me?.username || "-"}</b> &nbsp;|&nbsp; Bakiye:{" "}
            <b>{me?.balance ?? "-"}</b>
          </div>
        </div>

        <div style={topActions}>
          <div style={pillBox}>
            {STATUS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                style={chip(s === status)}
                type="button"
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>

          <button style={btn} onClick={refreshAll} type="button">
            Refresh
          </button>
        </div>
      </div>

      {error && <div style={err}>{error}</div>}

      <div style={grid}>
        {/* ROOMS */}
        <section style={card}>
          <h3 style={h3}>Rooms</h3>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input
              value={Number.isFinite(bet) ? bet : 50}
              onChange={(e) => {
                const v = Number(e.target.value);
                setBet(Number.isFinite(v) ? v : 50);
              }}
              type="number"
              min={1}
              style={input}
              placeholder="Bet"
            />
            <button
              style={btn2}
              onClick={onCreateRoom}
              disabled={creating}
              type="button"
              title="Backend POST /api/rooms/"
            >
              {creating ? "Oda Açılıyor..." : "Yeni Oda Aç"}
            </button>
          </div>

          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>ID</th>
                  <th style={th}>Bet</th>
                  <th style={th}>Status</th>
                  <th style={th}>Players</th>
                  <th style={th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((r) => {
                  const st = String(r.status).toLowerCase();

                  const players =
                    r.players_count ??
                    (Array.isArray(r.players) ? r.players.filter(Boolean).length : "-");

                  const betValue = r.bet_amount ?? r.bet ?? "-";

                  return (
                    <tr key={r.id}>
                      <td style={td}>{r.id}</td>
                      <td style={td}>{betValue}</td>
                      <td style={td}>
                        <span style={statusPill(st)}>{st}</span>
                      </td>
                      <td style={td}>{players}/2</td>

                      <td style={td}>
                        {st === "finished" ? (
                          <span style={{ opacity: 0.7 }}>Bitti</span>
                        ) : st === "open" ? (
                          <button
                            style={linkBtn}
                            onClick={() => onJoinOrPlay(r)}
                            type="button"
                          >
                            Katıl
                          </button>
                        ) : (
                          <Link to={`/room/${r.id}`} style={linkAsBtn}>
                            Play (WS)
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}

                {filteredRooms.length === 0 && (
                  <tr>
                    <td style={td} colSpan={5}>
                      Kayıt yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* FINISHED */}
        <section style={card}>
          <h3 style={h3}>Finished Rooms</h3>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Room</th>
                  <th style={th}>Winner</th>
                  <th style={th}>Bet</th>
                  <th style={th}>Finished</th>
                </tr>
              </thead>
              <tbody>
                {finishedRooms.slice(0, 10).map((r) => (
                  <tr key={r.id}>
                    <td style={td}>#{r.id}</td>
                    <td style={td}>{r.winner_username ?? r.winner ?? "-"}</td>
                    <td style={td}>{r.bet_amount ?? r.bet ?? "-"}</td>
                    <td style={td}>{formatDT(r.finished_at)}</td>
                  </tr>
                ))}
                {finishedRooms.length === 0 && (
                  <tr>
                    <td style={td} colSpan={4}>
                      Henüz biten oyun yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* LEADERBOARD */}
        <section style={card}>
          <h3 style={h3}>Leaderboard (Top 10)</h3>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>#</th>
                  <th style={th}>User</th>
                  <th style={th}>Score/Balance</th>
                </tr>
              </thead>
              <tbody>
                {(leaderboard || []).slice(0, 10).map((x, idx) => (
                  <tr key={x.id || x.username || idx}>
                    <td style={td}>{idx + 1}</td>
                    <td style={td}>{x.username ?? x.user ?? "-"}</td>
                    <td style={td}>{x.score ?? x.balance ?? "-"}</td>
                  </tr>
                ))}
                {(leaderboard || []).length === 0 && (
                  <tr>
                    <td style={td} colSpan={3}>
                      Leaderboard boş.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* TRANSACTIONS */}
        <section style={card}>
          <h3 style={h3}>Son Hesap Hareketleri</h3>
          <div style={tableWrap}>
            <table style={table}>
              <thead>
                <tr>
                  <th style={th}>Tarih</th>
                  <th style={th}>Type</th>
                  <th style={th}>Amount</th>
                  <th style={th}>Balance After</th>
                  <th style={th}>Room</th>
                </tr>
              </thead>
              <tbody>
                {(txs || []).slice(0, 10).map((t, idx) => (
                  <tr key={t.id || idx}>
                    <td style={td}>{formatDT(t.created_at || t.created)}</td>
                    <td style={td}>{t.type || "-"}</td>
                    <td style={td}>{t.amount ?? "-"}</td>
                    <td style={td}>{t.balance_after ?? "-"}</td>
                    <td style={td}>{t.room_id ?? t.room ?? "-"}</td>
                  </tr>
                ))}
                {(txs || []).length === 0 && (
                  <tr>
                    <td style={td} colSpan={5}>
                      Hesap hareketi yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: 10, opacity: 0.8 }}>
            Odaya git: <Link to="/room/12">/room/12</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function formatDT(s) {
  if (!s) return "-";
  try {
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) return String(s);
    return d.toLocaleString();
  } catch {
    return String(s);
  }
}

const wrap = { padding: 24, maxWidth: 1200, margin: "0 auto" };
const topRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: 16,
  flexWrap: "wrap",
  marginBottom: 14,
};
const topActions = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const pillBox = { display: "flex", gap: 8, flexWrap: "wrap" };

const grid = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
const card = { border: "1px solid #333", borderRadius: 14, padding: 14, background: "#151515" };
const h3 = { margin: "4px 0 12px" };

const tableWrap = { overflow: "auto", borderRadius: 12, border: "1px solid #2a2a2a" };
const table = { width: "100%", borderCollapse: "collapse" };
const th = {
  textAlign: "left",
  padding: "10px 10px",
  fontSize: 12,
  opacity: 0.8,
  borderBottom: "1px solid #2a2a2a",
  whiteSpace: "nowrap",
};
const td = { padding: "10px 10px", borderBottom: "1px solid #242424", whiteSpace: "nowrap" };

const btn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #3a3a3a",
  background: "#1d1d1d",
  color: "#fff",
  cursor: "pointer",
};
const btn2 = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #3a3a3a",
  background: "#232323",
  color: "#fff",
  cursor: "pointer",
};
const input = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #3a3a3a",
  background: "#1b1b1b",
  color: "#fff",
  width: 140,
};

const linkBtn = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #3a3a3a",
  background: "#202020",
  color: "#b8d6ff",
  cursor: "pointer",
};
const linkAsBtn = {
  ...linkBtn,
  display: "inline-block",
  textDecoration: "none",
  lineHeight: "normal",
};

const err = {
  padding: 12,
  borderRadius: 10,
  border: "1px solid #5a2a2a",
  background: "#221111",
  color: "#ffb4b4",
  marginBottom: 12,
};

function chip(active) {
  return {
    padding: "8px 10px",
    borderRadius: 999,
    border: "1px solid #3a3a3a",
    background: active ? "#2a2a2a" : "#1b1b1b",
    color: "#fff",
    cursor: "pointer",
    fontSize: 12,
  };
}

function statusPill(st) {
  const base = {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 12,
    border: "1px solid #333",
    background: "#1b1b1b",
  };
  if (st === "open") return { ...base, color: "#b8ffcf" };
  if (st === "full") return { ...base, color: "#b8d6ff" };
  if (st === "finished") return { ...base, color: "#ffd7a8" };
  return base;
}
