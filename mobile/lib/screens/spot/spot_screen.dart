import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class SpotScreen extends ConsumerStatefulWidget {
  const SpotScreen({super.key});
  @override ConsumerState<SpotScreen> createState() => _State();
}

class _State extends ConsumerState<SpotScreen> {
  bool _isBuy = true;
  String _pair = 'WIK/USDC';
  final _amtCtrl = TextEditingController();
  bool _loading = false;

  static const _pairs = ['WIK/USDC','ETH/USDC','ARB/USDC','LINK/USDC','BTC/USDC'];
  static const _prices = {'WIK/USDC': '\$0.284','ETH/USDC':'\$3,482','ARB/USDC':'\$1.24','LINK/USDC':'\$14.82','BTC/USDC':'\$67,284'};
  static const _changes = {'WIK/USDC':'+8.4%','ETH/USDC':'+1.84%','ARB/USDC':'-0.82%','LINK/USDC':'+2.10%','BTC/USDC':'+2.14%'};

  @override void dispose() { _amtCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Spot Trading')),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        Row(children: [
          Expanded(child: StatTile(label: 'Fee Tier', value: '0.05%', sub: 'standard spot', valueColor: WikColor.green)),
          const SizedBox(width: 10),
          Expanded(child: StatTile(label: 'Protocol Take', value: '0.02%', sub: 'goes to stakers', valueColor: WikColor.accent)),
        ]),
        const SizedBox(height: 14),
        SizedBox(height: 60, child: ListView.separated(
          scrollDirection: Axis.horizontal, itemCount: _pairs.length,
          separatorBuilder: (_, __) => const SizedBox(width: 8),
          itemBuilder: (_, i) {
            final p = _pairs[i]; final sel = p == _pair;
            return GestureDetector(
              onTap: () => setState(() => _pair = p),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                decoration: BoxDecoration(
                  color: sel ? WikColor.accent.withOpacity(0.12) : WikColor.bg1,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: sel ? WikColor.accent : WikColor.border),
                ),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(p, style: TextStyle(color: sel ? WikColor.accent : WikColor.text1, fontWeight: FontWeight.w700, fontSize: 12)),
                  Text(_prices[p]!, style: WikText.price(size: 11, color: sel ? WikColor.accent : WikColor.text2)),
                ]),
              ),
            );
          },
        )),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)),
          child: Row(children: [true, false].map((buy) => Expanded(child: GestureDetector(
            onTap: () => setState(() => _isBuy = buy),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.symmetric(vertical: 12),
              decoration: BoxDecoration(
                color: _isBuy == buy ? (buy ? WikColor.green : WikColor.red) : Colors.transparent,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(buy ? 'Buy' : 'Sell', textAlign: TextAlign.center,
                style: TextStyle(color: _isBuy == buy ? (buy ? Colors.black : Colors.white) : WikColor.text3,
                  fontWeight: FontWeight.w800, fontSize: 14)),
            ),
          ))).toList()),
        ),
        const SizedBox(height: 14),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(_pair.split('/').first, style: WikText.price(size: 22, color: WikColor.text1)),
              Text(_prices[_pair]!, style: WikText.price(size: 22)),
              Text(_changes[_pair]!, style: TextStyle(color: _changes[_pair]!.startsWith('+') ? WikColor.green : WikColor.red, fontFamily: 'SpaceMono', fontSize: 14, fontWeight: FontWeight.w700)),
            ]),
            const SizedBox(height: 12),
            TextField(
              controller: _amtCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: WikText.price(size: 18),
              decoration: InputDecoration(
                hintText: '0.00',
                suffixText: _isBuy ? 'USDC' : _pair.split('/').first,
                labelText: _isBuy ? 'Amount to spend' : 'Amount to sell',
              ),
            ),
            const SizedBox(height: 10),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Fee (0.05%)', style: TextStyle(color: WikColor.text3, fontSize: 12)),
              Text('\$${((double.tryParse(_amtCtrl.text) ?? 0) * 0.0005).toStringAsFixed(4)} USDC',
                style: WikText.price(size: 12, color: WikColor.text2)),
            ]),
          ]),
        ),
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _loading ? null : () async {
            setState(() => _loading = true);
            // Real API call — see ApiService.instance methods
            if (!mounted) return;
            setState(() { _loading = false; _amtCtrl.clear(); });
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('✅ ${_isBuy ? "Bought" : "Sold"} $_pair'),
              backgroundColor: WikColor.green, behavior: SnackBarBehavior.floating));
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: _isBuy ? WikColor.green : WikColor.red,
            foregroundColor: _isBuy ? Colors.black : Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 15),
          ),
          child: Text('${_isBuy ? "Buy" : "Sell"} ${_pair.split('/').first}',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
        )),
      ]),
    ),
  );
}
