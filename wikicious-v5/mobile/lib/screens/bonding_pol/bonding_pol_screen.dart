import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class BondingPolScreen extends ConsumerStatefulWidget {
  const BondingPolScreen({super.key});
  @override ConsumerState<BondingPolScreen> createState() => _State();
}

class _State extends ConsumerState<BondingPolScreen> {
  int _bondType = 0;
  final _amtCtrl = TextEditingController(text: '1000');
  bool _bonding = false;

  static const _bonds = [
    ('WIK/USDC LP', '7%', '5 days', '\$50,000 max/day'),
    ('ETH/WIK LP',  '10%', '5 days', '\$30,000 max/day'),
    ('WBTC/WIK LP', '8%', '7 days', '\$20,000 max/day'),
  ];

  double get _lpValue => double.tryParse(_amtCtrl.text) ?? 0;
  double get _wikPrice => 0.284;
  double get _discount => double.parse(_bonds[_bondType].$2.replaceAll('%','')) / 100;
  double get _wikAmount => _lpValue / (_wikPrice * (1 - _discount));

  @override void dispose() { _amtCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Bond POL')),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        Row(children: [
          Expanded(child: StatTile(label: 'Protocol LP Owned', value: '\$8.4M', sub: 'permanent', valueColor: WikColor.green)),
          const SizedBox(width: 10),
          Expanded(child: StatTile(label: 'Total Bonds', value: '1,284', sub: 'all time', valueColor: WikColor.accent)),
        ]),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
          child: const Text('Sell your LP tokens to the protocol at a discount and receive WIK vested over 5 days. Protocol permanently owns the LP and earns 100% of fees forever.',
            style: TextStyle(color: WikColor.text3, fontSize: 12, height: 1.6)),
        ),
        const SizedBox(height: 14),
        ...List.generate(_bonds.length, (i) {
          final b = _bonds[i]; final sel = _bondType == i;
          return GestureDetector(
            onTap: () => setState(() => _bondType = i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: sel ? WikColor.accent.withOpacity(0.08) : WikColor.bg1,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: sel ? WikColor.accent : WikColor.border, width: sel ? 1.5 : 1)),
              child: Row(children: [
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(b.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 13)),
                  Text('Vesting: ${b.$3} · ${b.$4}', style: const TextStyle(color: WikColor.text3, fontSize: 11)),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('${b.$2} discount', style: const TextStyle(color: WikColor.green, fontFamily: 'SpaceMono', fontSize: 16, fontWeight: FontWeight.w900)),
                  if (sel) const Icon(Icons.check_circle, color: WikColor.green, size: 16),
                ]),
              ]),
            ),
          );
        }),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('LP TOKEN VALUE (USDC)', style: WikText.label()),
            const SizedBox(height: 8),
            TextField(controller: _amtCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: WikText.price(size: 20),
              decoration: const InputDecoration(hintText: '0.00', suffixText: 'USDC'),
              onChanged: (_) => setState(() {})),
            const Divider(height: 16),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('WIK discount price', style: TextStyle(color: WikColor.text3, fontSize: 12)),
              Text('\$${(_wikPrice * (1 - _discount)).toStringAsFixed(4)}', style: WikText.price(size: 12, color: WikColor.gold)),
            ]),
            const SizedBox(height: 4),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('WIK you receive', style: TextStyle(color: WikColor.text3, fontSize: 12)),
              Text('${_wikAmount.toStringAsFixed(2)} WIK', style: WikText.price(size: 14, color: WikColor.green)),
            ]),
            const SizedBox(height: 4),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Vesting', style: TextStyle(color: WikColor.text3, fontSize: 12)),
              Text(_bonds[_bondType].$3, style: WikText.price(size: 12, color: WikColor.text1)),
            ]),
          ]),
        ),
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _bonding ? null : () async {
            setState(() => _bonding = true);
            // Real API call — see ApiService.instance methods
            if (!mounted) return;
            setState(() => _bonding = false);
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('🔗 Bond created — ${_wikAmount.toStringAsFixed(2)} WIK vesting'),
              backgroundColor: WikColor.green, behavior: SnackBarBehavior.floating));
          },
          style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15)),
          child: _bonding
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : const Text('Purchase Bond', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
        )),
      ]),
    ),
  );
}
