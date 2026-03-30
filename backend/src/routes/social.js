'use strict';
const multer  = require('multer');
const { uploadToArweave, uploadToIPFS, fetchArweaveContent, ipfsUrl, arweaveUrl } = require('../services/storage_service');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

module.exports = function(app, socialIndexer, rewardsContract) {

  // ── Feed ──────────────────────────────────────────────────────────────
  // Home feed (from followed users)
  app.get('/api/social/feed', async (req, res) => {
    try {
      const { address, page = 0 } = req.query;
      if (!address) return res.status(400).json({ error: 'address required' });
      const posts = socialIndexer.getHomeFeed(address, Number(page));
      res.json({ posts, page: Number(page), hasMore: posts.length === 20 });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Explore feed (top by engagement)
  app.get('/api/social/explore', async (req, res) => {
    try {
      const { page = 0 } = req.query;
      const posts = socialIndexer.getExploreFeed(Number(page));
      res.json({ posts, page: Number(page) });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Posts ─────────────────────────────────────────────────────────────
  // Get single post + comments
  app.get('/api/social/posts/:id', async (req, res) => {
    try {
      const post = socialIndexer.getPost(req.params.id);
      if (!post) return res.status(404).json({ error: 'not found' });

      // Fetch content from Arweave if hash available
      let content = null;
      if (post.content_arweave && !post.content_arweave.startsWith('0x')) {
        content = await fetchArweaveContent(post.content_arweave);
      }

      const comments = socialIndexer.getPostComments(req.params.id);
      res.json({ post, content, comments });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Get comments for a post
  app.get('/api/social/posts/:id/comments', (req, res) => {
    try {
      const { page = 0 } = req.query;
      const comments = socialIndexer.getPostComments(Number(req.params.id), Number(page));
      res.json(comments);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Upload content (before posting on-chain) ──────────────────────────
  // Step 1: Upload text content to Arweave → get hash
  // Step 2: Upload media to IPFS → get CID hash
  // Step 3: User calls WikiSocial.createPost(arweaveHash, ipfsHash, ...) on-chain

  app.post('/api/social/upload/content', async (req, res) => {
    try {
      const { text, tags, author, replyTo } = req.body;
      if (!text && !req.body.mediaOnly) return res.status(400).json({ error: 'text required' });
      if (text && text.length > 10000) return res.status(400).json({ error: 'text too long (max 10,000 chars)' });

      const content = {
        text: text || '',
        tags: tags || [],
        author,
        replyTo: replyTo || null,
        timestamp: Date.now(),
      };

      const result = await uploadToArweave(content);
      res.json({
        arweaveTxId: result.txId,
        contentHash: result.hash, // This goes on-chain as bytes32
        arweaveUrl:  result.txId ? arweaveUrl(result.txId) : null,
        mock:        result.mock || false,
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Upload image to IPFS
  app.post('/api/social/upload/image', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'no file' });
      const allowed = ['image/jpeg','image/png','image/gif','image/webp'];
      if (!allowed.includes(req.file.mimetype)) return res.status(400).json({ error: 'invalid image type' });

      const result = await uploadToIPFS(req.file.buffer, req.file.originalname, req.file.mimetype);
      res.json({
        cid:       result.cid,
        mediaHash: result.hash, // This goes on-chain as bytes32
        url:       ipfsUrl(result.cid),
        size:      result.size,
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Upload video to IPFS
  app.post('/api/social/upload/video', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'no file' });
      const allowed = ['video/mp4','video/webm','video/quicktime'];
      if (!allowed.includes(req.file.mimetype)) return res.status(400).json({ error: 'invalid video type' });

      const result = await uploadToIPFS(req.file.buffer, req.file.originalname, req.file.mimetype);
      res.json({
        cid:       result.cid,
        mediaHash: result.hash,
        url:       ipfsUrl(result.cid),
        size:      result.size,
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Upload profile avatar/banner to Arweave
  app.post('/api/social/upload/avatar', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'no file' });
      const result = await uploadToIPFS(req.file.buffer, req.file.originalname, req.file.mimetype);
      res.json({ cid: result.cid, hash: result.hash, url: ipfsUrl(result.cid) });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Profiles ──────────────────────────────────────────────────────────
  app.get('/api/social/profiles/:addressOrHandle', async (req, res) => {
    try {
      const param = req.params.addressOrHandle;
      const profile = param.startsWith('0x')
        ? socialIndexer.getProfile(param)
        : socialIndexer.getProfileByHandle(param);
      if (!profile) return res.status(404).json({ error: 'profile not found' });
      res.json(profile);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/social/profiles/:address/posts', (req, res) => {
    try {
      const { page = 0 } = req.query;
      const posts = socialIndexer.getUserPosts(req.params.address, Number(page));
      res.json(posts);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/social/profiles/:address/likes', (req, res) => {
    try {
      const { page = 0 } = req.query;
      const posts = socialIndexer.getUserLikes(req.params.address, Number(page));
      res.json(posts);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/social/profiles/:address/followers', (req, res) => {
    try {
      const { page = 0 } = req.query;
      res.json(socialIndexer.getFollowers(req.params.address, Number(page)));
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/social/profiles/:address/following', (req, res) => {
    try {
      const { page = 0 } = req.query;
      res.json(socialIndexer.getFollowing(req.params.address, Number(page)));
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // Suggested users to follow
  app.get('/api/social/suggested', (req, res) => {
    try {
      const { address } = req.query;
      if (!address) return res.json([]);
      res.json(socialIndexer.getSuggestedUsers(address));
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Search ────────────────────────────────────────────────────────────
  app.get('/api/social/search', (req, res) => {
    try {
      const { q, page = 0 } = req.query;
      if (!q || q.length < 2) return res.json({ profiles: [], posts: [], tags: [] });
      res.json(socialIndexer.search(q, Number(page)));
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Hashtags & Trending ───────────────────────────────────────────────
  app.get('/api/social/trending', (req, res) => {
    try {
      const { limit = 10 } = req.query;
      res.json(socialIndexer.getTrending(Number(limit)));
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/social/hashtag/:tag', (req, res) => {
    try {
      const { page = 0 } = req.query;
      const posts = socialIndexer.getHashtagPosts(req.params.tag, Number(page));
      const count = socialIndexer.db.prepare('SELECT COUNT(*) as c FROM hashtags WHERE tag=?').get(req.params.tag);
      res.json({ tag: req.params.tag, posts, totalPosts: count?.c || 0 });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Notifications ─────────────────────────────────────────────────────
  app.get('/api/social/notifications', (req, res) => {
    try {
      const { address, page = 0 } = req.query;
      if (!address) return res.status(400).json({ error: 'address required' });
      const notifications = socialIndexer.getNotifications(address, Number(page));
      const unread        = socialIndexer.getUnreadCount(address);
      res.json({ notifications, unread });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  app.post('/api/social/notifications/read', (req, res) => {
    try {
      const { address } = req.body;
      if (!address) return res.status(400).json({ error: 'address required' });
      socialIndexer.markNotificationsRead(address);
      res.json({ ok: true });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Rewards ───────────────────────────────────────────────────────────
  app.get('/api/social/rewards/:address', async (req, res) => {
    try {
      if (!rewardsContract) return res.json({ claimable: '0', totalEarned: '0' });
      const { ethers } = require('ethers');
      const addr = req.params.address;
      const [claimable, earned, claimed, dailyPool] = await Promise.all([
        rewardsContract.claimable_(addr).catch(() => 0n),
        rewardsContract.totalEarned(addr).catch(() => 0n),
        rewardsContract.totalClaimed(addr).catch(() => 0n),
        rewardsContract.dailyPoolSize().catch(() => 0n),
      ]);
      res.json({
        claimable:   ethers.formatEther(claimable),
        totalEarned: ethers.formatEther(earned),
        claimed:     ethers.formatEther(claimed),
        dailyPool:   ethers.formatEther(dailyPool),
        rewardRates: {
          post:    '1 WIK',
          like:    '0.5 WIK to author, 0.1 WIK to liker',
          comment: '0.3 WIK to author, 0.2 WIK to commenter',
          repost:  '0.2 WIK to original author',
          follow:  '0.1 WIK to followed',
          dailyPool: `${ethers.formatEther(dailyPool)} WIK split by engagement`,
        },
      });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // ── Arweave content fetch proxy (cached) ──────────────────────────────
  const contentCache = new Map();
  app.get('/api/social/content/:txId', async (req, res) => {
    try {
      const { txId } = req.params;
      if (contentCache.has(txId)) return res.json(contentCache.get(txId));
      const content = await fetchArweaveContent(txId);
      if (!content) return res.status(404).json({ error: 'content not found' });
      contentCache.set(txId, content);
      if (contentCache.size > 1000) contentCache.delete(contentCache.keys().next().value);
      res.json(content);
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
};
