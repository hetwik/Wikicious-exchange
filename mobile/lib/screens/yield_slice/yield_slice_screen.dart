import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class YieldSliceScreen extends ConsumerStatefulWidget {
  const YieldSliceScreen({super.key});
  @override
  ConsumerState<YieldSliceScreen> createState() => _YieldSliceScreenState();
}

class _YieldSliceScreenState extends ConsumerState<YieldSliceScreen> {
  int _selectedSlice = 0;
  int _actionTab = 0; // 0=slice, 1=redeem, 2=yield, 3=swap

  static const _slices = [
    (symbol: 'USDC-30d',  days: 30,  apr: '8.21%', ptPrice: '0.9932', discount: '0.68%', tvl: '\$2.4M'),
    (symbol: 'USDC-90d',  days: 90,  apr: '7.63%', ptPrice: '0.9809', discount: '1.91%', tvl: '\$5.8M'),
    (symbol: 'USDC-180d', days: 180, apr: '7.12%', ptPrice: '0.9640', discount: '3.60%', tvl: '\$12M'),
    (symbol: 'USDC-365d', days: 365, apr: '6.88%', ptPrice: '0.9312', discount: '6.88%', tvl: '\$8.2M'),
  ];

  final _amtCtrl = TextEditingController();

  @override
  void dispose() { _amtCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final s = _slices[_selectedSlice];
    return Scaffold(
      appBar: AppBar(title: const Text('🍰 Yield Slicing')),
      body: Column(
        children: [
          // Protocol stats
          Container(
            color: WikColor.bg1,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
                Text('Total TVL', style: WikText.label()),
                const Text('\$28.4M', style: TextStyle(color: WikColor.accent, fontWeight: FontWeight.w900, fontFamily: 'SpaceMono')),
              ])),
              Container(width: 1, height: 30, color: WikColor.border),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
                Text('Active Slices', style: WikText.label()),
                Text('${_slices.length}', style: const TextStyle(color: WikColor.green, fontWeight: FontWeight.w900, fontFamily: 'SpaceMono')),
              ])),
              Container(width: 1, height: 30, color: WikColor.border),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
                Text('Protocol Fees', style: WikText.label()),
                const Text('\$14.2K', style: TextStyle(color: WikColor.gold, fontWeight: FontWeight.w900, fontFamily: 'SpaceMono')),
              ])),
            ]),
          ),

          // Slice selector chips
          SizedBox(
            height: 52,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: _slices.length,
              itemBuilder: (_, i) {
                final sl = _slices[i];
                final selected = _selectedSlice == i;
                return GestureDetector(
                  onTap: () => setState(() => _selectedSlice = i),
                  child: Container(
                    margin: const EdgeInsets.only(right: 8),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(
                      color: selected ? WikColor.accentBg : WikColor.bg1,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: selected ? WikColor.accent : WikColor.border),
                    ),
                    child: Row(mainAxisSize: MainAxisSize.min, children: [
                      Text(sl.symbol, style: TextStyle(color: selected ? WikColor.accent : WikColor.text2, fontWeight: FontWeight.w700, fontSize: 12)),
                      const SizedBox(width: 6),
                      Text(sl.apr, style: TextStyle(color: selected ? WikColor.green : WikColor.text3, fontSize: 11)),
                    ]),
                  ),
                );
              },
            ),
          ),

          // Selected slice details
          Expanded(child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              // Slice info card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(14), border: Border.all(color: WikColor.border)),
                child: Column(children: [
                  Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                    Text(s.symbol, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w900, fontSize: 18)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(color: WikColor.greenBg, borderRadius: BorderRadius.circular(20)),
                      child: Text(s.apr, style: const TextStyle(color: WikColor.green, fontWeight: FontWeight.w800, fontSize: 13)),
                    ),
                  ]),
                  const SizedBox(height: 4),
                  Row(children: [
                    const Icon(Icons.schedule, color: WikColor.text3, size: 12),
                    const SizedBox(width: 4),
                    Text('${s.days} days remaining', style: const TextStyle(color: WikColor.text3, fontSize: 11)),
                  ]),
                  const SizedBox(height: 16),
                  Row(children: [
                    Expanded(child: _InfoBox('PT Price', s.ptPrice, WikColor.accent)),
                    const SizedBox(width: 8),
                    Expanded(child: _InfoBox('Discount', s.discount, WikColor.gold)),
                    const SizedBox(width: 8),
                    Expanded(child: _InfoBox('TVL', s.tvl, WikColor.text1)),
                  ]),
                  const SizedBox(height: 12),
                  // AMM depth bar
                  Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Text('PT Pool', style: WikText.label()),
                      Text('Underlying Pool', style: WikText.label()),
                    ]),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: Row(children: [
                        Expanded(flex: 48, child: Container(height: 6, color: WikColor.accent)),
                        Expanded(flex: 52, child: Container(height: 6, color: WikColor.green)),
                      ]),
                    ),
                  ]),
                ]),
              ),
              const SizedBox(height: 16),

              // Action tabs
              Container(
                decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)),
                child: Row(children: [
                  for (final (i, label) in [
                    (0, '🔪 Slice'),
                    (1, '💰 Redeem'),
                    (2, '⚡ Yield'),
                    (3, '🔄 Swap'),
                  ]) Expanded(child: GestureDetector(
                    onTap: () => setState(() => _actionTab = i),
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 150),
                      padding: const EdgeInsets.symmetric(vertical: 10),
                      decoration: BoxDecoration(
                        color: _actionTab == i ? WikColor.accent : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: Text(label, style: TextStyle(color: _actionTab == i ? Colors.white : WikColor.text3, fontSize: 11, fontWeight: FontWeight.w700)),
                    ),
                  )),
                ]),
              ),
              const SizedBox(height: 16),

              // Action content
              _buildAction(s),
            ]),
          )),
        ],
      ),
    );
  }

  Widget _buildAction(dynamic s) {
    switch (_actionTab) {
      case 0: // Slice
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Split wTokens into PT + YT', style: TextStyle(color: WikColor.text2, fontSize: 12)),
          const SizedBox(height: 12),
          TextField(controller: _amtCtrl, onChanged: (_) => setState(() {}), keyboardType: TextInputType.number,
            style: WikText.price(size: 17),
            decoration: const InputDecoration(labelText: 'wToken Amount', suffixText: 'wUSDC')),
          const SizedBox(height: 12),
          if ((double.tryParse(_amtCtrl.text) ?? 0) > 0) ...[
            Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)), child: Row(children: [
              Expanded(child: _TokenOut('PT', _amtCtrl.text, WikColor.accent, 'Redeem at maturity')),
              const SizedBox(width: 12),
              Expanded(child: _TokenOut('YT', _amtCtrl.text, WikColor.green, 'Earns all yield')),
            ])),
            const SizedBox(height: 12),
          ],
          SizedBox(width: double.infinity, child: ElevatedButton(onPressed: () => _snack('Slice wTokens'), child: const Text('Slice wTokens'))),
        ]);

      case 1: // Redeem
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Burn PT to get underlying at maturity', style: TextStyle(color: WikColor.text2, fontSize: 12)),
          const SizedBox(height: 12),
          TextField(controller: _amtCtrl, keyboardType: TextInputType.number, style: WikText.price(size: 17),
            decoration: const InputDecoration(labelText: 'PT Amount', suffixText: 'PT')),
          const SizedBox(height: 12),
          Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)), child: Column(children: [
            _SummaryRow('You receive', '${_amtCtrl.text.isEmpty ? '0' : _amtCtrl.text} USDC', WikColor.green),
            _SummaryRow('Rate', '1 PT = 1 USDC at maturity'),
            _SummaryRow('Matures in', '${s.days} days'),
          ])),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: OutlinedButton(
            onPressed: () => _snack('Slice not yet matured — ${s.days} days remaining'),
            style: OutlinedButton.styleFrom(foregroundColor: WikColor.gold, side: const BorderSide(color: WikColor.gold)),
            child: Text('Redeem in ${s.days} days'),
          )),
        ]);

      case 2: // Yield
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Claim yield accrued on your YT balance', style: TextStyle(color: WikColor.text2, fontSize: 12)),
          const SizedBox(height: 12),
          Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)), child: Column(children: [
            _SummaryRow('YT Balance',       '— (connect wallet)', WikColor.text1),
            _SummaryRow('Claimable Yield',  '— USDC',            WikColor.green),
            _SummaryRow('Protocol Fee',     '5% of yield',       WikColor.text2),
            _SummaryRow('Implied APY',      s.apr,               WikColor.green),
          ])),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () => _snack('Connect wallet to claim yield'),
            style: ElevatedButton.styleFrom(backgroundColor: WikColor.green, foregroundColor: Colors.black),
            child: const Text('Claim Yield', style: TextStyle(fontWeight: FontWeight.w800)),
          )),
        ]);

      case 3: // Swap
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Trade PT ↔ USDC in the built-in AMM', style: TextStyle(color: WikColor.text2, fontSize: 12)),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)),
            child: Row(children: [
              Expanded(child: GestureDetector(child: Container(padding: const EdgeInsets.symmetric(vertical: 9), decoration: BoxDecoration(color: WikColor.accent, borderRadius: BorderRadius.circular(8)), alignment: Alignment.center, child: const Text('Sell PT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: 13))))),
              const SizedBox(width: 3),
              Expanded(child: GestureDetector(child: Container(padding: const EdgeInsets.symmetric(vertical: 9), alignment: Alignment.center, child: const Text('Buy PT', style: TextStyle(color: WikColor.text3, fontWeight: FontWeight.w700, fontSize: 13))))),
            ]),
          ),
          const SizedBox(height: 12),
          TextField(controller: _amtCtrl, onChanged: (_) => setState(() {}), keyboardType: TextInputType.number,
            style: WikText.price(size: 17), decoration: const InputDecoration(labelText: 'PT Amount', suffixText: 'PT')),
          const SizedBox(height: 12),
          Container(padding: const EdgeInsets.all(12), decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)), child: Column(children: [
            _SummaryRow('You receive', '${((double.tryParse(_amtCtrl.text) ?? 0) * double.parse(s.ptPrice)).toStringAsFixed(4)} USDC', WikColor.green),
            _SummaryRow('AMM fee', '0.20%', WikColor.text2),
            _SummaryRow('Implied rate', s.apr, WikColor.accent),
          ])),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: ElevatedButton(onPressed: () => _snack('Swap PT → connect wallet'), child: const Text('Sell PT for USDC'))),
        ]);

      default: return const SizedBox.shrink();
    }
  }

  void _snack(String msg) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: WikColor.accent, behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
  );
}

class _InfoBox extends StatelessWidget {
  final String k, v; final Color c;
  const _InfoBox(this.k, this.v, this.c);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(10),
    decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(8)),
    child: Column(children: [
      Text(k, style: const TextStyle(color: WikColor.text3, fontSize: 9, fontWeight: FontWeight.w600)),
      const SizedBox(height: 3),
      Text(v, style: TextStyle(color: c, fontSize: 12, fontWeight: FontWeight.w800, fontFamily: 'SpaceMono')),
    ]),
  );
}

class _TokenOut extends StatelessWidget {
  final String type, amount, desc; final Color c;
  const _TokenOut(this.type, this.amount, this.c, this.desc);
  @override
  Widget build(BuildContext context) => Column(children: [
    Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3), decoration: BoxDecoration(color: c.withOpacity(0.15), borderRadius: BorderRadius.circular(5)), child: Text(type, style: TextStyle(color: c, fontWeight: FontWeight.w800, fontSize: 10))),
    const SizedBox(height: 4),
    Text(amount, style: WikText.price(size: 16, color: c)),
    const SizedBox(height: 2),
    Text(desc, style: const TextStyle(color: WikColor.text3, fontSize: 9), textAlign: TextAlign.center),
  ]);
}

class _SummaryRow extends StatelessWidget {
  final String k, v; final Color c;
  const _SummaryRow(this.k, this.v, [this.c = WikColor.text1]);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(k, style: const TextStyle(color: WikColor.text3, fontSize: 12)),
      Text(v, style: TextStyle(color: c, fontSize: 12, fontWeight: FontWeight.w600, fontFamily: 'SpaceMono')),
    ]),
  );
}
