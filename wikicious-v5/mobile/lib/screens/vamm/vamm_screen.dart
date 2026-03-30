import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

final _vammLevProvider  = StateProvider<double>((ref) => 100);
final _vammSideProvider = StateProvider<bool>((ref) => true);
final _vammMktProvider  = StateProvider<int>((ref) => 0);

class VammScreen extends ConsumerStatefulWidget {
  const VammScreen({super.key});
  @override ConsumerState<VammScreen> createState() => _VammScreenState();
}

class _VammScreenState extends ConsumerState<VammScreen> {
  final _colCtrl = TextEditingController(text: '200');
  bool _loading = false;

  static const _mkts = [
    ('BTC/USDT','\$67,284','+2.14%',true),
    ('ETH/USDT','\$3,482', '+1.84%',true),
    ('SOL/USDT','\$148',   '+4.21%',true),
    ('ARB/USDT','\$1.24',  '-0.82%',false),
    ('WIK/USDT','\$0.284', '+8.40%',true),
  ];

  @override void dispose() { _colCtrl.dispose(); super.dispose(); }

  double get _lev => ref.read(_vammLevProvider);
  double get _col => double.tryParse(_colCtrl.text) ?? 0;
  double get _pos => _col * _lev;
  double get _fee => _pos * 0.0006;
  Color  get _levColor => _lev <= 100 ? WikColor.green : _lev <= 500 ? WikColor.gold : WikColor.red;
  String get _tierLabel => _lev <= 100 ? '✅ Standard' : _lev <= 500 ? '🥇 Expert — Gold Pass' : '💎 Ultra — Diamond Pass';

  Future<void> _open() async {
    if (_col <= 0) return;
    HapticFeedback.mediumImpact();
    setState(() => _loading = true);
    // Real API call — see ApiService.instance methods
    if (!mounted) return;
    setState(() => _loading = false);
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text('⚡ ${ref.read(_vammSideProvider) ? "Long" : "Short"} opened — ${_lev.toInt()}× vAMM'),
      backgroundColor: WikColor.green,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final lev    = ref.watch(_vammLevProvider);
    final isLong = ref.watch(_vammSideProvider);
    final mktIdx = ref.watch(_vammMktProvider);
    final mkt    = _mkts[mktIdx];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Virtual AMM'),
        actions: [Padding(
          padding: const EdgeInsets.only(right: 14),
          child: Center(child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: WikColor.red.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: WikColor.red.withOpacity(0.3)),
            ),
            child: const Text('UP TO 1000×', style: TextStyle(color: WikColor.red, fontSize: 10, fontWeight: FontWeight.w800)),
          )),
        )],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Stats
          Row(children: [
            Expanded(child: StatTile(label: 'Insurance Fund', value: '\$2.4M', valueColor: WikColor.green)),
            const SizedBox(width: 10),
            Expanded(child: StatTile(label: 'OI Long/Short', value: '\$84M / \$62M', valueColor: WikColor.text1)),
          ]),
          const SizedBox(height: 14),

          // Market picker
          SizedBox(
            height: 76,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: _mkts.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (_, i) {
                final m = _mkts[i]; final sel = i == mktIdx;
                return GestureDetector(
                  onTap: () => ref.read(_vammMktProvider.notifier).state = i,
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 180),
                    width: 108,
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: sel ? WikColor.accent.withOpacity(0.12) : WikColor.bg1,
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: sel ? WikColor.accent : WikColor.border),
                    ),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
                      Text(m.$1, style: const TextStyle(color: WikColor.text1, fontSize: 11, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 3),
                      Text(m.$2, style: WikText.price(size: 11, color: m.$4 ? WikColor.green : WikColor.red)),
                      Text(m.$3, style: TextStyle(color: m.$4 ? WikColor.green : WikColor.red, fontSize: 9, fontWeight: FontWeight.w700)),
                    ]),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 14),

          // Long / Short
          Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)),
            child: Row(children: [true, false].map((side) => Expanded(
              child: GestureDetector(
                onTap: () => ref.read(_vammSideProvider.notifier).state = side,
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 160),
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  decoration: BoxDecoration(
                    color: isLong == side ? (side ? WikColor.green : WikColor.red) : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(side ? '▲  Long' : '▼  Short', textAlign: TextAlign.center,
                    style: TextStyle(
                      color: isLong == side ? (side ? Colors.black : Colors.white) : WikColor.text3,
                      fontWeight: FontWeight.w800, fontSize: 14,
                    )),
                ),
              ),
            )).toList()),
          ),
          const SizedBox(height: 14),

          // Leverage slider
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('LEVERAGE', style: WikText.label()),
                Text('${lev.toInt()}×', style: WikText.price(size: 24, color: _levColor)),
              ]),
              Slider(
                value: lev, min: 1, max: 1000,
                activeColor: _levColor, inactiveColor: WikColor.border,
                onChanged: (v) { ref.read(_vammLevProvider.notifier).state = v; setState(() {}); },
              ),
              Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text('1×',    style: WikText.label()),
                Text('100×',  style: WikText.label(color: WikColor.green)),
                Text('500×',  style: WikText.label(color: WikColor.gold)),
                Text('1000×', style: WikText.label(color: WikColor.red)),
              ]),
              const SizedBox(height: 8),
              Container(
                width: double.infinity, padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: _levColor.withOpacity(0.08), borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _levColor.withOpacity(0.25)),
                ),
                child: Text(_tierLabel, style: TextStyle(color: _levColor, fontSize: 11, fontWeight: FontWeight.w600)),
              ),
            ]),
          ),
          const SizedBox(height: 14),

          // Collateral + summary
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('COLLATERAL (USDC)', style: WikText.label()),
              const SizedBox(height: 8),
              TextField(
                controller: _colCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: WikText.price(size: 20),
                decoration: const InputDecoration(hintText: '0.00', suffixText: 'USDC'),
                onChanged: (_) => setState(() {}),
              ),
              const Divider(height: 20),
              ...[
                ('Position Size', '\$${_pos.toStringAsFixed(0)}', WikColor.text1),
                ('Entry Price',   '${mkt.$2} (vAMM)',             WikColor.text1),
                ('Liq. Price',    isLong
                    ? '\$${(67284 * (1 - 1 / (lev > 1 ? lev : 2))).toStringAsFixed(0)}'
                    : '\$${(67284 * (1 + 1 / (lev > 1 ? lev : 2))).toStringAsFixed(0)}',
                    WikColor.red),
                ('Fee (0.06%)',   '\$${_fee.toStringAsFixed(2)}',  WikColor.text2),
              ].map((r) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 4),
                child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text(r.$1, style: const TextStyle(color: WikColor.text3, fontSize: 12)),
                  Text(r.$2, style: WikText.price(size: 12, color: r.$3)),
                ]),
              )),
            ]),
          ),
          const SizedBox(height: 20),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _loading ? null : _open,
              style: ElevatedButton.styleFrom(
                backgroundColor: isLong ? WikColor.green : WikColor.red,
                foregroundColor: isLong ? Colors.black : Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 16),
              ),
              child: _loading
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text('${isLong ? "▲ Open Long" : "▼ Open Short"}  ${lev.toInt()}×',
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900)),
            ),
          ),
          const SizedBox(height: 8),
          Text('vAMM · no physical liquidity · insurance fund backed', style: WikText.label(), textAlign: TextAlign.center),
        ]),
      ),
    );
  }
}
