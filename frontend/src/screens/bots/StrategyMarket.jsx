/**
 * Strategy Marketplace — browse all built-in bot strategies,
 * configure params, and deploy a new bot in one click.
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../hooks/useApi';
import { MARKET_SYMBOLS } from '../../config';

// Strategy feature descriptions shown in cards
const STRATEGY_INFO = {
  grid:     { icon: '⊞', color: '#4a9eff', tag: 'Sideways Markets' },
  dca:      { icon: '📅', color: '#00c896', tag: 'Long-term Accumulation' },
  rsi:      { icon: '📈', color: '#f0a500', tag: 'Mean Reversion' },
  macd:     { icon: '〰', color: '#aa66ff', tag: 'Trend Following' },
  breakout: { icon: '🚀', color: '#ff6644', tag: 'Momentum' },
  copy:     { icon: '📋', color: '#00d4ff', tag: 'Passive' },
  custom:   { icon: '🐍', color: '#ffcc00', tag: 'Advanced / HFT' },
};

export default function StrategyMarket({ address }) {
  const qc = useQueryClient();
  const [selected, setSelected]   = useState(null); // selected strategy key
  const [configForm, setConfigForm] = useState({});  // form values
  const [symbol, setSymbol]        = useState('BTCUSDT');
  const [marketIndex, setMarketIndex] = useState(0);
  const [successMsg, setSuccessMsg]   = useState('');

  // Fetch strategy templates from API
  const { data: strategies = [] } = useQuery({
    queryKey: ['strategies'],
    queryFn:  () => api.get('/api/bots/strategies').then(r => r.data),
  });

  const selectedStrategy = strategies.find(s => s.key === selected);

  // Create bot mutation
  const createBot = useMutation({
    mutationFn: () => api.post('/api/bots', {
      type:        selected,
      symbol,
      marketIndex,
      wallet:      address,
      config:      configForm,
    }).then(r => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries(['bots']);
      setSuccessMsg(`✅ Bot created! Start it from "My Bots" tab. ID: ${data.id}`);
      setSelected(null);
      setConfigForm({});
    },
  });

  return (
    <div className="strategy-market">
      {/* ── Strategy Cards ─────────────────────────────────── */}
      {!selected && (
        <>
          <h2>Choose a Strategy</h2>
          <p className="muted">Select a pre-built strategy below, or upload a custom Python bot.</p>

          {successMsg && (
            <div className="success-banner">{successMsg}</div>
          )}

          <div className="strategy-grid">
            {strategies.map(s => {
              const info = STRATEGY_INFO[s.key] || {};
              return (
                <div
                  key={s.key}
                  className="strategy-card"
                  style={{ borderColor: info.color }}
                  onClick={() => { setSelected(s.key); setConfigForm({}); setSuccessMsg(''); }}
                >
                  <div className="strategy-card-icon" style={{ color: info.color }}>{info.icon}</div>
                  <div className="strategy-card-tag" style={{ background: info.color + '22', color: info.color }}>
                    {info.tag}
                  </div>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <div className="strategy-meta">
                    <span>Best for: {s.bestFor}</span>
                    <span className={`risk-badge risk-${s.risk?.toLowerCase().replace(/[^a-z]/g,'')}`}>
                      Risk: {s.risk}
                    </span>
                  </div>
                  <button className="btn-select-strategy">Select →</button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Config Form ────────────────────────────────────── */}
      {selected && selectedStrategy && (
        <div className="strategy-config">
          <button className="btn-back" onClick={() => setSelected(null)}>← Back</button>
          <h2>{STRATEGY_INFO[selected]?.icon} Configure {selectedStrategy.name}</h2>
          <p className="muted">{selectedStrategy.description}</p>

          {/* Market selector */}
          <div className="config-section">
            <h3>Market</h3>
            <select
              value={symbol}
              onChange={e => {
                const idx = MARKET_SYMBOLS.indexOf(e.target.value);
                setSymbol(e.target.value);
                setMarketIndex(idx >= 0 ? idx : 0);
              }}
            >
              {MARKET_SYMBOLS.map((s, i) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Strategy-specific params */}
          {selectedStrategy.params.length > 0 && (
            <div className="config-section">
              <h3>Strategy Parameters</h3>
              <div className="config-params">
                {selectedStrategy.params.map(param => (
                  <div key={param.key} className="config-param">
                    <label>{param.label}</label>
                    <input
                      type={param.type === 'number' ? 'number' : 'text'}
                      placeholder={param.default !== undefined ? `Default: ${param.default}` : ''}
                      min={param.min}
                      max={param.max}
                      step={param.type === 'number' ? 'any' : undefined}
                      value={configForm[param.key] ?? (param.default ?? '')}
                      onChange={e => setConfigForm(f => ({
                        ...f,
                        [param.key]: param.type === 'number' ? parseFloat(e.target.value) : e.target.value,
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Custom Python bot — script upload */}
          {selected === 'custom' && (
            <div className="config-section">
              <h3>Python Script</h3>
              <p className="muted">
                Your script reads market data from stdin and prints trade signals to stdout.
                See <code>/bots/examples/</code> for templates.
              </p>
              <textarea
                className="script-editor"
                rows={20}
                placeholder="# Paste your Python strategy here..."
                value={configForm._script || ''}
                onChange={e => setConfigForm(f => ({ ...f, _script: e.target.value }))}
              />
            </div>
          )}

          {/* Create button */}
          {!address ? (
            <div className="connect-warning">Connect wallet to create a bot</div>
          ) : (
            <button
              className="btn-create-bot"
              onClick={() => createBot.mutate()}
              disabled={createBot.isPending}
            >
              {createBot.isPending ? 'Creating…' : `🤖 Create ${selectedStrategy.name} Bot`}
            </button>
          )}

          {createBot.isError && (
            <div className="error-banner">{createBot.error?.response?.data?.error || 'Error creating bot'}</div>
          )}
        </div>
      )}
    </div>
  );
}
