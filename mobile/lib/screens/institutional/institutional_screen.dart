import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class InstitutionalScreen extends ConsumerStatefulWidget {
  const InstitutionalScreen({super.key});
  @override ConsumerState<InstitutionalScreen> createState() => _State();
}

class _State extends ConsumerState<InstitutionalScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  bool _kyb = true;
  bool _showKybForm = false;

  static const _pools = [
    ('USDC/USDT Inst.',  '\$48M', '0.01%', '0.008%'),
    ('WBTC/USDC Inst.',  '\$28M', '0.05%', '0.04%'),
    ('WETH/USDC Inst.',  '\$36M', '0.05%', '0.04%'),
    ('ARB/USDC Inst.',   '\$12M', '0.10%', '0.08%'),
  ];

  static const _subs = [
    ('BASIC',      '\$5,000/mo',   ['3 pools access', 'Standard execution', 'Compliance docs']),
    ('PRO',        '\$15,000/mo',  ['All pools', 'Priority execution', 'OTC desk access', 'Dedicated support']),
    ('ENTERPRISE', '\$50,000/yr',  ['Custom pools', 'White-glove onboarding', 'Direct API', 'SLA guarantee', 'Custom fees']),
  ];

  @override void initState() { super.initState(); _tabs = TabController(length: 3, vsync: this); }
  @override void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Institutional'),
      actions: [Padding(padding: const EdgeInsets.only(right: 14),
        child: _kyb
          ? Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: WikColor.gold.withOpacity(0.15), borderRadius: BorderRadius.circular(8),
                border: Border.all(color: WikColor.gold.withOpacity(0.3))),
              child: const Text('KYB ✓', style: TextStyle(color: WikColor.gold, fontSize: 11, fontWeight: FontWeight.w800)))
          : TextButton(onPressed: () => setState(() => _showKybForm = true),
              child: const Text('Apply KYB', style: TextStyle(color: WikColor.accent, fontWeight: FontWeight.w700))))],
      bottom: TabBar(controller: _tabs, indicatorColor: WikColor.gold, labelColor: WikColor.gold,
        unselectedLabelColor: WikColor.text3,
        tabs: const [Tab(text: 'Pools'), Tab(text: 'Subscribe'), Tab(text: 'KYB')]),
    ),
    body: TabBarView(controller: _tabs, children: [_buildPools(), _buildSubs(), _buildKyb()]),
  );

  Widget _buildPools() => SingleChildScrollView(
    padding: const EdgeInsets.all(12),
    child: Column(children: [
      if (_kyb) Container(
        padding: const EdgeInsets.all(12), margin: const EdgeInsets.only(bottom: 12),
        decoration: BoxDecoration(color: WikColor.gold.withOpacity(0.08), borderRadius: BorderRadius.circular(10),
          border: Border.all(color: WikColor.gold.withOpacity(0.25))),
        child: Row(children: [
          const Icon(Icons.verified_outlined, color: WikColor.gold, size: 20),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const Text('Nexus Capital Ltd.', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 13)),
            const Text('Cayman Islands · PRO Subscription', style: TextStyle(color: WikColor.text3, fontSize: 11)),
          ]),
        ]),
      ),
      Row(children: [
        Expanded(child: StatTile(label: 'Inst. TVL', value: '\$112M', valueColor: WikColor.gold)),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Institutions', value: '42', sub: 'KYB verified', valueColor: WikColor.accent)),
      ]),
      const SizedBox(height: 12),
      ..._pools.map((p) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: WikColor.gold.withOpacity(0.2))),
        child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(p.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 14)),
            ElevatedButton(
              onPressed: _kyb ? () {} : null,
              style: ElevatedButton.styleFrom(
                backgroundColor: WikColor.gold, foregroundColor: Colors.black,
                minimumSize: const Size(80, 32),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
              ),
              child: const Text('Trade', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
            ),
          ]),
          const SizedBox(height: 8),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('TVL: ${p.$2}', style: const TextStyle(color: WikColor.text3, fontSize: 12)),
            Text('Swap fee: ${p.$3}', style: TextStyle(color: WikColor.green, fontSize: 12, fontWeight: FontWeight.w600)),
            Text('LP fee: ${p.$4}', style: const TextStyle(color: WikColor.accent, fontSize: 12)),
          ]),
        ]),
      )),
    ]),
  );

  Widget _buildSubs() => ListView.separated(
    padding: const EdgeInsets.all(12),
    itemCount: _subs.length,
    separatorBuilder: (_, __) => const SizedBox(height: 10),
    itemBuilder: (_, i) {
      final s = _subs[i]; final isPro = i == 1;
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: WikColor.bg1, borderRadius: BorderRadius.circular(14),
          border: Border.all(color: isPro ? WikColor.gold : WikColor.border, width: isPro ? 1.5 : 1),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Text(s.$1, style: TextStyle(color: isPro ? WikColor.gold : WikColor.text1,
              fontWeight: FontWeight.w900, fontSize: 16)),
            if (isPro) ...[const SizedBox(width: 8), Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(color: WikColor.gold, borderRadius: BorderRadius.circular(10)),
              child: const Text('POPULAR', style: TextStyle(color: Colors.black, fontSize: 9, fontWeight: FontWeight.w900)))],
            const Spacer(),
            Text(s.$2, style: WikText.price(size: 16, color: isPro ? WikColor.gold : WikColor.text1)),
          ]),
          const SizedBox(height: 10),
          ...s.$3.map((f) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 3),
            child: Row(children: [
              Icon(Icons.check, color: isPro ? WikColor.gold : WikColor.green, size: 16),
              const SizedBox(width: 8),
              Text(f, style: const TextStyle(color: WikColor.text2, fontSize: 12)),
            ]),
          )),
          const SizedBox(height: 12),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(
              backgroundColor: isPro ? WikColor.gold : WikColor.bg3,
              foregroundColor: isPro ? Colors.black : WikColor.text1,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
            ),
            child: Text('Select ${s.$1}', style: const TextStyle(fontWeight: FontWeight.w800)),
          )),
        ]),
      );
    },
  );

  Widget _buildKyb() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        padding: const EdgeInsets.all(12), margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
        child: const Text('Verification takes 1–3 business days. Required: company registration, beneficial ownership declaration, compliance officer contact.',
          style: TextStyle(color: WikColor.text3, fontSize: 12, height: 1.6)),
      ),
      ...[
        'Institution Name',
        'Jurisdiction / Country',
        'Compliance Contact Email',
        'Company Registration Number',
      ].map((l) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: TextField(decoration: InputDecoration(labelText: l)),
      )),
      const SizedBox(height: 6),
      SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: () {},
        style: ElevatedButton.styleFrom(
          backgroundColor: WikColor.gold, foregroundColor: Colors.black,
          padding: const EdgeInsets.symmetric(vertical: 14)),
        child: const Text('Submit KYB Application', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
      )),
    ]),
  );
}
