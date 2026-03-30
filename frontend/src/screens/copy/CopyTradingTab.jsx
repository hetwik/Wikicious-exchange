/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — Copy Trading Tab
 *
 *  Two sub-views:
 *  Discover  — browse master traders sorted by monthly PnL
 *  My Copies — manage your active copy subscriptions
 * ════════════════════════════════════════════════════════════════
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../hooks/useApi';

// Risk score → label and color
function riskLabel(score) {
  if (score <= 3) return { label: 'Conservative', color: '#00c896' };
  if (score <= 6) return { label: 'Moderate',     color: '#f0a500' };
  return           { label: 'Aggressive',   color: '#ff4466' };
}

export default function CopyTradingTab({ address }) {
  const qc = useQueryClient();
  const [view, setView]             = useState('discover'); // 'discover' | 'mine'
  const [subscribingTo, setSubTo]   = useState(null);       // master address currently subscribing to
  const [subForm, setSubForm]       = useState({ copyRatio: 1.0, maxTradeSize: 100, copySl: true, copyTp: true });
  const [expandedSub, setExpandedSub] = useState(null);

  // ── Fetch master traders ───────────────────────────────────
  const { data: masters = [] } = useQuery({
    queryKey:        ['copy_masters'],
    queryFn:         () => api.get('/api/copy/masters').then(r => r.data),
    refetchInterval: 30_000,
  });

  // ── Fetch my subscriptions ─────────────────────────────────
  const { data: subscriptions = [] } = useQuery({
    queryKey:        ['copy_subs'],
    queryFn:         () => api.get('/api/copy/subscriptions').then(r => r.data),
    refetchInterval: 10_000,
  });

  // ── Subscribe mutation ─────────────────────────────────────
  const subscribe = useMutation({
    mutationFn: () => api.post('/api/copy/subscribe', {
      masterAddress: subscribingTo,
      wallet:        address,
      ...subForm,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries(['copy_subs', 'copy_masters']);
      setSubTo(null);
    },
  });

  // ── Unsubscribe mutation ───────────────────────────────────
  const unsubscribe = useMutation({
    mutationFn: id => api.delete(`/api/copy/subscribe/${id}`).then(r => r.data),
    onSuccess:  () => qc.invalidateQueries(['copy_subs', 'copy_masters']),
  });

  // ── Fetch trades for expanded subscription ─────────────────
  const { data: copyTrades = [] } = useQuery({
    queryKey: ['copy_trades', expandedSub],
    queryFn:  () => api.get(`/api/copy/trades/${expandedSub}`).then(r => r.data),
    enabled:  !!expandedSub,
  });

  const subscribedAddresses = new Set(subscriptions.map(s => s.master_address));

  return (
    <div className="copy-trading-tab">
      {/* ── Sub-nav ───────────────────────────────────────────── */}
      <div className="copy-subnav">
        <button className={view === 'discover' ? 'active' : ''} onClick={() => setView('discover')}>
          🔍 Discover Traders
        </button>
        <button className={view === 'mine' ? 'active' : ''} onClick={() => setView('mine')}>
          📋 My Copies ({subscriptions.length})
        </button>
      </div>

      {/* ════════════════════════════════════════════════════════
           DISCOVER VIEW — master trader marketplace
          ════════════════════════════════════════════════════════ */}
      {view === 'discover' && (
        <div className="copy-discover">
          <div className="copy-header">
            <h2>Top Traders to Copy</h2>
            <p className="muted">Sorted by monthly PnL. Subscribe to automatically mirror their trades.</p>
          </div>

          <div className="masters-grid">
            {masters.map(master => {
              const risk    = riskLabel(master.risk_score);
              const already = subscribedAddresses.has(master.address);
              return (
                <div key={master.address} className="master-card">
                  {/* Verified badge */}
                  {master.verified ? <span className="verified-badge">✓ Verified</span> : null}

                  <div className="master-header">
                    <div className="master-avatar">
                      {master.username[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="master-name">{master.username}</div>
                      <div className="master-addr">{master.address.slice(0, 8)}…{master.address.slice(-4)}</div>
                    </div>
                  </div>

                  <div className="master-stats">
                    <div className="mstat">
                      <span className="mstat-label">Monthly PnL</span>
                      <span className="mstat-value green">+{master.monthly_pnl?.toFixed(1)}%</span>
                    </div>
                    <div className="mstat">
                      <span className="mstat-label">Win Rate</span>
                      <span className="mstat-value">{master.win_rate?.toFixed(1)}%</span>
                    </div>
                    <div className="mstat">
                      <span className="mstat-label">Total PnL</span>
                      <span className="mstat-value green">${(master.total_pnl || 0).toLocaleString()}</span>
                    </div>
                    <div className="mstat">
                      <span className="mstat-label">Followers</span>
                      <span className="mstat-value">{master.followers}</span>
                    </div>
                  </div>

                  <div className="master-risk" style={{ color: risk.color }}>
                    Risk: {risk.label} ({master.risk_score}/10)
                  </div>

                  {already ? (
                    <div className="already-copying">✓ Already Copying</div>
                  ) : (
                    <button
                      className="btn-copy"
                      onClick={() => { setSubTo(master.address); setSubForm({ copyRatio: 1.0, maxTradeSize: 100, copySl: true, copyTp: true }); }}
                      disabled={!address}
                    >
                      {address ? '📋 Copy Trader' : 'Connect Wallet'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Subscribe Modal ──────────────────────────────── */}
          {subscribingTo && (
            <div className="modal-overlay" onClick={() => setSubTo(null)}>
              <div className="modal-box" onClick={e => e.stopPropagation()}>
                <h3>Copy Trading Settings</h3>
                <p className="muted">Copying: <strong>{masters.find(m => m.address === subscribingTo)?.username}</strong></p>

                <div className="sub-form">
                  <label>
                    Copy Ratio
                    <span className="field-hint">1.0 = same size as master, 0.5 = half size</span>
                    <input type="number" min="0.01" max="10" step="0.01"
                      value={subForm.copyRatio}
                      onChange={e => setSubForm(f => ({ ...f, copyRatio: parseFloat(e.target.value) }))}
                    />
                  </label>
                  <label>
                    Max Trade Size (USDC)
                    <span className="field-hint">Cap per copied trade — protects against large positions</span>
                    <input type="number" min="5" step="5"
                      value={subForm.maxTradeSize}
                      onChange={e => setSubForm(f => ({ ...f, maxTradeSize: parseFloat(e.target.value) }))}
                    />
                  </label>
                  <div className="sub-checkboxes">
                    <label><input type="checkbox" checked={subForm.copySl}
                      onChange={e => setSubForm(f => ({ ...f, copySl: e.target.checked }))} /> Copy Stop-Losses</label>
                    <label><input type="checkbox" checked={subForm.copyTp}
                      onChange={e => setSubForm(f => ({ ...f, copyTp: e.target.checked }))} /> Copy Take-Profits</label>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn-cancel" onClick={() => setSubTo(null)}>Cancel</button>
                  <button className="btn-confirm"
                    onClick={() => subscribe.mutate()}
                    disabled={subscribe.isPending}
                  >
                    {subscribe.isPending ? 'Subscribing…' : '✓ Start Copying'}
                  </button>
                </div>

                {subscribe.isError && (
                  <div className="error-banner">{subscribe.error?.response?.data?.error || 'Error'}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
           MY COPIES VIEW — active subscriptions
          ════════════════════════════════════════════════════════ */}
      {view === 'mine' && (
        <div className="copy-mine">
          {!subscriptions.length ? (
            <div className="copy-empty">
              <div className="copy-empty-icon">📋</div>
              <h3>No active copy subscriptions</h3>
              <p>Go to <strong>Discover Traders</strong> to start copying top performers.</p>
              <button className="btn-discover" onClick={() => setView('discover')}>Discover Traders →</button>
            </div>
          ) : (
            <div className="my-copies-list">
              {subscriptions.map(sub => {
                const risk = riskLabel(sub.risk_score || 5);
                return (
                  <div key={sub.id} className="copy-sub-card">
                    <div className="copy-sub-header">
                      <div className="copy-sub-master">
                        <strong>{sub.username}</strong>
                        <span className="muted"> · {sub.master_address.slice(0, 8)}…</span>
                      </div>
                      <div className={`copy-sub-pnl ${sub.total_pnl >= 0 ? 'green' : 'red'}`}>
                        {sub.total_pnl >= 0 ? '+' : ''}{(sub.total_pnl || 0).toFixed(2)} USDC
                      </div>
                    </div>

                    <div className="copy-sub-stats">
                      <span>Copied Trades: <strong>{sub.total_trades}</strong></span>
                      <span>Ratio: <strong>{sub.copy_ratio}×</strong></span>
                      <span>Max Size: <strong>${sub.max_trade_size}</strong></span>
                      <span>Master Monthly: <strong className="green">+{sub.monthly_pnl?.toFixed(1)}%</strong></span>
                    </div>

                    <div className="copy-sub-actions">
                      <button className="btn-trades"
                        onClick={() => setExpandedSub(expandedSub === sub.id ? null : sub.id)}
                      >📊 Trade History</button>
                      <button className="btn-stop"
                        onClick={() => { if (window.confirm('Stop copying this trader?')) unsubscribe.mutate(sub.id); }}
                      >✕ Unsubscribe</button>
                    </div>

                    {/* Trade history drawer */}
                    {expandedSub === sub.id && (
                      <div className="copy-trades-drawer">
                        <h4>Copied Trades</h4>
                        {!copyTrades.length ? <p className="muted">No trades yet</p> : (
                          <table className="trades-table">
                            <thead>
                              <tr><th>Time</th><th>Symbol</th><th>Side</th><th>Size</th><th>Price</th><th>PnL</th></tr>
                            </thead>
                            <tbody>
                              {copyTrades.slice(0, 20).map(t => (
                                <tr key={t.id}>
                                  <td>{new Date(t.ts * 1000).toLocaleTimeString()}</td>
                                  <td>{t.symbol}</td>
                                  <td className={t.side === 'long' ? 'green' : 'red'}>{t.side.toUpperCase()}</td>
                                  <td>${t.size.toFixed(2)}</td>
                                  <td>${t.price.toFixed(2)}</td>
                                  <td className={t.pnl >= 0 ? 'green' : 'red'}>{t.pnl >= 0 ? '+' : ''}{t.pnl.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
