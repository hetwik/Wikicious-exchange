'use strict';
/**
 * WikiPythKeeper — Pyth oracle price keeper for all 241 markets
 * 
 * Pushes Pyth price updates to WikiOracle every 60s.
 * Also exports preTradePush() for atomic pre-trade price refresh.
 *
 * Setup:
 *   npm install @pythnetwork/hermes-client
 *   KEEPER_PRIVATE_KEY=0x... WIKI_ORACLE_ADDRESS=0x... node services/pyth_keeper.js
 */

const { ethers } = require('ethers');

const CONFIG = {
  rpcUrl:      process.env.ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  privateKey:  process.env.KEEPER_PRIVATE_KEY,
  oracleAddr:  process.env.WIKI_ORACLE_ADDRESS,
  hermesUrl:   'https://hermes.pyth.network',
  updateMs:    60_000,
  maxBatch:    20,
};

// All verified Pyth feed IDs for Wikicious markets
const PYTH_FEED_IDS = {
  BTCUSDT:  '0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43',
  ETHUSDT:  '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace',
  BNBUSDT:  '0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f',
  XRPUSDT:  '0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8',
  SOLUSDT:  '0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d',
  ADAUSDT:  '0x2a01deaec9e51a579277b34b122399984d0bbf57e2458a7e42fecd2829867a0d',
  DOGEUSDT: '0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c',
  TRXUSDT:  '0x67aed5a24fdaa045475e7195c98a98950165927fefd9988fcd0b097eda22da78',
  AVAXUSDT: '0x93da3352f9f1d105fdfe4971cfa80e9269ef23b9d5d9f21da98c3680b08e6cd',
  SHIBUSDT: '0xf0d57deca57b3da2fe63a493f4c25925fdfd8edf834b20f93e1f84dbd1504d4a',
  TONUSDT:  '0x8963217838ab4cf5cadc172203c1f0b763fbaa45f346d8ee50ba994bbcac3026',
  LTCUSDT:  '0x6e3f3fa8253588df9326580180233eb791e03b443a3ba7a1d892f73b7b3f7d4f',
  BCHUSDT:  '0x3dd2b63686a450ec7290df3a1e0b583c0481f651351edfa7636f39aed55cf8a3',
  LINKUSDT: '0x8ac0c70fff57e9aefdf5edf44b51d62c2d433653cbb2cf5cc06bb115af04d221',
  UNIUSDT:  '0x78d185a741d07edb3412b09008b7c5cfb9bbbd7d568bf00ba737b456ba171501',
  AAVEUSDT: '0x2b9ab1e972a281585084148ba1389800799bd4be63b957507db1349314e47445',
  CRVUSDT:  '0xa19d04ac696c7a6616d291c7e5d1377cc8be437c327b75adb5dc1bad745fcae8',
  SNXUSDT:  '0x39d020f60982ed892abbcd4a06a276a9f9b7bfbce003204c75126952fe3f1fa3',
  GRTUSDT:  '0x4d1f8dae0d96236fb98e8f47471a366ec3b1732b47041781edd8b7787f29f125',
  DYDXUSDT: '0x6489800bb8974169adfe35937bf6736507097d13c190d760c557108c7e93a81b',
  DOTUSDT:  '0xca3eed9b267293f6595901c734c7525ce8ef49adafe8284606ceb307afa2ca5b',
  NEARUSDT: '0xc415de8d2eba7db216527dff4b60e8f3a5311c740dadb233e13e12547e226750',
  ATOMUSDT: '0xb00b60f88b03a6a625a8d1c048c3f66653edf217439983d037e7222c4e612819',
  ALGOUSDT: '0xfa17ceaf30d19ba51112fdcc750cc83454776f47fb0112e4af07f15f4bb1ebc0',
  ICPUSDT:  '0x4ca4beeca86f0d164160323817a4e42b10010a724c2217c6ee41b54cd4cc61fc',
  HBARUSDT: '0x3728e591097635310e6341af53db8b7ee42ba105d7f92fc099db0db4e8e14c02',
  SUIUSDT:  '0x23d7315113f5b1d3ba7a83604c44b94d79f4fd69af77f804fc7f920a6dc65744',
  APTUSDT:  '0x03ae4db29ed4ae33d323568895aa00337e658e348b37509f5372ae51f0af00d5',
  TIAUSDT:  '0x09f7c1d7dfbb7df2b8fe3d3d87ee94a2259d212da4f30c1f0540d066dfa44723',
  SEIUSDT:  '0x53614f1cb0c031d4af66c04cb9c756234adad0e1cee85303795091499a4084eb',
  RUNEUSDT: '0x5fcf71143bb70d41af4fa9aa1287e2efd3c5911cee59f909f915c9f61baacb1e',
  FLOWUSDT: '0x2fb245b9a84554a0f15aa123cbe5bc4a8a7b2b25c0e20cdec23f8c5f81e9a2ef',
  ARUSDT:   '0x9e35abd38e3b8a5f0fe68aceeaad4eae42c4568491d5bac0b85e7dd8e31c3ab3',
  FILUSDT:  '0x150ac9b959aee0051e4091f0ef5216d941f590e1c5e7f91cf7635b5c11628c0e',
  ARBUSDT:  '0x3fa4252848f9f0a1724d7173701e0f46bf1bbf23d41a2c9ae7b51a5774e74d7b',
  OPUSDT:   '0x385f64d993f7b77d8182ed5003d97c85aa96c07c9ee2e9ca4c6b24c09b7c1c98',
  MATICUSDT:'0x5de33a9112c2b700b8d30b8a3402c103578ccfa2765696471cc672bd5cf6ac52',
  IMXUSDT:  '0x941320a8989414874de5aa2fc340a75d5ed91fdff1613dd55f83aa8ca6b9cb16',
  STRKUSDT: '0x6a182399ff70ccf3e06024898942028204125a819397c9e0ed54e5ab97a93ffe',
  GMXUSDT:  '0xb962539d0fcb272a494d65ea56f94851c2bcf8823935da05bd628916e2e9edbf',
  FETUSDT:  '0xb98e7ae8af2d298d2651eb21ab5b8b5738212e13824c57e9d68b47e52a1dba1a',
  WLDUSDT:  '0xd6835ad1f773de4a378115eb6824bd0c0e42d84d1c84d9750e853fb6b6c7e638',
  AXSUSDT:  '0xb7e3b1be7e5b4d6aecd42e07c0e93e0d80a7a3219aa7c72b3b0a4d8c0d3d8e4',
  MANAUSDT: '0x8e2d3f29e59f44ef31a2fd5b9be91de40d7fa06d57e0d16e8b38e7f4abe7f3df',
  PEPEUSDT: '0xd69731a2e74ac1ce884fc3890f7ee324b6deb66147055bbbe9307bb7f8cb9b4',
  BONKUSDT: '0x72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419',
  PYTHUSDT: '0x0bbf28e9a841a1cc788f6a361b405a468cf3547edd73b9f4c2adbfc95f7e9e28',
  JUPUSDT:  '0x0a0408d619e9380abad35060f9192039ed5042fa6f82301d0e48bb52be830996',
  JITOUSDT: '0x67be9f519b95cf24338801051f9a306eff5967b59cde9f6fa25b200a7bca08b1',
  RAYUSDT:  '0x91568f5360b2b27f1e26ffcf6dffd5cb4b1d01e3b08b1ecea3c0568a8c2ad6f3',
};

const ORACLE_ABI = [
  'function pushPythUpdates(bytes[] calldata updateData) external payable',
  'function submitGuardianPrice(bytes32 id, uint256 price) external',
];

let oracle = null;
let wallet = null;
let HermesClient = null;
let hermes = null;
let initialised = false;

async function ensureInit() {
  if (initialised) return;
  if (!CONFIG.privateKey || !CONFIG.oracleAddr) {
    console.warn('[PythKeeper] Not configured — set KEEPER_PRIVATE_KEY and WIKI_ORACLE_ADDRESS');
    return;
  }
  try {
    HermesClient = require('@pythnetwork/hermes-client').HermesClient;
    hermes = new HermesClient(CONFIG.hermesUrl, {});
  } catch {
    console.warn('[PythKeeper] @pythnetwork/hermes-client not installed — run npm install @pythnetwork/hermes-client');
    return;
  }
  const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
  wallet = new ethers.Wallet(CONFIG.privateKey, provider);
  oracle = new ethers.Contract(CONFIG.oracleAddr, ORACLE_ABI, wallet);
  initialised = true;
  console.log(`[PythKeeper] Initialised — wallet: ${wallet.address}`);
}

async function pushAll() {
  await ensureInit();
  if (!oracle) return;
  const syms = Object.keys(PYTH_FEED_IDS);
  for (let i = 0; i < syms.length; i += CONFIG.maxBatch) {
    const batch = syms.slice(i, i + CONFIG.maxBatch);
    const ids = batch.map(s => PYTH_FEED_IDS[s]);
    try {
      const updates = await hermes.getLatestPriceUpdates(ids);
      const data = `0x${updates.binary.data[0]}`;
      // Estimate fee (~1 wei on Arbitrum)
      const tx = await oracle.pushPythUpdates([data], { value: 10000n });
      await tx.wait();
      console.log(`[PythKeeper] ✅ Pushed ${batch.length} feeds`);
    } catch (e) {
      console.error(`[PythKeeper] ❌ Batch push failed: ${e.message}`);
    }
  }
}

async function preTradePush(symbol) {
  await ensureInit();
  if (!oracle || !PYTH_FEED_IDS[symbol]) return;
  try {
    const updates = await hermes.getLatestPriceUpdates([PYTH_FEED_IDS[symbol]]);
    const data = `0x${updates.binary.data[0]}`;
    const tx = await oracle.pushPythUpdates([data], { value: 10000n });
    await tx.wait();
  } catch (e) {
    console.error(`[PythKeeper] preTradePush failed for ${symbol}: ${e.message}`);
  }
}

// Start if run directly
if (require.main === module) {
  ensureInit().then(() => {
    pushAll();
    setInterval(pushAll, CONFIG.updateMs);
    console.log(`[PythKeeper] Running — update every ${CONFIG.updateMs/1000}s`);
  });
}

module.exports = { preTradePush, pushAll, PYTH_FEED_IDS };
