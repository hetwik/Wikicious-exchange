import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class RevenueSplitterScreen extends ConsumerStatefulWidget {
  const RevenueSplitterScreen({super.key});
  @override ConsumerState<RevenueSplitterScreen> createState() => _State();
}

class _State extends ConsumerState<RevenueSplitterScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;

  static const _splits = [
    ('veWIK Stakers', 40, WikColor.accent,  '\$242,496'),
    ('Protocol POL',  30, WikColor.green,   '\$181,872'),
    ('Treasury/Dev',  20, WikColor.gold,    '\$121,248'),
    ('Safety Module', 10, WikColor.red,     '\$60,624'),
  ];

  static const _sources = [
    ('WikiPerp fees',        '\$242,496', '40.0%'),
    ('Forex / Metals',       '\$90,936',  '15.0%'),
    ('Liquidations',         '\$60,624',  '10.0%'),
    ('Bridge (LZ)',          '\$48,499',  '8.0%'),
    ('Lending spread',       '\$42,437',  '7.0%'),
    ('IEO Platform',         '\$30,312',  '5.0%'),
    ('Spot trading',         '\$24,250',  '4.0%'),
    ('Paymaster markup',     '\$18,187',  '3.0%'),
    ('Zap fees',             '\$12,125',  '2.0%'),
    ('Swap insurance',       '\$12,125',  '2.0%'),
    ('36 more streams',      '\$24,249',  '4.0%'),
  ];

  @override void initState() { super.initState(); _tabs = TabController(length: 3, vsync: this); }
  @override void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Revenue Splitter'),
      actions: [Padding(padding: const EdgeInsets.only(right: 14),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('MONTHLY', style: TextStyle(color: WikColor.text3, fontSize: 9, fontWeight: FontWeight.w700)),
          const Text('\$606K', style: TextStyle(color: WikColor.gold, fontFamily: 'SpaceMono', fontSize: 15, fontWeight: FontWeight.w900)),
        ]))],
      bottom: TabBar(controller: _tabs, indicatorColor: WikColor.accent, labelColor: WikColor.accent,
        unselectedLabelColor: WikColor.text3,
        tabs: const [Tab(text: 'Live Flow'), Tab(text: 'Sources'), Tab(text: 'History')]),
    ),
    body: TabBarView(controller: _tabs, children: [_buildFlow(), _buildSources(), _buildHistory()]),
  );

  Widget _buildFlow() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(14), border: Border.all(color: WikColor.border)),
        child: Column(children: [
          const Text('40 / 30 / 20 / 10', style: TextStyle(color: WikColor.text1, fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          const Text('Automated on-chain distribution', style: TextStyle(color: WikColor.text3, fontSize: 12)),
          const SizedBox(height: 16),
          Row(children: _splits.map((s) => Expanded(child: Container(
            margin: const EdgeInsets.symmetric(horizontal: 3),
            height: 6,
            decoration: BoxDecoration(color: s.$3, borderRadius: BorderRadius.circular(3)),
          ))).toList()),
          const SizedBox(height: 16),
          ..._splits.map((s) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Column(children: [
              Row(children: [
                Container(width: 10, height: 10, decoration: BoxDecoration(color: s.$3, shape: BoxShape.circle)),
                const SizedBox(width: 8),
                Expanded(child: Text(s.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 13))),
                Text('${s.$2}%', style: TextStyle(color: s.$3, fontWeight: FontWeight.w800, fontSize: 13)),
                const SizedBox(width: 12),
                Text(s.$4, style: const TextStyle(color: WikColor.text1, fontFamily: 'SpaceMono', fontSize: 12)),
              ]),
              const SizedBox(height: 4),
              ClipRRect(borderRadius: BorderRadius.circular(3),
                child: LinearProgressIndicator(value: s.$2 / 100, backgroundColor: WikColor.bg3,
                  valueColor: AlwaysStoppedAnimation<Color>(s.$3), minHeight: 5)),
            ]),
          )),
        ]),
      ),
      const SizedBox(height: 14),
      Row(children: [
        Expanded(child: StatTile(label: 'Total Sources', value: '46', sub: 'revenue streams', valueColor: WikColor.accent)),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Annual Run-rate', value: '\$7.3M', valueColor: WikColor.gold)),
      ]),
    ]),
  );

  Widget _buildSources() => ListView.separated(
    padding: const EdgeInsets.all(12),
    itemCount: _sources.length,
    separatorBuilder: (_, __) => const Divider(height: 1),
    itemBuilder: (_, i) {
      final s = _sources[i];
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Row(children: [
          Expanded(child: Text(s.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w600, fontSize: 13))),
          Text(s.$2, style: const TextStyle(color: WikColor.green, fontFamily: 'SpaceMono', fontSize: 12, fontWeight: FontWeight.w700)),
          const SizedBox(width: 16),
          SizedBox(width: 48, child: Text(s.$3, style: const TextStyle(color: WikColor.text3, fontSize: 11), textAlign: TextAlign.right)),
        ]),
      );
    },
  );

  Widget _buildHistory() {
    final months = ['Mar 2026', 'Feb 2026', 'Jan 2026', 'Dec 2025'];
    final values = [606240.0, 539400.0, 480200.0, 420100.0];
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: months.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) => Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
        child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(months[i], style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
            Text('\$${(values[i] / 1000).toStringAsFixed(0)}K',
              style: const TextStyle(color: WikColor.green, fontFamily: 'SpaceMono', fontSize: 16, fontWeight: FontWeight.w900)),
          ]),
          const SizedBox(height: 8),
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            ..._splits.map((s) => Column(children: [
              Text(s.$1.split(' ').first, style: WikText.label()),
              const SizedBox(height: 3),
              Text('\$${((values[i] * s.$2 / 100) / 1000).toStringAsFixed(0)}K',
                style: TextStyle(color: s.$3, fontFamily: 'SpaceMono', fontSize: 11, fontWeight: FontWeight.w700)),
            ])),
          ]),
        ]),
      ),
    );
  }
}
