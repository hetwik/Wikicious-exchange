'use strict';
/**
 * ════════════════════════════════════════════════════════════════
 *  WIKICIOUS — New Revenue Routes (12 Features)
 *  IEO · External Insurance · Gas Rebates · Structured Lending
 *  Maker Rewards · Yield Aggregator · NFT Perps · Subscriptions
 *  Composable Vault · DAO Treasury · Funding Derivatives · Perp Options
 * ════════════════════════════════════════════════════════════════
 */
const express    = require('express');
const { ethers } = require('ethers');
const { getProvider, ADDRESSES } = require('../services/chain');

const f   = v => { try { return v?.toString(); } catch { return '0'; } };
const safe = fn => async (req,res) => { try { await fn(req,res); } catch(e) { res.status(500).json({ error: e.message }); } };
const getC = (k,abi) => { const a=ADDRESSES[k]; return a ? new ethers.Contract(a,abi,getProvider()) : null; };

// ── ABIs ─────────────────────────────────────────────────────────────────

const IEO_ABI=['function projectCount() view returns (uint256)','function getProject(uint256) view returns (tuple(address projectOwner,string name,string tokenSymbol,address saleToken,uint256 totalSupply,uint256 hardcap,uint256 softcap,uint256 tokenPrice,uint256 startTime,uint256 endTime,uint256 raised,uint256 protocolFee,uint256 protocolTokens,uint256 protocolTokensVested,uint256 vestingStart,uint256 wikBond,uint8 status,bool exclusivityActive,uint256 exclusivityExpiry))','function totalRaised() view returns (uint256)','function totalProtocolFees() view returns (uint256)','function getContribution(uint256,address) view returns (tuple(uint256 usdcAmount,uint256 tokenAmount,bool claimed))'];
const EI_ABI=['function clientCount() view returns (uint256)','function getClient(uint256) view returns (tuple(address protocol,string name,uint256 coveredTVL,uint256 annualPremiumBps,uint256 subscriptionEnd,uint256 maxPayout,uint256 totalPremiumPaid,uint256 totalClaimsPaid,bool active))','function monthlyRunRate() view returns (uint256)','function reserveFund() view returns (uint256)','function protocolRevenue() view returns (uint256)','function totalCovered() view returns (uint256)'];
const GR_ABI=['function campaignCount() view returns (uint256)','function getCampaign(uint256) view returns (tuple(address sponsor,string name,bytes32 refCode,uint256 wikDeposited,uint256 wikRemaining,uint256 rebatePerTx,uint256 maxTxPerUser,uint256 expiresAt,uint256 txCount,bool active))','function totalWIKReceived() view returns (uint256)','function totalWIKBurned() view returns (uint256)','function totalGasRebated() view returns (uint256)'];
const SL_ABI=['function poolCount() view returns (uint256)','function getPool(uint256) view returns (tuple(string name,uint256 totalTVL,uint256 seniorDeposits,uint256 mezzDeposits,uint256 juniorDeposits,uint256 structuringFee,uint256 accruedSpread,uint256 totalProtocolFees,uint256 lastHarvest,bool active))','function totalProtocolRevenue() view returns (uint256)'];
const MR_ABI=['function makerCount() view returns (uint256)','function getMaker(address) view returns (tuple(uint256 epochScore,uint256 pendingRewards,uint256 totalEarned,uint256 lastEpoch,bool registered))','function dailyWIKPool() view returns (uint256)','function totalWIKDistributed() view returns (uint256)','function epochCount() view returns (uint256)','function pendingPool() view returns (uint256)'];
const YA_ABI=['function totalDeposited() view returns (uint256)','function totalYield() view returns (uint256)','function protocolFees() view returns (uint256)','function sharePrice() view returns (uint256)','function strategyCount() view returns (uint256)','function getStrategy(uint256) view returns (tuple(string name,address adapter,uint256 allocatedUSDC,uint256 currentAPY,bool active,bool isHome))','function activeStrategy() view returns (uint256)','function bestAPY() view returns (uint256 apy,uint256 stratId)','function userValue(address) view returns (uint256)','function totalSupply() view returns (uint256)'];
const NFTP_ABI=['function marketCount() view returns (uint256)','function getMarket(uint256) view returns (tuple(string collection,string name,address guardian,uint256 floorPrice,uint256 priceUpdated,uint256 openInterestLong,uint256 openInterestShort,uint256 totalVolume,uint256 totalFees,bool active))','function totalProtocolFees() view returns (uint256)','function getTraderPositions(address) view returns (uint256[])'];
const SUB_ABI=['function subscriberCount() view returns (uint256)','function activeCount() view returns (uint256)','function totalRevenue() view returns (uint256)','function mrr() view returns (uint256)','function arr() view returns (uint256)','function isActive(address) view returns (bool)','function getSubscription(address) view returns (tuple(address subscriber,uint8 plan,uint256 expiresAt,uint256 totalPaid,bool active,bytes32 apiKeyHash))'];
const CV_ABI=['function totalAUM() view returns (uint256)','function sharePrice() view returns (uint256)','function protocolFees() view returns (uint256)','function totalSupply() view returns (uint256)','function userValue(address) view returns (uint256)','function pledgedShares(address) view returns (uint256)','function freeShares(address) view returns (uint256)','function collateralValue(address) view returns (uint256)'];
const DAO_ABI=['function clientCount() view returns (uint256)','function getClient(uint256) view returns (tuple(string daoName,address daoMultisig,address reportingAddr,uint256 deposited,uint256 currentValue,uint256 totalYield,uint256 protocolFees,uint256 depositTime,uint256 lastReport,string strategy,bool active))','function totalAUM() view returns (uint256)','function totalProtocolRevenue() view returns (uint256)','function projectedAnnualRevenue() view returns (uint256)'];
const FRD_ABI=['function marketCount() view returns (uint256)','function getMarket(uint256) view returns (tuple(string perpMarket,uint256 strikeRate,uint256 settlementDate,uint256 longOI,uint256 shortOI,uint256 settledRate,bool settled,bool active))','function totalProtocolFees() view returns (uint256)'];
const PO_ABI=['function optionCount() view returns (uint256)','function totalPremiums() view returns (uint256)','function totalPayouts() view returns (uint256)','function protocolRevenue() view returns (uint256)','function lossRatio() view returns (uint256)','function getBuyerOptions(address) view returns (uint256[])','function quotePremium(uint256,uint256,uint256,uint256,string) view returns (uint256)'];

// ═══════════════════════════════════════════════════════════
const ieoRouter = express.Router();
ieoRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiIEOPlatform',IEO_ABI);
  if(!c) return res.json({totalRaised:'0',totalFees:'0',projects:0});
  const [raised,fees,count]=await Promise.all([c.totalRaised().catch(()=>0n),c.totalProtocolFees().catch(()=>0n),c.projectCount().catch(()=>0n)]);
  res.json({totalRaised:f(raised),totalProtocolFees:f(fees),projectCount:Number(count)});
}));
ieoRouter.get('/projects', safe(async(req,res)=>{
  const c=getC('WikiIEOPlatform',IEO_ABI); if(!c) return res.json([]);
  const n=Number(await c.projectCount().catch(()=>0n));
  const projects=[];
  for(let i=0;i<Math.min(n,50);i++){const p=await c.getProject(i).catch(()=>null);if(p)projects.push({id:i,name:p.name,symbol:p.tokenSymbol,hardcap:f(p.hardcap),raised:f(p.raised),status:['PENDING','APPROVED','ACTIVE','FINALIZED','CANCELLED'][Number(p.status)],endTime:Number(p.endTime)});}
  res.json(projects);
}));
ieoRouter.get('/contribution/:id/:address', safe(async(req,res)=>{
  const c=getC('WikiIEOPlatform',IEO_ABI); if(!c) return res.json({usdcAmount:'0',tokenAmount:'0',claimed:false});
  const contrib=await c.getContribution(Number(req.params.id),req.params.address).catch(()=>null);
  res.json(contrib?{usdcAmount:f(contrib.usdcAmount),tokenAmount:f(contrib.tokenAmount),claimed:contrib.claimed}:{usdcAmount:'0',tokenAmount:'0',claimed:false});
}));

// ═══════════════════════════════════════════════════════════
const eiRouter = express.Router();
eiRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiExternalInsurance',EI_ABI); if(!c) return res.json({mrr:'0',reserve:'0',revenue:'0',covered:'0',clients:0});
  const [mrr,reserve,revenue,covered,count]=await Promise.all([c.monthlyRunRate().catch(()=>0n),c.reserveFund().catch(()=>0n),c.protocolRevenue().catch(()=>0n),c.totalCovered().catch(()=>0n),c.clientCount().catch(()=>0n)]);
  res.json({mrr:f(mrr),reserveFund:f(reserve),protocolRevenue:f(revenue),totalCovered:f(covered),clientCount:Number(count)});
}));
eiRouter.get('/clients', safe(async(req,res)=>{
  const c=getC('WikiExternalInsurance',EI_ABI); if(!c) return res.json([]);
  const n=Number(await c.clientCount().catch(()=>0n));
  const clients=[];
  for(let i=0;i<n;i++){const cl=await c.getClient(i).catch(()=>null);if(cl)clients.push({id:i,name:cl.name,protocol:cl.protocol,coveredTVL:f(cl.coveredTVL),annualPremiumBps:Number(cl.annualPremiumBps),subscriptionEnd:Number(cl.subscriptionEnd),totalPremiumPaid:f(cl.totalPremiumPaid),active:cl.active});}
  res.json(clients);
}));

// ═══════════════════════════════════════════════════════════
const grRouter = express.Router();
grRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiGasRebate',GR_ABI); if(!c) return res.json({wikReceived:'0',wikBurned:'0',gasRebated:'0',campaigns:0});
  const [rcvd,burned,rebated,count]=await Promise.all([c.totalWIKReceived().catch(()=>0n),c.totalWIKBurned().catch(()=>0n),c.totalGasRebated().catch(()=>0n),c.campaignCount().catch(()=>0n)]);
  res.json({wikReceived:f(rcvd),wikBurned:f(burned),gasRebated:f(rebated),campaignCount:Number(count)});
}));
grRouter.get('/campaigns', safe(async(req,res)=>{
  const c=getC('WikiGasRebate',GR_ABI); if(!c) return res.json([]);
  const n=Number(await c.campaignCount().catch(()=>0n));
  const camps=[];
  for(let i=0;i<n;i++){const cp=await c.getCampaign(i).catch(()=>null);if(cp)camps.push({id:i,name:cp.name,wikDeposited:f(cp.wikDeposited),wikRemaining:f(cp.wikRemaining),txCount:Number(cp.txCount),expiresAt:Number(cp.expiresAt),active:cp.active});}
  res.json(camps);
}));

// ═══════════════════════════════════════════════════════════
const slRouter = express.Router();
slRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiStructuredLending',SL_ABI); if(!c) return res.json({totalRevenue:'0',pools:0});
  const [rev,count]=await Promise.all([c.totalProtocolRevenue().catch(()=>0n),c.poolCount().catch(()=>0n)]);
  res.json({totalProtocolRevenue:f(rev),poolCount:Number(count)});
}));
slRouter.get('/pools', safe(async(req,res)=>{
  const c=getC('WikiStructuredLending',SL_ABI); if(!c) return res.json([]);
  const n=Number(await c.poolCount().catch(()=>0n));
  const pools=[];
  for(let i=0;i<n;i++){const p=await c.getPool(i).catch(()=>null);if(p)pools.push({id:i,name:p.name,totalTVL:f(p.totalTVL),seniorDeposits:f(p.seniorDeposits),mezzDeposits:f(p.mezzDeposits),juniorDeposits:f(p.juniorDeposits),structuringFee:f(p.structuringFee),accruedSpread:f(p.accruedSpread),active:p.active});}
  res.json(pools);
}));

// ═══════════════════════════════════════════════════════════
const mrRouter = express.Router();
mrRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiMakerRewards',MR_ABI); if(!c) return res.json({makers:0,distributed:'0',dailyPool:'0',pending:'0'});
  const [makers,dist,pool,pending]=await Promise.all([c.makerCount().catch(()=>0n),c.totalWIKDistributed().catch(()=>0n),c.dailyWIKPool().catch(()=>0n),c.pendingPool().catch(()=>0n)]);
  res.json({makerCount:Number(makers),totalWIKDistributed:f(dist),dailyWIKPool:f(pool),pendingPool:f(pending)});
}));
mrRouter.get('/maker/:address', safe(async(req,res)=>{
  const c=getC('WikiMakerRewards',MR_ABI); if(!c) return res.json({registered:false});
  const m=await c.getMaker(req.params.address).catch(()=>null);
  res.json(m?{registered:m.registered,epochScore:f(m.epochScore),pendingRewards:f(m.pendingRewards),totalEarned:f(m.totalEarned)}:{registered:false});
}));

// ═══════════════════════════════════════════════════════════
const yaRouter = express.Router();
yaRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiYieldAggregator',YA_ABI); if(!c) return res.json({tvl:'0',yield:'0',fees:'0',sharePrice:'1000000000000000000'});
  const [tvl,yld,fees,sp,supply,count,active]=await Promise.all([c.totalDeposited().catch(()=>0n),c.totalYield().catch(()=>0n),c.protocolFees().catch(()=>0n),c.sharePrice().catch(()=>BigInt(1e18)),c.totalSupply().catch(()=>0n),c.strategyCount().catch(()=>1n),c.activeStrategy().catch(()=>0n)]);
  res.json({totalDeposited:f(tvl),totalYield:f(yld),protocolFees:f(fees),sharePrice:f(sp),totalSupply:f(supply),strategyCount:Number(count),activeStrategy:Number(active)});
}));
yaRouter.get('/strategies', safe(async(req,res)=>{
  const c=getC('WikiYieldAggregator',YA_ABI); if(!c) return res.json([{id:0,name:'WikiLending',currentAPY:800,active:true,isHome:true}]);
  const n=Number(await c.strategyCount().catch(()=>1n));
  const strats=[];
  for(let i=0;i<n;i++){const s=await c.getStrategy(i).catch(()=>null);if(s)strats.push({id:i,name:s.name,allocatedUSDC:f(s.allocatedUSDC),currentAPY:Number(s.currentAPY),active:s.active,isHome:s.isHome});}
  res.json(strats);
}));
yaRouter.get('/user/:address', safe(async(req,res)=>{
  const c=getC('WikiYieldAggregator',YA_ABI); if(!c) return res.json({value:'0'});
  const val=await c.userValue(req.params.address).catch(()=>0n);
  res.json({value:f(val)});
}));

// ═══════════════════════════════════════════════════════════
const nftpRouter = express.Router();
nftpRouter.get('/markets', safe(async(req,res)=>{
  const c=getC('WikiNFTPerps',NFTP_ABI); if(!c) return res.json([
    {id:0,collection:'BAYC',name:'Bored Ape Yacht Club',floorPrice:'0',active:true},
    {id:1,collection:'CryptoPunks',name:'CryptoPunks',floorPrice:'0',active:true},
    {id:2,collection:'Azuki',name:'Azuki',floorPrice:'0',active:true},
  ]);
  const n=Number(await c.marketCount().catch(()=>0n));
  const markets=[];
  for(let i=0;i<n;i++){const m=await c.getMarket(i).catch(()=>null);if(m)markets.push({id:i,collection:m.collection,name:m.name,floorPrice:f(m.floorPrice),priceUpdated:Number(m.priceUpdated),oiLong:f(m.openInterestLong),oiShort:f(m.openInterestShort),volume:f(m.totalVolume),fees:f(m.totalFees),active:m.active});}
  res.json(markets);
}));
nftpRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiNFTPerps',NFTP_ABI); if(!c) return res.json({fees:'0',markets:0});
  const [fees,count]=await Promise.all([c.totalProtocolFees().catch(()=>0n),c.marketCount().catch(()=>0n)]);
  res.json({totalProtocolFees:f(fees),marketCount:Number(count)});
}));

// ═══════════════════════════════════════════════════════════
const subRouter = express.Router();
subRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiTraderSubscription',SUB_ABI); if(!c) return res.json({active:0,revenue:'0',mrr:'0',arr:'0'});
  const [active,rev,mrr,arr,total]=await Promise.all([c.activeCount().catch(()=>0n),c.totalRevenue().catch(()=>0n),c.mrr().catch(()=>0n),c.arr().catch(()=>0n),c.subscriberCount().catch(()=>0n)]);
  res.json({activeCount:Number(active),totalRevenue:f(rev),mrr:f(mrr),arr:f(arr),totalSubscribers:Number(total)});
}));
subRouter.get('/user/:address', safe(async(req,res)=>{
  const c=getC('WikiTraderSubscription',SUB_ABI); if(!c) return res.json({active:false});
  const [active,sub]=await Promise.all([c.isActive(req.params.address).catch(()=>false),c.getSubscription(req.params.address).catch(()=>null)]);
  res.json({active,expiresAt:sub?Number(sub.expiresAt):0,plan:sub?['MONTHLY','ANNUAL'][Number(sub.plan)]:'NONE',totalPaid:sub?f(sub.totalPaid):'0'});
}));

// ═══════════════════════════════════════════════════════════
const cvRouter = express.Router();
cvRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiComposableVault',CV_ABI); if(!c) return res.json({aum:'0',sharePrice:'1000000000000000000',fees:'0'});
  const [aum,sp,fees,supply]=await Promise.all([c.totalAUM().catch(()=>0n),c.sharePrice().catch(()=>BigInt(1e18)),c.protocolFees().catch(()=>0n),c.totalSupply().catch(()=>0n)]);
  res.json({totalAUM:f(aum),sharePrice:f(sp),protocolFees:f(fees),totalSupply:f(supply)});
}));
cvRouter.get('/user/:address', safe(async(req,res)=>{
  const c=getC('WikiComposableVault',CV_ABI); if(!c) return res.json({value:'0',pledged:'0',free:'0',collateralValue:'0'});
  const [val,pledged,free,collVal]=await Promise.all([c.userValue(req.params.address).catch(()=>0n),c.pledgedShares(req.params.address).catch(()=>0n),c.freeShares(req.params.address).catch(()=>0n),c.collateralValue(req.params.address).catch(()=>0n)]);
  res.json({value:f(val),pledgedShares:f(pledged),freeShares:f(free),collateralValue:f(collVal)});
}));

// ═══════════════════════════════════════════════════════════
const daoRouter = express.Router();
daoRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiDAOTreasury',DAO_ABI); if(!c) return res.json({aum:'0',revenue:'0',projected:'0',clients:0});
  const [aum,rev,proj,count]=await Promise.all([c.totalAUM().catch(()=>0n),c.totalProtocolRevenue().catch(()=>0n),c.projectedAnnualRevenue().catch(()=>0n),c.clientCount().catch(()=>0n)]);
  res.json({totalAUM:f(aum),totalProtocolRevenue:f(rev),projectedAnnualRevenue:f(proj),clientCount:Number(count)});
}));
daoRouter.get('/clients', safe(async(req,res)=>{
  const c=getC('WikiDAOTreasury',DAO_ABI); if(!c) return res.json([]);
  const n=Number(await c.clientCount().catch(()=>0n));
  const clients=[];
  for(let i=0;i<n;i++){const cl=await c.getClient(i).catch(()=>null);if(cl)clients.push({id:i,daoName:cl.daoName,deposited:f(cl.deposited),currentValue:f(cl.currentValue),totalYield:f(cl.totalYield),protocolFees:f(cl.protocolFees),strategy:cl.strategy,active:cl.active});}
  res.json(clients);
}));

// ═══════════════════════════════════════════════════════════
const frdRouter = express.Router();
frdRouter.get('/markets', safe(async(req,res)=>{
  const c=getC('WikiFundingRateDerivative',FRD_ABI); if(!c) return res.json([]);
  const n=Number(await c.marketCount().catch(()=>0n));
  const markets=[];
  for(let i=0;i<n;i++){const m=await c.getMarket(i).catch(()=>null);if(m)markets.push({id:i,perpMarket:m.perpMarket,strikeRate:f(m.strikeRate),settlementDate:Number(m.settlementDate),longOI:f(m.longOI),shortOI:f(m.shortOI),settled:m.settled,active:m.active});}
  res.json(markets);
}));
frdRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiFundingRateDerivative',FRD_ABI); if(!c) return res.json({fees:'0',markets:0});
  const [fees,count]=await Promise.all([c.totalProtocolFees().catch(()=>0n),c.marketCount().catch(()=>0n)]);
  res.json({totalProtocolFees:f(fees),marketCount:Number(count)});
}));

// ═══════════════════════════════════════════════════════════
const poRouter = express.Router();
poRouter.get('/stats', safe(async(req,res)=>{
  const c=getC('WikiPerpOptions',PO_ABI); if(!c) return res.json({premiums:'0',payouts:'0',revenue:'0',lossRatio:0,options:0});
  const [premiums,payouts,revenue,lossRatio,count]=await Promise.all([c.totalPremiums().catch(()=>0n),c.totalPayouts().catch(()=>0n),c.protocolRevenue().catch(()=>0n),c.lossRatio().catch(()=>0n),c.optionCount().catch(()=>0n)]);
  res.json({totalPremiums:f(premiums),totalPayouts:f(payouts),protocolRevenue:f(revenue),lossRatio:Number(lossRatio),optionCount:Number(count)});
}));
poRouter.get('/quote', safe(async(req,res)=>{
  const {notional,entry,strike,days,market='BTCUSDT'}=req.query;
  const c=getC('WikiPerpOptions',PO_ABI); if(!c||!notional||!entry||!strike||!days) return res.json({premium:'0'});
  const p=await c.quotePremium(notional,entry,strike,days,market).catch(()=>0n);
  res.json({premium:f(p)});
}));
poRouter.get('/user/:address', safe(async(req,res)=>{
  const c=getC('WikiPerpOptions',PO_ABI); if(!c) return res.json({options:[]});
  const ids=await c.getBuyerOptions(req.params.address).catch(()=>[]);
  res.json({options:ids.map(id=>Number(id))});
}));

// ── Export ────────────────────────────────────────────────────────────────
module.exports = {
  ieoRouter, eiRouter, grRouter, slRouter, mrRouter, yaRouter,
  nftpRouter, subRouter, cvRouter, daoRouter, frdRouter, poRouter,
};
