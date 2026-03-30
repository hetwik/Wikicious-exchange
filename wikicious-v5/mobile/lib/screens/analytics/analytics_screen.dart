import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class AnalyticsScreen extends ConsumerStatefulWidget {
  const AnalyticsScreen({super.key});
  @override ConsumerState<AnalyticsScreen> createState() => _State();
}

class _State extends ConsumerState<AnalyticsScreen> {
  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Analytics')),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        Row(children: [
          Expanded(child: StatTile(label: 'Protocol TVL', value: '\$284M', sub: '+12.4% 7d', valueColor: WikColor.accent)),
          const SizedBox(width: 10),
          Expanded(child: StatTile(label: '24h Volume', value: '\$48M', sub: '+8.2% vs avg', valueColor: WikColor.green)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: StatTile(label: 'Cumul. Fees', value: '\$1.84M', sub: 'all time', valueColor: WikColor.gold)),
          const SizedBox(width: 10),
          Expanded(child: StatTile(label: 'Active Traders', value: '12,840', sub: '24h unique', valueColor: WikColor.text1)),
        ]),
        const SizedBox(height: 14),
        _section('TOP MARKETS BY VOLUME', [
          ('BTC/USDT Perp', '\$18.4M', '38.3%'),
          ('ETH/USDT Perp', '\$10.2M', '21.2%'),
          ('EUR/USD Forex',  '\$6.8M',  '14.2%'),
          ('SOL/USDT Perp', '\$4.4M',  '9.1%'),
          ('BTC/USDT Spot', '\$3.2M',  '6.7%'),
        ]),
        const SizedBox(height: 14),
        _section('REVENUE LAST 7 DAYS', [
          ('Mon', '\$18,400', ''),
          ('Tue', '\$22,800', ''),
          ('Wed', '\$19,200', ''),
          ('Thu', '\$24,600', ''),
          ('Fri', '\$28,400', ''),
          ('Sat', '\$16,200', ''),
          ('Sun', '\$21,800', ''),
        ]),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('PROTOCOL HEALTH', style: WikText.label()),
            const SizedBox(height: 10),
            ...[
              ('Insurance Fund',  '\$4.8M',  '✅ Healthy'),
              ('LP Utilisation',  '64%',     '✅ Optimal'),
              ('Oracle Latency',  '<200ms',  '✅ Fast'),
              ('Circuit Breaker', 'Armed',   '✅ Ready'),
              ('veWIK Supply',    '8.4M',    '📊 Growing'),
            ].map((r) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(children: [
                Expanded(child: Text(r.$1, style: const TextStyle(color: WikColor.text3, fontSize: 12))),
                Text(r.$2, style: const TextStyle(color: WikColor.text1, fontFamily: 'SpaceMono', fontSize: 12, fontWeight: FontWeight.w700)),
                const SizedBox(width: 12),
                Text(r.$3, style: const TextStyle(fontSize: 11)),
              ]),
            )),
          ]),
        ),
      ]),
    ),
  );

  Widget _section(String title, List<(String, String, String)> rows) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(title, style: WikText.label()),
      const SizedBox(height: 10),
      ...rows.map((r) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 4),
        child: Row(children: [
          Expanded(child: Text(r.$1, style: const TextStyle(color: WikColor.text2, fontSize: 12))),
          Text(r.$2, style: WikText.price(size: 12, color: WikColor.green)),
          if (r.$3.isNotEmpty) ...[const SizedBox(width: 10), Text(r.$3, style: const TextStyle(color: WikColor.text3, fontSize: 11))],
        ]),
      )),
    ]),
  );
}
