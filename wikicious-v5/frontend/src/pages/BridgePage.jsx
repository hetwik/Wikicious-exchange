// ═══════════════════════════════════════════════════════════════════════════
//  BridgePage.jsx — Cross-chain swap UI
// ═══════════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = (path) => axios.get(`${API_URL}${path}`).then(r => r.data);

const CHAINS = [
  { id: 42161, name: 'Arbitrum',  icon: '🔵', color: '#12AAFF' },
  { id: 1,     name: 'Ethereum', icon: '⬡',  color: '#627EEA' },
  { id: 10,    name: 'Optimism', icon: '🔴', color: '#FF0420' },
  { id: 8453,  name: 'Base',     icon: '🟦', color: '#0052FF' },
  { id: 137,   name: 'Polygon',  icon: '🟣', color: '#8247E5' },
];

const TOKENS = [
  { symbol: 'USDC', address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', decimals: 6,  icon: '💵' },
  { symbol: 'WETH', address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', decimals: 18, icon: 'Ξ'  },
  { symbol: 'ARB',  address: '0x912CE59144191C1204E64559FE8253a0e49E6548', decimals: 18, icon: 'A'  },
];

function ChainSelect({ value, onChange, label }) {
  const [open, setOpen] = useState(false);
  const selected = CHAINS.find(c => c.id === value) || CHAINS[0];
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>{label}</div>
      <button onClick={() => setOpen(!open)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10,
          background: '#0A0C16', border: '1px solid #1C2138', cursor: 'pointer', color: '#EDF0FA' }}>
        <span style={{ fontSize: 20 }}>{selected.icon}</span>
        <span style={{ fontWeight: 700, fontSize: 14, flex: 1, textAlign: 'left' }}>{selected.name}</span>
        <span style={{ color: '#4A5270' }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, marginTop: 4,
          background: '#0E1120', border: '1px solid #1C2138', borderRadius: 10, overflow: 'hidden', boxShadow: '0 8px 32px #00000060' }}>
          {CHAINS.map(c => (
            <button key={c.id} onClick={() => { onChange(c.id); setOpen(false); }}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                background: c.id === value ? '#5B7FFF15' : 'transparent', border: 'none', cursor: 'pointer',
                color: c.id === value ? '#5B7FFF' : '#8892B0', borderLeft: `3px solid ${c.id === value ? c.color : 'transparent'}` }}>
              <span style={{ fontSize: 18 }}>{c.icon}</span>
              <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BridgePage() {
  const { address } = useAccount();
  const [fromChain, setFromChain] = useState(42161);
  const [toChain,   setToChain]   = useState(1);
  const [token,     setToken]     = useState(TOKENS[0]);
  const [amount,    setAmount]    = useState('');

  const { data: stats } = useQuery({ queryKey: ['bridge-stats'], queryFn: () => api('/api/bridge/stats') });

  const fee     = amount ? (parseFloat(amount) * 0.001).toFixed(4) : '0';
  const receive = amount ? (parseFloat(amount) - parseFloat(fee)).toFixed(4) : '0';

  const swap = () => {
    const tmp = fromChain;
    setFromChain(toChain);
    setToChain(tmp);
  };

  return (
    <AppLayout active="bridge">
      <div style={{ maxWidth: 520, margin: '48px auto', padding: '0 24px' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌉</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EDF0FA', margin: '0 0 8px' }}>Cross-Chain Bridge</h1>
          <p style={{ color: '#4A5270', fontSize: 14, margin: 0 }}>Seamlessly move assets across chains with 0.1% fee</p>
          {stats && <div style={{ color: '#5B7FFF', fontSize: 12, marginTop: 8, fontWeight: 700 }}>
            Total Volume: ${(Number(stats.totalVolume)/1e6).toFixed(2)}M
          </div>}
        </div>

        {/* Bridge card */}
        <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 20, padding: 24 }}>

          {/* Token selector */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>TOKEN</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {TOKENS.map(t => (
                <button key={t.symbol} onClick={() => setToken(t)}
                  style={{ flex: 1, padding: '10px 8px', borderRadius: 10, cursor: 'pointer', border: '1px solid',
                    borderColor: token.symbol === t.symbol ? '#5B7FFF' : '#1C2138',
                    background: token.symbol === t.symbol ? '#5B7FFF15' : '#0A0C16',
                    color: token.symbol === t.symbol ? '#5B7FFF' : '#8892B0', fontWeight: 700, fontSize: 13 }}>
                  <span style={{ marginRight: 6 }}>{t.icon}</span>{t.symbol}
                </button>
              ))}
            </div>
          </div>

          {/* Chain selectors */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end', marginBottom: 20 }}>
            <ChainSelect value={fromChain} onChange={setFromChain} label="FROM" />
            <button onClick={swap}
              style={{ width: 40, height: 40, borderRadius: '50%', background: '#5B7FFF20', border: '1px solid #5B7FFF40',
                color: '#5B7FFF', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 0 }}>
              ⇄
            </button>
            <ChainSelect value={toChain} onChange={setToChain} label="TO" />
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>AMOUNT</div>
            <div style={{ position: 'relative' }}>
              <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 10,
                  color: '#EDF0FA', fontSize: 22, fontWeight: 800, fontFamily: 'monospace',
                  padding: '14px 100px 14px 16px', outline: 'none', boxSizing: 'border-box' }} />
              <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: '#8892B0', fontWeight: 700, fontSize: 14 }}>{token.symbol}</span>
                <button style={{ background: '#5B7FFF20', border: '1px solid #5B7FFF40', borderRadius: 6,
                  color: '#5B7FFF', fontSize: 10, fontWeight: 700, padding: '2px 6px', cursor: 'pointer' }}>MAX</button>
              </div>
            </div>
          </div>

          {/* Fee breakdown */}
          {amount && parseFloat(amount) > 0 && (
            <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 20, border: '1px solid #1C2138' }}>
              {[
                ['Bridge Fee (0.1%)', `${fee} ${token.symbol}`],
                ['You Receive', `${receive} ${token.symbol}`],
                ['Est. Time', '~2-5 minutes'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, ':last-child': { marginBottom: 0 } }}>
                  <span style={{ color: '#4A5270', fontSize: 12 }}>{k}</span>
                  <span style={{ color: k === 'You Receive' ? '#00E5A0' : '#8892B0', fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{v}</span>
                </div>
              ))}
            </div>
          )}

          <button style={{ width: '100%', padding: 16, borderRadius: 12, fontSize: 15, fontWeight: 900,
            cursor: 'pointer', border: 'none', letterSpacing: '0.05em',
            background: amount && parseFloat(amount) > 0 ? 'linear-gradient(135deg, #5B7FFF, #7B5EA7)' : '#1C2138',
            color: amount && parseFloat(amount) > 0 ? '#fff' : '#4A5270' }}>
            {address ? 'BRIDGE NOW' : 'CONNECT WALLET'}
          </button>
        </div>

        {/* Supported chains */}
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <div style={{ color: '#4A5270', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>SUPPORTED CHAINS</div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            {CHAINS.map(c => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                background: '#0E1120', border: `1px solid ${c.color}30`, borderRadius: 8 }}>
                <span style={{ fontSize: 14 }}>{c.icon}</span>
                <span style={{ color: '#8892B0', fontSize: 12, fontWeight: 600 }}>{c.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default BridgePage;
