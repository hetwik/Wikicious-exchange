// ═══════════════════════════════════════════════════════════════
//  lending_screen.dart
// ═══════════════════════════════════════════════════════════════
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class LendingScreen extends ConsumerStatefulWidget {
  const LendingScreen({super.key});
  @override
  ConsumerState<LendingScreen> createState() => _LendingScreenState();
}

class _LendingScreenState extends ConsumerState<LendingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  String? _selectedAction; // 'supply' | 'borrow'
  String? _selectedMarket;

  @override
  void initState() { super.initState(); _tabs = TabController(length: 2, vsync: this); }
  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  static const _markets = [
    (sym: 'USDC', supplyApr: '4.52%', borrowApr: '7.18%', util: 0.62, cf: '85%', icon: '💵'),
    (sym: 'WETH', supplyApr: '2.11%', borrowApr: '4.82%', util: 0.43, cf: '80%', icon: 'Ξ'),
    (sym: 'WBTC', supplyApr: '1.84%', borrowApr: '3.91%', util: 0.38, cf: '75%', icon: '₿'),
    (sym: 'ARB',  supplyApr: '8.24%', borrowApr: '14.10%',util: 0.58, cf: '70%', icon: 'A'),
    (sym: 'WIK',  supplyApr: '18.5%', borrowApr: '—',     util: 0.0,  cf: '60%', icon: 'W'),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lend & Borrow'),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: WikColor.accent,
          labelColor: WikColor.accent,
          unselectedLabelColor: WikColor.text3,
          tabs: const [Tab(text: 'Markets'), Tab(text: 'My Positions')],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [_buildMarkets(), _buildPositions()],
      ),
    );
  }

  Widget _buildMarkets() => Column(
    children: [
      // Health factor banner
      Container(
        margin: const EdgeInsets.all(12),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(color: WikColor.greenBg, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.green.withOpacity(0.3))),
        child: Row(children: [
          const Icon(Icons.shield_outlined, color: WikColor.green, size: 18),
          const SizedBox(width: 8),
          const Text('Health Factor ', style: TextStyle(color: WikColor.text2, fontSize: 12)),
          const Text('∞  (no borrows)', style: TextStyle(color: WikColor.green, fontWeight: FontWeight.w700, fontSize: 12)),
        ]),
      ),
      Expanded(child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: _markets.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final m = _markets[i];
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(14), border: Border.all(color: WikColor.border)),
            child: Column(children: [
              Row(children: [
                CircleAvatar(
                  backgroundColor: WikColor.accentBg, radius: 18,
                  child: Text(m.icon, style: const TextStyle(fontSize: 14)),
                ),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(m.sym, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 15)),
                  Text('Collateral: ${m.cf}', style: const TextStyle(color: WikColor.text3, fontSize: 11)),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text(m.supplyApr, style: const TextStyle(color: WikColor.green, fontWeight: FontWeight.w700, fontSize: 15, fontFamily: 'SpaceMono')),
                  const Text('Supply APR', style: TextStyle(color: WikColor.text3, fontSize: 10)),
                ]),
              ]),
              const SizedBox(height: 10),
              // Utilization bar
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text('Utilization', style: WikText.label()),
                  Text('${(m.util * 100).toStringAsFixed(0)}%', style: TextStyle(
                    color: m.util > 0.8 ? WikColor.red : m.util > 0.6 ? WikColor.gold : WikColor.green,
                    fontSize: 11, fontWeight: FontWeight.w700,
                  )),
                ]),
                const SizedBox(height: 4),
                ClipRRect(
                  borderRadius: BorderRadius.circular(3),
                  child: LinearProgressIndicator(
                    value: m.util,
                    backgroundColor: WikColor.bg2,
                    color: m.util > 0.8 ? WikColor.red : m.util > 0.6 ? WikColor.gold : WikColor.green,
                    minHeight: 5,
                  ),
                ),
              ]),
              const SizedBox(height: 10),
              Row(children: [
                Expanded(child: OutlinedButton(
                  onPressed: () => _showActionSheet(context, m.sym, 'supply'),
                  style: OutlinedButton.styleFrom(foregroundColor: WikColor.green, side: const BorderSide(color: WikColor.green), padding: const EdgeInsets.symmetric(vertical: 8)),
                  child: Text('Supply ${m.supplyApr}', style: const TextStyle(fontSize: 12)),
                )),
                const SizedBox(width: 8),
                Expanded(child: m.borrowApr == '—'
                  ? OutlinedButton(
                      onPressed: null,
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: WikColor.border)),
                      child: const Text('—', style: TextStyle(fontSize: 12, color: WikColor.text3)),
                    )
                  : OutlinedButton(
                      onPressed: () => _showActionSheet(context, m.sym, 'borrow'),
                      style: OutlinedButton.styleFrom(foregroundColor: Colors.orange, side: const BorderSide(color: Colors.orange), padding: const EdgeInsets.symmetric(vertical: 8)),
                      child: Text('Borrow ${m.borrowApr}', style: const TextStyle(fontSize: 12)),
                    ),
                ),
              ]),
            ]),
          );
        },
      )),
    ],
  );

  Widget _buildPositions() => const Center(
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Icon(Icons.account_balance_outlined, color: WikColor.text3, size: 48),
      SizedBox(height: 12),
      Text('No active positions', style: TextStyle(color: WikColor.text2)),
      SizedBox(height: 6),
      Text('Supply or borrow assets to get started', style: TextStyle(color: WikColor.text3, fontSize: 12)),
    ]),
  );

  void _showActionSheet(BuildContext context, String sym, String action) {
    final ctrl = TextEditingController();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: WikColor.bg1,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).viewInsets.bottom + 20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('${action == 'supply' ? 'Supply' : 'Borrow'} $sym',
            style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 18)),
          const SizedBox(height: 16),
          TextField(controller: ctrl, keyboardType: TextInputType.number,
            style: WikText.price(size: 17),
            decoration: InputDecoration(labelText: 'Amount', suffixText: sym)),
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, child: ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: action == 'supply' ? WikColor.green : Colors.orange),
            onPressed: () { Navigator.pop(context); ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('${action == 'supply' ? 'Supplied' : 'Borrowed'} $sym — connect wallet'), backgroundColor: WikColor.accent, behavior: SnackBarBehavior.floating)); },
            child: Text('${action == 'supply' ? 'Supply' : 'Borrow'} $sym'),
          )),
        ]),
      ),
    );
  }
}
