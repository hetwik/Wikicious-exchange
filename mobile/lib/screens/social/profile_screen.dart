import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:intl/intl.dart';
import '../../theme.dart';
import '../../providers/providers.dart';
import '../../providers/social_providers.dart';
import '../../widgets/social/post_card.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  final String address;
  const ProfileScreen({super.key, required this.address});
  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  bool _following = false;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final myAddress = ref.watch(authProvider).address?.toLowerCase();
    final isMe      = widget.address.toLowerCase() == myAddress;
    final profile   = ref.watch(profileProvider(widget.address));
    final posts     = ref.watch(userPostsProvider(widget.address));
    final rewards   = ref.watch(rewardsProvider(widget.address));

    return Scaffold(
      backgroundColor: WikColor.bg0,
      body: NestedScrollView(
        headerSliverBuilder: (ctx, _) => [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            backgroundColor: WikColor.bg0,
            flexibleSpace: FlexibleSpaceBar(
              background: profile.when(
                loading: () => const ColoredBox(color: WikColor.bg1),
                error:   (_, __) => const ColoredBox(color: WikColor.bg1),
                data: (p) => Stack(fit: StackFit.expand, children: [
                  // Banner
                  p.bannerArweave.isNotEmpty
                      ? CachedNetworkImage(imageUrl: p.bannerArweave.contains('ipfs')
                          ? 'https://cloudflare-ipfs.com/ipfs/${p.bannerArweave}'
                          : 'https://arweave.net/${p.bannerArweave}',
                          fit: BoxFit.cover)
                      : Container(color: WikColor.bg1),
                  // Gradient overlay
                  const DecoratedBox(decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter, end: Alignment.bottomCenter,
                      colors: [Colors.transparent, WikColor.bg0],
                    ),
                  )),
                ]),
              ),
            ),
          ),
        ],
        body: profile.when(
          loading: () => const Center(child: CircularProgressIndicator(color: WikColor.accent)),
          error:   (e, _) => Center(child: Text('Error: $e')),
          data: (p) => Column(children: [
            // Profile header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  // Avatar
                  Container(
                    width: 72, height: 72,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: WikColor.bg0, width: 3),
                      color: WikColor.bg3,
                    ),
                    child: ClipOval(child: p.avatarUrl.isNotEmpty
                        ? CachedNetworkImage(imageUrl: p.avatarUrl, fit: BoxFit.cover)
                        : const Icon(Icons.person, size: 40, color: WikColor.text3)),
                  ),
                  const Spacer(),
                  // Follow / Edit button
                  if (isMe)
                    OutlinedButton(
                      onPressed: () {/* edit profile */},
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: WikColor.border),
                        foregroundColor: WikColor.text1,
                      ),
                      child: const Text('Edit profile'),
                    )
                  else
                    ElevatedButton(
                      onPressed: _toggleFollow,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: _following ? WikColor.bg3 : WikColor.accent,
                        foregroundColor: _following ? WikColor.text1 : Colors.white,
                      ),
                      child: Text(_following ? 'Following' : 'Follow'),
                    ),
                ]),
                const SizedBox(height: 10),
                // Name + badges
                Row(children: [
                  Text(p.displayName.isNotEmpty ? p.displayName : '@${p.handle}',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: WikColor.text1)),
                  if (p.verified) ...[
                    const SizedBox(width: 4),
                    const Icon(Icons.verified, size: 16, color: WikColor.accent),
                  ],
                  if (p.traderVerified) ...[
                    const SizedBox(width: 4),
                    const Tooltip(
                      message: 'Active trader',
                      child: Icon(Icons.candlestick_chart, size: 14, color: WikColor.gold),
                    ),
                  ],
                ]),
                Text('@${p.handle}', style: WikText.label(size: 13)),
                if (p.bio.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(p.bio, style: const TextStyle(color: WikColor.text2, fontSize: 14, height: 1.4)),
                ],
                if (p.website.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Row(children: [
                    const Icon(Icons.link, size: 14, color: WikColor.accent),
                    const SizedBox(width: 4),
                    Text(p.website, style: const TextStyle(color: WikColor.accent, fontSize: 13)),
                  ]),
                ],
                const SizedBox(height: 10),
                // Stats row
                Row(children: [
                  _Stat(count: p.followingCount, label: 'Following',
                      onTap: () {/* show following */}),
                  const SizedBox(width: 20),
                  _Stat(count: p.followerCount,  label: 'Followers',
                      onTap: () {/* show followers */}),
                  const SizedBox(width: 20),
                  _Stat(count: p.postCount,      label: 'Posts'),
                ]),
                const SizedBox(height: 10),
                // WIK rewards row
                rewards.when(
                  loading: () => const SizedBox.shrink(),
                  error:   (_, __) => const SizedBox.shrink(),
                  data: (r) => _RewardsBar(rewards: r),
                ),
              ]),
            ),

            const SizedBox(height: 8),

            // Tabs
            TabBar(
              controller: _tabs,
              indicatorColor: WikColor.accent,
              labelColor: WikColor.text1,
              unselectedLabelColor: WikColor.text3,
              tabs: const [
                Tab(text: 'Posts'),
                Tab(text: 'Likes'),
                Tab(text: 'Trades'),
              ],
            ),

            // Tab content
            Expanded(
              child: TabBarView(
                controller: _tabs,
                children: [
                  // Posts tab
                  posts.when(
                    loading: () => const Center(child: CircularProgressIndicator(color: WikColor.accent)),
                    error:   (e, _) => Center(child: Text('Error: $e')),
                    data:    (list) => list.isEmpty
                        ? const Center(child: Text('No posts yet', style: TextStyle(color: WikColor.text3)))
                        : ListView.builder(
                            itemCount: list.length,
                            itemBuilder: (_, i) => PostCard(post: list[i]),
                          ),
                  ),
                  // Likes tab
                  const Center(child: Text('Liked posts', style: TextStyle(color: WikColor.text3))),
                  // Trades tab — trade posts only
                  posts.when(
                    loading: () => const SizedBox.shrink(),
                    error:   (_, __) => const SizedBox.shrink(),
                    data: (list) {
                      final trades = list.where((p) => p.isTradePost).toList();
                      return trades.isEmpty
                          ? Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
                              const Icon(Icons.candlestick_chart, size: 48, color: WikColor.text3),
                              const SizedBox(height: 12),
                              Text(isMe ? 'Share your trades from the Trade screen' : 'No shared trades yet',
                                  style: const TextStyle(color: WikColor.text3)),
                            ]))
                          : ListView.builder(
                              itemCount: trades.length,
                              itemBuilder: (_, i) => PostCard(post: trades[i]),
                            );
                    },
                  ),
                ],
              ),
            ),
          ]),
        ),
      ),
    );
  }

  void _toggleFollow() {
    setState(() => _following = !_following);
    // TODO: Call WikiSocial.follow/unfollow on-chain
  }
}

class _Stat extends StatelessWidget {
  final int count;
  final String label;
  final VoidCallback? onTap;
  const _Stat({required this.count, required this.label, this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: RichText(text: TextSpan(children: [
      TextSpan(text: NumberFormat.compact().format(count),
          style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
      TextSpan(text: ' $label', style: WikText.label(size: 13)),
    ])),
  );
}

class _RewardsBar extends StatelessWidget {
  final Map<String, dynamic> rewards;
  const _RewardsBar({required this.rewards});
  @override
  Widget build(BuildContext context) {
    final claimable = double.tryParse(rewards['claimable'] ?? '0') ?? 0;
    final earned    = double.tryParse(rewards['totalEarned'] ?? '0') ?? 0;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: WikColor.bg2,
        borderRadius: BorderRadius.circular(10),
        border: const Border.fromBorderSide(BorderSide(color: WikColor.border)),
      ),
      child: Row(children: [
        const Icon(Icons.token, size: 16, color: WikColor.gold),
        const SizedBox(width: 6),
        RichText(text: TextSpan(children: [
          TextSpan(text: '${earned.toStringAsFixed(1)} WIK ', style: const TextStyle(color: WikColor.gold, fontWeight: FontWeight.w700)),
          TextSpan(text: 'earned total', style: WikText.label(size: 12)),
        ])),
        const Spacer(),
        if (claimable > 0)
          GestureDetector(
            onTap: () {/* claim WIK */},
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: WikColor.gold.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text('Claim ${claimable.toStringAsFixed(1)} WIK',
                  style: const TextStyle(color: WikColor.gold, fontSize: 11, fontWeight: FontWeight.w700)),
            ),
          ),
      ]),
    );
  }
}
