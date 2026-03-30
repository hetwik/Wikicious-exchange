import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class StrategyVaultsScreen extends ConsumerWidget {
  const StrategyVaultsScreen({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(title: const Text('Strategy Vaults')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          Row(children: [
            Expanded(child: StatTile(label: 'TVL', value: '$12.4M', valueColor: WikColor.accent)),
            const SizedBox(width: 10),
            Expanded(child: StatTile(label: '24h Volume', value: '$2.8M', valueColor: WikColor.green)),
          ]),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
            child: Center(child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 32),
              child: Column(children: const [
                Icon(Icons.auto_graph_outlined, size: 52, color: WikColor.accent),
                SizedBox(height: 12),
                Text('Strategy Vaults', style: TextStyle(color: WikColor.text1, fontSize: 18, fontWeight: FontWeight.w800)),
                SizedBox(height: 6),
                Text('Full Strategy Vaults interface loading...', style: TextStyle(color: WikColor.text3, fontSize: 13)),
              ]),
            )),
          ),
        ]),
      ),
    );
  }
}
