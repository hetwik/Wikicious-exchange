// ════════════════════════════════════════════════════════════════════════
//  LiquidStakingPage.jsx
// ════════════════════════════════════════════════════════════════════════
import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = path => axios.get(`${API_URL}${path}`).then(r => r.data);
const fmtWIK = v => { const n = Number(v)/1e18; return n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(2)}K` : n.toFixed(4); };
const fmtDate = ts => new Date(Number(ts)*1000).toLocaleDateString('en',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});

const MOCK_STATS = { exchangeRate: '1082400000000000000', totalStakedWIK: '84200000000000000000000000', totalUnbonding: '1200000000000000000000000', instantBuffer: '5000000000000000000000000', protocolFeeBps: '500', unbondingPeriodDays: 7, apy: '14.2', sWIKAddress: '0x...' };

function ExchangeRateGauge({ rate }) {
  const r = Number(rate) / 1e18;
  return (
    <div style={{ background: 'linear-gradient(135deg, #5B7FFF12, #A855F712)', border: '1px solid #5B7FFF30', borderRadius: 16, padding: 24, textAlign: 'center' }}>
      <div style={{ color: '#4A5270', fontSize: 11, fontWeight: 700, marginBottom: 6, letterSpacing: '0.1em' }}>EXCHANGE RATE</div>
      <div style={{ fontSize: 48, fontWeight: 900, color: '#EDF0FA', fontFamily: 'monospace', lineHeight: 1 }}>
        1<span style={{ color: '#A855F7', fontSize: 24 }}> sWIK</span>
      </div>
      <div style={{ color: '#4A5270', fontSize: 18, margin: '8px 0' }}>=</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: '#5B7FFF', fontFamily: 'monospace' }}>
        {r.toFixed(4)}<span style={{ color: '#8892B0', fontSize: 18 }}> WIK</span>
      </div>
      <div style={{ color: '#00E5A0', fontSize: 13, fontWeight: 700, marginTop: 8 }}>
        ↑ {((r - 1) * 100).toFixed(2)}% since genesis
      </div>
    </div>
  );
}

export function LiquidStakingPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState('stake');
  const [amount, setAmount] = useState('');

  const { data: stats = MOCK_STATS }  = useQuery({ queryKey: ['ls-stats'], queryFn: () => api('/api/liquid-staking/stats'), refetchInterval: 30000 });
  const { data: userData = {} }       = useQuery({ queryKey: ['ls-user', address], queryFn: () => api(`/api/liquid-staking/user/${address}`), enabled: !!address, refetchInterval: 15000 });

  const rate      = Number(stats.exchangeRate || 1e18) / 1e18;
  const sWIKPreview = tab === 'stake' && amount ? (parseFloat(amount) / rate).toFixed(4) : null;
  const wikPreview  = tab === 'unstake' && amount ? (parseFloat(amount) * rate).toFixed(4) : null;
  const instantFee  = tab === 'instant' && amount ? (parseFloat(amount) * rate * 0.003).toFixed(4) : null;

  return (
    <AppLayout active="liquid-staking">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg, #A855F720, #5B7FFF20)', border: '1px solid #A855F740', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💎</div>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: '#EDF0FA', margin: 0 }}>Liquid Staking</h1>
              <p style={{ color: '#4A5270', fontSize: 13, margin: 0 }}>Stake WIK → receive sWIK (liquid receipt). Use sWIK in DeFi while earning staking rewards</p>
            </div>
          </div>
        </div>

        {/* Stats + gauge */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 24, marginBottom: 28 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            {[
              { l: 'Total Staked', v: fmtWIK(stats.totalStakedWIK) + ' WIK', c: '#5B7FFF' },
              { l: 'Staking APY', v: `${stats.apy}%`, c: '#00E5A0' },
              { l: 'Unbonding', v: fmtWIK(stats.totalUnbonding) + ' WIK', c: '#FFB800' },
              { l: 'Instant Buffer', v: fmtWIK(stats.instantBuffer) + ' WIK', c: '#A855F7' },
            ].map(({ l, v, c }) => (
              <div key={l} style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 6, letterSpacing: '0.08em' }}>{l.toUpperCase()}</div>
                <div style={{ color: c, fontSize: 20, fontWeight: 900, fontFamily: 'monospace' }}>{v}</div>
              </div>
            ))}
          </div>
          <ExchangeRateGauge rate={stats.exchangeRate} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Action card */}
          <div style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 16, padding: 24 }}>
            {/* Tabs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 3, background: '#0A0C16', padding: 3, borderRadius: 9, marginBottom: 22 }}>
              {[['stake','Stake'],['unstake','Unbond'],['instant','Instant'],['claim','Claim']].map(([id, label]) => (
                <button key={id} onClick={() => setTab(id)}
                  style={{ padding: '8px 4px', borderRadius: 7, fontSize: 11, fontWeight: 700, cursor: 'pointer', border: 'none', transition: 'all .12s', textAlign: 'center',
                    background: tab === id ? '#5B7FFF' : 'transparent', color: tab === id ? '#fff' : '#4A5270' }}>
                  {label}
                </button>
              ))}
            </div>

            {(tab === 'stake' || tab === 'unstake' || tab === 'instant') && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: '#4A5270', fontSize: 10, fontWeight: 700, marginBottom: 8 }}>
                    {tab === 'stake' ? 'WIK TO STAKE' : tab === 'unstake' ? 'sWIK TO UNBOND' : 'sWIK TO INSTANT REDEEM'}
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" type="number"
                      style={{ width: '100%', background: '#0A0C16', border: '1px solid #1C2138', borderRadius: 10,
                        color: '#EDF0FA', fontSize: 22, fontWeight: 900, fontFamily: 'monospace',
                        padding: '14px 80px 14px 16px', outline: 'none', boxSizing: 'border-box' }} />
                    <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: '#8892B0', fontWeight: 700, fontSize: 14 }}>
                        {tab === 'stake' ? 'WIK' : 'sWIK'}
                      </span>
                      <button style={{ background: '#5B7FFF20', border: '1px solid #5B7FFF40', borderRadius: 6, color: '#5B7FFF', fontSize: 10, fontWeight: 700, padding: '3px 8px', cursor: 'pointer' }}>MAX</button>
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 18 }}>
                  {tab === 'stake' && <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#4A5270', fontSize: 12 }}>You receive</span>
                      <span style={{ color: '#A855F7', fontWeight: 800, fontFamily: 'monospace' }}>{sWIKPreview || '0.00'} sWIK</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4A5270', fontSize: 12 }}>Unlock method</span>
                      <span style={{ color: '#8892B0', fontSize: 12 }}>7-day unbonding or instant</span>
                    </div>
                  </>}
                  {tab === 'unstake' && <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#4A5270', fontSize: 12 }}>WIK to receive</span>
                      <span style={{ color: '#5B7FFF', fontWeight: 800, fontFamily: 'monospace' }}>{wikPreview || '0.00'} WIK</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4A5270', fontSize: 12 }}>Unbonding period</span>
                      <span style={{ color: '#FFB800', fontSize: 12 }}>7 days</span>
                    </div>
                  </>}
                  {tab === 'instant' && <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ color: '#4A5270', fontSize: 12 }}>WIK to receive</span>
                      <span style={{ color: '#00E5A0', fontWeight: 800, fontFamily: 'monospace' }}>{amount ? (parseFloat(amount) * rate * 0.997).toFixed(4) : '0.00'} WIK</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#4A5270', fontSize: 12 }}>Instant fee (0.3%)</span>
                      <span style={{ color: '#FF8C42', fontSize: 12, fontFamily: 'monospace' }}>{instantFee || '0.00'} WIK</span>
                    </div>
                  </>}
                </div>

                <button style={{ width: '100%', padding: 15, borderRadius: 12, fontWeight: 900, fontSize: 14, cursor: 'pointer', border: 'none', letterSpacing: '0.04em',
                  background: tab === 'stake' ? 'linear-gradient(135deg, #A855F7, #5B7FFF)' : tab === 'instant' ? 'linear-gradient(135deg, #FF8C42, #FF4060)' : 'linear-gradient(135deg, #5B7FFF, #3B5FDF)',
                  color: '#fff' }}>
                  {tab === 'stake' ? '💎 STAKE WIK' : tab === 'unstake' ? '⏳ START UNBONDING' : '⚡ INSTANT REDEEM'}
                </button>
              </>
            )}

            {tab === 'claim' && (
              <>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontWeight: 700, color: '#8892B0', fontSize: 13, marginBottom: 16 }}>Pending Unbond Requests</div>
                  {userData?.unbondRequests?.filter(r => !r.claimed).length > 0
                    ? userData.unbondRequests.filter(r => !r.claimed).map(r => {
                        const ready = Date.now()/1000 >= Number(r.unbondTime);
                        return (
                          <div key={r.id} style={{ background: '#0A0C16', borderRadius: 10, padding: 14, marginBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <div style={{ color: '#EDF0FA', fontWeight: 700, fontFamily: 'monospace' }}>{fmtWIK(r.wikAmount)} WIK</div>
                              <div style={{ color: ready ? '#00E5A0' : '#FFB800', fontSize: 11, marginTop: 3 }}>
                                {ready ? '✅ Ready to claim' : `⏳ Unlocks ${fmtDate(r.unbondTime)}`}
                              </div>
                            </div>
                            <button disabled={!ready}
                              style={{ padding: '8px 18px', borderRadius: 8, background: ready ? '#00E5A020' : '#1C2138',
                                border: `1px solid ${ready ? '#00E5A040' : '#1C2138'}`, color: ready ? '#00E5A0' : '#4A5270',
                                fontWeight: 700, fontSize: 12, cursor: ready ? 'pointer' : 'default' }}>
                              Claim
                            </button>
                          </div>
                        );
                      })
                    : <div style={{ textAlign: 'center', color: '#4A5270', fontSize: 13, padding: 24 }}>No pending unbond requests</div>
                  }
                </div>
              </>
            )}
          </div>

          {/* Info card */}
          <div>
            <div style={{ background: '#0D0F17', border: '1px solid #1C2138', borderRadius: 16, padding: 24, marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#EDF0FA', marginBottom: 16 }}>How sWIK Works</div>
              {[
                { icon: '🔒', title: 'Stake WIK → Receive sWIK', desc: 'sWIK is a liquid receipt token representing your staked WIK. Value grows as rewards accrue.' },
                { icon: '💰', title: 'Earn While Using sWIK', desc: 'Use sWIK as collateral in Lending, provide LP liquidity, or hold — all while rewards grow.' },
                { icon: '📈', title: 'Always Redeemable', desc: '1 sWIK always redeems for ≥ 1 WIK. Exchange rate can only go up as rewards accrue.' },
                { icon: '⚡', title: 'Instant Exit Available', desc: '0.3% fee for immediate WIK from the buffer. Standard exit: 7-day unbonding, no fee.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                  <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ color: '#EDF0FA', fontWeight: 700, fontSize: 13 }}>{title}</div>
                    <div style={{ color: '#4A5270', fontSize: 12, lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ background: '#0D0F17', border: '1px solid #00E5A030', borderRadius: 16, padding: 20 }}>
              <div style={{ color: '#00E5A0', fontWeight: 800, fontSize: 15, marginBottom: 12 }}>⚡ sWIK Utility</div>
              {[['WikiLending', 'Use sWIK as collateral', '#5B7FFF'], ['WikiLP', 'Pair sWIK/USDC for LP fees', '#00E5A0'], ['WikiLaunchpad', 'Gold tier with sWIK', '#FFD700']].map(([name, desc, c]) => (
                <div key={name} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: c, fontWeight: 700, fontSize: 12 }}>{name}</span>
                  <span style={{ color: '#4A5270', fontSize: 12 }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default LiquidStakingPage;
