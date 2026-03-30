import { useState } from 'react';
import { useAccount } from 'wagmi';
import AppLayout from '../components/layout/AppLayout';

const S={bg:'#0E1120',s1:'#09101C',s2:'#131829',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060',p:'#A855F7'};

// API keys set via environment variables — see .env.example
const MOONPAY_PK  = process.env.REACT_APP_MOONPAY_API_KEY  || 'pk_test_your_key';
const TRANSAK_KEY = process.env.REACT_APP_TRANSAK_API_KEY  || 'staging_test_key';
const BANXA_KEY   = process.env.REACT_APP_BANXA_PARTNER_ID || 'wikicious';
const RAMP_KEY    = process.env.REACT_APP_RAMP_API_KEY     || 'your_ramp_key';

const PROVIDERS = [
  { name:'MoonPay',  flag:'🌍', commission:'0.5%',  countries:'180+', methods:'Card, Bank, Apple Pay, Google Pay', minUSD:30,  maxUSD:50000, time:'~5 min',
    buildUrl:(amount,currency,crypto,wallet)=>`https://buy.moonpay.com?apiKey=${MOONPAY_PK}&currencyCode=${crypto.toLowerCase()}_arbitrum&baseCurrencyAmount=${amount}&baseCurrencyCode=${currency.toLowerCase()}&walletAddress=${wallet||''}&colorCode=%235B7FFF` },
  { name:'Transak',  flag:'🇮🇳', commission:'0.75%', countries:'100+', methods:'UPI, IMPS, Card, Bank Wire',       minUSD:5,   maxUSD:10000, time:'~2 min',
    buildUrl:(amount,currency,crypto,wallet)=>`https://global.transak.com?apiKey=${TRANSAK_KEY}&fiatCurrency=${currency}&defaultFiatAmount=${amount}&cryptoCurrencyCode=${crypto}&network=arbitrum&walletAddress=${wallet||''}&themeColor=5B7FFF` },
  { name:'Banxa',    flag:'🇦🇺', commission:'0.75%', countries:'60+',  methods:'POLi, BPAY, Bank, Card',           minUSD:50,  maxUSD:20000, time:'~10 min',
    buildUrl:(amount,currency,crypto,wallet)=>`https://wikicious.banxa.com?fiat_type=${currency}&fiat_amount=${amount}&coin_type=${crypto}&blockchain=ARBITRUM&wallet_address=${wallet||''}` },
  { name:'Ramp',     flag:'🇬🇧', commission:'0.5%',  countries:'40+',  methods:'Open Banking, Card',               minUSD:20,  maxUSD:30000, time:'~3 min',
    buildUrl:(amount,currency,crypto,wallet)=>`https://app.ramp.network?apiKey=${RAMP_KEY}&swapAsset=ARBITRUM_${crypto}&fiatValue=${amount}&fiatCurrency=${currency}&userAddress=${wallet||''}` },
];

const CRYPTO_MAP = { USDC:'USDC', ETH:'ETH', BTC:'BTC', ARB:'ARB', WIK:'WIK' };

export default function FiatOnRampPage() {
  const { address } = useAccount();
  const [amount,   setAmount]   = useState(500);
  const [currency, setCurrency] = useState('USD');
  const [provider, setProvider] = useState(0);
  const [crypto,   setCrypto]   = useState('USDC');

  const p          = PROVIDERS[provider];
  const commission = (amount * parseFloat(p.commission) / 100).toFixed(2);
  const receive    = (amount - amount * 0.02).toFixed(2);

  function openProvider() {
    const url = p.buildUrl(amount, currency, CRYPTO_MAP[crypto] || crypto, address);
    window.open(url, '_blank', 'width=500,height=700,noopener,noreferrer');
  }

  return (
    <AppLayout>
      <div style={{maxWidth:1100,margin:'0 auto',padding:'20px 24px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
          <div style={{width:48,height:48,borderRadius:13,background:'linear-gradient(135deg,#00E5A0,#FFB800)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>💳</div>
          <div>
            <h1 style={{margin:0,fontSize:22,fontWeight:900,color:S.t1}}>Buy Crypto</h1>
            <div style={{fontSize:11,color:S.t3}}>Fiat → crypto gateway · MoonPay, Transak, Banxa, Ramp · Wikicious earns 0.5–0.75% referral</div>
          </div>
          <div style={{marginLeft:'auto',textAlign:'right'}}>
            <div style={{fontSize:8,color:S.t3}}>REFERRAL REVENUE (30d)</div>
            <div style={{fontSize:18,fontWeight:900,fontFamily:'monospace',color:S.g}}>$28,400</div>
          </div>
        </div>

        {!address && <div style={{padding:'10px 14px',background:'rgba(255,176,0,.08)',border:'1px solid rgba(255,176,0,.25)',borderRadius:10,fontSize:12,color:'#FFB800',marginBottom:16}}>
          ⚠ Connect your wallet so we can auto-fill your receiving address
        </div>}

        <div style={{display:'grid',gridTemplateColumns:'380px 1fr',gap:20}}>
          {/* Left form */}
          <div style={{background:S.s1,border:`1px solid ${S.b}`,borderRadius:14,padding:20}}>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:6}}>I WANT TO SPEND</div>
              <div style={{display:'flex',gap:6}}>
                <input type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} style={{flex:1,background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:18,fontFamily:'monospace',fontWeight:900,padding:'10px 12px',outline:'none'}}/>
                <select value={currency} onChange={e=>setCurrency(e.target.value)} style={{background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,color:S.t1,fontSize:13,padding:'0 10px',outline:'none'}}>
                  {['USD','EUR','GBP','INR','AUD','CAD'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:9,color:S.t3,fontWeight:700,marginBottom:6}}>I WANT TO RECEIVE</div>
              <div style={{display:'flex',gap:6}}>
                {['USDC','ETH','BTC','ARB','WIK'].map(c=><button key={c} onClick={()=>setCrypto(c)} style={{flex:1,padding:'7px 0',borderRadius:7,border:`1px solid ${crypto===c?S.a:S.b}`,background:crypto===c?`${S.a}15`:'transparent',color:crypto===c?S.a:S.t3,fontWeight:700,fontSize:10,cursor:'pointer'}}>{c}</button>)}
              </div>
            </div>
            <div style={{background:'#0A0C16',borderRadius:9,padding:'10px 12px',marginBottom:14}}>
              {[['Provider fee','~2–3%'],['Wikicious referral',`$${commission} (${p.commission})`],['You receive (est)',`~${receive} ${crypto}`],['Time',p.time],['Wallet',address?`${address.slice(0,6)}…${address.slice(-4)}`:'Not connected']].map(([k,v])=>
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'3px 0'}}>
                  <span style={{fontSize:11,color:S.t3}}>{k}</span>
                  <span style={{fontSize:11,fontFamily:'monospace',fontWeight:700,color:S.t1}}>{v}</span>
                </div>
              )}
            </div>
            <button onClick={openProvider} style={{width:'100%',padding:13,borderRadius:10,border:'none',fontWeight:900,fontSize:14,background:`linear-gradient(135deg,${S.g},${S.a})`,color:'#000',cursor:'pointer'}}>
              Continue with {p.name} {p.flag} →
            </button>
            <div style={{textAlign:'center',marginTop:8,fontSize:9,color:S.t3}}>Redirected to {p.name} — complete purchase securely. Crypto arrives on Arbitrum.</div>
          </div>

          {/* Right — provider list */}
          <div>
            <div style={{fontWeight:700,fontSize:13,color:S.t1,marginBottom:12}}>Select Payment Provider</div>
            {PROVIDERS.map((pv,i)=>(
              <div key={pv.name} onClick={()=>setProvider(i)} style={{background:provider===i?`${S.g}08`:S.s1,border:`2px solid ${provider===i?S.g:S.b}`,borderRadius:13,padding:16,marginBottom:10,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <span style={{fontSize:24}}>{pv.flag}</span>
                  <div>
                    <div style={{fontWeight:800,fontSize:14,color:S.t1}}>{pv.name}</div>
                    <div style={{fontSize:10,color:S.t3}}>{pv.methods}</div>
                    <div style={{fontSize:9,color:S.t3,marginTop:2}}>{pv.countries} countries · Min ${pv.minUSD} · {pv.time}</div>
                  </div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:9,color:S.t3}}>Wikicious earns</div>
                  <div style={{fontSize:18,fontWeight:900,fontFamily:'monospace',color:S.gold}}>{pv.commission}</div>
                  <div style={{fontSize:9,color:S.t3}}>referral/trade</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
