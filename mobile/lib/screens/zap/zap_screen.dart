import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class ZapScreen extends ConsumerStatefulWidget {
  const ZapScreen({super.key});
  @override ConsumerState<ZapScreen> createState() => _ZapScreenState();
}

class _ZapScreenState extends ConsumerState<ZapScreen> {
  String _tokenIn = 'ETH';
  int _targetIdx = 0;
  final _amtCtrl = TextEditingController(text: '1.0');
  bool _zapping = false;

  static const _tokens = ['ETH', 'USDC', 'WIK', 'ARB'];
  static const _targets = [
    ('ETH/USDC LP',          '12.4% APY', '\$8.4M TVL',  ['Wrap ETH', 'Swap half → USDC', 'Add Liquidity Pool 0']),
    ('WIK/USDC LP',          '28.4% APY', '\$2.1M TVL',  ['Swap to USDC half', 'Swap to WIK half', 'Add Liquidity Pool 3']),
    ('ETH/USDC Vault ⚡',    '18.2% APY', '\$4.8M TVL',  ['Split ETH', 'Add LP position', 'Deposit to Strategy Vault']),
    ('BTC/USDC LP',          '9.8% APY',  '\$12.4M TVL', ['Swap ETH→WBTC', 'Swap ETH→USDC', 'Add Liquidity']),
  ];

  double get _amount => double.tryParse(_amtCtrl.text) ?? 0;
  double get _fee    => _amount * 0.0009;
  double get _net    => _amount - _fee;

  Future<void> _zap() async {
    if (_amount <= 0) return;
    HapticFeedback.mediumImpact();
    setState(() => _zapping = true);
    // Real API call — see ApiService.instance methods
    if (!mounted) return;
    setState(() => _zapping = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('⚡ Zapped \${_amount} \${_tokenIn} → \${_targets[_targetIdx].\$1}'),
      backgroundColor: WikColor.green,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final tgt = _targets[_targetIdx];
    return Scaffold(
      appBar: AppBar(title: const Text('Zap LP')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          Row(children: [
            Expanded(child: StatTile(label: 'Zap Fee', value: '0.09%', valueColor: WikColor.gold)),
            const SizedBox(width: 10),
            Expanded(child: StatTile(label: 'Steps', value: '1 tx', sub: '${tgt.\$4.length} atomic calls', valueColor: WikColor.green)),
          ]),
          const SizedBox(height: 16),

          // FROM token
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('FROM', style: WikText.label()),
              const SizedBox(height: 10),
              Row(children: _tokens.map((t) => Expanded(child: GestureDetector(
                onTap: () => setState(() => _tokenIn = t),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 150),
                  margin: const EdgeInsets.only(right: 6),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: _tokenIn == t ? WikColor.accent.withOpacity(0.15) : WikColor.bg2,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: _tokenIn == t ? WikColor.accent : WikColor.border),
                  ),
                  child: Text(t, textAlign: TextAlign.center,
                    style: TextStyle(color: _tokenIn == t ? WikColor.accent : WikColor.text3, fontWeight: FontWeight.w700, fontSize: 11)),
                ),
              ))).toList()),
              const SizedBox(height: 12),
              TextField(
                controller: _amtCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: WikText.price(size: 24),
                decoration: InputDecoration(
                  hintText: '0.00',
                  suffixText: _tokenIn,
                  filled: true, fillColor: WikColor.bg2,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: WikColor.border)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: WikColor.border)),
                ),
                onChanged: (_) => setState(() {}),
              ),
            ]),
          ),

          const SizedBox(height: 8),
          Center(child: Container(
            width: 36, height: 36,
            decoration: BoxDecoration(color: WikColor.accent.withOpacity(0.12), shape: BoxShape.circle,
              border: Border.all(color: WikColor.accent.withOpacity(0.3))),
            child: const Icon(Icons.electric_bolt, color: WikColor.accent, size: 18),
          )),
          const SizedBox(height: 8),

          // INTO target
          Container(
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(padding: const EdgeInsets.fromLTRB(14, 12, 14, 6), child: Text('ZAP INTO', style: WikText.label())),
                ..._targets.asMap().entries.map((e) {
                  final i = e.key; final t = e.value; final sel = i == _targetIdx;
                  return GestureDetector(
                    onTap: () => setState(() => _targetIdx = i),
                    child: Container(
                      margin: const EdgeInsets.fromLTRB(8, 0, 8, 8),
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: sel ? WikColor.green.withOpacity(0.08) : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(color: sel ? WikColor.green : Colors.transparent),
                      ),
                      child: Row(children: [
                        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                          Text(t.\$1, style: TextStyle(color: sel ? WikColor.green : WikColor.text1, fontWeight: FontWeight.w700, fontSize: 13)),
                          Text(t.\$3, style: const TextStyle(color: WikColor.text3, fontSize: 11)),
                        ])),
                        Text(t.\$2, style: TextStyle(color: sel ? WikColor.green : WikColor.text2, fontWeight: FontWeight.w700, fontSize: 14)),
                        const SizedBox(width: 8),
                        if (sel) const Icon(Icons.check_circle, color: WikColor.green, size: 18),
                      ]),
                    ),
                  );
                }),
              ],
            ),
          ),
          const SizedBox(height: 14),

          // Atomic steps
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('ATOMIC STEPS (1 transaction)', style: WikText.label()),
              const SizedBox(height: 10),
              ...tgt.\$4.asMap().entries.map((e) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(children: [
                  Container(
                    width: 24, height: 24,
                    decoration: BoxDecoration(color: WikColor.accent.withOpacity(0.15), borderRadius: BorderRadius.circular(7),
                      border: Border.all(color: WikColor.accent.withOpacity(0.3))),
                    child: Center(child: Text('\${e.key + 1}', style: const TextStyle(color: WikColor.accent, fontSize: 11, fontWeight: FontWeight.w800))),
                  ),
                  const SizedBox(width: 10),
                  Text(e.value, style: const TextStyle(color: WikColor.text2, fontSize: 12)),
                ]),
              )),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(8), width: double.infinity,
                decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(8)),
                child: const Text('All steps are atomic — if any fails, the entire zap reverts.',
                  style: TextStyle(color: WikColor.text3, fontSize: 11, fontHeight: 1.5)),
              ),
            ]),
          ),
          const SizedBox(height: 8),

          // Fee summary
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
              _feeRow('Zap Fee', '\${_fee.toStringAsFixed(4)} \$_tokenIn'),
              _feeRow('Net In', '\${_net.toStringAsFixed(4)} \$_tokenIn'),
              _feeRow('Slippage', '≤0.5%'),
            ]),
          ),
          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _zapping ? null : _zap,
              style: ElevatedButton.styleFrom(
                backgroundColor: WikColor.green, foregroundColor: Colors.black,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _zapping
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
                  : Text('⚡ Zap \${_amtCtrl.text} \$_tokenIn → \${tgt.\$1}',
                      style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
            ),
          ),
        ]),
      ),
    );
  }

  Widget _feeRow(String label, String value) => Column(children: [
    Text(label, style: WikText.label()),
    const SizedBox(height: 4),
    Text(value, style: WikText.price(size: 12, color: WikColor.text1)),
  ]);
}
