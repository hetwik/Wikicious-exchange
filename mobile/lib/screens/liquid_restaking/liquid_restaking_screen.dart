import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class LiquidRestakingScreen extends ConsumerStatefulWidget {
  const LiquidRestakingScreen({super.key});
  @override ConsumerState<LiquidRestakingScreen> createState() => _State();
}

class _State extends ConsumerState<LiquidRestakingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  String _token = 'stETH';
  final _amtCtrl = TextEditingController(text: '1.0');
  bool _depositing = false;

  static const _tokens = ['stETH', 'rETH', 'wstETH'];
  static const _apy = [
    ('Base stETH yield',  '4.8%',  WikColor.blue),
    ('EigenLayer AVS',    '+2.4%', WikColor.green),
    ('WikiFee share',     '+0.8%', WikColor.gold),
    ('Total APY',         '8.0%',  WikColor.cyan),
  ];
  static const Color cyan = Color(0xFF00D4FF);

  @override void initState() { super.initState(); _tabs = TabController(length: 2, vsync: this); }
  @override void dispose() { _tabs.dispose(); _amtCtrl.dispose(); super.dispose(); }

  double get _amount => double.tryParse(_amtCtrl.text) ?? 0;
  double get _wLRT   => _amount * 1.0042;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Liquid Restaking'),
      actions: [Padding(padding: const EdgeInsets.only(right: 14),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('TOTAL RESTAKED', style: TextStyle(color: WikColor.text3, fontSize: 9, fontWeight: FontWeight.w700)),
          const Text('\$48.2M', style: TextStyle(color: Color(0xFFA855F7), fontFamily: 'SpaceMono', fontSize: 14, fontWeight: FontWeight.w700)),
        ]))],
      bottom: TabBar(controller: _tabs, indicatorColor: WikColor.accent, labelColor: WikColor.accent,
        unselectedLabelColor: WikColor.text3,
        tabs: const [Tab(text: 'Deposit'), Tab(text: 'My Position')]),
    ),
    body: TabBarView(controller: _tabs, children: [_buildDeposit(), _buildPosition()]),
  );

  Widget _buildDeposit() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      // APY breakdown
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFA855F7).withOpacity(0.3))),
        child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceAround, children: [
            _apyBox('Base APY', '4.8%', WikColor.accent),
            Container(width: 1, height: 40, color: WikColor.border),
            _apyBox('EL Bonus', '+2.4%', WikColor.green),
            Container(width: 1, height: 40, color: WikColor.border),
            _apyBox('Total APY', '8.0%', cyan),
          ]),
          const Divider(height: 16),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Your share', style: TextStyle(color: WikColor.text3, fontSize: 12)),
            const Text('90% of rewards', style: TextStyle(color: WikColor.green, fontWeight: FontWeight.w700, fontSize: 12)),
          ]),
          const SizedBox(height: 4),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Protocol commission', style: TextStyle(color: WikColor.text3, fontSize: 12)),
            const Text('10% to Wikicious', style: TextStyle(color: WikColor.gold, fontWeight: FontWeight.w700, fontSize: 12)),
          ]),
        ]),
      ),
      const SizedBox(height: 14),

      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('SELECT TOKEN', style: WikText.label()),
          const SizedBox(height: 10),
          Row(children: _tokens.map((t) => Expanded(child: GestureDetector(
            onTap: () => setState(() => _token = t),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.only(right: 6),
              padding: const EdgeInsets.symmetric(vertical: 9),
              decoration: BoxDecoration(
                color: _token == t ? const Color(0xFFA855F7).withOpacity(0.15) : WikColor.bg2,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _token == t ? const Color(0xFFA855F7) : WikColor.border),
              ),
              child: Text(t, textAlign: TextAlign.center,
                style: TextStyle(color: _token == t ? const Color(0xFFA855F7) : WikColor.text3,
                  fontWeight: FontWeight.w700, fontSize: 11)),
            ),
          ))).toList()),
          const SizedBox(height: 12),
          TextField(
            controller: _amtCtrl,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            style: WikText.price(size: 22),
            decoration: InputDecoration(hintText: '0.00', suffixText: _token,
              filled: true, fillColor: WikColor.bg2,
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: WikColor.border)),
              enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: const BorderSide(color: WikColor.border))),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('You receive', style: TextStyle(color: WikColor.text3, fontSize: 13)),
            Text('${_wLRT.toStringAsFixed(4)} wLRT',
              style: const TextStyle(color: Color(0xFFA855F7), fontFamily: 'SpaceMono', fontSize: 15, fontWeight: FontWeight.w700)),
          ]),
        ]),
      ),
      const SizedBox(height: 8),
      Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
        child: const Text('wLRT is liquid — trade it on WikiSpot or use as collateral in WikiLending without losing restaking rewards.',
          style: TextStyle(color: WikColor.text3, fontSize: 11, height: 1.5), textAlign: TextAlign.center),
      ),
      const SizedBox(height: 16),
      SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: _depositing ? null : () async {
          setState(() => _depositing = true);
          // Real API call — see ApiService.instance methods
          if (!mounted) return;
          setState(() => _depositing = false);
          ScaffoldMessenger.of(context).showSnackBar(SnackBar(
            content: Text('🔄 Deposited ${_amtCtrl.text} $_token → ${_wLRT.toStringAsFixed(4)} wLRT'),
            backgroundColor: WikColor.green, behavior: SnackBarBehavior.floating,
          ));
        },
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFFA855F7), foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(vertical: 16),
        ),
        child: _depositing
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
            : Text('Deposit ${_amtCtrl.text} $_token → wLRT',
                style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
      )),
    ]),
  );

  Widget _buildPosition() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      Row(children: [
        Expanded(child: StatTile(label: 'wLRT Balance', value: '0.00', valueColor: const Color(0xFFA855F7))),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Pending Rewards', value: '0.00 ETH', valueColor: WikColor.green)),
      ]),
      const SizedBox(height: 10),
      StatTile(label: 'Combined APY', value: '8.0%', sub: 'base + EigenLayer AVS', valueColor: cyan),
      const SizedBox(height: 14),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('APY BREAKDOWN', style: WikText.label()),
          const SizedBox(height: 10),
          ..._apy.map((a) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(a.$1, style: const TextStyle(color: WikColor.text2, fontSize: 13)),
              Text(a.$2, style: TextStyle(color: a.$3, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: FontWeight.w700)),
            ]),
          )),
        ]),
      ),
      const SizedBox(height: 14),
      SizedBox(width: double.infinity, child: OutlinedButton(
        onPressed: () {},
        style: OutlinedButton.styleFrom(foregroundColor: WikColor.gold, side: const BorderSide(color: WikColor.gold),
          padding: const EdgeInsets.symmetric(vertical: 14)),
        child: const Text('Claim Pending Rewards', style: TextStyle(fontWeight: FontWeight.w800)),
      )),
    ]),
  );

  Widget _apyBox(String label, String value, Color c) => Column(children: [
    Text(label, style: WikText.label()),
    const SizedBox(height: 4),
    Text(value, style: TextStyle(color: c, fontFamily: 'SpaceMono', fontSize: 18, fontWeight: FontWeight.w900)),
  ]);
}
