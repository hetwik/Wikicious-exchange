'use strict';
const { ethers } = require('ethers');
const Database   = require('better-sqlite3');
const path       = require('path');

const SOCIAL_ABI = [
  'event ProfileCreated(address indexed wallet, string handle, uint256 ts)',
  'event ProfileUpdated(address indexed wallet)',
  'event HandleChanged(address indexed wallet, string oldHandle, string newHandle)',
  'event PostCreated(uint256 indexed postId, address indexed author, uint8 postType, bytes32 contentHash)',
  'event TradePostCreated(uint256 indexed postId, address indexed author, uint256 positionId)',
  'event PostDeleted(uint256 indexed postId, address indexed author)',
  'event Liked(uint256 indexed postId, address indexed liker, address indexed author)',
  'event Unliked(uint256 indexed postId, address indexed liker)',
  'event CommentPosted(uint256 indexed commentId, uint256 indexed parentId, address indexed author)',
  'event Reposted(uint256 indexed newId, uint256 indexed origId, address indexed reposter)',
  'event Quoted(uint256 indexed newId, uint256 indexed origId, address indexed quoter)',
  'event Followed(address indexed follower, address indexed followed)',
  'event Unfollowed(address indexed follower, address indexed followed)',
  'event HashtagIndexed(string indexed tag, uint256 indexed postId)',
  'function getPost(uint256 id) view returns (uint256,address,uint8,bytes32,bytes32,uint8,uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256,bool,uint256,bool)',
  'function getProfile(address w) view returns (tuple(address wallet,string handle,string displayName,bytes32 avatarArweave,bytes32 bannerArweave,string bio,string website,uint256 followerCount,uint256 followingCount,uint256 postCount,uint256 totalLikesReceived,uint256 joinedAt,bool verified,bool traderVerified,bool active))',
  'function totalPosts() view returns (uint256)',
  'function isFollowing(address,address) view returns (bool)',
  'function hasLiked(uint256,address) view returns (bool)',
];

const REWARDS_ABI = [
  'function claimable_(address) view returns (uint256)',
  'function totalEarned(address) view returns (uint256)',
  'function totalClaimed(address) view returns (uint256)',
  'function dailyPoolSize() view returns (uint256)',
  'function rewardPostCreate() view returns (uint256)',
  'function rewardLikeAuthor() view returns (uint256)',
  'function dailyEarned(address) view returns (uint256)',
];

class SocialIndexer {
  constructor(provider, socialAddr, rewardsAddr) {
    this.provider = provider;
    this.contract = new ethers.Contract(socialAddr, SOCIAL_ABI, provider);
    this.rewards  = rewardsAddr ? new ethers.Contract(rewardsAddr, REWARDS_ABI, provider) : null;
    this.db       = new Database(path.join(__dirname, '../../data/social.db'));
    this._initDb();
    console.log('[social] indexer ready');
  }

  _initDb() {
    this.db.exec(`
      PRAGMA journal_mode=WAL;

      CREATE TABLE IF NOT EXISTS profiles (
        address         TEXT PRIMARY KEY,
        handle          TEXT UNIQUE,
        display_name    TEXT DEFAULT '',
        bio             TEXT DEFAULT '',
        website         TEXT DEFAULT '',
        avatar_arweave  TEXT DEFAULT '',
        banner_arweave  TEXT DEFAULT '',
        follower_count  INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        post_count      INTEGER DEFAULT 0,
        likes_received  INTEGER DEFAULT 0,
        joined_at       INTEGER DEFAULT 0,
        verified        INTEGER DEFAULT 0,
        trader_verified INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS posts (
        id              INTEGER PRIMARY KEY,
        author          TEXT NOT NULL,
        post_type       INTEGER DEFAULT 0,
        content_arweave TEXT DEFAULT '',
        media_ipfs      TEXT DEFAULT '',
        media_type      INTEGER DEFAULT 0,
        parent_id       INTEGER DEFAULT 0,
        like_count      INTEGER DEFAULT 0,
        comment_count   INTEGER DEFAULT 0,
        repost_count    INTEGER DEFAULT 0,
        quote_count     INTEGER DEFAULT 0,
        view_count      INTEGER DEFAULT 0,
        engagement_score INTEGER DEFAULT 0,
        created_at      INTEGER DEFAULT 0,
        deleted         INTEGER DEFAULT 0,
        linked_pos_id   INTEGER DEFAULT 0,
        is_trade_post   INTEGER DEFAULT 0,
        author_handle   TEXT DEFAULT '',
        author_display  TEXT DEFAULT '',
        author_avatar   TEXT DEFAULT '',
        author_verified INTEGER DEFAULT 0,
        author_trader_v INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS likes (
        post_id   INTEGER,
        liker     TEXT,
        author    TEXT,
        ts        INTEGER,
        PRIMARY KEY (post_id, liker)
      );

      CREATE TABLE IF NOT EXISTS follows (
        follower  TEXT,
        followed  TEXT,
        ts        INTEGER,
        PRIMARY KEY (follower, followed)
      );

      CREATE TABLE IF NOT EXISTS hashtags (
        tag         TEXT,
        post_id     INTEGER,
        ts          INTEGER,
        PRIMARY KEY (tag, post_id)
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        recipient TEXT NOT NULL,
        type      TEXT NOT NULL,
        actor     TEXT,
        post_id   INTEGER DEFAULT 0,
        comment_id INTEGER DEFAULT 0,
        read      INTEGER DEFAULT 0,
        ts        INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS indexer_state (
        key   TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_posts_author     ON posts(author);
      CREATE INDEX IF NOT EXISTS idx_posts_created    ON posts(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_engagement ON posts(engagement_score DESC);
      CREATE INDEX IF NOT EXISTS idx_posts_parent     ON posts(parent_id);
      CREATE INDEX IF NOT EXISTS idx_posts_type       ON posts(post_type);
      CREATE INDEX IF NOT EXISTS idx_notif_recipient  ON notifications(recipient, read, ts DESC);
      CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower);
      CREATE INDEX IF NOT EXISTS idx_follows_followed ON follows(followed);
      CREATE INDEX IF NOT EXISTS idx_hashtags_tag     ON hashtags(tag, ts DESC);
    `);
  }

  // ── Start listening to on-chain events ──────────────────────────────────
  startListening() {
    const c = this.contract;

    c.on('ProfileCreated', async (wallet, handle, ts) => {
      try {
        const profile = await c.getProfile(wallet);
        this._upsertProfile(wallet, profile);
        console.log(`[social] profile created: @${handle}`);
      } catch(e) { console.error('[social] ProfileCreated error:', e.message); }
    });

    c.on('ProfileUpdated', async (wallet) => {
      try {
        const profile = await c.getProfile(wallet);
        this._upsertProfile(wallet, profile);
      } catch(e) {}
    });

    c.on('HandleChanged', (wallet, oldHandle, newHandle) => {
      this.db.prepare('UPDATE profiles SET handle=? WHERE address=?').run(newHandle, wallet.toLowerCase());
      this.db.prepare('UPDATE posts SET author_handle=? WHERE author=?').run(newHandle, wallet.toLowerCase());
    });

    c.on('PostCreated', async (postId, author, postType, contentHash) => {
      try {
        const postData = await c.getPost(postId);
        const profile  = this._getProfile(author);
        this._insertPost(postId, postData, profile);
        console.log(`[social] post #${postId} by @${profile?.handle || author.slice(0,8)}`);
      } catch(e) { console.error('[social] PostCreated error:', e.message); }
    });

    c.on('PostDeleted', (postId) => {
      this.db.prepare('UPDATE posts SET deleted=1 WHERE id=?').run(Number(postId));
    });

    c.on('Liked', (postId, liker, author) => {
      const ts = Math.floor(Date.now()/1000);
      this.db.prepare('INSERT OR IGNORE INTO likes(post_id,liker,author,ts) VALUES(?,?,?,?)')
        .run(Number(postId), liker.toLowerCase(), author.toLowerCase(), ts);
      this.db.prepare('UPDATE posts SET like_count=like_count+1, engagement_score=engagement_score+10 WHERE id=?')
        .run(Number(postId));
      this._addNotification(author, 'like', liker, Number(postId));
    });

    c.on('Unliked', (postId, liker) => {
      this.db.prepare('DELETE FROM likes WHERE post_id=? AND liker=?')
        .run(Number(postId), liker.toLowerCase());
      this.db.prepare('UPDATE posts SET like_count=MAX(0,like_count-1) WHERE id=?')
        .run(Number(postId));
    });

    c.on('CommentPosted', (commentId, parentId, author) => {
      this.db.prepare('UPDATE posts SET comment_count=comment_count+1, engagement_score=engagement_score+5 WHERE id=?')
        .run(Number(parentId));
      const parent = this.db.prepare('SELECT author FROM posts WHERE id=?').get(Number(parentId));
      if (parent) this._addNotification(parent.author, 'comment', author, Number(parentId), Number(commentId));
    });

    c.on('Reposted', (newId, origId, reposter) => {
      this.db.prepare('UPDATE posts SET repost_count=repost_count+1, engagement_score=engagement_score+3 WHERE id=?')
        .run(Number(origId));
      const orig = this.db.prepare('SELECT author FROM posts WHERE id=?').get(Number(origId));
      if (orig) this._addNotification(orig.author, 'repost', reposter, Number(origId));
    });

    c.on('Quoted', (newId, origId, quoter) => {
      this.db.prepare('UPDATE posts SET quote_count=quote_count+1, engagement_score=engagement_score+4 WHERE id=?')
        .run(Number(origId));
    });

    c.on('Followed', (follower, followed) => {
      const ts = Math.floor(Date.now()/1000);
      this.db.prepare('INSERT OR IGNORE INTO follows(follower,followed,ts) VALUES(?,?,?)')
        .run(follower.toLowerCase(), followed.toLowerCase(), ts);
      this.db.prepare('UPDATE profiles SET follower_count=follower_count+1 WHERE address=?')
        .run(followed.toLowerCase());
      this.db.prepare('UPDATE profiles SET following_count=following_count+1 WHERE address=?')
        .run(follower.toLowerCase());
      this._addNotification(followed, 'follow', follower, 0);
    });

    c.on('Unfollowed', (follower, followed) => {
      this.db.prepare('DELETE FROM follows WHERE follower=? AND followed=?')
        .run(follower.toLowerCase(), followed.toLowerCase());
      this.db.prepare('UPDATE profiles SET follower_count=MAX(0,follower_count-1) WHERE address=?')
        .run(followed.toLowerCase());
      this.db.prepare('UPDATE profiles SET following_count=MAX(0,following_count-1) WHERE address=?')
        .run(follower.toLowerCase());
    });

    c.on('HashtagIndexed', (tag, postId) => {
      const ts = Math.floor(Date.now()/1000);
      this.db.prepare('INSERT OR IGNORE INTO hashtags(tag,post_id,ts) VALUES(?,?,?)')
        .run(tag, Number(postId), ts);
    });

    console.log('[social] event listeners active');
  }

  // ── DB helpers ───────────────────────────────────────────────────────────
  _upsertProfile(wallet, p) {
    const addr = wallet.toLowerCase();
    this.db.prepare(`
      INSERT INTO profiles(address,handle,display_name,bio,website,avatar_arweave,banner_arweave,
        follower_count,following_count,post_count,likes_received,joined_at,verified,trader_verified)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(address) DO UPDATE SET
        handle=excluded.handle, display_name=excluded.display_name, bio=excluded.bio,
        website=excluded.website, avatar_arweave=excluded.avatar_arweave,
        banner_arweave=excluded.banner_arweave, follower_count=excluded.follower_count,
        following_count=excluded.following_count, post_count=excluded.post_count,
        likes_received=excluded.likes_received, verified=excluded.verified,
        trader_verified=excluded.trader_verified
    `).run(
      addr,
      p.handle, p.displayName, p.bio, p.website,
      p.avatarArweave === ethers.ZeroHash ? '' : p.avatarArweave,
      p.bannerArweave  === ethers.ZeroHash ? '' : p.bannerArweave,
      Number(p.followerCount), Number(p.followingCount), Number(p.postCount),
      Number(p.totalLikesReceived), Number(p.joinedAt),
      p.verified ? 1 : 0, p.traderVerified ? 1 : 0
    );
    // Update denormalized author info on all posts
    this.db.prepare(`
      UPDATE posts SET author_handle=?, author_display=?, author_avatar=?,
        author_verified=?, author_trader_v=? WHERE author=?
    `).run(p.handle, p.displayName,
      p.avatarArweave === ethers.ZeroHash ? '' : p.avatarArweave,
      p.verified ? 1 : 0, p.traderVerified ? 1 : 0, addr
    );
  }

  _getProfile(wallet) {
    return this.db.prepare('SELECT * FROM profiles WHERE address=?').get(wallet.toLowerCase());
  }

  _insertPost(postId, data, profile) {
    // data tuple: id,author,postType,contentArweave,mediaIPFS,mediaType,parentId,
    //   likeCount,commentCount,repostCount,quoteCount,viewCount,engagementScore,
    //   createdAt,deleted,linkedPositionId,isTradePost
    this.db.prepare(`
      INSERT OR IGNORE INTO posts(
        id,author,post_type,content_arweave,media_ipfs,media_type,parent_id,
        like_count,comment_count,repost_count,quote_count,view_count,engagement_score,
        created_at,deleted,linked_pos_id,is_trade_post,
        author_handle,author_display,author_avatar,author_verified,author_trader_v
      ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `).run(
      Number(data[0]), data[1].toLowerCase(), Number(data[2]),
      data[3] === ethers.ZeroHash ? '' : data[3],
      data[4] === ethers.ZeroHash ? '' : data[4],
      Number(data[5]), Number(data[6]),
      Number(data[7]), Number(data[8]), Number(data[9]), Number(data[10]),
      Number(data[11]), Number(data[12]), Number(data[13]),
      data[14] ? 1 : 0, Number(data[15]), data[16] ? 1 : 0,
      profile?.handle || '', profile?.display_name || '',
      profile?.avatar_arweave || '',
      profile?.verified || 0, profile?.trader_verified || 0
    );
  }

  _addNotification(recipient, type, actor, postId, commentId = 0) {
    if (!recipient || recipient === actor) return;
    this.db.prepare(`
      INSERT INTO notifications(recipient,type,actor,post_id,comment_id,ts)
      VALUES(?,?,?,?,?,?)
    `).run(
      recipient.toLowerCase(), type, actor.toLowerCase(),
      postId, commentId, Math.floor(Date.now()/1000)
    );
  }

  // ── Query methods (used by API routes) ───────────────────────────────────
  getHomeFeed(address, page = 0, limit = 20) {
    const offset = page * limit;
    // Get posts from followed users + own posts
    const following = this.db.prepare('SELECT followed FROM follows WHERE follower=?')
      .all(address.toLowerCase()).map(r => r.followed);
    following.push(address.toLowerCase());
    const placeholders = following.map(() => '?').join(',');
    return this.db.prepare(`
      SELECT p.*, pr.handle as author_handle, pr.display_name as author_display,
        pr.avatar_arweave as author_avatar, pr.verified as author_verified,
        pr.trader_verified as author_trader_v
      FROM posts p
      LEFT JOIN profiles pr ON p.author = pr.address
      WHERE p.author IN (${placeholders}) AND p.deleted=0
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...following, limit, offset);
  }

  getExploreFeed(page = 0, limit = 20) {
    const offset = page * limit;
    return this.db.prepare(`
      SELECT p.*, pr.handle, pr.display_name, pr.avatar_arweave, pr.verified, pr.trader_verified
      FROM posts p
      LEFT JOIN profiles pr ON p.author = pr.address
      WHERE p.deleted=0 AND p.post_type=0
      ORDER BY p.engagement_score DESC, p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);
  }

  getUserPosts(address, page = 0, limit = 20) {
    return this.db.prepare(`
      SELECT p.* FROM posts p
      WHERE p.author=? AND p.deleted=0
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `).all(address.toLowerCase(), limit, page * limit);
  }

  getUserLikes(address, page = 0, limit = 20) {
    return this.db.prepare(`
      SELECT p.* FROM likes l
      JOIN posts p ON l.post_id = p.id
      WHERE l.liker=? AND p.deleted=0
      ORDER BY l.ts DESC
      LIMIT ? OFFSET ?
    `).all(address.toLowerCase(), limit, page * limit);
  }

  getPostComments(postId, page = 0, limit = 20) {
    return this.db.prepare(`
      SELECT p.*, pr.handle, pr.display_name, pr.avatar_arweave, pr.verified
      FROM posts p
      LEFT JOIN profiles pr ON p.author = pr.address
      WHERE p.parent_id=? AND p.post_type=1 AND p.deleted=0
      ORDER BY p.created_at ASC
      LIMIT ? OFFSET ?
    `).all(postId, limit, page * limit);
  }

  getHashtagPosts(tag, page = 0, limit = 20) {
    return this.db.prepare(`
      SELECT p.* FROM hashtags h
      JOIN posts p ON h.post_id = p.id
      WHERE h.tag=? AND p.deleted=0
      ORDER BY h.ts DESC
      LIMIT ? OFFSET ?
    `).all(tag, limit, page * limit);
  }

  getTrending(limit = 10) {
    const since = Math.floor(Date.now()/1000) - 86400; // last 24h
    return this.db.prepare(`
      SELECT h.tag, COUNT(*) as post_count, MAX(h.ts) as last_used
      FROM hashtags h
      JOIN posts p ON h.post_id = p.id
      WHERE h.ts > ? AND p.deleted=0
      GROUP BY h.tag
      ORDER BY post_count DESC
      LIMIT ?
    `).all(since, limit);
  }

  search(query, page = 0, limit = 20) {
    const q = `%${query.toLowerCase()}%`;
    const profiles = this.db.prepare(`
      SELECT * FROM profiles
      WHERE LOWER(handle) LIKE ? OR LOWER(display_name) LIKE ?
      LIMIT 5
    `).all(q, q);
    const posts = this.db.prepare(`
      SELECT p.*, pr.handle, pr.display_name, pr.avatar_arweave, pr.verified
      FROM posts p
      LEFT JOIN profiles pr ON p.author = pr.address
      WHERE p.deleted=0 AND (p.author_handle LIKE ? OR p.content_arweave LIKE ?)
      ORDER BY p.engagement_score DESC
      LIMIT ? OFFSET ?
    `).all(q, q, limit, page * limit);
    const tags = this.db.prepare(`
      SELECT tag, COUNT(*) as count FROM hashtags WHERE tag LIKE ? GROUP BY tag ORDER BY count DESC LIMIT 5
    `).all(q);
    return { profiles, posts, tags };
  }

  getNotifications(address, page = 0, limit = 30) {
    const rows = this.db.prepare(`
      SELECT n.*, pr.handle as actor_handle, pr.display_name as actor_display,
        pr.avatar_arweave as actor_avatar
      FROM notifications n
      LEFT JOIN profiles pr ON n.actor = pr.address
      WHERE n.recipient=?
      ORDER BY n.ts DESC
      LIMIT ? OFFSET ?
    `).all(address.toLowerCase(), limit, page * limit);
    return rows;
  }

  markNotificationsRead(address) {
    this.db.prepare('UPDATE notifications SET read=1 WHERE recipient=?').run(address.toLowerCase());
  }

  getUnreadCount(address) {
    const r = this.db.prepare('SELECT COUNT(*) as cnt FROM notifications WHERE recipient=? AND read=0')
      .get(address.toLowerCase());
    return r?.cnt || 0;
  }

  getProfile(address) {
    return this.db.prepare('SELECT * FROM profiles WHERE address=?').get(address.toLowerCase());
  }

  getProfileByHandle(handle) {
    return this.db.prepare('SELECT * FROM profiles WHERE LOWER(handle)=LOWER(?)').get(handle);
  }

  getPost(id) {
    return this.db.prepare('SELECT * FROM posts WHERE id=?').get(Number(id));
  }

  getSuggestedUsers(address, limit = 10) {
    // Suggest users followed by people you follow (friends-of-friends)
    return this.db.prepare(`
      SELECT p.*, COUNT(*) as mutual_follows
      FROM follows f1
      JOIN follows f2 ON f1.followed = f2.follower
      JOIN profiles p ON f2.followed = p.address
      WHERE f1.follower=? AND f2.followed != ?
        AND f2.followed NOT IN (SELECT followed FROM follows WHERE follower=?)
      GROUP BY f2.followed
      ORDER BY mutual_follows DESC, p.follower_count DESC
      LIMIT ?
    `).all(address.toLowerCase(), address.toLowerCase(), address.toLowerCase(), limit);
  }

  getFollowers(address, page = 0, limit = 30) {
    return this.db.prepare(`
      SELECT p.* FROM follows f JOIN profiles p ON f.follower = p.address
      WHERE f.followed=? ORDER BY f.ts DESC LIMIT ? OFFSET ?
    `).all(address.toLowerCase(), limit, page * limit);
  }

  getFollowing(address, page = 0, limit = 30) {
    return this.db.prepare(`
      SELECT p.* FROM follows f JOIN profiles p ON f.followed = p.address
      WHERE f.follower=? ORDER BY f.ts DESC LIMIT ? OFFSET ?
    `).all(address.toLowerCase(), limit, page * limit);
  }
}

module.exports = SocialIndexer;
