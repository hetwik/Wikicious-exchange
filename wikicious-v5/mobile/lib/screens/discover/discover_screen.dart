import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Discover Screen — feature hub, replaces static nav with searchable discovery
/// Every new feature is browsable from here. Quick actions + category cards.
class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});
  @override State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> {
  String _search = '';
  String _selectedCat = 'All';

  static const _cats = ['All','Trade','Earn','Bots','Prop','Growth','Wallet','Protocol'];

  static const _features = [
    _F('⚡','Perpetuals','Trade','Up to 1000× on 241 markets','/trade','1000×',Color(0xFF00F0A8)),
    _F('💱','Forex 2000×','Trade','EUR/USD, XAU/USD, commodities','/forex','2000×',Color(0xFFFFB020)),
    _F('🌑','Dark Pool','Trade','Private trades, no front-running','/dark-pool','NEW',Color(0xFF7C4FFF)),
    _F('⚙️','Strategy Orders','Trade','IF/THEN automated rules','/conditional-orders','NEW',Color(0xFF00F0A8)),
    _F('🔒','veWIK Staking','Earn','18.5% APR in USDC weekly','/staking','18.5%',Color(0xFF0075FF)),
    _F('🛡','Backstop Vault','Earn','15-25% APY, 7-day exit','/strategy-vaults','25%',Color(0xFFFFB020)),
    _F('⚖️','Delta-Neutral LP','Earn','~18% APY, zero price risk','/managed-vaults','LOW RISK',Color(0xFF00C8FF)),
    _F('💵','Real Yield LP','Earn','100% USDC fees to LPs','/real-yield-lp','NEW',Color(0xFF00F0A8)),
    _F('🔀','Yield Aggregator','Earn','Best APY auto-router','/yield-aggregator','NEW',Color(0xFF00F0A8)),
    _F('🏛','Structured Products','Earn','Covered call vaults weekly','/structured-product','NEW',Color(0xFF7C4FFF)),
    _F('🤖','Trading Bots','Bots','Grid/Funding/Trend/MR bots','/bots','4 STRATS',Color(0xFF00F0A8)),
    _F('👥','Copy Trading','Bots','Mirror top traders','/copy-trading','SOCIAL',Color(0xFFFF5C35)),
    _F('🏆','Prop Challenge','Prop','Trade up to \$200K funded','/prop','UP TO \$200K',Color(0xFFFFB020)),
    _F('🛡','Liq Protection','Prop','Auto-add margin subscription','/liq-protection','NEW',Color(0xFF00F0A8)),
    _F('⭐','Season XP','Growth','Points, streaks, win WIK','/season-points','S1',Color(0xFFFFB020)),
    _F('🎁','Affiliate','Growth','20-45% revenue share','/affiliate','45%',Color(0xFF00F0A8)),
    _F('💎','Revenue NFT','Growth','0.01% fees forever','/revenue-share-nft','\$500',Color(0xFFFFB020)),
    _F('💰','Multi-Collateral','Wallet','BTC/ETH/ARB as margin','/multi-collateral','NEW',Color(0xFF00F0A8)),
    _F('📂','Sub-Accounts','Wallet','10 isolated strategies','/sub-accounts','NEW',Color(0xFF0075FF)),
    _F('📱','Telegram Bot','Wallet','Trade from /chat','/telegram-gateway','NEW',Color(0xFF0075FF)),
    _F('⚡','API Access','Wallet','Programmatic trading','/api-gateway','PRO',Color(0xFF00C8FF)),
    _F('💼','Portfolio','Wallet','Complete net worth view','/portfolio-tracker','NEW',Color(0xFF7C4FFF)),
    _F('📊','Analytics','Protocol','DeFi Llama compatible stats','/revenue-dashboard','PUBLIC',Color(0xFF00F0A8)),
    _F('🔓','Vesting Market','Protocol','Buy locked WIK at discount','/vesting-market','NEW',Color(0xFFFFB020)),
  ];

  static const _quickActions = [
    _QA('📈','Trade BTC','1000× perp','/trade',Color(0xFF00F0A8)),
    _QA('💰','Earn Yield','Up to 25%','/yield-aggregator',Color(0xFFFFB020)),
    _QA('🏆','Prop Challenge','Win \$200K','/prop',Color(0xFFFFB020)),
    _QA('🤖','Start Bot','24/7 auto','/bots',Color(0xFF0075FF)),
    _QA('🎁','Refer & Earn','Up to 45%','/affiliate',Color(0xFF00F0A8)),
    _QA('🌑','Dark Pool','Private','/dark-pool',Color(0xFF7C4FFF)),
    _QA('💱','Forex','2000×','/forex',Color(0xFFFFB020)),
    _QA('💼','Portfolio','Net worth','/portfolio-tracker',Color(0xFF7C4FFF)),
  ];

  List<_F> get _filtered => _features.where((f) {
    final matchCat = _selectedCat == 'All' || f.cat == _selectedCat;
    final matchSearch = _search.isEmpty ||
        f.name.toLowerCase().contains(_search.toLowerCase()) ||
        f.desc.toLowerCase().contains(_search.toLowerCase());
    return matchCat && matchSearch;
  }).toList();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030810),
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            // Search bar
            SliverToBoxAdapter(child: Padding(
              padding: const EdgeInsets.fromLTRB(16,12,16,0),
              child: TextField(
                onChanged: (v) => setState(() => _search = v),
                style: const TextStyle(color: Color(0xFFE8F4FF), fontSize: 14),
                decoration: InputDecoration(
                  hintText: 'Search features, markets, strategies...',
                  hintStyle: const TextStyle(color: Color(0xFF4E6E90), fontSize: 13),
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF4E6E90), size: 20),
                  filled: true, fillColor: const Color(0xFF091220),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF152840))),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF152840))),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12),
                    borderSide: const BorderSide(color: Color(0xFF0075FF))),
                  contentPadding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            )),

            // Hero stats
            if (_search.isEmpty && _selectedCat == 'All')
              SliverToBoxAdapter(child: Padding(
                padding: const EdgeInsets.fromLTRB(16,14,16,0),
                child: Container(
                  padding: const EdgeInsets.all(18),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(colors: [const Color(0xFF091220), const Color(0xFF060C18)]),
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: const Color(0xFF152840)),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Welcome to Wikicious V5',
                      style: TextStyle(fontFamily: 'Syne', fontSize: 20, fontWeight: FontWeight.w800,
                        color: Color(0xFFE8F4FF))),
                    const SizedBox(height: 6),
                    const Text('129 contracts · 295 markets · Every yield strategy in DeFi',
                      style: TextStyle(fontSize: 12, color: Color(0xFF4E6E90))),
                    const SizedBox(height: 14),
                    Row(children: [
                      _statBadge('129', 'CONTRACTS'),
                      const SizedBox(width: 20),
                      _statBadge('295', 'MARKETS'),
                      const SizedBox(width: 20),
                      _statBadge('25%', 'MAX APY'),
                    ]),
                  ]),
                ),
              )),

            // Quick actions
            if (_search.isEmpty && _selectedCat == 'All') ...[
              const SliverToBoxAdapter(child: Padding(
                padding: EdgeInsets.fromLTRB(16,18,16,8),
                child: Text('⚡ Quick Actions',
                  style: TextStyle(fontFamily: 'Syne', fontSize: 14, fontWeight: FontWeight.w800,
                    color: Color(0xFFE8F4FF))),
              )),
              SliverToBoxAdapter(child: SizedBox(
                height: 90,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: _quickActions.length,
                  itemBuilder: (ctx, i) {
                    final q = _quickActions[i];
                    return GestureDetector(
                      onTap: () => context.push(q.route),
                      child: Container(
                        width: 80, margin: const EdgeInsets.only(right: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF0B1525),
                          borderRadius: BorderRadius.circular(13),
                          border: Border.all(color: const Color(0xFF152840)),
                        ),
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Text(q.icon, style: const TextStyle(fontSize: 22)),
                          const SizedBox(height: 5),
                          Text(q.title, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700,
                            color: Color(0xFFE8F4FF)), textAlign: TextAlign.center),
                          Text(q.sub, style: TextStyle(fontSize: 9, color: q.color, fontWeight: FontWeight.w600)),
                        ]),
                      ),
                    );
                  },
                ),
              )),
            ],

            // Category filter
            SliverToBoxAdapter(child: SizedBox(
              height: 44,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.fromLTRB(16, 10, 16, 0),
                itemCount: _cats.length,
                itemBuilder: (ctx, i) {
                  final selected = _selectedCat == _cats[i];
                  return GestureDetector(
                    onTap: () => setState(() => _selectedCat = _cats[i]),
                    child: Container(
                      margin: const EdgeInsets.only(right: 8),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                      decoration: BoxDecoration(
                        color: selected ? const Color(0xFF0075FF) : const Color(0xFF0B1525),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: selected ? const Color(0xFF0075FF) : const Color(0xFF152840)),
                      ),
                      child: Text(_cats[i],
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700,
                          color: selected ? Colors.white : const Color(0xFF4E6E90))),
                    ),
                  );
                },
              ),
            )),

            // Feature grid
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16,12,16,100),
              sliver: SliverGrid(
                delegate: SliverChildBuilderDelegate((ctx, i) {
                  final f = _filtered[i];
                  return GestureDetector(
                    onTap: () => context.push(f.route),
                    child: Container(
                      padding: const EdgeInsets.all(13),
                      decoration: BoxDecoration(
                        color: const Color(0xFF0B1525),
                        borderRadius: BorderRadius.circular(13),
                        border: Border.all(color: f.color.withOpacity(.15)),
                      ),
                      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Row(children: [
                          Container(width: 34, height: 34, decoration: BoxDecoration(
                            color: f.color.withOpacity(.15),
                            borderRadius: BorderRadius.circular(9),
                            border: Border.all(color: f.color.withOpacity(.3)),
                          ), child: Center(child: Text(f.icon, style: const TextStyle(fontSize: 16)))),
                          const Spacer(),
                          Container(padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                            decoration: BoxDecoration(
                              color: f.color.withOpacity(.15), borderRadius: BorderRadius.circular(100),
                              border: Border.all(color: f.color.withOpacity(.3)),
                            ),
                            child: Text(f.tag, style: TextStyle(fontSize: 8, fontWeight: FontWeight.w700,
                              color: f.color, fontFamily: 'JetBrainsMono'))),
                        ]),
                        const SizedBox(height: 9),
                        Text(f.name, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700,
                          color: Color(0xFFE8F4FF))),
                        const SizedBox(height: 3),
                        Text(f.desc, style: const TextStyle(fontSize: 10, color: Color(0xFF4E6E90)),
                          maxLines: 2, overflow: TextOverflow.ellipsis),
                      ]),
                    ),
                  );
                }, childCount: _filtered.length),
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2, mainAxisSpacing: 10, crossAxisSpacing: 10, childAspectRatio: 1.3),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _statBadge(String v, String l) => Column(children: [
    Text(v, style: const TextStyle(fontFamily: 'JetBrainsMono', fontSize: 18,
      fontWeight: FontWeight.w700, color: Color(0xFF00F0A8))),
    Text(l, style: const TextStyle(fontSize: 8, color: Color(0xFF4E6E90),
      fontWeight: FontWeight.w700, letterSpacing: .5)),
  ]);
}

class _F {
  final String icon, name, cat, desc, route, tag;
  final Color color;
  const _F(this.icon, this.name, this.cat, this.desc, this.route, this.tag, this.color);
}

class _QA {
  final String icon, title, sub, route;
  final Color color;
  const _QA(this.icon, this.title, this.sub, this.route, this.color);
}
