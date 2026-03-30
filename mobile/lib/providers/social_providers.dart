import 'dart:async';
import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:dio/dio.dart';
import '../services/api_service.dart';
import '../theme.dart';

// ── Models ────────────────────────────────────────────────────
class SocialPost {
  final int    id;
  final String author, authorHandle, authorDisplay, authorAvatar;
  final bool   authorVerified, authorTraderVerified;
  final int    postType; // 0=original 1=comment 2=repost 3=quote
  final String contentArweave, mediaIpfs;
  final int    mediaType; // 0=none 1=image 2=video 3=audio
  final int    parentId, likeCount, commentCount, repostCount, quoteCount;
  final int    engagementScore, createdAt;
  final bool   deleted, isTradePost;
  final int    linkedPositionId;
  // Resolved content (fetched from Arweave)
  final String? text;
  final List<String> tags;

  const SocialPost({
    required this.id, required this.author, required this.authorHandle,
    required this.authorDisplay, required this.authorAvatar,
    required this.authorVerified, required this.authorTraderVerified,
    required this.postType, required this.contentArweave, required this.mediaIpfs,
    required this.mediaType, required this.parentId,
    required this.likeCount, required this.commentCount,
    required this.repostCount, required this.quoteCount,
    required this.engagementScore, required this.createdAt,
    required this.deleted, required this.isTradePost,
    required this.linkedPositionId, this.text, this.tags = const [],
  });

  factory SocialPost.fromJson(Map<String, dynamic> j) => SocialPost(
    id:                   (j['id']              ?? 0).toInt(),
    author:               j['author']           ?? '',
    authorHandle:         j['author_handle']    ?? j['authorHandle']    ?? '',
    authorDisplay:        j['author_display']   ?? j['authorDisplay']   ?? '',
    authorAvatar:         j['author_avatar']    ?? j['authorAvatar']    ?? '',
    authorVerified:       (j['author_verified'] ?? j['authorVerified']  ?? 0) == 1,
    authorTraderVerified: (j['author_trader_v'] ?? j['authorTraderV']   ?? 0) == 1,
    postType:             (j['post_type']        ?? 0).toInt(),
    contentArweave:       j['content_arweave']  ?? '',
    mediaIpfs:            j['media_ipfs']       ?? '',
    mediaType:            (j['media_type']      ?? 0).toInt(),
    parentId:             (j['parent_id']       ?? 0).toInt(),
    likeCount:            (j['like_count']      ?? 0).toInt(),
    commentCount:         (j['comment_count']   ?? 0).toInt(),
    repostCount:          (j['repost_count']    ?? 0).toInt(),
    quoteCount:           (j['quote_count']     ?? 0).toInt(),
    engagementScore:      (j['engagement_score']?? 0).toInt(),
    createdAt:            (j['created_at']      ?? 0).toInt(),
    deleted:              (j['deleted']         ?? 0) == 1,
    isTradePost:          (j['is_trade_post']   ?? 0) == 1,
    linkedPositionId:     (j['linked_pos_id']   ?? 0).toInt(),
    text:                 j['text'],
    tags:                 List<String>.from(j['tags'] ?? []),
  );

  String get mediaUrl {
    if (mediaIpfs.isEmpty) return '';
    return 'https://cloudflare-ipfs.com/ipfs/$mediaIpfs';
  }

  String get arweaveUrl {
    if (contentArweave.isEmpty || contentArweave.startsWith('0x')) return '';
    return 'https://arweave.net/$contentArweave';
  }

  bool get hasMedia => mediaIpfs.isNotEmpty;
  bool get isVideo  => mediaType == 2;
  bool get isImage  => mediaType == 1;
}

class SocialProfile {
  final String address, handle, displayName, bio, website;
  final String avatarArweave, bannerArweave;
  final int    followerCount, followingCount, postCount, likesReceived, joinedAt;
  final bool   verified, traderVerified;

  const SocialProfile({
    required this.address, required this.handle, required this.displayName,
    required this.bio, required this.website,
    required this.avatarArweave, required this.bannerArweave,
    required this.followerCount, required this.followingCount,
    required this.postCount, required this.likesReceived, required this.joinedAt,
    required this.verified, required this.traderVerified,
  });

  factory SocialProfile.fromJson(Map<String, dynamic> j) => SocialProfile(
    address:        j['address']         ?? '',
    handle:         j['handle']          ?? '',
    displayName:    j['display_name']    ?? j['displayName'] ?? '',
    bio:            j['bio']             ?? '',
    website:        j['website']         ?? '',
    avatarArweave:  j['avatar_arweave']  ?? '',
    bannerArweave:  j['banner_arweave']  ?? '',
    followerCount:  (j['follower_count']  ?? 0).toInt(),
    followingCount: (j['following_count'] ?? 0).toInt(),
    postCount:      (j['post_count']      ?? 0).toInt(),
    likesReceived:  (j['likes_received']  ?? 0).toInt(),
    joinedAt:       (j['joined_at']       ?? 0).toInt(),
    verified:       (j['verified']        ?? 0) == 1,
    traderVerified: (j['trader_verified'] ?? 0) == 1,
  );

  String get avatarUrl {
    if (avatarArweave.isEmpty) return '';
    return avatarArweave.startsWith('Qm') || avatarArweave.startsWith('baf')
        ? 'https://cloudflare-ipfs.com/ipfs/$avatarArweave'
        : 'https://arweave.net/$avatarArweave';
  }
}

class SocialNotification {
  final int    id, postId, commentId, ts;
  final String recipient, type, actor, actorHandle, actorDisplay, actorAvatar;
  final bool   read;
  const SocialNotification({
    required this.id, required this.recipient, required this.type,
    required this.actor, required this.actorHandle, required this.actorDisplay,
    required this.actorAvatar, required this.postId, required this.commentId,
    required this.read, required this.ts,
  });
  factory SocialNotification.fromJson(Map<String, dynamic> j) => SocialNotification(
    id:           (j['id']           ?? 0).toInt(),
    recipient:    j['recipient']     ?? '',
    type:         j['type']          ?? '',
    actor:        j['actor']         ?? '',
    actorHandle:  j['actor_handle']  ?? '',
    actorDisplay: j['actor_display'] ?? '',
    actorAvatar:  j['actor_avatar']  ?? '',
    postId:       (j['post_id']      ?? 0).toInt(),
    commentId:    (j['comment_id']   ?? 0).toInt(),
    read:         (j['read']         ?? 0) == 1,
    ts:           (j['ts']           ?? 0).toInt(),
  );
}

// ── Social API calls ──────────────────────────────────────────
class SocialApi {
  static final _dio = api._dio;

  static Future<List<SocialPost>> getFeed(String address, {int page = 0}) async {
    final r = await _dio.get('/api/social/feed', queryParameters: {'address': address, 'page': page});
    return (r.data['posts'] as List).map((j) => SocialPost.fromJson(j)).toList();
  }

  static Future<List<SocialPost>> getExplore({int page = 0}) async {
    final r = await _dio.get('/api/social/explore', queryParameters: {'page': page});
    return (r.data['posts'] as List).map((j) => SocialPost.fromJson(j)).toList();
  }

  static Future<Map<String, dynamic>> getPost(int id) async {
    final r = await _dio.get('/api/social/posts/$id');
    return r.data;
  }

  static Future<List<SocialPost>> getComments(int postId, {int page = 0}) async {
    final r = await _dio.get('/api/social/posts/$postId/comments', queryParameters: {'page': page});
    return (r.data as List).map((j) => SocialPost.fromJson(j)).toList();
  }

  static Future<SocialProfile> getProfile(String addressOrHandle) async {
    final r = await _dio.get('/api/social/profiles/$addressOrHandle');
    return SocialProfile.fromJson(r.data);
  }

  static Future<List<SocialPost>> getUserPosts(String address, {int page = 0}) async {
    final r = await _dio.get('/api/social/profiles/$address/posts', queryParameters: {'page': page});
    return (r.data as List).map((j) => SocialPost.fromJson(j)).toList();
  }

  static Future<Map<String, dynamic>> search(String q) async {
    final r = await _dio.get('/api/social/search', queryParameters: {'q': q});
    return r.data;
  }

  static Future<List<Map<String, dynamic>>> getTrending() async {
    final r = await _dio.get('/api/social/trending');
    return List<Map<String, dynamic>>.from(r.data);
  }

  static Future<List<SocialPost>> getHashtagPosts(String tag, {int page = 0}) async {
    final r = await _dio.get('/api/social/hashtag/$tag', queryParameters: {'page': page});
    return (r.data['posts'] as List).map((j) => SocialPost.fromJson(j)).toList();
  }

  static Future<Map<String, dynamic>> getNotifications(String address, {int page = 0}) async {
    final r = await _dio.get('/api/social/notifications', queryParameters: {'address': address, 'page': page});
    return r.data;
  }

  static Future<void> markRead(String address) async {
    await _dio.post('/api/social/notifications/read', data: {'address': address});
  }

  static Future<Map<String, dynamic>> getRewards(String address) async {
    final r = await _dio.get('/api/social/rewards/$address');
    return r.data;
  }

  static Future<Map<String, dynamic>> uploadContent(String text, {List<String> tags = const [], String? author}) async {
    final r = await _dio.post('/api/social/upload/content', data: {'text': text, 'tags': tags, 'author': author});
    return r.data;
  }

  static Future<List<SocialProfile>> getSuggested(String address) async {
    final r = await _dio.get('/api/social/suggested', queryParameters: {'address': address});
    return (r.data as List).map((j) => SocialProfile.fromJson(j)).toList();
  }

  static Future<List<SocialProfile>> getFollowers(String address) async {
    final r = await _dio.get('/api/social/profiles/$address/followers');
    return (r.data as List).map((j) => SocialProfile.fromJson(j)).toList();
  }

  static Future<List<SocialProfile>> getFollowing(String address) async {
    final r = await _dio.get('/api/social/profiles/$address/following');
    return (r.data as List).map((j) => SocialProfile.fromJson(j)).toList();
  }
}

// ── Providers ─────────────────────────────────────────────────
final feedProvider = StateNotifierProvider<FeedNotifier, AsyncValue<List<SocialPost>>>((ref) {
  final address = ref.watch(authProvider).address;
  return FeedNotifier(address);
});

class FeedNotifier extends StateNotifier<AsyncValue<List<SocialPost>>> {
  final String? address;
  int _page = 0;
  bool _hasMore = true;
  FeedNotifier(this.address) : super(const AsyncLoading()) { load(); }

  Future<void> load({bool refresh = false}) async {
    if (refresh) { _page = 0; _hasMore = true; }
    if (!_hasMore && !refresh) return;
    try {
      if (address == null) {
        final posts = await SocialApi.getExplore(page: _page);
        state = AsyncData(refresh ? posts : [...(state.valueOrNull ?? []), ...posts]);
      } else {
        final posts = await SocialApi.getFeed(address!, page: _page);
        state = AsyncData(refresh ? posts : [...(state.valueOrNull ?? []), ...posts]);
        _hasMore = posts.length == 20;
        if (!refresh) _page++;
      }
    } catch(e) { if (state is! AsyncData) state = AsyncError(e, StackTrace.current); }
  }

  Future<void> refresh() => load(refresh: true);
  void loadMore() { if (_hasMore) load(); }
}

final exploreProvider = StateNotifierProvider<ExploreNotifier, AsyncValue<List<SocialPost>>>((ref) => ExploreNotifier());

class ExploreNotifier extends StateNotifier<AsyncValue<List<SocialPost>>> {
  int _page = 0;
  ExploreNotifier() : super(const AsyncLoading()) { load(); }
  Future<void> load({bool refresh = false}) async {
    if (refresh) _page = 0;
    try {
      final posts = await SocialApi.getExplore(page: _page);
      state = AsyncData(refresh ? posts : [...(state.valueOrNull ?? []), ...posts]);
      if (!refresh) _page++;
    } catch(e) { if (state is! AsyncData) state = AsyncError(e, StackTrace.current); }
  }
  Future<void> refresh() => load(refresh: true);
}

final trendingProvider = FutureProvider<List<Map<String, dynamic>>>((ref) => SocialApi.getTrending());

final notificationsProvider = FutureProvider.family<Map<String, dynamic>, String>(
    (ref, address) => SocialApi.getNotifications(address));

final unreadNotificationsProvider = StateProvider<int>((ref) => 0);

final rewardsProvider = FutureProvider.family<Map<String, dynamic>, String>(
    (ref, address) => SocialApi.getRewards(address));

final profileProvider = FutureProvider.family<SocialProfile, String>(
    (ref, addr) => SocialApi.getProfile(addr));

final userPostsProvider = FutureProvider.family<List<SocialPost>, String>(
    (ref, addr) => SocialApi.getUserPosts(addr));

final suggestedProvider = FutureProvider.family<List<SocialProfile>, String>(
    (ref, addr) => SocialApi.getSuggested(addr));

// Liked posts set for current user
final likedPostsProvider = StateProvider<Set<int>>((ref) => {});

// ── Post detail provider (needed by post_screen.dart) ─────────
final postDetailProvider = FutureProvider.family<SocialPost?, int>((ref, id) async {
  try {
    final posts = await SocialApi.getFeed(null);
    return posts.firstWhere((p) => p.id == id, orElse: () => posts.first);
  } catch (_) { return null; }
});
