'use strict';
const axios  = require('axios');
const crypto = require('crypto');

// ── Arweave upload (text content, metadata JSON) ──────────────────────────
// Uses Arweave HTTP API — deploy node or use bundlr.network
// Content JSON format stored on Arweave:
// { text, author, timestamp, tags, media_ipfs, media_type, app: "wikicious" }

async function uploadToArweave(content) {
  // In production: use @bundlr-network/client or arweave-js
  // Bundlr allows paying with ETH/USDC instead of AR token
  // One-time fee ~$0.01/MB stored permanently

  if (process.env.USE_ARWEAVE_MOCK === 'true') {
    // Dev mode: return deterministic hash
    const hash = crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
    return { txId: `mock_${hash.slice(0,40)}`, hash: `0x${hash}` };
  }

  const BUNDLR_URL  = process.env.BUNDLR_URL  || 'https://node1.bundlr.network';
  const ARWEAVE_KEY = process.env.ARWEAVE_KEY; // JWK or eth private key for bundlr

  if (!ARWEAVE_KEY) {
    // Fallback: return content hash — frontend can use IPFS instead
    const hash = crypto.createHash('sha256').update(JSON.stringify(content)).digest('hex');
    return { txId: null, hash: `0x${hash}`, fallback: true };
  }

  try {
    const body    = JSON.stringify({ ...content, app: 'wikicious', version: '1' });
    const bodyBuf = Buffer.from(body, 'utf8');

    // Price check
    const priceRes = await axios.get(`${BUNDLR_URL}/price/${bodyBuf.length}`);
    const price    = priceRes.data;

    // Upload via bundlr (pays in ETH)
    const res = await axios.post(`${BUNDLR_URL}/tx/ethereum`, bodyBuf, {
      headers: {
        'Content-Type': 'application/json',
        'x-pub-key': process.env.BUNDLR_PUB_KEY,
      },
      maxBodyLength: 5 * 1024 * 1024, // 5MB max for text
    });

    const txId = res.data.id;
    const hash = `0x${crypto.createHash('sha256').update(txId).digest('hex')}`;
    return { txId, hash, price };
  } catch(e) {
    console.error('[arweave] upload error:', e.message);
    throw new Error('Arweave upload failed: ' + e.message);
  }
}

// ── IPFS upload (images, videos) ──────────────────────────────────────────
// Uses Pinata — free tier: 1GB storage, 100 req/sec
// For video: chunked upload, returns IPFS CID

async function uploadToIPFS(fileBuffer, fileName, mimeType) {
  const PINATA_JWT = process.env.PINATA_JWT;

  if (!PINATA_JWT || process.env.USE_IPFS_MOCK === 'true') {
    // Dev mode
    const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    return { cid: `Qm${hash.slice(0,44)}`, hash: `0x${hash}`, mock: true };
  }

  // Size limits
  const MAX_IMAGE_SIZE = 10 * 1024 * 1024;  // 10MB
  const MAX_VIDEO_SIZE = 500 * 1024 * 1024; // 500MB

  const isVideo = mimeType.startsWith('video/');
  const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

  if (fileBuffer.length > maxSize) {
    throw new Error(`File too large. Max ${isVideo ? '500MB' : '10MB'}`);
  }

  try {
    const FormData = require('form-data');
    const form     = new FormData();
    form.append('file', fileBuffer, { filename: fileName, contentType: mimeType });
    form.append('pinataMetadata', JSON.stringify({ name: fileName, keyvalues: { app: 'wikicious' } }));
    form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

    const res = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', form, {
      headers: { ...form.getHeaders(), Authorization: `Bearer ${PINATA_JWT}` },
      maxBodyLength: maxSize + 1024,
    });

    const cid  = res.data.IpfsHash;
    const hash = `0x${crypto.createHash('sha256').update(cid).digest('hex')}`;
    return { cid, hash, size: fileBuffer.length };
  } catch(e) {
    console.error('[ipfs] upload error:', e.message);
    throw new Error('IPFS upload failed: ' + e.message);
  }
}

// ── Fetch content from Arweave ────────────────────────────────────────────
async function fetchArweaveContent(txId) {
  if (!txId || txId.startsWith('mock_')) return null;
  try {
    const res = await axios.get(`https://arweave.net/${txId}`, { timeout: 10000 });
    return res.data;
  } catch(e) {
    // Try alternative gateway
    try {
      const res = await axios.get(`https://gateway.irys.xyz/${txId}`, { timeout: 10000 });
      return res.data;
    } catch { return null; }
  }
}

// ── Get IPFS media URL ────────────────────────────────────────────────────
function ipfsUrl(cid) {
  if (!cid) return null;
  // Use Cloudflare IPFS gateway for fast delivery
  return `https://cloudflare-ipfs.com/ipfs/${cid}`;
}

function arweaveUrl(txId) {
  if (!txId) return null;
  return `https://arweave.net/${txId}`;
}

module.exports = { uploadToArweave, uploadToIPFS, fetchArweaveContent, ipfsUrl, arweaveUrl };
