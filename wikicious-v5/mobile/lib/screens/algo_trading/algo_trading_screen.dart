import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class AlgoTradingScreen extends ConsumerStatefulWidget {
  const AlgoTradingScreen({super.key});
  @override ConsumerState<AlgoTradingScreen> createState() => _State();
}

class _State extends ConsumerState<AlgoTradingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  @override void initState() { super.initState(); _tabs = TabController(length: 2, vsync: this); }
  @override void dispose() { _tabs.dispose(); super.dispose(); }

  static const _bots = [
    ('Grid Bot',     'Grid trading within price range', Icons.grid_on_outlined,         Color(0xFF00D4FF), 'Running'),
    ('DCA Bot',      'Dollar-cost averaging strategy',  Icons.calendar_today_outlined,   WikColor.green,   'Running'),
    ('RSI Bot',      'RSI overbought/oversold signals', Icons.show_chart_outlined,       WikColor.gold,    'Stopped'),
    ('Breakout Bot', 'Trade price breakouts',           Icons.trending_up_outlined,      Color(0xFFA855F7),'Running'),
    ('MACD Bot',     'MACD crossover signals',          Icons.stacked_line_chart_outlined,WikColor.accent, 'Stopped'),
  ];

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Algo Trading'),
      bottom: TabBar(controller: _tabs, indicatorColor: WikColor.accent, labelColor: WikColor.accent,
        unselectedLabelColor: WikColor.text3,
        tabs: const [Tab(text: 'Bot Templates'), Tab(text: 'TradingView')]),
    ),
    body: TabBarView(controller: _tabs, children: [
      ListView.separated(
        padding: const EdgeInsets.all(12), itemCount: _bots.length,
        separatorBuilder: (_, __) => const SizedBox(height: 8),
        itemBuilder: (_, i) {
          final b = _bots[i]; final running = b.$5 == 'Running';
          return Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
            child: Row(children: [
              Container(width: 42, height: 42, decoration: BoxDecoration(color: b.$4.withOpacity(0.12), borderRadius: BorderRadius.circular(12)),
                child: Icon(b.$3, color: b.$4, size: 22)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(b.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 13)),
                Text(b.$2, style: const TextStyle(color: WikColor.text3, fontSize: 11)),
              ])),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: running ? WikColor.green.withOpacity(0.12) : WikColor.bg3,
                  borderRadius: BorderRadius.circular(6)),
                child: Text(b.$5, style: TextStyle(color: running ? WikColor.green : WikColor.text3, fontSize: 10, fontWeight: FontWeight.w700)),
              ),
              const SizedBox(width: 8),
              Icon(Icons.arrow_forward_ios, size: 14, color: WikColor.text3),
            ]),
          );
        },
      ),
      SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('TradingView Webhooks', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 8),
          const Text('Connect your TradingView Pine Script alerts to automatically place orders on Wikicious.',
            style: TextStyle(color: WikColor.text3, fontSize: 12, height: 1.6)),
          const SizedBox(height: 16),
          StatTile(label: 'Webhook URL', value: 'wss://api.wikicious.io/tv', valueColor: WikColor.accent),
          const SizedBox(height: 10),
          const TextField(decoration: InputDecoration(labelText: 'API Key')),
          const SizedBox(height: 10),
          const TextField(decoration: InputDecoration(labelText: 'Secret Key')),
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () {},
            child: const Text('Generate API Keys', style: TextStyle(fontWeight: FontWeight.w900)),
          )),
        ]),
      ),
    ]),
  );
}
