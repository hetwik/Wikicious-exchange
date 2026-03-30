import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class CopyTradingScreen extends ConsumerStatefulWidget {
  const CopyTradingScreen({super.key});
  @override ConsumerState<CopyTradingScreen> createState() => _State();
}

class _State extends ConsumerState<CopyTradingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  @override void initState() { super.initState(); _tabs = TabController(length: 2, vsync: this); }
  @override void dispose() { _tabs.dispose(); super.dispose(); }

  static const _leaders = [
    ('CryptoPilot',  '0x4f2a…', '+284%', '3mo', '12.4%', '4,284', '0.82'),
    ('AlphaWhale',   '0x7b3c…', '+182%', '6mo', '8.2%',  '8,124', '0.74'),
    ('DeltaNeutral', '0x2e1d…', '+124%', '1y',  '6.8%',  '2,841', '0.68'),
    ('MomentumBot',  '0x9a4f…', '+98%',  '3mo', '14.2%', '1,482', '0.61'),
  ];

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Copy Trading'),
      bottom: TabBar(controller: _tabs, indicatorColor: WikColor.accent, labelColor: WikColor.accent,
        unselectedLabelColor: WikColor.text3,
        tabs: const [Tab(text: 'Leaderboard'), Tab(text: 'My Copies')]),
    ),
    body: TabBarView(controller: _tabs, children: [
      ListView.separated(
        padding: const EdgeInsets.all(12),
        itemCount: _leaders.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final l = _leaders[i];
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
            child: Column(children: [
              Row(children: [
                Container(width: 42, height: 42, decoration: BoxDecoration(
                  color: WikColor.accent.withOpacity(0.15), shape: BoxShape.circle,
                  border: Border.all(color: WikColor.accent.withOpacity(0.3))),
                  child: Center(child: Text('${i+1}', style: WikText.price(size: 16, color: WikColor.accent)))),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(l.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 14)),
                  Text('${l.$2} · ${l.$4}', style: const TextStyle(color: WikColor.text3, fontSize: 11)),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text(l.$3, style: const TextStyle(color: WikColor.green, fontFamily: 'SpaceMono', fontSize: 18, fontWeight: FontWeight.w900)),
                  Text('${l.$5} DD', style: const TextStyle(color: WikColor.red, fontSize: 11)),
                ]),
              ]),
              const SizedBox(height: 10),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                _badge('Copiers: ${l.$6}', WikColor.accent),
                _badge('Win rate: ${l.$7}', WikColor.green),
                ElevatedButton(
                  onPressed: () => _showCopyDialog(context, l.$1),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: WikColor.accent, foregroundColor: Colors.white,
                    minimumSize: const Size(80, 32),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Copy', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                ),
              ]),
            ]),
          );
        },
      ),
      Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.people_outline, size: 64, color: WikColor.text3),
        const SizedBox(height: 12),
        const Text('No active copy positions', style: TextStyle(color: WikColor.text2, fontSize: 16, fontWeight: FontWeight.w700)),
        const SizedBox(height: 6),
        const Text('Pick a leader from the leaderboard', style: TextStyle(color: WikColor.text3, fontSize: 13)),
      ])),
    ]),
  );

  Widget _badge(String text, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
    child: Text(text, style: TextStyle(color: c, fontSize: 11, fontWeight: FontWeight.w600)),
  );

  void _showCopyDialog(BuildContext ctx, String name) => showModalBottomSheet(
    context: ctx, backgroundColor: WikColor.bg1, isScrollControlled: true,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => Padding(
      padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(ctx).viewInsets.bottom + 32),
      child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Copy $name', style: const TextStyle(color: WikColor.text1, fontSize: 18, fontWeight: FontWeight.w800)),
        const SizedBox(height: 16),
        const TextField(keyboardType: TextInputType.number, decoration: InputDecoration(labelText: 'Copy Amount (USDC)', suffixText: 'USDC')),
        const SizedBox(height: 10),
        const TextField(keyboardType: TextInputType.number, decoration: InputDecoration(labelText: 'Max drawdown stop (%)', suffixText: '%')),
        const SizedBox(height: 20),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: () { Navigator.pop(ctx);
            ScaffoldMessenger.of(ctx).showSnackBar(SnackBar(
              content: Text('✅ Now copying $name'),
              backgroundColor: WikColor.green, behavior: SnackBarBehavior.floating)); },
          style: ElevatedButton.styleFrom(backgroundColor: WikColor.green, foregroundColor: Colors.black),
          child: Text('Start Copying $name', style: const TextStyle(fontWeight: FontWeight.w900)),
        )),
      ]),
    ),
  );
}
