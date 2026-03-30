import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Link, useLocation } from 'react-router-dom';

const NAV = [
  {path:'/bots',         label:'🤖 Bot Trading',   match:'/bots'},
  {path:'/algo-trading',   label:'⚡ Algo Trading',  match:'/algo-trading'},
  {path:'/copy-trading',   label:'📋 Copy Trading',  match:'/copy-trading'},
  {path:'/wallet', label:'👛 Wallet', match:'/wallet'},
  {path:'/swap',   label:'🔄 Swap',   match:'/swap'},
  {path:'/spot',   label:'📈 Spot',   match:'/spot'},
  {path:'/forex',  label:'🌍 Forex',  match:'/forex'},
  {path:'/metals', label:'🥇 Metals', match:'/metals'},
  {path:'/trade/BTCUSDT',   label:'Trade',       match:'/trade'},
  {path:'/markets',          label:'Markets',     match:'/markets'},
  {path:'/index-perps',      label:'📦 Indices',  match:'/index-perps'},
  {path:'/copy-trading',     label:'Copy',        match:'/copy-trading'},
  {path:'/orderbook',        label:'OB',          match:'/orderbook'},
  {path:'/lending',          label:'Lend',        match:'/lending'},
  {path:'/staking',          label:'Stake',       match:'/staking'},
  {path:'/yield-slice',      label:'🍰 Yield',    match:'/yield-slice'},
  {path:'/options-vaults',   label:'📊 Options',  match:'/options-vaults'},
  {path:'/strategy-vaults',  label:'🏛 Vaults',   match:'/strategy-vaults'},
  {path:'/funding-arb',      label:'⚖ FundArb',  match:'/funding-arb'},
  {path:'/rwa',              label:'🏦 RWA',      match:'/rwa'},
  {path:'/predictions',      label:'🔮 Predict',  match:'/predictions'},
  {path:'/bridge',           label:'Bridge',      match:'/bridge'},
  {path:'/launchpad',        label:'Launch',      match:'/launchpad'},
  {path:'/prop-challenge',   label:'🏆 Prop',     match:'/prop-challenge'},
  {path:'/trader-pass',      label:'🎫 Pass',     match:'/trader-pass'},
  {path:'/liq-insurance',    label:'🛡 Insure',   match:'/liq-insurance'},
  {path:'/otc',              label:'🤝 OTC',      match:'/otc'},
  {path:'/portfolio-margin', label:'⚖ PM',        match:'/portfolio-margin'},
  {path:'/maker-rebates',    label:'💱 Fees',     match:'/maker-rebates'},
  {path:'/volume-tiers',     label:'📈 Tiers',    match:'/volume-tiers'},
  {path:'/pol',              label:'🏊 POL',      match:'/pol'},
  {path:'/insurance-yield',  label:'💰 InsFund',  match:'/insurance-yield'},
  {path:'/permissionless',   label:'🔓 Markets',  match:'/permissionless'},
  {path:'/buyback-burn',     label:'🔥 Burn',     match:'/buyback-burn'},
  {path:'/kaas',             label:'🤖 KaaS',     match:'/kaas'},
  {path:'/analytics',        label:'📡 Data',     match:'/analytics'},
  {path:'/white-label',      label:'🏷 B2B',      match:'/white-label'},
  {path:'/ieo',               label:'🚀 IEO',      match:'/ieo'},
  {path:'/ext-insurance',     label:'🛡 ExtIns',    match:'/ext-insurance'},
  {path:'/gas-rebate',        label:'⛽ Gas',       match:'/gas-rebate'},
  {path:'/maker-rewards',     label:'💎 MakerRwd',  match:'/maker-rewards'},
  {path:'/subscriptions',     label:'📡 Subscribe', match:'/subscriptions'},
  {path:'/dao-treasury',      label:'🏛 DAO',       match:'/dao-treasury'},
  {path:'/revenue',          label:'Revenue',     match:'/revenue'},
];

export default function AppLayout({ children }) {
  const loc = useLocation();
  return (
    <div style={{display:'flex',flexDirection:'column',minHeight:'100vh',background:'#06080F',color:'#EDF0FA',fontFamily:"'DM Sans',-apple-system,BlinkMacSystemFont,sans-serif"}}>
      <header style={{height:48,borderBottom:'1px solid #1C2138',display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 20px',position:'sticky',top:0,zIndex:200,background:'#07090EF0',backdropFilter:'blur(16px)'}}>
        <div style={{display:'flex',alignItems:'center',gap:4,overflow:'hidden',flex:1,minWidth:0}}>
          <Link to="/" style={{display:'flex',alignItems:'center',gap:7,marginRight:8,textDecoration:'none',flexShrink:0}}>
            <div style={{width:26,height:26,borderRadius:7,background:'linear-gradient(135deg,#5B7FFF,#A855F7)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,color:'#fff'}}>W</div>
            <span style={{fontWeight:900,fontSize:12,letterSpacing:'.14em',color:'#8892B0'}}>WIKICIOUS</span>
          </Link>
          <div style={{width:1,height:14,background:'#1C2138',margin:'0 6px',flexShrink:0}}/>
          <nav style={{display:'flex',gap:1,overflowX:'auto',scrollbarWidth:'none',msOverflowStyle:'none'}}>
            {NAV.map(({path,label,match})=>{
              const active = loc.pathname.startsWith(match);
              return (
                <Link key={path} to={path} style={{padding:'4px 7px',borderRadius:6,fontSize:10,fontWeight:600,textDecoration:'none',transition:'all .12s',whiteSpace:'nowrap',flexShrink:0,color:active?'#fff':'#4A5270',background:active?'#5B7FFF22':'transparent',borderBottom:active?'2px solid #5B7FFF':'2px solid transparent'}}>
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div style={{flexShrink:0,marginLeft:12}}>
          <ConnectButton chainStatus="icon" showBalance={false} accountStatus="avatar"/>
        </div>
      </header>
      <main style={{flex:1}}>{children}</main>
    </div>
  );
}
