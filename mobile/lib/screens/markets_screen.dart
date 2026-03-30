import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../providers/providers.dart';
import '../../services/api_service.dart';

// ── Market model ──────────────────────────────────────────────────────────
class MarketInfo {
  final int    id;
  final String symbol, baseAsset, quoteAsset, category;
  final double price, change24h, spread;
  final int    maxLeverage;
  final bool   marketOpen;
  final String oracleSource;
  const MarketInfo({
    required this.id, required this.symbol, required this.baseAsset,
    required this.quoteAsset, required this.category, required this.price,
    required this.change24h, required this.spread, required this.maxLeverage,
    required this.marketOpen, required this.oracleSource,
  });
  factory MarketInfo.fromJson(Map<String, dynamic> j) => MarketInfo(
    id:           j['id'] ?? 0,
    symbol:       j['symbol'] ?? '',
    baseAsset:    j['baseAsset'] ?? '',
    quoteAsset:   j['quoteAsset'] ?? '',
    category:     j['categoryName'] ?? 'crypto',
    price:        (j['price'] ?? 0).toDouble(),
    change24h:    (j['change24h'] ?? 0).toDouble(),
    spread:       (j['spreadBps'] ?? 0).toDouble() / 100,
    maxLeverage:  j['maxLeverage'] ?? 10,
    marketOpen:   j['marketOpen'] ?? true,
    oracleSource: j['oracleSource'] ?? 'Chainlink',
  );
}

// Providers
final allMarketsProvider = FutureProvider<List<MarketInfo>>((ref) async {
  final r = await api.get('/api/markets/all');
  return (r['markets'] as List).map((m) => MarketInfo.fromJson(m)).toList();
});

final marketSearchProvider = StateProvider<String>((ref) => '');
final selectedCategoryProvider = StateProvider<String>((ref) => 'All');

// ── Markets Screen ────────────────────────────────────────────────────────
class MarketsScreen extends ConsumerStatefulWidget {
  const MarketsScreen({super.key});
  @override
  ConsumerState<MarketsScreen> createState() => _MarketsScreenState();
}

class _MarketsScreenState extends ConsumerState<MarketsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _searchCtrl = TextEditingController();

  static const _categories = [
    ('All',        '🌐'),
    ('Crypto',     '₿'),
    ('Forex Major','💱'),
    ('Forex Minor','🔀'),
    ('Forex Exotic','🌏'),
    ('Metals',     '🥇'),
    ('Commodities','🛢'),
  ];

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: _categories.length, vsync: this);
    _tabs.addListener(() {
      ref.read(selectedCategoryProvider.notifier).state = _categories[_tabs.index].$1;
    });
  }

  @override
  void dispose() { _tabs.dispose(); _searchCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WikColor.bg0,
      appBar: AppBar(
        backgroundColor: WikColor.bg0,
        title: const Text('Markets'),
        actions: [
          IconButton(
            icon: const Icon(Icons.tune, color: WikColor.text2),
            onPressed: () => _showFilter(context),
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(90),
          child: Column(children: [
            // Search bar
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
              child: TextField(
                controller: _searchCtrl,
                style: const TextStyle(color: WikColor.text1),
                decoration: InputDecoration(
                  hintText: 'Search EUR/USD, BTC, gold...',
                  hintStyle: const TextStyle(color: WikColor.text3),
                  prefixIcon: const Icon(Icons.search, color: WikColor.text3, size: 18),
                  filled: true, fillColor: WikColor.bg2,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                  suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(icon: const Icon(Icons.clear, size: 16, color: WikColor.text3),
                        onPressed: () { _searchCtrl.clear(); ref.read(marketSearchProvider.notifier).state = ''; })
                    : null,
                ),
                onChanged: (v) => ref.read(marketSearchProvider.notifier).state = v,
              ),
            ),
            // Category tabs
            TabBar(
              controller: _tabs,
              isScrollable: true,
              indicatorColor: WikColor.accent,
              labelColor: WikColor.accent,
              unselectedLabelColor: WikColor.text3,
              labelStyle: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700),
              tabAlignment: TabAlignment.start,
              tabs: _categories.map((c) => Tab(text: '${c.$2} ${c.$1}')).toList(),
            ),
          ]),
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: _categories.map((c) => _MarketList(category: c.$1)).toList(),
      ),
    );
  }

  void _showFilter(BuildContext ctx) {
    showModalBottomSheet(context: ctx, backgroundColor: WikColor.bg1,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => const _FilterSheet(),
    );
  }
}

// ── Market list per tab ───────────────────────────────────────────────────
class _MarketList extends ConsumerWidget {
  final String category;
  const _MarketList({required this.category});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final markets = ref.watch(allMarketsProvider);
    final search  = ref.watch(marketSearchProvider).toLowerCase();

    return markets.when(
      loading: () => const _MarketListSkeleton(),
      error:   (e, _) => Center(child: Text('$e', style: const TextStyle(color: WikColor.red))),
      data: (all) {
        final filtered = all.where((m) {
          final catMatch = category == 'All' || m.category.toLowerCase().contains(category.toLowerCase());
          final q        = search.isEmpty || m.symbol.toLowerCase().contains(search)
              || m.baseAsset.toLowerCase().contains(search)
              || m.quoteAsset.toLowerCase().contains(search);
          return catMatch && q;
        }).toList();

        if (filtered.isEmpty) return _EmptyState(search: search);

        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: filtered.length,
          itemBuilder: (_, i) => _MarketRow(market: filtered[i]),
        );
      },
    );
  }
}

// ── Market row ────────────────────────────────────────────────────────────
class _MarketRow extends StatelessWidget {
  final MarketInfo market;
  const _MarketRow({required this.market});

  Color get _changeColor => market.change24h >= 0 ? WikColor.green : WikColor.red;
  String get _changeStr  => '${market.change24h >= 0 ? '+' : ''}${market.change24h.toStringAsFixed(2)}%';

  String get _categoryIcon {
    final c = market.category.toLowerCase();
    if (c.contains('crypto'))    return '₿';
    if (c.contains('major'))     return '💱';
    if (c.contains('minor'))     return '🔀';
    if (c.contains('exotic'))    return '🌏';
    if (c.contains('metal'))     return '🥇';
    if (c.contains('commodity')) return '🛢';
    return '📊';
  }

  String _formatPrice(double p, String sym) {
    if (sym.contains('JPY') || sym.contains('KRW') || sym.contains('IDR') ||
        sym.contains('HUF') || sym.contains('NGN') || sym.contains('PKR') ||
        sym.contains('RUB') || sym.contains('THB') || sym.contains('PHP'))
      return p.toStringAsFixed(2);
    if (sym.contains('BTC'))  return p.toStringAsFixed(0);
    if (sym.contains('XAU'))  return p.toStringAsFixed(2);
    return p.toStringAsFixed(4);
  }

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () => context.push('/trade/${market.id}'),
    child: Container(
      margin: const EdgeInsets.only(bottom: 6),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: WikColor.bg1,
        borderRadius: BorderRadius.circular(12),
        border: const Border.fromBorderSide(BorderSide(color: WikColor.border)),
      ),
      child: Row(children: [
        // Icon + market status indicator
        Stack(children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(color: WikColor.bg3, borderRadius: BorderRadius.circular(12)),
            child: Center(child: Text(_categoryIcon, style: const TextStyle(fontSize: 20))),
          ),
          Positioned(
            right: 0, bottom: 0,
            child: Container(
              width: 10, height: 10,
              decoration: BoxDecoration(
                color: market.marketOpen ? WikColor.green : WikColor.red,
                shape: BoxShape.circle,
                border: Border.all(color: WikColor.bg1, width: 1.5),
              ),
            ),
          ),
        ]),
        const SizedBox(width: 12),

        // Symbol + meta
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(market.symbol, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
            const SizedBox(width: 6),
            _LeverageBadge(market.maxLeverage),
            if (!market.marketOpen) ...[
              const SizedBox(width: 4),
              _ClosedBadge(),
            ],
          ]),
          const SizedBox(height: 2),
          Row(children: [
            Text(_oracleLabel, style: WikText.label(size: 10)),
            const SizedBox(width: 6),
            Text('Spread: ${market.spread.toStringAsFixed(1)}bp', style: WikText.label(size: 10)),
          ]),
        ])),

        // Price + change
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(
            _formatPrice(market.price, market.symbol),
            style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14, fontFamily: 'SpaceMono'),
          ),
          const SizedBox(height: 2),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
            decoration: BoxDecoration(
              color: _changeColor.withOpacity(0.12),
              borderRadius: BorderRadius.circular(4),
            ),
            child: Text(_changeStr, style: TextStyle(color: _changeColor, fontSize: 11, fontWeight: FontWeight.w700)),
          ),
        ]),

        const SizedBox(width: 8),
        const Icon(Icons.chevron_right, color: WikColor.text3, size: 18),
      ]),
    ),
  );

  String get _oracleLabel {
    switch(market.oracleSource) {
      case 'Chainlink': return '⛓ Chainlink';
      case 'Pyth':      return '🔮 Pyth';
      case 'Guardian':  return '🛡 Guardian';
      case 'Derived':   return '🔗 Derived';
      default:          return market.oracleSource;
    }
  }
}

class _LeverageBadge extends StatelessWidget {
  final int leverage;
  const _LeverageBadge(this.leverage);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
    decoration: BoxDecoration(color: WikColor.accentBg, borderRadius: BorderRadius.circular(3)),
    child: Text('${leverage}x', style: const TextStyle(color: WikColor.accent, fontSize: 9, fontWeight: FontWeight.w700)),
  );
}

class _ClosedBadge extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
    decoration: BoxDecoration(color: WikColor.redBg, borderRadius: BorderRadius.circular(3)),
    child: const Text('CLOSED', style: TextStyle(color: WikColor.red, fontSize: 8, fontWeight: FontWeight.w700)),
  );
}

// ── Market stats header (shown above list) ────────────────────────────────
class _MarketStatsHeader extends StatelessWidget {
  final List<MarketInfo> markets;
  const _MarketStatsHeader({required this.markets});
  @override
  Widget build(BuildContext context) {
    final open   = markets.where((m) => m.marketOpen).length;
    final rising = markets.where((m) => m.change24h > 0).length;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      color: WikColor.bg1,
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
        _StatChip('${markets.length}', 'Markets', WikColor.text1),
        _StatChip('$open', 'Open', WikColor.green),
        _StatChip('$rising', 'Rising', WikColor.green),
        _StatChip('${markets.length - rising}', 'Falling', WikColor.red),
      ]),
    );
  }
}

class _StatChip extends StatelessWidget {
  final String value, label;
  final Color color;
  const _StatChip(this.value, this.label, this.color);
  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 15)),
    Text(label, style: WikText.label(size: 10)),
  ]);
}

// ── Filter sheet ──────────────────────────────────────────────────────────
class _FilterSheet extends StatefulWidget {
  const _FilterSheet();
  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  bool _openOnly  = false;
  bool _chainlinkOnly = false;
  String _sortBy  = 'volume';

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(24),
    child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Filter & Sort', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 16)),
      const SizedBox(height: 16),
      _FilterToggle('Show open markets only', _openOnly, (v) => setState(() => _openOnly = v)),
      _FilterToggle('Chainlink oracle only', _chainlinkOnly, (v) => setState(() => _chainlinkOnly = v)),
      const SizedBox(height: 12),
      const Text('Sort by', style: TextStyle(color: WikColor.text2, fontSize: 13)),
      const SizedBox(height: 8),
      Wrap(spacing: 8, children: [
        for (final s in ['volume', 'change', 'price', 'spread'])
          ChoiceChip(
            label: Text(s),
            selected: _sortBy == s,
            onSelected: (_) => setState(() => _sortBy = s),
            selectedColor: WikColor.accentBg,
            labelStyle: TextStyle(color: _sortBy == s ? WikColor.accent : WikColor.text2, fontSize: 12),
          ),
      ]),
      const SizedBox(height: 16),
      SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: () => Navigator.pop(context),
        child: const Text('Apply'),
      )),
    ]),
  );
}

class _FilterToggle extends StatelessWidget {
  final String label;
  final bool value;
  final ValueChanged<bool> onChanged;
  const _FilterToggle(this.label, this.value, this.onChanged);
  @override
  Widget build(BuildContext context) => Row(children: [
    Expanded(child: Text(label, style: const TextStyle(color: WikColor.text2, fontSize: 13))),
    Switch(value: value, onChanged: onChanged, activeColor: WikColor.accent),
  ]);
}

// ── Skeleton + empty ──────────────────────────────────────────────────────
class _MarketListSkeleton extends StatelessWidget {
  const _MarketListSkeleton();
  @override
  Widget build(BuildContext context) => ListView.builder(
    padding: const EdgeInsets.all(12),
    itemCount: 12,
    itemBuilder: (_, __) => Container(
      margin: const EdgeInsets.only(bottom: 6), height: 68,
      decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(12)),
    ),
  );
}

class _EmptyState extends StatelessWidget {
  final String search;
  const _EmptyState({required this.search});
  @override
  Widget build(BuildContext context) => Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
    const Text('📊', style: TextStyle(fontSize: 40)),
    const SizedBox(height: 12),
    Text(search.isEmpty ? 'No markets in this category' : 'No results for "$search"',
        style: const TextStyle(color: WikColor.text2)),
  ]));
}
