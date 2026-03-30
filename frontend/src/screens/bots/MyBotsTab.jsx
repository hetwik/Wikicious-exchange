/**
 * My Bots Tab — shows all the user's bots with live PnL,
 * start/pause/stop controls, and trade history per bot.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../hooks/useApi';

// Status badge colors
const STATUS_COLOR = {
  running: '#00ff88',
  paused:  '#f0a500',
  stopped: '#888',
  error:   '#ff4466',
};

export default function MyBotsTab({ address }) {
  const qc = useQueryClient();
  const [expandedBot, setExpandedBot] = useState(null);

  // ── Fetch user's bots ──────────────────────────────────────
  const { data: bots = [], isLoading } = useQuery({
    queryKey:        ['bots'],
    queryFn:         () => api.get('/api/bots').then(r => r.data),
    refetchInterval: 5_000,
  });

  // ── Bot action mutations ───────────────────────────────────
  const start  = useMutation({ mutationFn: id => api.patch(`/api/bots/${id}/start`),  onSuccess: () => qc.invalidateQueries(['bots']) });
  const pause  = useMutation({ mutationFn: id => api.patch(`/api/bots/${id}/pause`),  onSuccess: () => qc.invalidateQueries(['bots']) });
  const remove = useMutation({ mutationFn: id => api.delete(`/api/bots/${id}`),        onSuccess: () => qc.invalidateQueries(['bots']) });

  // ── Fetch trades for expanded bot ─────────────────────────
  const { data: trades = [] } = useQuery({
    queryKey: ['bot_trades', expandedBot],
    queryFn:  () => api.get(`/api/bots/${expandedBot}/trades`).then(r => r.data),
    enabled:  !!expandedBot,
  });

  if (isLoading) return <div className="loading">Loading bots…</div>;
  if (!bots.length) return (
    <div className="bots-empty">
      <div className="bots-empty-icon">🤖</div>
      <h3>No bots yet</h3>
      <p>Go to <strong>Strategies</strong> to create your first trading bot.</p>
    </div>
  );

  return (
    <div className="my-bots-tab">
      {/* ── Summary Bar ─────────────────────────────────────── */}
      <div className="bots-summary">
        <div className="summary-stat">
          <span className="label">Total Bots</span>
          <span className="value">{bots.length}</span>
        </div>
        <div className="summary-stat">
          <span className="label">Running</span>
          <span className="value green">{bots.filter(b => b.status === 'running').length}</span>
        </div>
        <div className="summary-stat">
          <span className="label">Total Trades</span>
          <span className="value">{bots.reduce((s, b) => s + (b.total_trades || 0), 0)}</span>
        </div>
        <div className="summary-stat">
          <span className="label">Total PnL</span>
          <span className={`value ${bots.reduce((s, b) => s + b.pnl, 0) >= 0 ? 'green' : 'red'}`}>
            ${bots.reduce((s, b) => s + (b.pnl || 0), 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* ── Bot Cards ───────────────────────────────────────── */}
      <div className="bot-cards">
        {bots.map(bot => (
          <div key={bot.id} className={`bot-card ${bot.status}`}>

            {/* Header row */}
            <div className="bot-card-header">
              <div className="bot-card-left">
                <span className="bot-type-badge">{bot.type.toUpperCase()}</span>
                <span className="bot-symbol">{bot.symbol}</span>
                <span className="bot-status-dot" style={{ background: STATUS_COLOR[bot.status] }} />
                <span className="bot-status-text">{bot.status}</span>
              </div>
              <div className="bot-card-right">
                <span className={`bot-pnl ${bot.pnl >= 0 ? 'green' : 'red'}`}>
                  {bot.pnl >= 0 ? '+' : ''}{(bot.pnl || 0).toFixed(2)} USDC
                </span>
              </div>
            </div>

            {/* Stats row */}
            <div className="bot-stats-row">
              <span>Trades: <strong>{bot.total_trades || 0}</strong></span>
              <span>Created: <strong>{new Date(bot.created_at * 1000).toLocaleDateString()}</strong></span>
              {bot.error_msg && <span className="bot-error">⚠️ {bot.error_msg.slice(0, 60)}</span>}
            </div>

            {/* Control buttons */}
            <div className="bot-controls">
              {bot.status !== 'running' && (
                <button
                  className="btn-start"
                  onClick={() => start.mutate(bot.id)}
                  disabled={start.isPending}
                >▶ Start</button>
              )}
              {bot.status === 'running' && (
                <button
                  className="btn-pause"
                  onClick={() => pause.mutate(bot.id)}
                  disabled={pause.isPending}
                >⏸ Pause</button>
              )}
              <button
                className="btn-trades"
                onClick={() => setExpandedBot(expandedBot === bot.id ? null : bot.id)}
              >📊 Trades</button>
              <button
                className="btn-stop"
                onClick={() => { if (window.confirm('Stop and remove this bot?')) remove.mutate(bot.id); }}
              >✕ Remove</button>
            </div>

            {/* Trade history drawer */}
            {expandedBot === bot.id && (
              <div className="bot-trades-drawer">
                <h4>Recent Trades</h4>
                {!trades.length ? <p className="muted">No trades yet</p> : (
                  <table className="trades-table">
                    <thead>
                      <tr><th>Time</th><th>Side</th><th>Size</th><th>Price</th><th>Reason</th></tr>
                    </thead>
                    <tbody>
                      {trades.slice(0, 20).map(t => (
                        <tr key={t.id}>
                          <td>{new Date(t.ts * 1000).toLocaleTimeString()}</td>
                          <td className={t.side === 'long' ? 'green' : 'red'}>{t.side.toUpperCase()}</td>
                          <td>${t.size.toFixed(2)}</td>
                          <td>${t.price.toFixed(2)}</td>
                          <td className="reason">{t.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
