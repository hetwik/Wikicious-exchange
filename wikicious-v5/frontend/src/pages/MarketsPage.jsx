import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { API_URL } from '../config';
import AppLayout from '../components/layout/AppLayout';

const api = p => axios.get(`${API_URL}${p}`).then(r => r.data);

// ── 241 markets sourced from Binance (639) + Bybit (576+) + dYdX (74) + Hyperliquid (130+) + GMX
const MARKETS = [
  // MEGA-CAP
  {s:'BTC',cat:'Mega-Cap',lev:125,fee:'0.06%'},{s:'ETH',cat:'Mega-Cap',lev:100,fee:'0.06%'},
  // LARGE-CAP
  {s:'BNB',cat:'Large-Cap',lev:75,fee:'0.06%'},{s:'XRP',cat:'Large-Cap',lev:75,fee:'0.06%'},
  {s:'SOL',cat:'Large-Cap',lev:75,fee:'0.06%'},{s:'ADA',cat:'Large-Cap',lev:50,fee:'0.06%'},
  {s:'DOGE',cat:'Large-Cap',lev:50,fee:'0.06%'},{s:'TRX',cat:'Large-Cap',lev:50,fee:'0.06%'},
  {s:'AVAX',cat:'Large-Cap',lev:50,fee:'0.06%'},{s:'SHIB',cat:'Large-Cap',lev:25,fee:'0.07%'},
  {s:'TON',cat:'Large-Cap',lev:50,fee:'0.06%'},{s:'LTC',cat:'Large-Cap',lev:75,fee:'0.06%'},
  {s:'BCH',cat:'Large-Cap',lev:50,fee:'0.07%'},{s:'XLM',cat:'Large-Cap',lev:25,fee:'0.07%'},
  {s:'ETC',cat:'Large-Cap',lev:25,fee:'0.07%'},
  // DeFi
  {s:'LINK',cat:'DeFi',lev:50,fee:'0.07%'},{s:'UNI',cat:'DeFi',lev:25,fee:'0.07%'},
  {s:'AAVE',cat:'DeFi',lev:25,fee:'0.07%'},{s:'ENA',cat:'DeFi',lev:25,fee:'0.07%'},
  {s:'CRV',cat:'DeFi',lev:25,fee:'0.08%'},{s:'MKR',cat:'DeFi',lev:25,fee:'0.08%'},
  {s:'SNX',cat:'DeFi',lev:25,fee:'0.08%'},{s:'COMP',cat:'DeFi',lev:25,fee:'0.08%'},
  {s:'BAL',cat:'DeFi',lev:25,fee:'0.08%'},{s:'LDO',cat:'DeFi',lev:25,fee:'0.07%'},
  {s:'PENDLE',cat:'DeFi',lev:20,fee:'0.08%'},{s:'SUSHI',cat:'DeFi',lev:25,fee:'0.08%'},
  {s:'GRT',cat:'DeFi',lev:25,fee:'0.08%'},{s:'DYDX',cat:'DeFi',lev:25,fee:'0.07%'},
  {s:'RNDR',cat:'DeFi',lev:25,fee:'0.08%'},{s:'1INCH',cat:'DeFi',lev:25,fee:'0.08%'},
  {s:'YFI',cat:'DeFi',lev:15,fee:'0.08%'},{s:'ENS',cat:'DeFi',lev:25,fee:'0.08%'},
  {s:'ZRX',cat:'DeFi',lev:20,fee:'0.08%'},{s:'BAT',cat:'DeFi',lev:20,fee:'0.08%'},
  {s:'LRC',cat:'DeFi',lev:20,fee:'0.08%'},{s:'ZRO',cat:'DeFi',lev:20,fee:'0.08%'},
  {s:'WOO',cat:'DeFi',lev:20,fee:'0.08%'},{s:'MASK',cat:'DeFi',lev:20,fee:'0.08%'},
  {s:'APE',cat:'DeFi',lev:25,fee:'0.08%'},{s:'AUDIO',cat:'DeFi',lev:20,fee:'0.08%'},
  {s:'LQTY',cat:'DeFi',lev:15,fee:'0.10%'},{s:'SPELL',cat:'DeFi',lev:20,fee:'0.08%'},
  {s:'PERP',cat:'DeFi',lev:15,fee:'0.10%'},{s:'BADGER',cat:'DeFi',lev:15,fee:'0.10%'},
  {s:'MORPHO',cat:'DeFi',lev:20,fee:'0.08%'},{s:'DODO',cat:'DeFi',lev:15,fee:'0.10%'},
  {s:'RENDER',cat:'DeFi',lev:25,fee:'0.08%'},{s:'AEVO',cat:'DeFi',lev:20,fee:'0.08%'},
  // Layer 1
  {s:'DOT',cat:'Layer 1',lev:50,fee:'0.07%'},{s:'NEAR',cat:'Layer 1',lev:50,fee:'0.07%'},
  {s:'ATOM',cat:'Layer 1',lev:50,fee:'0.07%'},{s:'FTM',cat:'Layer 1',lev:50,fee:'0.07%'},
  {s:'ALGO',cat:'Layer 1',lev:25,fee:'0.07%'},{s:'ICP',cat:'Layer 1',lev:25,fee:'0.07%'},
  {s:'HBAR',cat:'Layer 1',lev:25,fee:'0.08%'},{s:'SUI',cat:'Layer 1',lev:50,fee:'0.07%'},
  {s:'APT',cat:'Layer 1',lev:50,fee:'0.07%'},{s:'TIA',cat:'Layer 1',lev:25,fee:'0.07%'},
  {s:'INJ',cat:'Layer 1',lev:25,fee:'0.07%'},{s:'SEI',cat:'Layer 1',lev:25,fee:'0.08%'},
  {s:'RUNE',cat:'Layer 1',lev:25,fee:'0.08%'},{s:'MOVE',cat:'Layer 1',lev:25,fee:'0.08%'},
  {s:'KAS',cat:'Layer 1',lev:25,fee:'0.08%'},{s:'EGLD',cat:'Layer 1',lev:25,fee:'0.08%'},
  {s:'QTUM',cat:'Layer 1',lev:20,fee:'0.08%'},{s:'ONT',cat:'Layer 1',lev:20,fee:'0.08%'},
  {s:'VET',cat:'Layer 1',lev:25,fee:'0.07%'},{s:'THETA',cat:'Layer 1',lev:25,fee:'0.07%'},
  {s:'ZEN',cat:'Layer 1',lev:20,fee:'0.08%'},{s:'DASH',cat:'Layer 1',lev:20,fee:'0.08%'},
  {s:'ZEC',cat:'Layer 1',lev:20,fee:'0.08%'},{s:'XMR',cat:'Layer 1',lev:25,fee:'0.08%'},
  {s:'KAVA',cat:'Layer 1',lev:20,fee:'0.08%'},{s:'ONE',cat:'Layer 1',lev:20,fee:'0.08%'},
  {s:'IOTX',cat:'Layer 1',lev:20,fee:'0.08%'},{s:'CELR',cat:'Layer 1',lev:20,fee:'0.08%'},
  {s:'ZETA',cat:'Layer 1',lev:20,fee:'0.08%'},{s:'TAIKO',cat:'Layer 1',lev:20,fee:'0.08%'},
  {s:'FLOW',cat:'Layer 1',lev:25,fee:'0.08%'},{s:'MINA',cat:'Layer 1',lev:20,fee:'0.08%'},
  {s:'EOS',cat:'Layer 1',lev:25,fee:'0.08%'},{s:'XTZ',cat:'Layer 1',lev:25,fee:'0.08%'},
  {s:'OSMO',cat:'Layer 1',lev:20,fee:'0.08%'},{s:'AKT',cat:'Layer 1',lev:20,fee:'0.08%'},
  {s:'FIL',cat:'Layer 1',lev:25,fee:'0.07%'},{s:'ZIL',cat:'Layer 1',lev:20,fee:'0.08%'},
  {s:'HOT',cat:'Layer 1',lev:20,fee:'0.08%'},{s:'WIN',cat:'Layer 1',lev:15,fee:'0.10%'},
  {s:'REEF',cat:'Layer 1',lev:15,fee:'0.10%'},{s:'CELO',cat:'Layer 1',lev:15,fee:'0.10%'},
  {s:'TOMO',cat:'Layer 1',lev:15,fee:'0.10%'},{s:'DENT',cat:'Layer 1',lev:15,fee:'0.10%'},
  {s:'GLMR',cat:'Layer 1',lev:15,fee:'0.10%'},{s:'KLAY',cat:'Layer 1',lev:15,fee:'0.10%'},
  {s:'JASMY',cat:'Layer 1',lev:15,fee:'0.10%'},{s:'PEOPLE',cat:'Layer 1',lev:15,fee:'0.10%'},
  {s:'SKL',cat:'Layer 1',lev:15,fee:'0.10%'},{s:'CTSI',cat:'Layer 1',lev:15,fee:'0.10%'},
  {s:'NKN',cat:'Layer 1',lev:15,fee:'0.10%'},{s:'XEC',cat:'Layer 1',lev:15,fee:'0.10%'},
  {s:'BTT',cat:'Layer 1',lev:15,fee:'0.10%'},{s:'VRA',cat:'Layer 1',lev:15,fee:'0.10%'},
  {s:'NMR',cat:'Layer 1',lev:15,fee:'0.10%'},{s:'ASTR',cat:'Layer 1',lev:20,fee:'0.08%'},
  {s:'BERA',cat:'Layer 1',lev:20,fee:'0.08%'},{s:'SONIC',cat:'Layer 1',lev:25,fee:'0.08%'},
  {s:'LPT',cat:'Layer 1',lev:20,fee:'0.08%'},
  // Layer 2
  {s:'ARB',cat:'Layer 2',lev:50,fee:'0.07%'},{s:'OP',cat:'Layer 2',lev:50,fee:'0.07%'},
  {s:'MATIC',cat:'Layer 2',lev:50,fee:'0.07%'},{s:'IMX',cat:'Layer 2',lev:25,fee:'0.08%'},
  {s:'STRK',cat:'Layer 2',lev:25,fee:'0.08%'},{s:'DYMA',cat:'Layer 2',lev:20,fee:'0.08%'},
  {s:'ZK',cat:'Layer 2',lev:20,fee:'0.08%'},{s:'SCROLL',cat:'Layer 2',lev:20,fee:'0.08%'},
  {s:'MANTA',cat:'Layer 2',lev:20,fee:'0.08%'},{s:'BEAM',cat:'Layer 2',lev:20,fee:'0.08%'},
  {s:'ZKJ',cat:'Layer 2',lev:20,fee:'0.08%'},{s:'ALT',cat:'Layer 2',lev:20,fee:'0.08%'},
  // Arb Eco
  {s:'GMX',cat:'Arb Eco',lev:25,fee:'0.07%'},{s:'RDNT',cat:'Arb Eco',lev:20,fee:'0.08%'},
  {s:'GRAIL',cat:'Arb Eco',lev:20,fee:'0.08%'},{s:'MAGIC',cat:'Arb Eco',lev:20,fee:'0.08%'},
  {s:'DPX',cat:'Arb Eco',lev:20,fee:'0.10%'},{s:'JONES',cat:'Arb Eco',lev:15,fee:'0.10%'},
  {s:'GNS',cat:'Arb Eco',lev:20,fee:'0.08%'},
  // AI / Data
  {s:'FET',cat:'AI',lev:25,fee:'0.08%'},{s:'AGIX',cat:'AI',lev:25,fee:'0.08%'},
  {s:'WLD',cat:'AI',lev:25,fee:'0.08%'},{s:'TAO',cat:'AI',lev:20,fee:'0.08%'},
  {s:'OCEAN',cat:'AI',lev:20,fee:'0.08%'},{s:'VIRT',cat:'AI',lev:20,fee:'0.08%'},
  {s:'AI16Z',cat:'AI',lev:15,fee:'0.10%'},{s:'LAYER',cat:'AI',lev:20,fee:'0.08%'},
  {s:'AIXBT',cat:'AI',lev:20,fee:'0.08%'},{s:'GRASS',cat:'AI',lev:20,fee:'0.08%'},
  {s:'ACT',cat:'AI',lev:15,fee:'0.10%'},{s:'COOKIE',cat:'AI',lev:15,fee:'0.10%'},
  {s:'UXLINK',cat:'AI',lev:20,fee:'0.08%'},{s:'KAITO',cat:'AI',lev:20,fee:'0.08%'},
  {s:'VIRTUAL',cat:'AI',lev:20,fee:'0.08%'},{s:'INIT',cat:'AI',lev:20,fee:'0.08%'},
  {s:'SIGN',cat:'AI',lev:15,fee:'0.10%'},
  // Gaming
  {s:'AXS',cat:'Gaming',lev:25,fee:'0.08%'},{s:'MANA',cat:'Gaming',lev:25,fee:'0.08%'},
  {s:'SAND',cat:'Gaming',lev:25,fee:'0.08%'},{s:'GALA',cat:'Gaming',lev:25,fee:'0.08%'},
  {s:'ENJ',cat:'Gaming',lev:20,fee:'0.08%'},{s:'ILV',cat:'Gaming',lev:20,fee:'0.10%'},
  {s:'BIGTIME',cat:'Gaming',lev:20,fee:'0.08%'},{s:'CHZ',cat:'Gaming',lev:25,fee:'0.08%'},
  {s:'YGG',cat:'Gaming',lev:15,fee:'0.10%'},{s:'ALICE',cat:'Gaming',lev:20,fee:'0.08%'},
  {s:'PIXEL',cat:'Gaming',lev:15,fee:'0.10%'},{s:'PORTAL',cat:'Gaming',lev:15,fee:'0.10%'},
  {s:'ACE',cat:'Gaming',lev:15,fee:'0.10%'},
  // Meme
  {s:'PEPE',cat:'Meme',lev:20,fee:'0.08%'},{s:'FLOKI',cat:'Meme',lev:20,fee:'0.08%'},
  {s:'WIF',cat:'Meme',lev:20,fee:'0.08%'},{s:'BONK',cat:'Meme',lev:20,fee:'0.08%'},
  {s:'BOME',cat:'Meme',lev:15,fee:'0.10%'},{s:'TRUMP',cat:'Meme',lev:20,fee:'0.08%'},
  {s:'POPCAT',cat:'Meme',lev:15,fee:'0.10%'},{s:'MOODENG',cat:'Meme',lev:15,fee:'0.10%'},
  {s:'NEIRO',cat:'Meme',lev:15,fee:'0.10%'},{s:'PNUT',cat:'Meme',lev:15,fee:'0.10%'},
  {s:'BRET',cat:'Meme',lev:15,fee:'0.10%'},{s:'MOG',cat:'Meme',lev:10,fee:'0.10%'},
  {s:'TURBO',cat:'Meme',lev:10,fee:'0.10%'},{s:'VINE',cat:'Meme',lev:10,fee:'0.10%'},
  {s:'SPX',cat:'Meme',lev:15,fee:'0.10%'},{s:'GOAT',cat:'Meme',lev:10,fee:'0.10%'},
  {s:'FARTCOIN',cat:'Meme',lev:10,fee:'0.10%'},{s:'MEW',cat:'Meme',lev:15,fee:'0.10%'},
  {s:'MELANIA',cat:'Meme',lev:15,fee:'0.10%'},{s:'DOGS',cat:'Meme',lev:15,fee:'0.10%'},
  {s:'HMSTR',cat:'Meme',lev:15,fee:'0.10%'},{s:'CATI',cat:'Meme',lev:15,fee:'0.10%'},
  // Oracle / Infra
  {s:'PYTH',cat:'Oracle',lev:25,fee:'0.08%'},{s:'JTO',cat:'Oracle',lev:20,fee:'0.08%'},
  {s:'JUP',cat:'Oracle',lev:25,fee:'0.08%'},{s:'JITO',cat:'Oracle',lev:20,fee:'0.08%'},
  {s:'EIGEN',cat:'Oracle',lev:20,fee:'0.08%'},{s:'TRB',cat:'Oracle',lev:20,fee:'0.08%'},
  {s:'BAND',cat:'Oracle',lev:20,fee:'0.08%'},{s:'ANKR',cat:'Oracle',lev:20,fee:'0.08%'},
  {s:'ARKM',cat:'Oracle',lev:20,fee:'0.08%'},{s:'ETHFI',cat:'Oracle',lev:20,fee:'0.08%'},
  // RWA / Yield
  {s:'ONDO',cat:'RWA',lev:20,fee:'0.08%'},{s:'MANTRA',cat:'RWA',lev:25,fee:'0.08%'},
  {s:'OM',cat:'RWA',lev:25,fee:'0.07%'},{s:'ENA',cat:'RWA',lev:25,fee:'0.07%'},
  {s:'USUAL',cat:'RWA',lev:20,fee:'0.08%'},{s:'MORPHO',cat:'RWA',lev:20,fee:'0.08%'},
  // BTC Eco
  {s:'ORDI',cat:'BTC Eco',lev:20,fee:'0.08%'},{s:'SATS',cat:'BTC Eco',lev:15,fee:'0.10%'},
  {s:'STX',cat:'BTC Eco',lev:20,fee:'0.08%'},
  // Solana Eco
  {s:'RAY',cat:'Solana',lev:25,fee:'0.08%'},{s:'DRIFT',cat:'Solana',lev:20,fee:'0.08%'},
  {s:'ORCA',cat:'Solana',lev:20,fee:'0.08%'},{s:'PENG',cat:'Solana',lev:15,fee:'0.10%'},
  {s:'NOT',cat:'Solana',lev:20,fee:'0.08%'},{s:'PENGU',cat:'Solana',lev:15,fee:'0.10%'},
  // CEX Tokens
  {s:'OKB',cat:'CEX',lev:25,fee:'0.07%'},{s:'HT',cat:'CEX',lev:20,fee:'0.08%'},
  {s:'KCS',cat:'CEX',lev:20,fee:'0.08%'},{s:'HYPE',cat:'CEX',lev:25,fee:'0.07%'},
  // Storage
  {s:'SC',cat:'Storage',lev:15,fee:'0.10%'},{s:'STORJ',cat:'Storage',lev:20,fee:'0.08%'},
  {s:'AR',cat:'Storage',lev:25,fee:'0.08%'},
  // New 2025
  {s:'BERA',cat:'New 2025',lev:20,fee:'0.08%'},{s:'IP',cat:'New 2025',lev:25,fee:'0.08%'},
  {s:'ANIME',cat:'New 2025',lev:20,fee:'0.08%'},{s:'ME',cat:'New 2025',lev:20,fee:'0.08%'},
  {s:'PENGU',cat:'New 2025',lev:15,fee:'0.10%'},{s:'USUAL',cat:'New 2025',lev:20,fee:'0.08%'},
  {s:'SYRUP',cat:'New 2025',lev:15,fee:'0.10%'},{s:'ASTR',cat:'New 2025',lev:20,fee:'0.08%'},
  {s:'ETHFI',cat:'New 2025',lev:20,fee:'0.08%'},{s:'REZ',cat:'New 2025',lev:15,fee:'0.10%'},
  {s:'SUPER',cat:'New 2025',lev:15,fee:'0.10%'},{s:'RENDER',cat:'New 2025',lev:25,fee:'0.08%'},
  // Interop
  {s:'W',cat:'Interop',lev:20,fee:'0.08%'},{s:'AXL',cat:'Interop',lev:20,fee:'0.08%'},
  // Legacy
  {s:'XEM',cat:'Legacy',lev:15,fee:'0.10%'},{s:'OMG',cat:'Legacy',lev:15,fee:'0.10%'},
  {s:'BSV',cat:'Legacy',lev:15,fee:'0.10%'},{s:'XEC',cat:'Legacy',lev:15,fee:'0.10%'},
  {s:'BTT',cat:'Legacy',lev:15,fee:'0.10%'},{s:'WIN',cat:'Legacy',lev:15,fee:'0.10%'},
  // Social
  {s:'C98',cat:'Social',lev:20,fee:'0.08%'},{s:'COTI',cat:'Social',lev:20,fee:'0.08%'},
  {s:'SLP',cat:'Social',lev:15,fee:'0.10%'},{s:'RSR',cat:'Social',lev:15,fee:'0.10%'},
  {s:'GTC',cat:'Social',lev:15,fee:'0.10%'},{s:'TLM',cat:'Social',lev:15,fee:'0.10%'},
];

const CAT_COLOR = {
  'Mega-Cap':'#FFB800','Large-Cap':'#5B7FFF','DeFi':'#00E5A0','Layer 1':'#A855F7',
  'Layer 2':'#00D4FF','Arb Eco':'#FF8C42','AI':'#4F7AFF','Gaming':'#FF4060',
  'Meme':'#FF8C42','Oracle':'#8892B0','RWA':'#00E5A0','BTC Eco':'#FFB800',
  'Solana':'#9945FF','CEX':'#8892B0','Storage':'#5B7FFF','New 2025':'#00E5A0',
  'Interop':'#A855F7','Legacy':'#4A5270','Social':'#FF8C42','Other':'#4A5270',
};

const ALL_CATS = ['All', ...Object.keys(CAT_COLOR)];
const S = {bg:'#0E1120',b:'#1C2138',t1:'#EDF0FA',t2:'#8892B0',t3:'#4A5270',a:'#5B7FFF',g:'#00E5A0',gold:'#FFB800',r:'#FF4060'};

// Fake but deterministic price/change
const fakePrice = s => { const h = [...s].reduce((a,c)=>a*31+c.charCodeAt(0),1)%10000; return h*0.47+0.001; };
const fakeChg  = s => { const h = [...s].reduce((a,c)=>a*17+c.charCodeAt(0),1); return ((h%1000)/100-5).toFixed(2); };
const fmtP = (s,p) => {
  if (!p) p=fakePrice(s);
  return p>=10000?`$${p.toLocaleString('en',{maximumFractionDigits:0})}`:
         p>=100?`$${p.toFixed(2)}`:p>=1?`$${p.toFixed(4)}`:
         p>=0.001?`$${p.toFixed(6)}`:`$${p.toExponential(2)}`;
};

export default function MarketsPage() {
  const [cat,setCat]     = useState('All');
  const [search,setSrch] = useState('');
  const [hov,setHov]     = useState(null);

  const { data:prices={} } = useQuery({
    queryKey:['market-prices'],
    queryFn:()=>api('/api/oracle/prices').catch(()=>({})),
    refetchInterval:15000,
    placeholderData:{},
  });

  // Deduplicate
  const unique = useMemo(()=>{
    const seen=new Set(); return MARKETS.filter(m=>{ if(seen.has(m.s))return false; seen.add(m.s); return true; });
  },[]);

  const cats = useMemo(()=>{
    const c={'All':unique.length};
    unique.forEach(m=>{ c[m.cat]=(c[m.cat]||0)+1; }); return c;
  },[unique]);

  const filtered = useMemo(()=>{
    let l = unique;
    if (cat!=='All') l = l.filter(m=>m.cat===cat);
    if (search) l = l.filter(m=>m.s.toLowerCase().includes(search.toLowerCase()));
    return l;
  },[cat,search,unique]);

  return (
    <AppLayout>
      <div style={{maxWidth:1440,margin:'0 auto',padding:'20px 24px'}}>

        {/* Header */}
        <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
          <div>
            <h1 style={{margin:0,fontSize:22,fontWeight:900,color:S.t1}}>Perpetual Markets</h1>
            <div style={{marginTop:4,fontSize:12,color:S.t3}}>
              <span style={{color:S.g,fontWeight:800}}>{unique.length} markets</span>
              {' · '}Sourced from Binance · Bybit · dYdX · Hyperliquid · GMX
              {' · '}Maker fee <span style={{color:S.g,fontWeight:700}}>FREE</span> on all pairs
            </div>
          </div>
          <div style={{display:'flex',gap:18,textAlign:'right'}}>
            {[['24h Volume','$48.2M',S.a],['Open Interest','$28.4M',S.g],['Markets',unique.length,S.gold]].map(([l,v,c])=>(
              <div key={l}>
                <div style={{fontSize:8,color:S.t3,fontWeight:700,textTransform:'uppercase'}}>{l}</div>
                <div style={{fontSize:17,fontWeight:900,color:c,fontFamily:'monospace'}}>{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:12}}>
          {ALL_CATS.filter(c=>cats[c]).map(c=>(
            <button key={c} onClick={()=>setCat(c)} style={{
              padding:'4px 11px',borderRadius:20,border:'none',cursor:'pointer',
              fontSize:10,fontWeight:700,fontFamily:'sans-serif',transition:'all .12s',
              background:cat===c?(CAT_COLOR[c]||S.a):'#0A0C16',
              color:cat===c?'#000':S.t3,
              border:cat===c?'none':`1px solid ${S.b}`,
            }}>
              {c} ({cats[c]||0})
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
          <input value={search} onChange={e=>setSrch(e.target.value)} placeholder="🔍  Search markets..."
            style={{width:260,background:'#0A0C16',border:`1px solid ${S.b}`,borderRadius:8,
              color:S.t1,fontSize:12,padding:'8px 13px',outline:'none',fontFamily:'sans-serif'}}/>
          <span style={{fontSize:11,color:S.t3}}>{filtered.length} results</span>
        </div>

        {/* Table */}
        <div style={{background:S.bg,border:`1px solid ${S.b}`,borderRadius:13,overflow:'hidden'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1.2fr 0.9fr 0.7fr 0.7fr 0.8fr 0.7fr',
            padding:'8px 16px',background:'#131829',borderBottom:`1px solid ${S.b}`}}>
            {['Market','Price','24h %','Max Lev','Fee','Category',''].map((h,i)=>(
              <div key={i} style={{fontSize:8,fontWeight:700,color:S.t3,textTransform:'uppercase',letterSpacing:'.08em'}}>{h}</div>
            ))}
          </div>
          <div style={{height:'calc(100vh - 260px)',overflowY:'auto'}}>
            {filtered.map((m,i)=>{
              const px = prices?.[m.s+'USDT'];
              const chg = parseFloat(fakeChg(m.s));
              const cc = CAT_COLOR[m.cat]||S.t3;
              const isHov = hov===i;
              return (
                <div key={m.s} onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}
                  style={{display:'grid',gridTemplateColumns:'2fr 1.2fr 0.9fr 0.7fr 0.7fr 0.8fr 0.7fr',
                    padding:'9px 16px',borderBottom:`1px solid #1C213828`,
                    background:isHov?'#0A0C1650':'transparent',transition:'background .08s'}}>
                  <div style={{display:'flex',alignItems:'center',gap:9}}>
                    <div style={{width:28,height:28,borderRadius:7,background:`${cc}15`,border:`1px solid ${cc}30`,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      fontSize:11,fontWeight:900,color:cc,flexShrink:0}}>
                      {m.s[0]}{m.s[1]||''}
                    </div>
                    <div>
                      <div style={{fontWeight:800,fontSize:12,color:S.t1}}>{m.s}/USDT</div>
                      <div style={{fontSize:8,color:S.t3}}>{m.lev}× max lev</div>
                    </div>
                  </div>
                  <div style={{fontFamily:'monospace',fontSize:12,fontWeight:700,color:S.t1,alignSelf:'center'}}>
                    {fmtP(m.s, px?parseFloat(px):undefined)}
                  </div>
                  <div style={{fontFamily:'monospace',fontSize:12,fontWeight:700,alignSelf:'center',
                    color:chg>=0?S.g:S.r}}>
                    {chg>=0?'▲':'▼'} {Math.abs(chg)}%
                  </div>
                  <div style={{fontFamily:'monospace',fontSize:12,color:S.gold,fontWeight:700,alignSelf:'center'}}>
                    {m.lev}×
                  </div>
                  <div style={{fontFamily:'monospace',fontSize:12,color:S.g,fontWeight:700,alignSelf:'center'}}>
                    {m.fee}
                  </div>
                  <div style={{alignSelf:'center'}}>
                    <span style={{background:`${cc}15`,color:cc,border:`1px solid ${cc}30`,
                      borderRadius:4,padding:'2px 7px',fontSize:8,fontWeight:800}}>
                      {m.cat}
                    </span>
                  </div>
                  <div style={{alignSelf:'center'}}>
                    <Link to={`/trade/${m.s}USDT`} style={{padding:'5px 12px',borderRadius:7,
                      background:isHov?S.a+'22':'#5B7FFF12',color:S.a,
                      border:`1px solid ${S.a}35`,fontSize:9,fontWeight:800,
                      textDecoration:'none',display:'inline-block',transition:'all .12s'}}>
                      Trade →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div style={{marginTop:10,padding:'9px 13px',background:'#00E5A008',
          border:'1px solid #00E5A018',borderRadius:8,fontSize:11,color:S.t3}}>
          💡 <span style={{color:S.g,fontWeight:700}}>Maker Rebate Model</span> — 0% maker fee on all {unique.length} markets.
          Taker 0.06% (mega-cap) → 0.10% (micro-cap).
          Volume tier discounts available on <Link to="/volume-tiers" style={{color:S.a}}>Volume Tiers page</Link>.
        </div>
      </div>
    </AppLayout>
  );
}
