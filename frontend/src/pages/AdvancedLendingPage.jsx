import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = (path) => axios.get(`${API_URL}${path}`).then(r => r.data);

// ── Formatters ─────────────────────────────────────────────────────────────
const fmtUSD   = (v, dec = 6)  => { const n = Number(v) / 10**dec; return n >= 1e6 ? `$${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `$${(n/1e3).toFixed(2)}K` : `$${n.toFixed(2)}`; };
const fmtPct   = (v, dec = 18) => `${(Number(v) / 10**dec * 100).toFixed(2)}%`;
const fmtHealth= (v)           => { if (!v || v === '0') return '∞'; const n = Number(v)/1e18; return n > 999 ? '∞' : n.toFixed(3); };
const hfColor  = (v)           => { const n = Number(v)/1e18; return n >= 2 ? '#00E5A0' : n >= 1.2 ? '#FFB800' : '#FF4060'; };

// ── Sub-components ─────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 3, background: '#0A0C16', padding: 3, borderRadius: 10,
      border: '1px solid #1C2138', width: 'fit-content', marginBottom: 28 }}>
      {tabs.map(([id, label, icon]) => (
        <button key={id} onClick={() => onChange(id)}
          style={{ padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer',
            border: 'none', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 7,
            background: active === id ? 'linear-gradient(135deg, #5B7FFF, #7B5EA7)' : 'transparent',
            color: active === id ? '#fff' : '#4A5270' }}>
          <span>{icon}</span>{label}
        </button>
      ))}
    </div>
  );
}

function StatGrid({ stats }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 28 }}>
      {stats.map(({ label, value, sub, accent = '#5B7FFF' }) => (
        <div key={label} style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
          <div style={{ color: accent, fontSize: 22, fontWeight: 900, fontFamily: 'monospace', marginBottom: 3 }}>{value}</div>
          {sub && <div style={{ color: '#4A5270', fontSize: 11 }}>{sub}</div>}
        </div>
      ))}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, suffix, note }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || '0.00'}
          style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 10,
            color: '#EDF0FA', fontSize: 16, fontWeight: 700, fontFamily: 'monospace',
            padding: suffix ? '12px 72px 12px 14px' : '12px 14px', outline: 'none',
            boxSizing: 'border-box', transition: 'border-color 0.15s' }}
          onFocus={e => e.target.style.borderColor = '#5B7FFF'}
          onBlur={e => e.target.style.borderColor = '#1C2138'} />
        {suffix && (
          <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
            color: '#8892B0', fontWeight: 700, fontSize: 12 }}>{suffix}</span>
        )}
      </div>
      {note && <div style={{ color: '#4A5270', fontSize: 11, marginTop: 4 }}>{note}</div>}
    </div>
  );
}

function ActionBtn({ onClick, children, color = 'blue', disabled, loading }) {
  const bg = {
    blue:   'linear-gradient(135deg, #5B7FFF, #7B5EA7)',
    green:  'linear-gradient(135deg, #00E5A0, #00B87A)',
    red:    'linear-gradient(135deg, #FF4060, #CC2040)',
    orange: 'linear-gradient(135deg, #FF8C42, #FF6010)',
  }[color];
  return (
    <button onClick={onClick} disabled={disabled || loading}
      style={{ width: '100%', padding: '13px 0', borderRadius: 10, fontSize: 14, fontWeight: 900,
        cursor: disabled || loading ? 'not-allowed' : 'pointer', border: 'none', letterSpacing: '0.04em',
        background: disabled || loading ? '#1C2138' : bg,
        color: disabled || loading ? '#4A5270' : '#fff', transition: 'opacity 0.15s',
        opacity: loading ? 0.7 : 1 }}>
      {loading ? '⏳ Processing...' : children}
    </button>
  );
}

function InfoRow({ k, v, vColor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0',
      borderBottom: '1px solid #1C213840' }}>
      <span style={{ color: '#4A5270', fontSize: 12 }}>{k}</span>
      <span style={{ color: vColor || '#8892B0', fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{v}</span>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  FLASH LOAN PANEL
// ══════════════════════════════════════════════════════════════════
function FlashLoanPanel({ address }) {
  const [activeTab, setActiveTab]     = useState('borrow');
  const [token, setToken]             = useState('USDC');
  const [amount, setAmount]           = useState('');
  const [contractAddr, setContract]   = useState('');
  const [depositAmt, setDepositAmt]   = useState('');
  const [loading, setLoading]         = useState(false);

  const { data: stats } = useQuery({ queryKey: ['flash-stats'], queryFn: () => api('/api/flash/stats'), refetchInterval: 15000 });
  const { data: user  } = useQuery({ queryKey: ['flash-user', address], queryFn: () => api(`/api/flash/user/${address}`), enabled: !!address });

  const tokenAddress = {
    'USDC': '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'WETH': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    'ARB':  '0x912CE59144191C1204E64559FE8253a0e49E6548',
  };

  const reserve    = stats?.reserves?.find(r => r.symbol === token);
  const feeAmt     = amount && reserve ? (parseFloat(amount) * Number(reserve.feeBps) / 10000).toFixed(6) : '0';
  const repayAmt   = amount ? (parseFloat(amount) + parseFloat(feeAmt)).toFixed(6) : '0';

  const topLps = [
    { token: 'USDC', apy: '8.4%', tvl: '$2.4M', volume: '$48M' },
    { token: 'WETH', apy: '12.1%', tvl: '$840K', volume: '$22M' },
    { token: 'ARB',  apy: '18.7%', tvl: '$320K', volume: '$8.4M' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      {/* Left: Action panel */}
      <div>
        <TabBar tabs={[['borrow','Execute Flash','⚡'],['provide','Provide Liquidity','💧'],['history','My Positions','📊']]}
          active={activeTab} onChange={setActiveTab} />

        {activeTab === 'borrow' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>⚡ Execute Flash Loan</div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>TOKEN</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['USDC','WETH','ARB'].map(t => (
                  <button key={t} onClick={() => setToken(t)}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                      border: '1px solid', borderColor: token === t ? '#5B7FFF' : '#1C2138',
                      background: token === t ? '#5B7FFF15' : '#0A0C16',
                      color: token === t ? '#5B7FFF' : '#4A5270' }}>{t}</button>
                ))}
              </div>
            </div>

            <Input label="BORROW AMOUNT" value={amount} onChange={setAmount} suffix={token} />
            <Input label="YOUR CONTRACT ADDRESS" value={contractAddr} onChange={setContract}
              placeholder="0x... (implements IERC3156FlashBorrower)" />

            <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <InfoRow k="Flash Loan Fee" v={`${reserve?.feeBps || '9'} bps (${feeAmt} ${token})`} vColor="#FFB800" />
              <InfoRow k="Repay Amount"   v={`${repayAmt} ${token}`} vColor="#EDF0FA" />
              <InfoRow k="Availability"   v={reserve ? fmtUSD(reserve.maxFlashLoan, 6) : '—'} vColor="#00E5A0" />
              <InfoRow k="Daily Borrowed" v={reserve ? fmtUSD(reserve.dailyBorrowed, 6) : '—'} />
            </div>

            <div style={{ background: '#FFB80010', border: '1px solid #FFB80030', borderRadius: 8, padding: 12, marginBottom: 16 }}>
              <div style={{ color: '#FFB800', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>⚠️ Developer Note</div>
              <div style={{ color: '#8892B0', fontSize: 11, lineHeight: 1.6 }}>
                Your contract must implement <code style={{ color: '#5B7FFF', background: '#5B7FFF10', padding: '1px 4px', borderRadius: 3 }}>IERC3156FlashBorrower.onFlashLoan()</code> and
                return the success bytes32. Principal + fee must be repaid in the same transaction.
              </div>
            </div>

            <ActionBtn color="orange" disabled={!amount || !contractAddr}>
              EXECUTE FLASH LOAN
            </ActionBtn>
          </div>
        )}

        {activeTab === 'provide' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>💧 Provide Flash Liquidity</div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>TOKEN</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {['USDC','WETH','ARB'].map(t => (
                  <button key={t} onClick={() => setToken(t)}
                    style={{ flex: 1, padding: '9px 0', borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: 'pointer',
                      border: '1px solid', borderColor: token === t ? '#00E5A0' : '#1C2138',
                      background: token === t ? '#00E5A015' : '#0A0C16',
                      color: token === t ? '#00E5A0' : '#4A5270' }}>{t}</button>
                ))}
              </div>
            </div>

            <Input label="DEPOSIT AMOUNT" value={depositAmt} onChange={setDepositAmt} suffix={token} />

            <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <InfoRow k="Current APY"   v={reserve ? `~${reserve.feeBps * 365 * 0.7 / 100}%` : '—'} vColor="#00E5A0" />
              <InfoRow k="Your Balance"  v={user?.positions?.find(p => p.symbol === token)?.lpBalance || '0'} />
              <InfoRow k="Total TVL"     v={reserve ? fmtUSD(reserve.totalDeposited, 6) : '—'} />
              <InfoRow k="Total Volume"  v={reserve ? fmtUSD(reserve.totalVolume, 6) : '—'} />
            </div>

            <ActionBtn color="green" disabled={!depositAmt}>
              DEPOSIT {token}
            </ActionBtn>
          </div>
        )}

        {activeTab === 'history' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>📊 My LP Positions</div>
            {user?.positions?.length ? (
              user.positions.map(p => (
                <div key={p.token} style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#EDF0FA', fontWeight: 800 }}>{p.symbol}</span>
                    <span style={{ color: '#00E5A0', fontWeight: 800 }}>{fmtUSD(p.lpBalance, 6)}</span>
                  </div>
                  <InfoRow k="Pending Fees" v={fmtUSD(p.pendingFees, 6)} vColor="#FFB800" />
                  <button style={{ width: '100%', marginTop: 10, padding: '8px 0', borderRadius: 8, background: '#00E5A015',
                    border: '1px solid #00E5A040', color: '#00E5A0', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    Claim Fees
                  </button>
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', color: '#4A5270', padding: 32 }}>No LP positions yet</div>
            )}
          </div>
        )}
      </div>

      {/* Right: Pool overview */}
      <div>
        <div style={{ fontWeight: 800, fontSize: 14, color: '#EDF0FA', marginBottom: 16 }}>Flash Loan Pools</div>
        {topLps.map(lp => (
          <div key={lp.token} style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 12, padding: 18, marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#5B7FFF20', border: '1px solid #5B7FFF40',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#5B7FFF' }}>
                  {lp.token.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: '#EDF0FA' }}>{lp.token}</div>
                  <div style={{ color: '#4A5270', fontSize: 11 }}>Flash Reserve</div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ color: '#00E5A0', fontWeight: 900, fontSize: 16 }}>{lp.apy} APY</div>
                <div style={{ color: '#4A5270', fontSize: 11 }}>from flash fees</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div style={{ background: '#0A0C16', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700 }}>TVL</div>
                <div style={{ color: '#EDF0FA', fontWeight: 800, fontSize: 13 }}>{lp.tvl}</div>
              </div>
              <div style={{ background: '#0A0C16', borderRadius: 8, padding: '8px 12px', textAlign: 'center' }}>
                <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700 }}>24H VOLUME</div>
                <div style={{ color: '#EDF0FA', fontWeight: 800, fontSize: 13 }}>{lp.volume}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MARGIN LOAN PANEL
// ══════════════════════════════════════════════════════════════════
function MarginLoanPanel({ address }) {
  const [tab, setTab]       = useState('open');
  const [borrow, setBorrow] = useState('');
  const [coll, setColl]     = useState('');
  const [dur, setDur]       = useState('30');
  const [loading, setLoad]  = useState(false);

  const { data: stats } = useQuery({ queryKey: ['margin-stats'], queryFn: () => api('/api/margin/stats'), refetchInterval: 15000 });
  const { data: user  } = useQuery({ queryKey: ['margin-user', address], queryFn: () => api(`/api/margin/user/${address}`), enabled: !!address });

  const ltv        = borrow && coll ? ((parseFloat(borrow)/parseFloat(coll)) * 100).toFixed(1) : '0';
  const ltvColor   = Number(ltv) > 75 ? '#FF4060' : Number(ltv) > 60 ? '#FFB800' : '#00E5A0';
  const maxBorrow  = coll ? (parseFloat(coll) * 0.8).toFixed(2) : '0';

  const DURATIONS = [
    { d: '7', label: '7 days' }, { d: '14', label: '14 days' },
    { d: '30', label: '30 days' }, { d: '60', label: '60 days' },
    { d: '90', label: '90 days' }, { d: '0', label: 'Indefinite' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div>
        <TabBar tabs={[['open','Open Loan','📈'],['repay','My Loans','📋'],['lend','Lend','💰']]}
          active={tab} onChange={setTab} />

        {tab === 'open' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>📈 Open Margin Loan</div>

            <Input label="COLLATERAL (FROM VAULT BALANCE)" value={coll} onChange={setColl} suffix="USDC"
              note={`Max borrow: ${maxBorrow} USDC (80% LTV)`} />
            <Input label="BORROW AMOUNT" value={borrow} onChange={setBorrow} suffix="USDC" />

            {/* LTV meter */}
            {ltv > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#4A5270', fontSize: 11 }}>Loan-to-Value</span>
                  <span style={{ color: ltvColor, fontWeight: 800, fontSize: 13 }}>{ltv}%</span>
                </div>
                <div style={{ height: 6, background: '#0A0C16', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(ltv, 100)}%`, background: ltvColor, borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <span style={{ color: '#4A5270', fontSize: 10 }}>Max LTV: 80%</span>
                  <span style={{ color: '#4A5270', fontSize: 10 }}>Liq at: 85%</span>
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>DURATION</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {DURATIONS.map(({ d, label }) => (
                  <button key={d} onClick={() => setDur(d)}
                    style={{ padding: '8px 6px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: '1px solid', borderColor: dur === d ? '#5B7FFF' : '#1C2138',
                      background: dur === d ? '#5B7FFF15' : '#0A0C16',
                      color: dur === d ? '#5B7FFF' : '#4A5270' }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <InfoRow k="Borrow APY"   v={stats ? fmtPct(stats.borrowAPY) : '—'} vColor="#FF8C42" />
              <InfoRow k="Supply APY"   v={stats ? fmtPct(stats.supplyAPY) : '—'} vColor="#00E5A0" />
              <InfoRow k="Utilization"  v={stats ? fmtPct(stats.utilization) : '—'} />
              <InfoRow k="Total Loans"  v={stats?.loanCount || '—'} />
            </div>

            <ActionBtn disabled={!borrow || !coll || Number(ltv) > 80} color="blue">
              OPEN MARGIN LOAN
            </ActionBtn>
          </div>
        )}

        {tab === 'repay' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>📋 Active Margin Loans</div>
            {user?.loans?.filter(l => l.active).length ? (
              user.loans.filter(l => l.active).map(loan => (
                <div key={loan.id} style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ color: '#EDF0FA', fontWeight: 800 }}>Loan #{loan.id}</span>
                    <span style={{ color: hfColor(loan.healthFactor), fontWeight: 900, fontSize: 14 }}>
                      HF {fmtHealth(loan.healthFactor)}
                    </span>
                  </div>
                  <InfoRow k="Principal"   v={fmtUSD(loan.principal)} />
                  <InfoRow k="Current Debt" v={fmtUSD(loan.currentDebt)} vColor="#FF8C42" />
                  <InfoRow k="Collateral"  v={fmtUSD(loan.collateralLocked)} vColor="#00E5A0" />
                  {loan.dueAt !== '0' && <InfoRow k="Due"  v={new Date(Number(loan.dueAt)*1000).toLocaleDateString()} />}
                  {loan.liquidatable && (
                    <div style={{ margin: '8px 0', padding: '6px 10px', background: '#FF406015', border: '1px solid #FF406040',
                      borderRadius: 6, color: '#FF4060', fontSize: 11, fontWeight: 700 }}>⚠️ At risk of liquidation</div>
                  )}
                  <button style={{ width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 8,
                    background: 'linear-gradient(135deg, #5B7FFF, #7B5EA7)', border: 'none',
                    color: '#fff', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                    Repay ${(Number(loan.currentDebt)/1e6).toFixed(2)} USDC
                  </button>
                </div>
              ))
            ) : <div style={{ textAlign: 'center', color: '#4A5270', padding: 32 }}>No active margin loans</div>}
          </div>
        )}

        {tab === 'lend' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>💰 Lend to Margin Pool</div>
            <Input label="DEPOSIT AMOUNT" value={borrow} onChange={setBorrow} suffix="USDC" />
            <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <InfoRow k="Current Supply APY" v={stats ? fmtPct(stats.supplyAPY) : '—'} vColor="#00E5A0" />
              <InfoRow k="Your Balance"       v={user ? fmtUSD(user.lpBalance, 6) : '—'} />
              <InfoRow k="Pool TVL"           v={stats ? fmtUSD(stats.totalDeposited) : '—'} />
              <InfoRow k="Utilization"        v={stats ? fmtPct(stats.utilization) : '—'} />
            </div>
            <ActionBtn color="green" disabled={!borrow}>DEPOSIT TO MARGIN POOL</ActionBtn>
          </div>
        )}
      </div>

      {/* Right: How it works */}
      <div>
        <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#EDF0FA', marginBottom: 16 }}>How Margin Loans Work</div>
          {[
            ['1', 'Post Collateral', 'Lock USDC from your WikiVault balance as collateral (up to 80% LTV).'],
            ['2', 'Borrow USDC',     'Receive borrowed USDC directly to your wallet for any use.'],
            ['3', 'Trade Freely',    'Use borrowed funds to deposit back into vault for extra leverage.'],
            ['4', 'Repay',          'Repay principal + accrued interest to unlock your collateral.'],
          ].map(([n, title, desc]) => (
            <div key={n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #5B7FFF, #7B5EA7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900,
                color: '#fff', flexShrink: 0 }}>{n}</div>
              <div>
                <div style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 13 }}>{title}</div>
                <div style={{ color: '#4A5270', fontSize: 12, lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ background: '#0E1120', border: '1px solid #5B7FFF30', borderRadius: 14, padding: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 13, color: '#5B7FFF', marginBottom: 12 }}>⚡ Variable Rate Model</div>
          {[
            ['Below 80% utilization', '2% → 10% APR'],
            ['Above 80% utilization', 'Up to 150% APR'],
            ['Reserve factor',        '15% of interest'],
            ['Liquidation bonus',     '5% to liquidator'],
          ].map(([k, v]) => <InfoRow key={k} k={k} v={v} />)}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  LP COLLATERAL PANEL
// ══════════════════════════════════════════════════════════════════
function LPCollateralPanel({ address }) {
  const [tab, setTab]    = useState('deposit');
  const [ctId, setCtId]  = useState(0);
  const [lpAmt, setLp]   = useState('');
  const [borrow, setBor] = useState('');

  const { data: types } = useQuery({ queryKey: ['lpcoll-types'], queryFn: () => api('/api/lpcollateral/types') });
  const { data: user  } = useQuery({ queryKey: ['lpcoll-user', address], queryFn: () => api(`/api/lpcollateral/user/${address}`), enabled: !!address });

  const ct = types?.[ctId];

  const MOCK_TYPES = [
    { id: 0, method: 'WLP',       lpToken: '0x...WLP', ltvBps: '7500', liquidationThreshBps: '8000', liquidationBonusBps: '500', enabled: true },
    { id: 1, method: 'WikiSpot',  lpToken: '0x...ETH', ltvBps: '7000', liquidationThreshBps: '7500', liquidationBonusBps: '500', enabled: true },
    { id: 2, method: 'UniV5',     lpToken: '0x...UNI', ltvBps: '6500', liquidationThreshBps: '7000', liquidationBonusBps: '800', enabled: true },
  ];
  const displayTypes = (types?.length ? types : MOCK_TYPES);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div>
        <TabBar tabs={[['deposit','Use LP Collateral','🏦'],['vaults','My Vaults','📋'],['lend','Lend to Pool','💧']]}
          active={tab} onChange={setTab} />

        {tab === 'deposit' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>🏦 LP Token Collateral Vault</div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>SELECT LP TYPE</div>
              {displayTypes.map(t => (
                <button key={t.id} onClick={() => setCtId(t.id)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', marginBottom: 6, borderRadius: 10, cursor: 'pointer',
                    border: `1px solid ${ctId === t.id ? '#5B7FFF' : '#1C2138'}`,
                    background: ctId === t.id ? '#5B7FFF10' : '#0A0C16', color: '#EDF0FA' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ background: '#5B7FFF20', border: '1px solid #5B7FFF40', borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#5B7FFF' }}>{t.method}</span>
                    <span style={{ fontWeight: 700, fontSize: 13 }}>{t.lpToken?.slice(0,10)}...</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#00E5A0', fontWeight: 800, fontSize: 12 }}>{Number(t.ltvBps)/100}% LTV</div>
                    <div style={{ color: '#4A5270', fontSize: 10 }}>Liq at {Number(t.liquidationThreshBps)/100}%</div>
                  </div>
                </button>
              ))}
            </div>

            <Input label="LP AMOUNT TO DEPOSIT" value={lpAmt} onChange={setLp} suffix="LP" />
            <Input label="BORROW AMOUNT (USDC)" value={borrow} onChange={setBor} suffix="USDC" />

            <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <InfoRow k="LP Valuation Method" v={displayTypes[ctId]?.method || '—'} />
              <InfoRow k="Max LTV"             v={`${Number(displayTypes[ctId]?.ltvBps || 0)/100}%`} vColor="#00E5A0" />
              <InfoRow k="Liquidation At"      v={`${Number(displayTypes[ctId]?.liquidationThreshBps || 0)/100}%`} vColor="#FFB800" />
              <InfoRow k="Liq Bonus"           v={`${Number(displayTypes[ctId]?.liquidationBonusBps || 0)/100}%`} />
            </div>

            <ActionBtn disabled={!lpAmt || !borrow} color="blue">OPEN LP VAULT</ActionBtn>
          </div>
        )}

        {tab === 'vaults' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>📋 My LP Vaults</div>
            {user?.vaults?.length ? user.vaults.filter(v => v.active).map(v => (
              <div key={v.id} style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ color: '#EDF0FA', fontWeight: 800 }}>Vault #{v.id}</span>
                  <span style={{ color: hfColor(v.healthFactor), fontWeight: 900 }}>HF {fmtHealth(v.healthFactor)}</span>
                </div>
                <InfoRow k="LP Deposited"   v={v.lpAmount} />
                <InfoRow k="Current Debt"   v={fmtUSD(v.currentDebt)} vColor="#FF8C42" />
                <InfoRow k="Debt Principal" v={fmtUSD(v.debtPrincipal)} />
                <button style={{ width: '100%', marginTop: 10, padding: '10px 0', borderRadius: 8,
                  background: 'linear-gradient(135deg, #00E5A0, #00B87A)', border: 'none',
                  color: '#000', fontWeight: 800, fontSize: 12, cursor: 'pointer' }}>
                  Repay & Withdraw LP
                </button>
              </div>
            )) : <div style={{ textAlign: 'center', color: '#4A5270', padding: 32 }}>No active vaults</div>}
          </div>
        )}

        {tab === 'lend' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>💧 Lend USDC to LP Pool</div>
            <Input label="DEPOSIT AMOUNT" value={borrow} onChange={setBor} suffix="USDC" />
            <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <InfoRow k="Current APY"   v="~9.4%" vColor="#00E5A0" />
              <InfoRow k="Your Balance"  v={user ? fmtUSD(user.lpBalance, 6) : '—'} />
            </div>
            <ActionBtn color="green" disabled={!borrow}>DEPOSIT USDC</ActionBtn>
          </div>
        )}
      </div>

      {/* Right: LP valuation explainer */}
      <div>
        <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#EDF0FA', marginBottom: 16 }}>Flash-Loan Resistant LP Pricing</div>
          <div style={{ color: '#4A5270', fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>
            Standard LP valuation using <code style={{ color: '#5B7FFF' }}>reserveA × price + reserveB × price</code> is vulnerable
            to flash loan price manipulation. We use the <strong style={{ color: '#EDF0FA' }}>fair LP price formula</strong>:
          </div>
          <div style={{ background: '#0A0C16', borderRadius: 10, padding: 16, fontFamily: 'monospace', fontSize: 13,
            color: '#5B7FFF', marginBottom: 16, border: '1px solid #5B7FFF30' }}>
            fairPrice = 2 × √(valueA × valueB) / totalSupply
          </div>
          <div style={{ color: '#4A5270', fontSize: 12, lineHeight: 1.6 }}>
            This formula requires a flash loan attacker to manipulate BOTH tokens simultaneously in opposite directions,
            making attacks economically infeasible.
          </div>
        </div>

        <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#EDF0FA', marginBottom: 14 }}>Supported LP Types</div>
          {[
            { type: 'WLP', desc: 'WikiAMM LP token — valued by AUM/supply', safe: 'Very Safe' },
            { type: 'WikiSpot', desc: 'WikiSpot AMM LP — fair price formula', safe: 'Safe' },
            { type: 'UniV5', desc: 'Uniswap V5 LP — fair price formula', safe: 'Safe' },
            { type: 'External', desc: 'Any V5-compatible AMM LP', safe: 'Audited Only' },
          ].map(({ type, desc, safe }) => (
            <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid #1C213840' }}>
              <div>
                <span style={{ background: '#5B7FFF20', border: '1px solid #5B7FFF40', borderRadius: 5,
                  padding: '2px 8px', fontSize: 10, fontWeight: 700, color: '#5B7FFF', marginRight: 8 }}>{type}</span>
                <span style={{ color: '#8892B0', fontSize: 12 }}>{desc}</span>
              </div>
              <span style={{ color: '#00E5A0', fontSize: 11, fontWeight: 700 }}>{safe}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  CROSS-CHAIN LENDING PANEL
// ══════════════════════════════════════════════════════════════════
function CrossChainPanel({ address }) {
  const [tab, setTab]    = useState('supply');
  const [srcChain, setSrc] = useState(42161);
  const [dstChain, setDst] = useState(10);
  const [token, setTok]  = useState('USDC');
  const [amount, setAmt] = useState('');
  const [borrowAmt, setBor] = useState('');

  const { data: stats } = useQuery({ queryKey: ['ccl-stats'], queryFn: () => api('/api/crosslending/stats'), refetchInterval: 20000 });
  const { data: user  } = useQuery({ queryKey: ['ccl-user', address], queryFn: () => api(`/api/crosslending/user/${address}`), enabled: !!address });

  const CHAINS = [
    { id: 42161, name: 'Arbitrum',  icon: '🔵', color: '#12AAFF' },
    { id: 1,     name: 'Ethereum',  icon: '⬡',  color: '#627EEA' },
    { id: 10,    name: 'Optimism',  icon: '🔴', color: '#FF0420' },
    { id: 8453,  name: 'Base',      icon: '🟦', color: '#0052FF' },
    { id: 137,   name: 'Polygon',   icon: '🟣', color: '#8247E5' },
  ];

  const selectedSrc = CHAINS.find(c => c.id === srcChain);
  const selectedDst = CHAINS.find(c => c.id === dstChain);

  const userHF = user?.healthFactor ? fmtHealth(user.healthFactor) : '—';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
      <div>
        <TabBar tabs={[['supply','Supply Cross-Chain','🌐'],['borrow','Borrow','💸'],['positions','Positions','📊']]}
          active={tab} onChange={setTab} />

        {tab === 'supply' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>🌐 Supply Collateral Cross-Chain</div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>SUPPLY ON</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CHAINS.map(c => (
                  <button key={c.id} onClick={() => setSrc(c.id)}
                    style={{ padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: '1px solid', borderColor: srcChain === c.id ? c.color : '#1C2138',
                      background: srcChain === c.id ? `${c.color}15` : '#0A0C16',
                      color: srcChain === c.id ? c.color : '#4A5270' }}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>BORROW ON</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {CHAINS.filter(c => c.id !== srcChain).map(c => (
                  <button key={c.id} onClick={() => setDst(c.id)}
                    style={{ padding: '7px 12px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      border: '1px solid', borderColor: dstChain === c.id ? c.color : '#1C2138',
                      background: dstChain === c.id ? `${c.color}15` : '#0A0C16',
                      color: dstChain === c.id ? c.color : '#4A5270' }}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </div>

            <Input label="SUPPLY AMOUNT" value={amount} onChange={setAmt} suffix={token} />

            <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <InfoRow k="Supply On"     v={`${selectedSrc?.icon} ${selectedSrc?.name}`} />
              <InfoRow k="Borrow On"     v={`${selectedDst?.icon} ${selectedDst?.name}`} />
              <InfoRow k="Max Borrow"    v={amount ? fmtUSD(parseFloat(amount) * 0.75 * 1e6) : '—'} vColor="#00E5A0" />
              <InfoRow k="Cross-Chain APY" v={stats ? fmtPct(stats.crossChainAPY) : '—'} vColor="#FF8C42" />
              <InfoRow k="Bridge Fee"    v="0.05%" />
              <InfoRow k="Relay Time"    v="~2-5 minutes" />
            </div>

            <ActionBtn disabled={!amount} color="blue">SUPPLY & ENABLE CROSS-CHAIN</ActionBtn>

            <div style={{ marginTop: 12, padding: 10, background: '#5B7FFF08', borderRadius: 8, border: '1px solid #5B7FFF20' }}>
              <div style={{ color: '#5B7FFF', fontSize: 11, fontWeight: 700, marginBottom: 3 }}>ℹ️ How it works</div>
              <div style={{ color: '#4A5270', fontSize: 11, lineHeight: 1.6 }}>
                Supply tokens on {selectedSrc?.name}. Our keeper network relays your position to {selectedDst?.name}
                (2/3 multi-sig). You can then borrow on {selectedDst?.name} within minutes.
              </div>
            </div>
          </div>
        )}

        {tab === 'borrow' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>💸 Borrow Against Cross-Chain Collateral</div>

            {user?.positions?.length ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', marginBottom: 8 }}>YOUR CROSS-CHAIN POSITIONS</div>
                  {user.positions.filter(p => p.active).map(p => (
                    <div key={p.id} style={{ padding: '10px 14px', background: '#0A0C16', borderRadius: 8,
                      border: '1px solid #1C2138', marginBottom: 6, cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#EDF0FA', fontWeight: 700 }}>Pos #{p.id} on {p.srcChain}</span>
                        <span style={{ color: '#00E5A0', fontWeight: 700 }}>{fmtUSD(p.supplyAmount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <Input label="BORROW AMOUNT (USDC)" value={borrowAmt} onChange={setBor} suffix="USDC" />
                <ActionBtn disabled={!borrowAmt} color="orange">BORROW USDC</ActionBtn>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🌐</div>
                <div style={{ color: '#EDF0FA', fontWeight: 700, marginBottom: 8 }}>No cross-chain positions yet</div>
                <div style={{ color: '#4A5270', fontSize: 13 }}>Supply collateral on another chain first</div>
              </div>
            )}
          </div>
        )}

        {tab === 'positions' && (
          <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 900, fontSize: 15, color: '#EDF0FA', marginBottom: 20 }}>📊 Cross-Chain Positions</div>

            {address && (
              <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 16, textAlign: 'center' }}>
                <div style={{ color: '#4A5270', fontSize: 11, marginBottom: 4 }}>GLOBAL HEALTH FACTOR</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: hfColor(user?.healthFactor || '0') }}>
                  {userHF}
                </div>
              </div>
            )}

            {user?.positions?.length ? user.positions.map(p => (
              <div key={p.id} style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 8 }}>
                <InfoRow k="Chain"    v={`${p.srcChain}`} />
                <InfoRow k="Supplied" v={fmtUSD(p.supplyAmount)} vColor="#00E5A0" />
                <InfoRow k="Token"    v={p.supplyToken?.slice(0,10)+'...'} />
              </div>
            )) : <div style={{ textAlign: 'center', color: '#4A5270', padding: 24 }}>No positions</div>}

            {user?.borrows?.length ? user.borrows.filter(b => b.active).map(b => (
              <div key={b.id} style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 8 }}>
                <InfoRow k="Borrowed"  v={fmtUSD(b.principal)} vColor="#FF8C42" />
                <InfoRow k="Based On"  v={`Position #${b.crossChainPosId}`} />
                <button style={{ width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 7,
                  background: 'linear-gradient(135deg, #5B7FFF, #7B5EA7)', border: 'none',
                  color: '#fff', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Repay</button>
              </div>
            )) : null}
          </div>
        )}
      </div>

      {/* Right: Stats + how it works */}
      <div>
        <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24, marginBottom: 16 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#EDF0FA', marginBottom: 16 }}>Protocol Stats</div>
          {[
            ['Total Supplied (USD)',  stats ? fmtUSD(stats.totalSuppliedUSD) : '—', '#00E5A0'],
            ['Total Borrowed',        stats ? fmtUSD(stats.totalBorrowed, 6) : '—', '#FF8C42'],
            ['Borrow APY',            stats ? fmtPct(stats.crossChainAPY) : '—', '#5B7FFF'],
            ['Active Positions',      stats?.positionCount || '—', '#EDF0FA'],
            ['Relayer Threshold',     stats ? `${stats.relayerThreshold}/${stats.relayerCount}` : '—', '#FFB800'],
          ].map(([k, v, color]) => (
            <InfoRow key={k} k={k} v={v} vColor={color} />
          ))}
        </div>

        <div style={{ background: '#0E1120', border: '1px solid #1C2138', borderRadius: 14, padding: 24 }}>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#EDF0FA', marginBottom: 16 }}>Cross-Chain Message Flow</div>
          <div style={{ position: 'relative' }}>
            {[
              { icon: '📤', title: 'Supply on Source Chain', desc: 'Tokens locked on source chain. SupplyMessage emitted.' },
              { icon: '🔐', title: 'Multi-Sig Relay (2/3)', desc: 'Keeper network validates & co-signs. Min 2 of 3 must agree.' },
              { icon: '✅', title: 'Credited on Dest Chain', desc: 'Position credited on destination. Ready to borrow.' },
              { icon: '💸', title: 'Borrow on Dest Chain',   desc: 'Use cross-chain collateral to borrow any supported asset.' },
            ].map(({ icon, title, desc }, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#5B7FFF20', border: '1px solid #5B7FFF40',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
                  {i < 3 && <div style={{ width: 1, height: 16, background: '#1C2138', margin: '3px 0' }} />}
                </div>
                <div>
                  <div style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 13 }}>{title}</div>
                  <div style={{ color: '#4A5270', fontSize: 12, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════
//  MAIN PAGE
// ══════════════════════════════════════════════════════════════════
export default function AdvancedLendingPage() {
  const { address } = useAccount();
  const [feature, setFeature] = useState('flash');

  const FEATURES = [
    ['flash',       '⚡ Flash Loans',       '#FFB800'],
    ['margin',      '📈 Margin Loans',      '#5B7FFF'],
    ['lpcollateral','🏦 LP Collateral',     '#00E5A0'],
    ['crosschain',  '🌐 Cross-Chain Lend',  '#A855F7'],
  ];

  const STATS_MAP = {
    flash:        [{ label: 'Flash Volume 24h', value: '$4.8M',  sub: 'Across 3 tokens',   accent: '#FFB800' },
                   { label: 'LP Providers',      value: '247',   sub: 'Active LPs',         accent: '#5B7FFF' },
                   { label: 'Avg Flash Fee',      value: '0.09%', sub: 'Per transaction',   accent: '#00E5A0' },
                   { label: 'Flash Loan APY',     value: '~8.4%', sub: 'LP yield estimate', accent: '#A855F7' }],
    margin:       [{ label: 'Pool TVL',           value: '$2.1M',  sub: 'USDC deposited',    accent: '#5B7FFF' },
                   { label: 'Active Loans',        value: '84',    sub: 'Open positions',    accent: '#00E5A0' },
                   { label: 'Avg Borrow APY',      value: '~14%',  sub: 'Variable rate',     accent: '#FF8C42' },
                   { label: 'Avg LTV',             value: '62%',   sub: 'Across all loans',  accent: '#FFB800' }],
    lpcollateral: [{ label: 'LP Types',            value: '4',     sub: 'WLP/Spot/UniV5/Ext', accent: '#00E5A0' },
                   { label: 'TVL in Vaults',       value: '$840K', sub: 'LP collateral',     accent: '#5B7FFF' },
                   { label: 'Avg Vault LTV',       value: '58%',   sub: 'Utilisation',       accent: '#FFB800' },
                   { label: 'Lend Pool APY',       value: '~9.4%', sub: 'USDC yield',        accent: '#A855F7' }],
    crosschain:   [{ label: 'Chains Supported',    value: '5',     sub: 'EVM chains',        accent: '#A855F7' },
                   { label: 'Cross-Chain TVL',     value: '$1.2M', sub: 'Collateral locked', accent: '#00E5A0' },
                   { label: 'Borrow APY',          value: '~16%',  sub: 'Variable rate',     accent: '#FF8C42' },
                   { label: 'Relayer Threshold',   value: '2/3',   sub: 'Multi-sig security',accent: '#5B7FFF' }],
  };

  const featureColors = Object.fromEntries(FEATURES.map(([id,,c]) => [id, c]));

  return (
    <AppLayout>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14,
              background: `linear-gradient(135deg, ${featureColors[feature]}20, ${featureColors[feature]}10)`,
              border: `1px solid ${featureColors[feature]}40`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
              {FEATURES.find(f => f[0] === feature)?.[1].split(' ')[0]}
            </div>
            <div>
              <h1 style={{ fontSize: 26, fontWeight: 900, color: '#EDF0FA', margin: 0 }}>Advanced Lending Suite</h1>
              <p style={{ color: '#4A5270', fontSize: 13, margin: 0 }}>
                Flash loans · Margin loans · LP collateral · Cross-chain borrowing
              </p>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar" />
            </div>
          </div>
        </div>

        {/* Feature selector */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
          {FEATURES.map(([id, label, color]) => (
            <button key={id} onClick={() => setFeature(id)}
              style={{ padding: '14px 16px', borderRadius: 12, cursor: 'pointer', border: '2px solid',
                borderColor: feature === id ? color : '#1C2138',
                background: feature === id ? `${color}12` : '#0E1120',
                transition: 'all 0.2s', textAlign: 'left' }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>{label.split(' ')[0]}</div>
              <div style={{ color: feature === id ? color : '#8892B0', fontWeight: 800, fontSize: 13 }}>
                {label.split(' ').slice(1).join(' ')}
              </div>
            </button>
          ))}
        </div>

        {/* Stats for current feature */}
        <StatGrid stats={STATS_MAP[feature]} />

        {/* Active feature panel */}
        {feature === 'flash'        && <FlashLoanPanel    address={address} />}
        {feature === 'margin'       && <MarginLoanPanel   address={address} />}
        {feature === 'lpcollateral' && <LPCollateralPanel address={address} />}
        {feature === 'crosschain'   && <CrossChainPanel   address={address} />}
      </div>
    </AppLayout>
  );
}
