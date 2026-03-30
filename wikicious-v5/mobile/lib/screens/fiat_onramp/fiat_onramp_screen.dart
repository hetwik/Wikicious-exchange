import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class FiatOnRampScreen extends ConsumerStatefulWidget {
  const FiatOnRampScreen({super.key});
  @override ConsumerState<FiatOnRampScreen> createState() => _State();
}

class _State extends ConsumerState<FiatOnRampScreen> {
  int _amount = 500;
  String _currency = 'USD';
  String _crypto = 'USDC';
  int _providerIdx = 0;
  bool _loading = false;

  static const _currencies = ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD'];
  static const _cryptos    = ['USDC', 'ETH', 'BTC', 'ARB', 'WIK'];
  static const _providers  = [
    ('MoonPay',  '🌍', '0.5%',  '180+ countries', 'Cards, Bank, Apple Pay, Google Pay'),
    ('Transak',  '🇮🇳', '0.75%', '100+ countries', 'UPI, IMPS, Cards, Bank Wire'),
    ('Banxa',    '🇦🇺', '0.75%', '60+ countries',  'POLi, BPAY, Bank, Cards'),
    ('Ramp',     '🇬🇧', '0.5%',  '40+ countries',  'Open Banking, Cards'),
  ];

  double get _commission => _amount * double.parse(_providers[_providerIdx].$3.replaceAll('%','')) / 100;

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Buy Crypto'),
      actions: [Padding(padding: const EdgeInsets.only(right: 14),
        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Text('30d REFERRAL', style: TextStyle(color: WikColor.text3, fontSize: 9, fontWeight: FontWeight.w700)),
          const Text('\$28,400', style: TextStyle(color: WikColor.green, fontFamily: 'SpaceMono', fontSize: 13, fontWeight: FontWeight.w700)),
        ]))],
    ),
    body: SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: StatTile(label: 'Referral Rate', value: '0.5–0.75%', valueColor: WikColor.gold)),
          const SizedBox(width: 10),
          Expanded(child: StatTile(label: 'Total Orders', value: '4,820', sub: 'last 30 days', valueColor: WikColor.accent)),
        ]),
        const SizedBox(height: 16),

        // Amount
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('I WANT TO SPEND', style: WikText.label()),
            const SizedBox(height: 8),
            Row(children: [
              Expanded(child: TextField(
                keyboardType: TextInputType.number,
                controller: TextEditingController(text: _amount.toString()),
                style: WikText.price(size: 28),
                decoration: const InputDecoration(hintText: '0', border: InputBorder.none, contentPadding: EdgeInsets.zero),
                onChanged: (v) => setState(() => _amount = int.tryParse(v) ?? 0),
              )),
              DropdownButton<String>(
                value: _currency,
                dropdownColor: WikColor.bg2,
                style: WikText.price(size: 14, color: WikColor.accent),
                underline: const SizedBox(),
                items: _currencies.map((c) => DropdownMenuItem(value: c, child: Text(c))).toList(),
                onChanged: (v) => setState(() => _currency = v!),
              ),
            ]),
          ]),
        ),
        const SizedBox(height: 10),

        // Crypto
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('I WANT TO RECEIVE', style: WikText.label()),
            const SizedBox(height: 10),
            Row(children: _cryptos.map((c) => Expanded(child: GestureDetector(
              onTap: () => setState(() => _crypto = c),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                margin: const EdgeInsets.only(right: 5),
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: _crypto == c ? WikColor.accent.withOpacity(0.15) : WikColor.bg2,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: _crypto == c ? WikColor.accent : WikColor.border),
                ),
                child: Text(c, textAlign: TextAlign.center,
                  style: TextStyle(color: _crypto == c ? WikColor.accent : WikColor.text3, fontWeight: FontWeight.w700, fontSize: 10)),
              ),
            ))).toList()),
          ]),
        ),
        const SizedBox(height: 14),

        Text('SELECT PROVIDER', style: WikText.label()),
        const SizedBox(height: 8),
        ..._providers.asMap().entries.map((e) {
          final i = e.key; final p = e.value; final sel = _providerIdx == i;
          return GestureDetector(
            onTap: () => setState(() => _providerIdx = i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              margin: const EdgeInsets.only(bottom: 8),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: sel ? WikColor.green.withOpacity(0.06) : WikColor.bg1,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: sel ? WikColor.green : WikColor.border, width: sel ? 1.5 : 1),
              ),
              child: Row(children: [
                Text(p.$2, style: const TextStyle(fontSize: 22)),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(p.$1, style: TextStyle(color: sel ? WikColor.text1 : WikColor.text1, fontWeight: FontWeight.w800, fontSize: 14)),
                  Text('${p.$4} · ${p.$5}', style: const TextStyle(color: WikColor.text3, fontSize: 11)),
                ])),
                Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                  Text('Wiki earns', style: WikText.label()),
                  Text(p.$3, style: const TextStyle(color: WikColor.gold, fontFamily: 'SpaceMono', fontSize: 16, fontWeight: FontWeight.w900)),
                ]),
              ]),
            ),
          );
        }),
        const SizedBox(height: 8),

        // Summary
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
          child: Column(children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('You spend', style: TextStyle(color: WikColor.text3, fontSize: 13)),
              Text('\$$_amount $_currency', style: WikText.price(size: 13, color: WikColor.text1)),
            ]),
            const SizedBox(height: 4),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('Wiki referral', style: TextStyle(color: WikColor.text3, fontSize: 13)),
              Text('\$${_commission.toStringAsFixed(2)} $_currency', style: WikText.price(size: 13, color: WikColor.gold)),
            ]),
            const SizedBox(height: 4),
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              const Text('You receive approx.', style: TextStyle(color: WikColor.text3, fontSize: 13)),
              Text('~\$${(_amount * 0.97).toStringAsFixed(0)} $_crypto', style: WikText.price(size: 13, color: WikColor.green)),
            ]),
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
              content: Text('Opening ${_providers[_providerIdx].$1} checkout...'),
              backgroundColor: WikColor.green, behavior: SnackBarBehavior.floating));
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: WikColor.green, foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 15)),
          child: _loading
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
              : Text('Continue with ${_providers[_providerIdx].$1} ${_providers[_providerIdx].$2}',
                  style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
        )),
        const SizedBox(height: 8),
        Center(child: Text('Redirected to ${_providers[_providerIdx].$1} · ${_providers[_providerIdx].$4}',
          style: WikText.label(), textAlign: TextAlign.center)),
      ]),
    ),
  );
}
