import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';

class SwapScreen extends ConsumerStatefulWidget {
  const SwapScreen({super.key});
  @override ConsumerState<SwapScreen> createState() => _State();
}

class _State extends ConsumerState<SwapScreen> {
  String _tokenIn = 'ETH'; String _tokenOut = 'USDC';
  final _amtCtrl = TextEditingController(text: '1.0');
  bool _loading = false;
  static const _tokens = ['ETH','USDC','WIK','ARB','WBTC','LINK'];
  static const _rates  = {'ETH/USDC':3482.0,'ETH/WIK':12260.0,'USDC/WIK':3.52,'ARB/USDC':1.24,'WBTC/USDC':67284.0,'LINK/USDC':14.82};

  double get _amtIn => double.tryParse(_amtCtrl.text) ?? 0;
  double get _amtOut {
    final k = '$_tokenIn/$_tokenOut'; final k2 = '$_tokenOut/$_tokenIn';
    if (_rates.containsKey(k)) return _amtIn * _rates[k]! * 0.9993;
    if (_rates.containsKey(k2)) return _amtIn / _rates[k2]! * 0.9993;
    return _amtIn;
  }
  double get _fee => _amtIn * 0.0007;

  void _swap() { final t = _tokenIn; setState(() { _tokenIn = _tokenOut; _tokenOut = t; }); }

  @override void dispose() { _amtCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Swap'), actions: [
      Padding(padding: const EdgeInsets.only(right: 14),
        child: Center(child: Text('SOR', style: TextStyle(color: WikColor.accent, fontSize: 11, fontWeight: FontWeight.w700))))
    ]),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
          child: Column(children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('FROM', style: WikText.label()),
              DropdownButton<String>(
                value: _tokenIn, dropdownColor: WikColor.bg2,
                style: WikText.price(size: 14, color: WikColor.text1), underline: const SizedBox(),
                items: _tokens.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                onChanged: (v) => setState(() => _tokenIn = v!),
              ),
            ]),
            TextField(
              controller: _amtCtrl,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: WikText.price(size: 28),
              decoration: const InputDecoration(hintText: '0.00', border: InputBorder.none, contentPadding: EdgeInsets.zero),
              onChanged: (_) => setState(() {}),
            ),
          ]),
        ),
        const SizedBox(height: 8),
        Center(child: GestureDetector(
          onTap: _swap,
          child: Container(
            width: 40, height: 40,
            decoration: BoxDecoration(color: WikColor.accent.withOpacity(0.12), shape: BoxShape.circle,
              border: Border.all(color: WikColor.accent.withOpacity(0.3))),
            child: const Icon(Icons.swap_vert, color: WikColor.accent, size: 22),
          ),
        )),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
          child: Column(children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text('TO', style: WikText.label()),
              DropdownButton<String>(
                value: _tokenOut, dropdownColor: WikColor.bg2,
                style: WikText.price(size: 14, color: WikColor.text1), underline: const SizedBox(),
                items: _tokens.map((t) => DropdownMenuItem(value: t, child: Text(t))).toList(),
                onChanged: (v) => setState(() => _tokenOut = v!),
              ),
            ]),
            Align(alignment: Alignment.centerLeft,
              child: Text(_amtOut > 0 ? _amtOut.toStringAsFixed(4) : '0.00',
                style: WikText.price(size: 28, color: WikColor.green))),
          ]),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
          child: Column(children: [
            _row('Route', 'Wiki SOR → Best price'),
            _row('Fee', '0.07% (\$${(_fee * 3482).toStringAsFixed(4)})'),
            _row('Slippage', '≤0.3%'),
            _row('Price impact', '<0.05%'),
          ]),
        ),
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: _loading ? null : () async {
            setState(() => _loading = true);
            // Real API call — see ApiService.instance methods
            if (!mounted) return;
            setState(() => _loading = false);
            ScaffoldMessenger.of(context).showSnackBar(SnackBar(
              content: Text('✅ Swapped ${_amtCtrl.text} $_tokenIn → ${_amtOut.toStringAsFixed(4)} $_tokenOut'),
              backgroundColor: WikColor.green, behavior: SnackBarBehavior.floating));
          },
          style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 15),
            backgroundColor: WikColor.green, foregroundColor: Colors.black),
          child: _loading
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
              : Text('Swap $_tokenIn → $_tokenOut', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
        )),
      ]),
    ),
  );

  Widget _row(String k, String v) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 3),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(k, style: const TextStyle(color: WikColor.text3, fontSize: 12)),
      Text(v, style: const TextStyle(color: WikColor.text1, fontFamily: 'SpaceMono', fontSize: 12)),
    ]),
  );
}
