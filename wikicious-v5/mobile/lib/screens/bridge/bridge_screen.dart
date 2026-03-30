import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class BridgeScreen extends ConsumerStatefulWidget {
  const BridgeScreen({super.key});
  @override
  ConsumerState<BridgeScreen> createState() => _BridgeScreenState();
}

class _BridgeScreenState extends ConsumerState<BridgeScreen> {
  int _fromChainIdx = 0;
  int _toChainIdx   = 1;
  int _tokenIdx     = 0;
  final _amtCtrl    = TextEditingController();
  bool _bridging    = false;

  static const _chains = [
    (name: 'Arbitrum',  icon: '🔵', id: 42161),
    (name: 'Ethereum',  icon: '⬡',  id: 1),
    (name: 'Optimism',  icon: '🔴', id: 10),
    (name: 'Base',      icon: '🟦', id: 8453),
    (name: 'Polygon',   icon: '🟣', id: 137),
  ];
  static const _tokens = [
    (sym: 'USDC', icon: '💵', decimals: 6),
    (sym: 'WETH', icon: 'Ξ',  decimals: 18),
    (sym: 'ARB',  icon: 'A',  decimals: 18),
  ];

  @override
  void dispose() { _amtCtrl.dispose(); super.dispose(); }

  double get _amt  => double.tryParse(_amtCtrl.text) ?? 0;
  double get _fee  => _amt * 0.001;
  double get _rcv  => _amt - _fee;

  void _swap() => setState(() {
    final tmp = _fromChainIdx;
    _fromChainIdx = _toChainIdx;
    _toChainIdx = tmp;
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Cross-Chain Bridge')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(children: [
          // Stats
          Row(children: [
            Expanded(child: StatTile(label: 'Total Volume', value: '\$24.8M', valueColor: WikColor.accent)),
            const SizedBox(width: 10),
            Expanded(child: StatTile(label: 'Bridge Fee', value: '0.1%', valueColor: WikColor.green)),
          ]),
          const SizedBox(height: 20),

          // Token selector
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(14), border: Border.all(color: WikColor.border)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Token', style: WikText.label()),
              const SizedBox(height: 8),
              Row(children: _tokens.asMap().entries.map((e) => Expanded(child: GestureDetector(
                onTap: () => setState(() => _tokenIdx = e.key),
                child: Container(
                  margin: EdgeInsets.only(right: e.key < _tokens.length - 1 ? 6 : 0),
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: _tokenIdx == e.key ? WikColor.accentBg : WikColor.bg2,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: _tokenIdx == e.key ? WikColor.accent : WikColor.border),
                  ),
                  alignment: Alignment.center,
                  child: Column(children: [
                    Text(e.value.icon, style: const TextStyle(fontSize: 18)),
                    const SizedBox(height: 2),
                    Text(e.value.sym, style: TextStyle(color: _tokenIdx == e.key ? WikColor.accent : WikColor.text2, fontWeight: FontWeight.w700, fontSize: 11)),
                  ]),
                ),
              ))).toList()),
            ]),
          ),
          const SizedBox(height: 12),

          // Chain selectors
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(14), border: Border.all(color: WikColor.border)),
            child: Row(children: [
              Expanded(child: _ChainPicker(label: 'FROM', chains: _chains, selectedIdx: _fromChainIdx, onChanged: (i) => setState(() => _fromChainIdx = i))),
              GestureDetector(
                onTap: _swap,
                child: Container(
                  width: 40, height: 40,
                  decoration: BoxDecoration(color: WikColor.accentBg, shape: BoxShape.circle, border: Border.all(color: WikColor.accent.withOpacity(0.4))),
                  child: const Icon(Icons.swap_horiz, color: WikColor.accent, size: 20),
                ),
              ),
              Expanded(child: _ChainPicker(label: 'TO', chains: _chains, selectedIdx: _toChainIdx, onChanged: (i) => setState(() => _toChainIdx = i))),
            ]),
          ),
          const SizedBox(height: 12),

          // Amount
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(14), border: Border.all(color: WikColor.border)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Amount', style: WikText.label()),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(child: TextField(
                  controller: _amtCtrl,
                  onChanged: (_) => setState(() {}),
                  keyboardType: TextInputType.number,
                  style: WikText.price(size: 20),
                  decoration: InputDecoration(hintText: '0.00', suffixText: _tokens[_tokenIdx].sym, border: InputBorder.none),
                )),
                GestureDetector(
                  onTap: () { _amtCtrl.text = '100'; setState(() {}); },
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: WikColor.accentBg, borderRadius: BorderRadius.circular(6)),
                    child: const Text('MAX', style: TextStyle(color: WikColor.accent, fontSize: 11, fontWeight: FontWeight.w800)),
                  ),
                ),
              ]),
            ]),
          ),

          // Preview
          if (_amt > 0) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
              child: Column(children: [
                _SummaryRow('Bridge Fee (0.1%)', '${_fee.toStringAsFixed(6)} ${_tokens[_tokenIdx].sym}'),
                _SummaryRow('You Receive', '${_rcv.toStringAsFixed(6)} ${_tokens[_tokenIdx].sym}', WikColor.green),
                _SummaryRow('Est. Time', '2–5 minutes'),
                _SummaryRow('From → To', '${_chains[_fromChainIdx].name} → ${_chains[_toChainIdx].name}'),
              ]),
            ),
          ],
          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _bridging || _amt <= 0 ? null : () async {
                setState(() => _bridging = true);
                await // Future.value removed(const Duration(seconds: 2));
                if (mounted) {
                  setState(() => _bridging = false);
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(
                    content: Text('Bridge initiated: $_amt ${_tokens[_tokenIdx].sym} → ${_chains[_toChainIdx].name}'),
                    backgroundColor: WikColor.green, behavior: SnackBarBehavior.floating,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ));
                }
              },
              child: _bridging
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : Text('Bridge ${_tokens[_tokenIdx].sym} to ${_chains[_toChainIdx].name}', style: const TextStyle(fontWeight: FontWeight.w700)),
            ),
          ),

          // Supported chains
          const SizedBox(height: 20),
          Text('Supported Chains', style: WikText.label()),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 8, children: _chains.map((c) => Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(8), border: Border.all(color: WikColor.border)),
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Text(c.icon, style: const TextStyle(fontSize: 14)),
              const SizedBox(width: 6),
              Text(c.name, style: const TextStyle(color: WikColor.text2, fontSize: 12, fontWeight: FontWeight.w600)),
            ]),
          )).toList()),
        ]),
      ),
    );
  }
}

class _ChainPicker extends StatelessWidget {
  final String label;
  final List chains;
  final int selectedIdx;
  final ValueChanged<int> onChanged;
  const _ChainPicker({required this.label, required this.chains, required this.selectedIdx, required this.onChanged});

  @override
  Widget build(BuildContext context) {
    final selected = chains[selectedIdx];
    return GestureDetector(
      onTap: () => showModalBottomSheet(
        context: context,
        backgroundColor: WikColor.bg1,
        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
        builder: (_) => Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(padding: const EdgeInsets.all(16), child: Text('Select Chain', style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 16))),
            ...chains.asMap().entries.map((e) => ListTile(
              leading: Text(e.value.icon, style: const TextStyle(fontSize: 20)),
              title: Text(e.value.name, style: const TextStyle(color: WikColor.text1)),
              onTap: () { onChanged(e.key); Navigator.pop(context); },
            )).toList(),
            const SizedBox(height: 8),
          ],
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.center, children: [
        Text(label, style: WikText.label()),
        const SizedBox(height: 6),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
          decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Text(selected.icon, style: const TextStyle(fontSize: 18)),
            const SizedBox(width: 6),
            Text(selected.name, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 12)),
            const Icon(Icons.keyboard_arrow_down, color: WikColor.text3, size: 14),
          ]),
        ),
      ]),
    );
  }
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
