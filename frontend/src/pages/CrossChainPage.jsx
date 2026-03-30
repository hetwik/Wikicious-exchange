import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = (path) => axios.get(`${API_URL}${path}`).then(r => r.data);

// ── Constants ──────────────────────────────────────────────────────────────
const CHAINS = {
  1:     { name: 'Ethereum',  icon: '⬡',  color: '#627EEA', short: 'ETH'  },
  10:    { name: 'Optimism',  icon: '🔴', color: '#FF0420', short: 'OP'   },
  42161: { name: 'Arbitrum',  icon: '🔵', color: '#12AAFF', short: 'ARB'  },
  8453:  { name: 'Base',      icon: '🟦', color: '#0052FF', short: 'BASE' },
  137:   { name: 'Polygon',   icon: '🟣', color: '#8247E5', short: 'MATIC'},
};

const MARKETS = [
  { id: 'BTC/USD',  symbol: 'BTC/USD-PERP',  maxLev: 125, icon: '₿',  color: '#F7931A' },
  { id: 'ETH/USD',  symbol: 'ETH/USD-PERP',  maxLev: 100, icon: 'Ξ',  color: '#627EEA' },
  { id: 'SOL/USD',  symbol: 'SOL/USD-PERP',  maxLev: 50,  icon: '◎',  color: '#9945FF' },
  { id: 'ARB/USD',  symbol: 'ARB/USD-PERP',  maxLev: 50,  icon: 'A',  color: '#12AAFF' },
  { id: 'BNB/USD',  symbol: 'BNB/USD-PERP',  maxLev: 75,  icon: 'B',  color: '#F3BA2F' },
  { id: 'AVAX/USD', symbol: 'AVAX/USD-PERP', maxLev: 50,  icon: 'A',  color: '#E84142' },
];

const INTENT_STATUS = {
  Pending:   { color: '#FFB800', label: 'Pending',   dot: '🟡' },
  Fulfilled: { color: '#00E5A0', label: 'Filled',    dot: '🟢' },
  Cancelled: { color: '#FF4060', label: 'Cancelled', dot: '🔴' },
  Expired:   { color: '#4A5270', label: 'Expired',   dot: '⚫' },
};

// ── Components ────────────────────────────────────────────────────────────

function ChainPill({ chainId, size = 'sm' }) {
  const c = CHAINS[chainId] || CHAINS[42161];
  const pad = size === 'sm' ? '3px 8px' : '6px 14px';
  return (
    <span style={{ padding: pad, borderRadius: 20, fontSize: size === 'sm' ? 11 : 13,
      fontWeight: 700, background: `${c.color}20`, color: c.color, border: `1px solid ${c.color}40`,
      display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {c.icon} {c.short}
    </span>
  );
}

function RouteVisualizer({ srcChain = 42161, destChain, fee, time }) {
  const src  = CHAINS[srcChain]  || CHAINS[42161];
  const dest = CHAINS[destChain] || CHAINS[42161];
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '14px 0' }}>
      <div style={{ textAlign: 'center', minWidth: 80 }}>
        <div style={{ fontSize: 24 }}>{src.icon}</div>
        <div style={{ color: src.color, fontWeight: 700, fontSize: 11, marginTop: 4 }}>{src.name}</div>
      </div>
      <div style={{ flex: 1, position: 'relative', height: 2, background: '#1C2138' }}>
        {/* Animated dot */}
        <div style={{ position: 'absolute', top: -4, left: '50%', transform: 'translateX(-50%)',
          width: 10, height: 10, borderRadius: '50%', background: '#5B7FFF',
          boxShadow: '0 0 8px #5B7FFF', animation: 'pulse 2s infinite' }} />
        <div style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)',
          whiteSpace: 'nowrap', textAlign: 'center' }}>
          <div style={{ color: '#5B7FFF', fontSize: 10, fontWeight: 700 }}>Fee: ${fee ? (Number(fee)/1e6).toFixed(2) : '—'}</div>
        </div>
        <div style={{ position: 'absolute', top: 8, left: '50%', transform: 'translateX(-50%)',
          whiteSpace: 'nowrap', color: '#4A5270', fontSize: 9 }}>~{time || '2–5 min'}</div>
      </div>
      <div style={{ textAlign: 'center', minWidth: 80 }}>
        <div style={{ fontSize: 24 }}>{dest.icon}</div>
        <div style={{ color: dest.color, fontWeight: 700, fontSize: 11, marginTop: 4 }}>{dest.name}</div>
      </div>
    </div>
  );
}

function FeeBreakdown({ fee, fixed, variable, tier }) {
  const tierNames = ['No Discount', '10% Off', '20% Off', '35% Off', '50% Off'];
  if (!fee) return null;
  return (
    <div style={{ background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 10, padding: 14 }}>
      <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 10 }}>
        FEE BREAKDOWN (AFFINE MODEL)
      </div>
      {[
        ['Fixed (bridge + base)', `$${(Number(fixed||0)/1e6).toFixed(2)}`, '#8892B0'],
        ['Variable (size × rate)', `$${(Number(variable||0)/1e6).toFixed(4)}`, '#8892B0'],
        ['Fee Tier', tierNames[tier] || 'No Discount', tier > 0 ? '#00E5A0' : '#4A5270'],
        ['Total Fee', `$${(Number(fee||0)/1e6).toFixed(4)}`, '#EDF0FA'],
      ].map(([k, v, color]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ color: '#4A5270', fontSize: 12 }}>{k}</span>
          <span style={{ color, fontWeight: k === 'Total Fee' ? 800 : 600, fontSize: 12, fontFamily: 'monospace' }}>{v}</span>
        </div>
      ))}
      {tier === 0 && (
        <div style={{ marginTop: 8, padding: '6px 10px', background: '#5B7FFF10', borderRadius: 6, border: '1px solid #5B7FFF20' }}>
          <span style={{ color: '#5B7FFF', fontSize: 11 }}>
            💡 Lock WIK to reduce fees up to <strong>50%</strong>
          </span>
        </div>
      )}
    </div>
  );
}

function IntentRow({ intent }) {
  const status = INTENT_STATUS[intent.status] || INTENT_STATUS.Pending;
  const srcChain  = CHAINS[intent.srcChain]  || CHAINS[42161];
  const destChain = CHAINS[intent.destChain] || CHAINS[42161];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px 90px 100px',
      padding: '12px 20px', borderBottom: '1px solid #1C213860',
      fontSize: 12, alignItems: 'center', fontFamily: 'monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: '#4A5270' }}>#{intent.id}</span>
        <span style={{ color: '#EDF0FA', fontWeight: 700 }}>
          {intent.intentType} {intent.isLong ? '↑' : '↓'}
        </span>
        <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700,
          background: intent.isLong ? '#00E5A015' : '#FF406015',
          color: intent.isLong ? '#00E5A0' : '#FF4060' }}>
          {intent.leverage}×
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <ChainPill chainId={intent.srcChain} />
        <span style={{ color: '#4A5270' }}>→</span>
        <ChainPill chainId={intent.destChain} />
      </div>
      <div style={{ color: '#EDF0FA' }}>${(Number(intent.collateral)/1e6).toFixed(0)}</div>
      <div style={{ color: '#8892B0' }}>${(Number(intent.routingFee)/1e6).toFixed(2)}</div>
      <div>
        <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700,
          background: `${status.color}20`, color: status.color }}>
          {status.dot} {status.label}
        </span>
      </div>
      <div style={{ color: '#4A5270', fontSize: 10 }}>
        {new Date(Number(intent.createdAt) * 1000).toLocaleString('en', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function CrossChainPage() {
  const { address } = useAccount();

  // Form state
  const [tradeType, setTradeType]   = useState('perp');  // perp | margin | spot
  const [side,       setSide]       = useState('long');
  const [srcChain,   setSrcChain]   = useState(42161);
  const [destChain,  setDestChain]  = useState(1);
  const [market,     setMarket]     = useState(MARKETS[0]);
  const [collateral, setCollateral] = useState('1000');
  const [leverage,   setLeverage]   = useState(10);
  const [limitPrice, setLimitPrice] = useState('');
  const [tpPrice,    setTpPrice]    = useState('');
  const [slPrice,    setSlPrice]    = useState('');
  const [orderType,  setOrderType]  = useState('market');
  const [submitting, setSubmitting] = useState(false);
  const [submitted,  setSubmitted]  = useState(null);

  // Data
  const { data: stats }   = useQuery({ queryKey: ['cc-stats'], queryFn: () => api('/api/crosschain/stats'), refetchInterval: 15000 });
  const { data: feeEst }  = useQuery({
    queryKey: ['cc-fee', collateral, leverage, address],
    queryFn:  () => api(`/api/crosschain/estimate?collateral=${Math.floor(parseFloat(collateral||0)*1e6)}&leverage=${leverage}&user=${address||'0x0000000000000000000000000000000000000000'}`),
    enabled:  !!collateral && parseFloat(collateral) > 0,
  });
  const { data: userTier } = useQuery({
    queryKey: ['fee-tier', address],
    queryFn:  () => api(`/api/fees/user/${address}`),
    enabled:  !!address,
  });
  const { data: intents = [] } = useQuery({
    queryKey: ['cc-intents', address],
    queryFn:  () => api(`/api/crosschain/intents/${address}`),
    enabled:  !!address,
    refetchInterval: 10000,
  });

  const notional = (parseFloat(collateral || 0) * leverage).toFixed(2);

  return (
    <AppLayout active="crosschain">
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12,
                  background: 'linear-gradient(135deg, #5B7FFF20, #12AAFF20)',
                  border: '1px solid #5B7FFF40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌐</div>
                <div>
                  <h1 style={{ fontSize: 26, fontWeight: 900, color: '#EDF0FA', margin: 0, lineHeight: 1 }}>Cross-Chain Trading</h1>
                  <p style={{ color: '#4A5270', fontSize: 13, margin: '4px 0 0' }}>
                    Native perps, margin & spot across Ethereum, Arbitrum, Optimism, Base and Polygon
                  </p>
                </div>
              </div>
            </div>

            {/* Stats strip */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {[
                { l: 'Protocol Revenue',  v: stats ? `$${(Number(stats.revenue)/1e6).toFixed(2)}` : '—', c: '#00E5A0' },
                { l: 'Total Intents',     v: stats ? stats.intents : '—',                                c: '#5B7FFF' },
                { l: 'Your Tier',         v: userTier ? ['Base','Bronze','Silver','Gold','Diamond'][userTier.tier] : '—', c: '#FFB800' },
                { l: 'Fee Discount',      v: userTier ? `${[0,10,20,35,50][userTier.tier]}%` : '—',      c: '#A855F7' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 10, padding: '10px 16px', minWidth: 120 }}>
                  <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>{l}</div>
                  <div style={{ color: c, fontWeight: 800, fontSize: 16, fontFamily: 'monospace' }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24, alignItems: 'start' }}>

          {/* Left: Route visualizer + intent history */}
          <div>
            {/* Route card */}
            <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#EDF0FA', marginBottom: 20 }}>
                Select Route
              </div>

              {/* Chain selector */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center', marginBottom: 24 }}>
                {/* Source */}
                <div>
                  <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>SOURCE CHAIN</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(CHAINS).map(([id, c]) => (
                      <button key={id} onClick={() => setSrcChain(Number(id))}
                        style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid',
                          borderColor: srcChain === Number(id) ? c.color : '#1C2138',
                          background:  srcChain === Number(id) ? `${c.color}15` : 'transparent',
                          color:       srcChain === Number(id) ? c.color : '#4A5270' }}>
                        {c.icon} {c.short}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: 'center', paddingTop: 20 }}>
                  <button onClick={() => { const t=srcChain; setSrcChain(destChain); setDestChain(t); }}
                    style={{ width: 36, height: 36, borderRadius: '50%', background: '#5B7FFF20',
                      border: '1px solid #5B7FFF40', color: '#5B7FFF', fontSize: 16, cursor: 'pointer' }}>⇄</button>
                </div>

                {/* Dest */}
                <div>
                  <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>DESTINATION CHAIN</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {Object.entries(CHAINS).map(([id, c]) => (
                      <button key={id} onClick={() => setDestChain(Number(id))}
                        disabled={Number(id) === srcChain}
                        style={{ padding: '6px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid',
                          borderColor: destChain === Number(id) ? c.color : '#1C2138',
                          background:  destChain === Number(id) ? `${c.color}15` : '#0A0C1680',
                          color:       destChain === Number(id) ? c.color : Number(id) === srcChain ? '#2A3050' : '#4A5270',
                          opacity: Number(id) === srcChain ? 0.3 : 1 }}>
                        {c.icon} {c.short}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Route visualizer */}
              <RouteVisualizer
                srcChain={srcChain}
                destChain={destChain}
                fee={feeEst?.total}
                time="2–5 min"
              />

              {/* Market selector */}
              <div style={{ marginTop: 20 }}>
                <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>MARKET</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6 }}>
                  {MARKETS.map(m => (
                    <button key={m.id} onClick={() => setMarket(m)}
                      style={{ padding: '8px 4px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid',
                        borderColor: market.id === m.id ? m.color : '#1C2138',
                        background:  market.id === m.id ? `${m.color}15` : 'transparent',
                        color:       market.id === m.id ? m.color : '#4A5270', textAlign: 'center' }}>
                      <div style={{ fontSize: 18 }}>{m.icon}</div>
                      <div style={{ marginTop: 2, fontSize: 10 }}>{m.id.split('/')[0]}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Intent history */}
            {address && (
              <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 16, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #1C2138', fontSize: 13, fontWeight: 800, color: '#EDF0FA' }}>
                  Your Cross-Chain Positions
                </div>
                {/* Table header */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px 80px 90px 100px',
                  padding: '8px 20px', background: '#0A0C16', color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em' }}>
                  {['TYPE/DIR','ROUTE','SIZE','FEE','STATUS','TIME'].map(h => <span key={h}>{h}</span>)}
                </div>
                {intents.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: '#4A5270', fontSize: 13 }}>
                    No cross-chain positions yet
                  </div>
                ) : intents.map(i => <IntentRow key={i.id} intent={i} />)}
              </div>
            )}
          </div>

          {/* Right: Trade panel */}
          <div style={{ position: 'sticky', top: 72 }}>
            <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 16, overflow: 'hidden' }}>

              {/* Type tabs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', background: '#0A0C16' }}>
                {[['perp','⚡ Perp'],['margin','📊 Margin'],['spot','💱 Spot']].map(([id, label]) => (
                  <button key={id} onClick={() => setTradeType(id)}
                    style={{ padding: '12px 0', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 12,
                      background: tradeType === id ? '#0E1120' : 'transparent',
                      color: tradeType === id ? '#EDF0FA' : '#4A5270',
                      borderBottom: `2px solid ${tradeType === id ? '#5B7FFF' : 'transparent'}` }}>
                    {label}
                  </button>
                ))}
              </div>

              <div style={{ padding: 20 }}>
                {/* Long/Short */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 16, background: '#0A0C16', padding: 3, borderRadius: 8 }}>
                  {['long','short'].map(s => (
                    <button key={s} onClick={() => setSide(s)}
                      style={{ padding: '9px 0', borderRadius: 6, fontWeight: 800, fontSize: 12, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                        background: side === s ? (s === 'long' ? '#00E5A0' : '#FF4060') : 'transparent',
                        color: side === s ? '#000' : '#4A5270' }}>
                      {s === 'long' ? '↑ LONG' : '↓ SHORT'}
                    </button>
                  ))}
                </div>

                {/* Collateral */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>COLLATERAL (USDC)</div>
                  <div style={{ position: 'relative' }}>
                    <input value={collateral} onChange={e => setCollateral(e.target.value)} placeholder="1000"
                      style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 8,
                        color: '#EDF0FA', fontSize: 18, fontWeight: 800, fontFamily: 'monospace',
                        padding: '11px 60px 11px 14px', outline: 'none', boxSizing: 'border-box' }} />
                    <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                      color: '#4A5270', fontSize: 11, fontWeight: 700 }}>USDC</span>
                  </div>
                </div>

                {/* Leverage (only for perp/margin) */}
                {tradeType !== 'spot' && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#4A5270', fontSize: 10, fontWeight: 700 }}>LEVERAGE</span>
                      <span style={{ color: '#5B7FFF', fontWeight: 800, fontSize: 13, fontFamily: 'monospace' }}>{leverage}×</span>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 5, 10, 25, 50].filter(l => l <= market.maxLev).map(l => (
                        <button key={l} onClick={() => setLeverage(l)}
                          style={{ flex: 1, padding: '6px 0', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid',
                            borderColor: leverage === l ? '#5B7FFF' : '#1C2138',
                            background:  leverage === l ? '#5B7FFF20' : 'transparent',
                            color:       leverage === l ? '#5B7FFF' : '#4A5270' }}>
                          {l}×
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Limit price */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
                    {['market','limit'].map(t => (
                      <button key={t} onClick={() => setOrderType(t)}
                        style={{ padding: '4px 12px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: '1px solid',
                          borderColor: orderType === t ? '#5B7FFF' : '#1C2138',
                          background:  orderType === t ? '#5B7FFF15' : 'transparent',
                          color:       orderType === t ? '#5B7FFF' : '#4A5270' }}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                  {orderType === 'limit' && (
                    <input value={limitPrice} onChange={e => setLimitPrice(e.target.value)} placeholder="Limit price (18 dec)"
                      style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 8,
                        color: '#EDF0FA', fontSize: 14, padding: '10px 12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                  )}
                </div>

                {/* TP/SL */}
                {tradeType !== 'spot' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    <div>
                      <div style={{ color: '#00E5A0', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>TAKE PROFIT</div>
                      <input value={tpPrice} onChange={e => setTpPrice(e.target.value)} placeholder="0 = off"
                        style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C213880', borderRadius: 6,
                          color: '#00E5A0', fontSize: 12, padding: '8px 10px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                    </div>
                    <div>
                      <div style={{ color: '#FF4060', fontSize: 10, fontWeight: 700, marginBottom: 4 }}>STOP LOSS</div>
                      <input value={slPrice} onChange={e => setSlPrice(e.target.value)} placeholder="0 = off"
                        style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C213880', borderRadius: 6,
                          color: '#FF4060', fontSize: 12, padding: '8px 10px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
                    </div>
                  </div>
                )}

                {/* Summary */}
                <div style={{ background: '#0A0C16', borderRadius: 8, padding: 12, marginBottom: 14 }}>
                  {[
                    ['Notional Size', `$${parseFloat(notional).toLocaleString('en', {minimumFractionDigits:2})}`, '#EDF0FA'],
                    ['Market',        `${market.icon} ${market.id}`, '#8892B0'],
                    ['Route',         `${CHAINS[srcChain]?.short} → ${CHAINS[destChain]?.short}`, '#5B7FFF'],
                    ['Est. Time',     '2–5 minutes', '#4A5270'],
                  ].map(([k, v, c]) => (
                    <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ color: '#4A5270', fontSize: 12 }}>{k}</span>
                      <span style={{ color: c, fontSize: 12, fontFamily: 'monospace', fontWeight: 600 }}>{v}</span>
                    </div>
                  ))}
                </div>

                {/* Fee breakdown */}
                {feeEst && <FeeBreakdown fee={feeEst.total} fixed={feeEst.fixed} variable={feeEst.variable} tier={feeEst.tier} />}

                {/* Submit */}
                <button
                  disabled={!address || submitting || srcChain === destChain}
                  style={{ width: '100%', marginTop: 14, padding: 14, borderRadius: 12, fontSize: 14, fontWeight: 900,
                    cursor: address && srcChain !== destChain ? 'pointer' : 'not-allowed', border: 'none',
                    background: !address || srcChain === destChain ? '#1C2138' :
                      side === 'long' ? 'linear-gradient(135deg, #00E5A0, #0FA070)' : 'linear-gradient(135deg, #FF4060, #C02040)',
                    color: !address || srcChain === destChain ? '#4A5270' : '#fff',
                    letterSpacing: '0.05em' }}>
                  {!address ? 'Connect Wallet' :
                   srcChain === destChain ? 'Select Different Chains' :
                   submitting ? 'Submitting...' :
                   `${side === 'long' ? '↑ LONG' : '↓ SHORT'} ${market.id.split('/')[0]} ON ${CHAINS[destChain]?.short}`}
                </button>

                {srcChain === destChain && (
                  <p style={{ color: '#FF4060', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                    Source and destination chains must be different
                  </p>
                )}
              </div>
            </div>

            {/* Tier upgrade prompt */}
            {userTier && userTier.tier < 4 && (
              <div style={{ marginTop: 12, background: '#5B7FFF08', border: '1px solid #5B7FFF30', borderRadius: 12, padding: 14 }}>
                <div style={{ color: '#5B7FFF', fontWeight: 700, fontSize: 12, marginBottom: 4 }}>💎 Unlock Lower Fees</div>
                <div style={{ color: '#4A5270', fontSize: 11, lineHeight: 1.5 }}>
                  Lock {['1K','5K','20K','100K'][userTier.tier]} more WIK to reach{' '}
                  {['Bronze','Silver','Gold','Diamond'][userTier.tier]} tier and save{' '}
                  {[10,20,35,50][userTier.tier]}% on all trading fees.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
