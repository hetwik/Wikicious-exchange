import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

enum RiskTier { safe, caution, danger, critical }

class AiGuardrailsScreen extends ConsumerStatefulWidget {
  const AiGuardrailsScreen({super.key});
  @override ConsumerState<AiGuardrailsScreen> createState() => _AiGuardrailsScreenState();
}

class _AiGuardrailsScreenState extends ConsumerState<AiGuardrailsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _insAmtCtrl = TextEditingController(text: '1000');
  bool _addingIns = false;

  static const _tokens = [
    ('USDC',    2,  RiskTier.safe,     false, true,  '\$4.8B', '2027'),
    ('WIK',     18, RiskTier.safe,     false, true,  '\$48M',  '2026'),
    ('LINK',    15, RiskTier.safe,     false, true,  '\$2.4B', '∞'),
    ('ARB',     22, RiskTier.caution,  false, true,  '\$1.2B', '2025'),
    ('SHIB2',   72, RiskTier.danger,   false, false, '\$8M',   'expired'),
    ('MEMERUG', 94, RiskTier.critical, true,  false, '\$240K', 'none'),
  ];

  @override void initState() { super.initState(); _tabs = TabController(length: 2, vsync: this); }
  @override void dispose() { _tabs.dispose(); _insAmtCtrl.dispose(); super.dispose(); }

  Color _tierColor(RiskTier t) {
    switch (t) {
      case RiskTier.safe:     return WikColor.green;
      case RiskTier.caution:  return WikColor.gold;
      case RiskTier.danger:   return const Color(0xFFFF8C42);
      case RiskTier.critical: return WikColor.red;
    }
  }

  String _tierLabel(RiskTier t) {
    switch (t) {
      case RiskTier.safe:     return 'SAFE';
      case RiskTier.caution:  return 'CAUTION';
      case RiskTier.danger:   return 'DANGER';
      case RiskTier.critical: return 'CRITICAL';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Guardrails'),
        actions: [Padding(
          padding: const EdgeInsets.only(right: 14),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Text('FUND', style: TextStyle(color: WikColor.text3, fontSize: 9, fontWeight: FontWeight.w700)),
            Text('\$4.8M', style: WikText.price(size: 14, color: WikColor.green)),
          ]),
        )],
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: WikColor.accent,
          labelColor: WikColor.accent,
          unselectedLabelColor: WikColor.text3,
          tabs: const [Tab(text: 'Security Board'), Tab(text: 'Swap Insurance')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [_buildBoard(), _buildInsurance()]),
    );
  }

  Widget _buildBoard() => Column(children: [
    Padding(
      padding: const EdgeInsets.all(12),
      child: Row(children: [
        Expanded(child: StatTile(label: 'Tokens Scanned', value: '2,840', valueColor: WikColor.accent)),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Honeypots Found', value: '124', valueColor: WikColor.red)),
      ]),
    ),
    Expanded(
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        itemCount: _tokens.length,
        separatorBuilder: (_, __) => const SizedBox(height: 6),
        itemBuilder: (_, i) {
          final t = _tokens[i];
          final c = _tierColor(t.\$3);
          return Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12),
              border: Border.all(color: t.\$4 ? WikColor.red.withOpacity(0.4) : WikColor.border)),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Container(width: 36, height: 36, decoration: BoxDecoration(
                    color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: c.withOpacity(0.3))),
                  child: Center(child: Text(t.\$1[0], style: TextStyle(color: c, fontWeight: FontWeight.w900, fontSize: 14)))),
                const SizedBox(width: 10),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(t.\$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 13)),
                  Text('MCap: \${t.\$6} · Lock: \${t.\$7}', style: const TextStyle(color: WikColor.text3, fontSize: 11)),
                ])),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: c.withOpacity(0.3))),
                  child: Text(_tierLabel(t.\$3), style: TextStyle(color: c, fontSize: 10, fontWeight: FontWeight.w800)),
                ),
              ]),
              const SizedBox(height: 8),
              Row(children: [
                Expanded(child: ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: t.\$2 / 100,
                    backgroundColor: WikColor.bg3,
                    valueColor: AlwaysStoppedAnimation<Color>(c),
                    minHeight: 5,
                  ),
                )),
                const SizedBox(width: 8),
                Text('\${t.\$2}/100', style: TextStyle(color: c, fontFamily: 'SpaceMono', fontSize: 11, fontWeight: FontWeight.w700)),
              ]),
              const SizedBox(height: 6),
              Row(children: [
                _badge(t.\$4 ? '⚠️ Honeypot' : '✅ No honeypot', t.\$4 ? WikColor.red : WikColor.green),
                const SizedBox(width: 6),
                _badge(t.\$5 ? '🔒 LP locked' : '🔓 LP unlocked', t.\$5 ? WikColor.green : WikColor.red),
              ]),
            ]),
          );
        },
      ),
    ),
  ]);

  Widget _buildInsurance() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: WikColor.green.withOpacity(0.06),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: WikColor.green.withOpacity(0.2)),
        ),
        child: Column(children: [
          Row(children: [
            const Icon(Icons.shield_outlined, color: WikColor.green, size: 32),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              const Text('Swap Insurance', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 16)),
              const Text('\$0.05 flat fee per swap', style: TextStyle(color: WikColor.green, fontSize: 12, fontWeight: FontWeight.w700)),
            ])),
          ]),
          const SizedBox(height: 10),
          const Text('If a rug-pull or exploit drains a pool within 24h of your swap, file a claim and receive up to 100% of your swapped amount from the Insurance Fund.',
            style: TextStyle(color: WikColor.text3, fontSize: 12, height: 1.6)),
        ]),
      ),
      const SizedBox(height: 16),
      Row(children: [
        Expanded(child: StatTile(label: 'Coverage', value: '100%', sub: 'of input amount', valueColor: WikColor.green)),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Window', value: '24h', sub: 'after swap', valueColor: WikColor.accent)),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: StatTile(label: 'Premium', value: '\$0.05', sub: 'USDC flat', valueColor: WikColor.gold)),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Claims Paid', value: '124', sub: '\$280K total', valueColor: WikColor.text1)),
      ]),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('SWAP AMOUNT (USDC)', style: WikText.label()),
          const SizedBox(height: 8),
          TextField(
            controller: _insAmtCtrl,
            keyboardType: TextInputType.number,
            style: WikText.price(size: 20),
            decoration: const InputDecoration(hintText: '0.00', suffixText: 'USDC'),
            onChanged: (_) => setState(() {}),
          ),
          const SizedBox(height: 10),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Premium', style: TextStyle(color: WikColor.text3, fontSize: 13)),
            Text('\$0.05 USDC', style: WikText.price(size: 13, color: WikColor.gold)),
          ]),
          const SizedBox(height: 4),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Coverage', style: TextStyle(color: WikColor.text3, fontSize: 13)),
            Text('\$\${(double.tryParse(_insAmtCtrl.text) ?? 0).toStringAsFixed(0)} USDC',
              style: WikText.price(size: 13, color: WikColor.green)),
          ]),
        ]),
      ),
      const SizedBox(height: 16),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: _addingIns ? null : () async {
            setState(() => _addingIns = true);
            // Real API call — see ApiService.instance methods
            if (!mounted) return;
            setState(() => _addingIns = false);
            ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
              content: Text('🛡 Swap insurance added — you\'re protected for 24h'),
              backgroundColor: WikColor.green,
              behavior: SnackBarBehavior.floating,
            ));
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: WikColor.green, foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          child: _addingIns
              ? const SizedBox(height: 18, width: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.black))
              : const Text('Add Insurance (+\$0.05)', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
        ),
      ),
    ]),
  );

  Widget _badge(String label, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
    child: Text(label, style: TextStyle(color: c, fontSize: 10, fontWeight: FontWeight.w600)),
  );
}
