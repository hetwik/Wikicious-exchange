import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:cached_network_image/cached_network_image.dart';
import '../../theme.dart';
import '../../providers/social_providers.dart';
import '../../providers/providers.dart';
import '../../services/wallet_service.dart';

class PostCard extends ConsumerStatefulWidget {
  final SocialPost post;
  final bool showThread;
  final VoidCallback? onTap;

  const PostCard({super.key, required this.post, this.showThread = false, this.onTap});

  @override
  ConsumerState<PostCard> createState() => _PostCardState();
}

class _PostCardState extends ConsumerState<PostCard> {
  late bool _liked;
  late int  _likeCount;

  @override
  void initState() {
    super.initState();
    _liked     = ref.read(likedPostsProvider).contains(widget.post.id);
    _likeCount = widget.post.likeCount;
  }

  @override
  Widget build(BuildContext context) {
    final post    = widget.post;
    final myAddr  = ref.watch(authProvider).address?.toLowerCase();
    final isOwn   = post.author.toLowerCase() == myAddr;

    return InkWell(
      onTap: widget.onTap ?? () => context.push('/post/${post.id}'),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: WikColor.border)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

          // Repost banner
          if (post.postType == 2)
            Padding(
              padding: const EdgeInsets.only(bottom: 6, left: 36),
              child: Row(children: [
                const Icon(Icons.repeat, size: 14, color: WikColor.text3),
                const SizedBox(width: 4),
                Text('${post.authorHandle} reposted', style: WikText.label()),
              ]),
            ),

          // Trade post banner
          if (post.isTradePost)
            Padding(
              padding: const EdgeInsets.only(bottom: 6, left: 36),
              child: Row(children: [
                const Icon(Icons.candlestick_chart, size: 14, color: WikColor.gold),
                const SizedBox(width: 4),
                Text('Shared a trade', style: WikText.label(color: WikColor.gold)),
              ]),
            ),

          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Avatar
            GestureDetector(
              onTap: () => context.push('/profile/${post.author}'),
              child: _Avatar(url: post.authorAvatar, size: 40),
            ),
            const SizedBox(width: 10),

            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Author row
              Row(children: [
                Expanded(child: Row(children: [
                  Text(
                    post.authorDisplay.isNotEmpty ? post.authorDisplay : post.authorHandle,
                    style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14, color: WikColor.text1),
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (post.authorVerified) ...[
                    const SizedBox(width: 3),
                    const Icon(Icons.verified, size: 14, color: WikColor.accent),
                  ],
                  if (post.authorTraderVerified) ...[
                    const SizedBox(width: 3),
                    const Icon(Icons.candlestick_chart, size: 12, color: WikColor.gold),
                  ],
                  const SizedBox(width: 4),
                  Text('@${post.authorHandle}', style: WikText.label(size: 12)),
                ])),
                Text(
                  timeago.format(DateTime.fromMillisecondsSinceEpoch(post.createdAt * 1000)),
                  style: WikText.label(size: 11),
                ),
                if (isOwn) _MoreMenu(post: post),
              ]),

              const SizedBox(height: 6),

              // Text content
              if (post.text != null && post.text!.isNotEmpty)
                _PostText(text: post.text!),

              const SizedBox(height: 8),

              // Media
              if (post.hasMedia) _MediaWidget(post: post),

              // Trade card
              if (post.isTradePost && post.linkedPositionId > 0)
                _TradeCard(positionId: post.linkedPositionId),

              const SizedBox(height: 10),

              // Actions row
              _ActionsRow(
                post:      post,
                liked:     _liked,
                likeCount: _likeCount,
                onLike:    _toggleLike,
              ),
            ])),
          ]),
        ]),
      ),
    );
  }

  Future<void> _toggleLike() async {
    HapticFeedback.lightImpact();
    final wasLiked = _liked;
    setState(() {
      _liked     = !_liked;
      _likeCount = _liked ? _likeCount + 1 : _likeCount - 1;
    });
    // Update liked set
    final liked = ref.read(likedPostsProvider.notifier);
    if (_liked) {
      liked.state = {...ref.read(likedPostsProvider), widget.post.id};
    } else {
      liked.state = {...ref.read(likedPostsProvider)}..remove(widget.post.id);
    }
    // TODO: Call WikiSocial.likePost / unlikePost on-chain via wallet
    // For now: optimistic UI — on-chain call queued in background
  }
}

// ── Sub-widgets ───────────────────────────────────────────────
class _Avatar extends StatelessWidget {
  final String url;
  final double size;
  const _Avatar({required this.url, required this.size});

  @override
  Widget build(BuildContext context) {
    return CircleAvatar(
      radius: size / 2,
      backgroundColor: WikColor.bg3,
      backgroundImage: url.isNotEmpty ? CachedNetworkImageProvider(url) : null,
      child: url.isEmpty
          ? Icon(Icons.person, size: size * 0.5, color: WikColor.text3)
          : null,
    );
  }
}

class _PostText extends StatelessWidget {
  final String text;
  const _PostText({required this.text});

  @override
  Widget build(BuildContext context) {
    // Parse text for #hashtags and @mentions
    final spans = <InlineSpan>[];
    final regex  = RegExp(r'(#\w+|@\w+)');
    int   last   = 0;
    for (final match in regex.allMatches(text)) {
      if (match.start > last) {
        spans.add(TextSpan(
          text: text.substring(last, match.start),
          style: const TextStyle(color: WikColor.text1, fontSize: 14, height: 1.4),
        ));
      }
      final word = match.group(0)!;
      spans.add(TextSpan(
        text: word,
        style: const TextStyle(color: WikColor.accent, fontSize: 14, height: 1.4),
      ));
      last = match.end;
    }
    if (last < text.length) {
      spans.add(TextSpan(
        text: text.substring(last),
        style: const TextStyle(color: WikColor.text1, fontSize: 14, height: 1.4),
      ));
    }
    return RichText(text: TextSpan(children: spans));
  }
}

class _MediaWidget extends StatelessWidget {
  final SocialPost post;
  const _MediaWidget({required this.post});

  @override
  Widget build(BuildContext context) {
    if (post.isImage) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: CachedNetworkImage(
          imageUrl: post.mediaUrl,
          fit: BoxFit.cover,
          width: double.infinity,
          maxHeightDiskCache: 600,
          placeholder: (_, __) => Container(
            height: 200,
            color: WikColor.bg3,
            child: const Center(child: CircularProgressIndicator(strokeWidth: 2)),
          ),
          errorWidget: (_, __, ___) => Container(
            height: 100, color: WikColor.bg3,
            child: const Center(child: Icon(Icons.broken_image, color: WikColor.text3)),
          ),
        ),
      );
    }
    if (post.isVideo) {
      return GestureDetector(
        onTap: () {/* open video player */},
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Container(
            height: 200, color: WikColor.bg3,
            child: const Center(child: Icon(Icons.play_circle_fill, size: 56, color: WikColor.accent)),
          ),
        ),
      );
    }
    return const SizedBox.shrink();
  }
}

class _TradeCard extends StatelessWidget {
  final int positionId;
  const _TradeCard({required this.positionId});
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(top: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: WikColor.bg3,
        borderRadius: BorderRadius.circular(10),
        border: const Border.fromBorderSide(BorderSide(color: WikColor.border)),
      ),
      child: Row(children: [
        const Icon(Icons.candlestick_chart, color: WikColor.gold, size: 18),
        const SizedBox(width: 8),
        Text('Trade #$positionId', style: const TextStyle(color: WikColor.gold, fontWeight: FontWeight.w600)),
        const Spacer(),
        GestureDetector(
          onTap: () => context.push('/trade'),
          child: const Text('View on Exchange →', style: TextStyle(color: WikColor.accent, fontSize: 12)),
        ),
      ]),
    );
  }
}

class _ActionsRow extends StatelessWidget {
  final SocialPost post;
  final bool liked;
  final int  likeCount;
  final VoidCallback onLike;
  const _ActionsRow({required this.post, required this.liked, required this.likeCount, required this.onLike});

  @override
  Widget build(BuildContext context) {
    return Row(children: [
      _ActionBtn(icon: Icons.chat_bubble_outline, count: post.commentCount, color: WikColor.text3,
          onTap: () => context.push('/compose?replyTo=${post.id}')),
      const SizedBox(width: 24),
      _ActionBtn(icon: Icons.repeat, count: post.repostCount, color: WikColor.text3,
          onTap: () {/* repost */}),
      const SizedBox(width: 24),
      _ActionBtn(
        icon: liked ? Icons.favorite : Icons.favorite_border,
        count: likeCount,
        color: liked ? WikColor.red : WikColor.text3,
        onTap: onLike,
      ),
      const Spacer(),
      _ActionBtn(icon: Icons.share_outlined, count: 0, color: WikColor.text3,
          onTap: () {/* share */}),
    ]);
  }
}

class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final int count;
  final Color color;
  final VoidCallback onTap;
  const _ActionBtn({required this.icon, required this.count, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Row(children: [
      Icon(icon, size: 18, color: color),
      if (count > 0) ...[
        const SizedBox(width: 4),
        Text('$count', style: TextStyle(color: color, fontSize: 12)),
      ],
    ]),
  );
}

class _MoreMenu extends StatelessWidget {
  final SocialPost post;
  const _MoreMenu({required this.post});
  @override
  Widget build(BuildContext context) => PopupMenuButton<String>(
    icon: const Icon(Icons.more_horiz, size: 16, color: WikColor.text3),
    color: WikColor.bg3,
    onSelected: (v) {/* delete post */},
    itemBuilder: (_) => [
      const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: WikColor.red))),
    ],
  );
}
