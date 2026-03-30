import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class ForexScreen extends ConsumerStatefulWidget {
  const ForexScreen({super.key});
  @override ConsumerState<ForexScreen> createState() => _State();
}

class _State extends ConsumerState<ForexScreen> {
  bool _isLong = true;
  int _pair = 0;
  final _amtCtrl = TextEditingController(text: '1000');
  static const _pairs = [
    ('EUR/USD','1.0842','+0.12%',true),  ('GBP/USD','1.2641','+0.08%',true),
    ('USD/JPY','151.42','-0.14%',false), ('AUD/USD','0.6518','+0.22%',true),
    ('USD/CAD','1.3680','-0.06%',false), ('USD/CHF','0.9012','+0.04%',true),
  ];
  @override void dispose() { _amtCtrl.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    final p = _pairs[_pair];
    return Scaffold(
      appBar: AppBar(title: const Text('Forex')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          Row(children: [
            Expanded(child: StatTile(label: 'Max Leverage', value: '500×', valueColor: WikColor.gold)),
            const SizedBox(width: 10),
            Expanded(child: StatTile(label: 'Spread', value: '0.2 pips', valueColor: WikColor.green)),
          ]),
          const SizedBox(height: 14),
          SizedBox(height: 68, child: ListView.separated(
            scrollDirection: Axis.horizontal, itemCount: _pairs.length,
            separatorBuilder: (_, __) => const SizedBox(width: 8),
            itemBuilder: (_, i) {
              final pp = _pairs[i]; final sel = i == _pair;
              return GestureDetector(
                onTap: () => setState(() => _pair = i),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: sel ? WikColor.accent.withOpacity(0.12) : WikColor.bg1,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: sel ? WikColor.accent : WikColor.border),
                  ),
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    Text(pp.$1, style: TextStyle(color: sel ? WikColor.accent : WikColor.text1, fontWeight: FontWeight.w700, fontSize: 12)),
                    Text(pp.$2, style: WikText.price(size: 11, color: pp.$4 ? WikColor.green : WikColor.red)),
                    Text(pp.$3, style: TextStyle(color: pp.$4 ? WikColor.green : WikColor.red, fontSize: 9, fontWeight: FontWeight.w600)),
                  ]),
                ),
              );
            },
          )),
          const SizedBox(height: 14),
          Container(padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)),
            child: Row(children: [true, false].map((b) => Expanded(child: GestureDetector(
              onTap: () => setState(() => _isLong = b),
              child: AnimatedContainer(duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: _isLong == b ? (b ? WikColor.green : WikColor.red) : Colors.transparent,
                  borderRadius: BorderRadius.circular(8)),
                child: Text(b ? '▲  Buy' : '▼  Sell', textAlign: TextAlign.center,
                  style: TextStyle(color: _isLong == b ? (b ? Colors.black : Colors.white) : WikColor.text3,
                    fontWeight: FontWeight.w800, fontSize: 14))),
            ))).toList())),
          const SizedBox(height: 14),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text(p.$1, style: WikText.price(size: 18, color: WikColor.text1)),
                Text(p.$2, style: WikText.price(size: 22, color: p.$4 ? WikColor.green : WikColor.red)),
                Text(p.$3, style: TextStyle(color: p.$4 ? WikColor.green : WikColor.red, fontWeight: FontWeight.w700)),
              ]),
              const SizedBox(height: 12),
              TextField(controller: _amtCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: WikText.price(size: 18),
                decoration: const InputDecoration(labelText: 'Position size (USDC)', suffixText: 'USDC')),
            ]),
          ),
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: _isLong ? WikColor.green : WikColor.red,
              foregroundColor: _isLong ? Colors.black : Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 15)),
            child: Text('${_isLong ? "▲ Buy" : "▼ Sell"} ${p.$1}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
          )),
        ]),
      ),
    );
  }
}
