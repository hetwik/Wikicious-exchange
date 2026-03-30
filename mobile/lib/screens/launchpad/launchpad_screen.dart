import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class LaunchpadScreen extends ConsumerWidget {
  const LaunchpadScreen({super.key});

  static const _sales = [
    (name: 'WikiSwap',   status: 'Active',    raised: 450000.0,  hard: 1000000.0, price: '0.00001 USDC', tier: 'All Tiers',  end: 3),
    (name: 'ChainVault', status: 'Upcoming',  raised: 0.0,       hard: 500000.0,  price: '0.000005 USDC',tier: 'Silver+',    end: 10),
    (name: 'MetaFi',     status: 'Finalized', raised: 2000000.0, hard: 2000000.0, price: '0.00002 USDC', tier: 'All Tiers',  end: 0),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Launchpad')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Your tier
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF5B7FFF), Color(0xFFA855F7)]),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(children: [
              const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Your Tier', style: TextStyle(color: Colors.white70, fontSize: 12)),
                SizedBox(height: 4),
                Text('🥉 Bronze', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 22)),
                SizedBox(height: 4),
                Text('Hold 2,000+ veWIK for Silver', style: TextStyle(color: Colors.white70, fontSize: 11)),
              ]),
              const Spacer(),
              Column(children: [
                const Text('Required', style: TextStyle(color: Colors.white70, fontSize: 10)),
                const SizedBox(height: 4),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(color: Colors.white.withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                  child: const Text('500 veWIK ✓', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)),
                ),
              ]),
            ]),
          ),
          const SizedBox(height: 16),

          // Tier guide
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
            child: Row(children: [
              for (final t in [
                (icon: '👥', name: 'Public',  req: 'Any'),
                (icon: '🥉', name: 'Bronze',  req: '500'),
                (icon: '🥈', name: 'Silver',  req: '2K'),
                (icon: '🥇', name: 'Gold',    req: '10K'),
              ]) Expanded(child: Column(children: [
                Text(t.icon, style: const TextStyle(fontSize: 20)),
                const SizedBox(height: 4),
                Text(t.name, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 11)),
                Text(t.req == 'Any' ? 'FCFS' : '${t.req} veWIK', style: const TextStyle(color: WikColor.text3, fontSize: 9)),
              ])),
            ]),
          ),
          const SizedBox(height: 16),

          const Text('Active & Upcoming Sales', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 10),

          for (final s in _sales) _SaleCard(sale: s),
        ],
      ),
    );
  }
}

class _SaleCard extends StatelessWidget {
  final dynamic sale;
  const _SaleCard({required this.sale});

  @override
  Widget build(BuildContext context) {
    final pct = sale.hard > 0 ? sale.raised / sale.hard : 0.0;
    final statusColor = sale.status == 'Active' ? WikColor.green : sale.status == 'Upcoming' ? WikColor.gold : WikColor.accent;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: WikColor.bg1,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: sale.status == 'Active' ? WikColor.green.withOpacity(0.3) : WikColor.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          CircleAvatar(backgroundColor: WikColor.accentBg, radius: 20, child: Text(sale.name[0], style: const TextStyle(color: WikColor.accent, fontWeight: FontWeight.w800, fontSize: 16))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(sale.name, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 15)),
            Text(sale.price, style: const TextStyle(color: WikColor.text3, fontSize: 11)),
          ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: statusColor.withOpacity(0.15), borderRadius: BorderRadius.circular(20), border: Border.all(color: statusColor.withOpacity(0.4))),
            child: Text(sale.status.toUpperCase(), style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.w800)),
          ),
        ]),
        const SizedBox(height: 12),
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('Progress', style: WikText.label()),
          Text('\$${NumberFormat('#,##0').format(sale.raised)} / \$${NumberFormat('#,##0').format(sale.hard)}', style: const TextStyle(color: WikColor.text1, fontSize: 11, fontFamily: 'SpaceMono', fontWeight: FontWeight.w600)),
        ]),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: pct,
            backgroundColor: WikColor.bg2,
            color: pct >= 1.0 ? WikColor.accent : WikColor.green,
            minHeight: 6,
          ),
        ),
        const SizedBox(height: 4),
        Text('${(pct * 100).toStringAsFixed(1)}% raised · ${sale.tier}', style: const TextStyle(color: WikColor.text3, fontSize: 10)),
        if (sale.status == 'Active') ...[
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(backgroundColor: WikColor.accent),
              child: const Text('Participate', style: TextStyle(fontWeight: FontWeight.w700)),
            )),
          ]),
        ],
        if (sale.status == 'Finalized') ...[
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(foregroundColor: WikColor.accent, side: const BorderSide(color: WikColor.accent)),
            child: const Text('Claim Tokens'),
          )),
        ],
      ]),
    );
  }
}
