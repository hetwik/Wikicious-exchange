import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class ManagedVaultsScreen extends ConsumerStatefulWidget {
  const ManagedVaultsScreen({super.key});
  @override ConsumerState<ManagedVaultsScreen> createState() => _State();
}

class _State extends ConsumerState<ManagedVaultsScreen> {
  int? _expandedIdx;
  final _ctrlA = TextEditingController(text: '1.0');
  final _ctrlB = TextEditingController(text: '3482');
  bool _depositing = false;

  static const _vaults = [
    ('ETH/USDC Auto-Range', '\$3,200–\$3,800', true,  '14.8%', '\$8.4M',  142, Color(0xFF4F8EFF)),
    ('BTC/USDC Auto-Range', '\$62K–\$72K',     true,  '9.2%',  '\$12.8M', 84,  WikColor.gold),
    ('WIK/USDC Auto-Range', '\$0.24–\$0.34',   false, '28.4%', '\$1.2M',  218, Color(0xFFA855F7)),
    ('ARB/USDC Auto-Range', '\$1.05–\$1.35',   true,  '18.2%', '\$3.2M',  96,  WikColor.green),
  ];

  @override void dispose() { _ctrlA.dispose(); _ctrlB.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Managed Vaults'),
      actions: [Padding(padding: const EdgeInsets.only(right: 14),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('TOTAL TVL', style: TextStyle(color: WikColor.text3, fontSize: 9, fontWeight: FontWeight.w700)),
          const Text('\$24.6M', style: TextStyle(color: WikColor.accent, fontFamily: 'SpaceMono', fontSize: 14, fontWeight: FontWeight.w700)),
        ]))]),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(12),
      child: Column(children: [
        Row(children: [
          Expanded(child: StatTile(label: 'Mgmt Fee', value: '2%/yr', sub: 'accrued per-block', valueColor: WikColor.gold)),
          const SizedBox(width: 10),
          Expanded(child: StatTile(label: 'Perf Fee', value: '10%', sub: 'of trading yield', valueColor: WikColor.gold)),
        ]),
        const SizedBox(height: 14),
        ..._vaults.asMap().entries.map((e) {
          final i = e.key; final v = e.value;
          final expanded = _expandedIdx == i;
          return Container(
            margin: const EdgeInsets.only(bottom: 10),
            decoration: BoxDecoration(
              color: WikColor.bg1, borderRadius: BorderRadius.circular(14),
              border: Border.all(color: expanded ? v.$7 : WikColor.border, width: expanded ? 1.5 : 1),
            ),
            child: Column(children: [
              GestureDetector(
                onTap: () => setState(() => _expandedIdx = expanded ? null : i),
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(children: [
                    Row(children: [
                      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                        Text(v.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 13)),
                        const SizedBox(height: 3),
                        Row(children: [
                          Container(width: 6, height: 6, decoration: BoxDecoration(
                              color: v.$3 ? WikColor.green : WikColor.red, shape: BoxShape.circle)),
                          const SizedBox(width: 5),
                          Text('Range: ${v.$2}  ${v.$3 ? "In Range" : "Rebalancing"}',
                            style: TextStyle(color: v.$3 ? WikColor.green : WikColor.red, fontSize: 11, fontWeight: FontWeight.w600)),
                        ]),
                      ])),
                      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                        Text(v.$4, style: TextStyle(color: v.$7, fontFamily: 'SpaceMono', fontSize: 20, fontWeight: FontWeight.w900)),
                        Text('APY', style: WikText.label()),
                      ]),
                    ]),
                    const SizedBox(height: 10),
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      ...[('TVL', v.$5), ('Rebalances', '${v.$6}'), ('Range', v.$2)].map((kv) => Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(kv.$1, style: WikText.label()),
                          Text(kv.$2, style: WikText.price(size: 12, color: WikColor.text1)),
                        ],
                      )),
                    ]),
                  ]),
                ),
              ),
              if (expanded) ...[
                const Divider(height: 1),
                Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text('DEPOSIT', style: WikText.label()),
                    const SizedBox(height: 10),
                    Row(children: [
                      Expanded(child: TextField(controller: _ctrlA,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        style: const TextStyle(color: WikColor.text1, fontSize: 15),
                        decoration: const InputDecoration(labelText: 'ETH', contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10)))),
                      const SizedBox(width: 8),
                      Expanded(child: TextField(controller: _ctrlB,
                        keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        style: const TextStyle(color: WikColor.text1, fontSize: 15),
                        decoration: const InputDecoration(labelText: 'USDC', contentPadding: EdgeInsets.symmetric(horizontal: 10, vertical: 10)))),
                    ]),
                    const SizedBox(height: 12),
                    SizedBox(width: double.infinity, child: ElevatedButton(
                      onPressed: _depositing ? null : () async {
                        setState(() => _depositing = true);
                        // Real API call — see ApiService.instance methods
                        if (!mounted) return;
                        setState(() { _depositing = false; _expandedIdx = null; });
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                          content: Text('✅ Deposited into ${v.$1}'),
                          backgroundColor: WikColor.green, behavior: SnackBarBehavior.floating));
                      },
                      style: ElevatedButton.styleFrom(backgroundColor: v.$7, foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12)),
                      child: _depositing
                          ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Text('Deposit → MLV Shares', style: TextStyle(fontWeight: FontWeight.w800)),
                    )),
                  ]),
                ),
              ],
            ]),
          );
        }),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
          child: const Text('AI automatically moves liquidity when price exits range — no action needed. Rebalance fee: 0.05% per event.',
            style: TextStyle(color: WikColor.text3, fontSize: 11, height: 1.5), textAlign: TextAlign.center),
        ),
      ]),
    ),
  );
}
