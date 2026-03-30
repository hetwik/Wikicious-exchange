import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class SmartWalletScreen extends ConsumerStatefulWidget {
  const SmartWalletScreen({super.key});
  @override ConsumerState<SmartWalletScreen> createState() => _SmartWalletScreenState();
}

class _SmartWalletScreenState extends ConsumerState<SmartWalletScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;
  String _gasToken = 'USDC';
  bool _deploying = false;

  static const _gasTokens = [
    ('USDC', '💵', '12%'), ('WIK', '🔵', '10%'),
    ('WETH', 'Ξ',  '12%'), ('ARB', '🔴', '12%'),
  ];

  static const _sessionKeys = [
    ('MyAlgoBot', '7d left', '\$500/tx', true),
    ('GridBot',   '3d left', '\$200/tx', true),
  ];

  static const _batchTemplates = [
    ('Open Position + TP/SL',     3, 'Open long + set take profit + stop loss'),
    ('Approve + Swap + Stake',    3, 'Approve token + swap to WIK + stake'),
    ('Close Position + Withdraw', 2, 'Close perp + withdraw margin to wallet'),
  ];

  @override void initState() { super.initState(); _tabs = TabController(length: 4, vsync: this); }
  @override void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Smart Wallet'),
        actions: [Padding(
          padding: const EdgeInsets.only(right: 14),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Container(width: 8, height: 8, decoration: BoxDecoration(color: WikColor.green, shape: BoxShape.circle,
              boxShadow: [BoxShadow(color: WikColor.green.withOpacity(0.6), blurRadius: 6)])),
            const SizedBox(width: 6),
            const Text('Active', style: TextStyle(color: WikColor.green, fontSize: 11, fontWeight: FontWeight.w700)),
          ]),
        )],
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: WikColor.accent,
          labelColor: WikColor.accent,
          unselectedLabelColor: WikColor.text3,
          isScrollable: true,
          tabs: const [Tab(text: 'Overview'), Tab(text: 'Gasless'), Tab(text: 'Sessions'), Tab(text: 'Recovery')],
        ),
      ),
      body: TabBarView(controller: _tabs, children: [
        _buildOverview(), _buildGasless(), _buildSessions(), _buildRecovery(),
      ]),
    );
  }

  Widget _buildOverview() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      Row(children: [
        Expanded(child: StatTile(label: 'Gas Saved', value: '\$48.20', sub: 'this month', valueColor: WikColor.green)),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Batch Txs', value: '142', sub: 'vs 284 individual', valueColor: WikColor.accent)),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: StatTile(label: 'Session Keys', value: '2', sub: 'active delegates', valueColor: WikColor.gold)),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Guardians', value: '3', sub: 'social recovery', valueColor: Color(0xFFA855F7))),
      ]),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Smart Account', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(8)),
            child: Row(children: [
              Expanded(child: Text('0x4a2f8b3c...e1d9', style: WikText.mono.copyWith(color: WikColor.accent, fontSize: 12))),
              GestureDetector(
                onTap: () { Clipboard.setData(const ClipboardData(text: '0x4a2f8b3c...e1d9'));
                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied!'), behavior: SnackBarBehavior.floating)); },
                child: const Icon(Icons.copy_outlined, size: 16, color: WikColor.text3),
              ),
            ]),
          ),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
            decoration: BoxDecoration(color: WikColor.green.withOpacity(0.08), borderRadius: BorderRadius.circular(8),
              border: Border.all(color: WikColor.green.withOpacity(0.25))),
            child: Row(children: [
              Icon(Icons.check_circle_outline, color: WikColor.green, size: 16),
              const SizedBox(width: 8),
              const Text('Deployed on Arbitrum One · ERC-4337 v0.6', style: TextStyle(color: WikColor.green, fontSize: 11, fontWeight: FontWeight.w600)),
            ]),
          ),
        ]),
      ),
      const SizedBox(height: 14),
      ...[
        (Icons.electric_bolt_outlined, 'Gasless Trading', 'Pay gas in any token — 12% markup'),
        (Icons.key_outlined,           'Session Keys',    'Delegate limited trading to bots'),
        (Icons.inventory_2_outlined,   'Batch Txs',       'Multiple calls in one UserOperation'),
        (Icons.supervised_user_circle_outlined, 'Social Recovery', '2-of-3 guardian signatures'),
      ].map((item) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
        child: Row(children: [
          Container(width: 36, height: 36, decoration: BoxDecoration(color: WikColor.accent.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
            child: Icon(item.$1, color: WikColor.accent, size: 18)),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(item.$2, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 13)),
            Text(item.$3, style: const TextStyle(color: WikColor.text3, fontSize: 11)),
          ])),
          const Icon(Icons.arrow_forward_ios, size: 14, color: WikColor.text3),
        ]),
      )),
    ]),
  );

  Widget _buildGasless() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: WikColor.green.withOpacity(0.08), borderRadius: BorderRadius.circular(10),
          border: Border.all(color: WikColor.green.withOpacity(0.2))),
        child: const Text('Instead of holding ETH for gas, pay directly in the token you already have. Wikicious charges a 10–12% convenience markup on the actual gas cost.',
          style: TextStyle(color: WikColor.text2, fontSize: 12, height: 1.6)),
      ),
      const SizedBox(height: 16),
      Text('SELECT GAS TOKEN', style: WikText.label()),
      const SizedBox(height: 10),
      ...List.generate(_gasTokens.length, (i) {
        final t = _gasTokens[i]; final sel = _gasToken == t.$1;
        return GestureDetector(
          onTap: () => setState(() => _gasToken = t.$1),
          child: Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: sel ? WikColor.green.withOpacity(0.08) : WikColor.bg1,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: sel ? WikColor.green : WikColor.border, width: sel ? 1.5 : 1),
            ),
            child: Row(children: [
              Text(t.$2, style: const TextStyle(fontSize: 24)),
              const SizedBox(width: 12),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(t.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 14)),
                Text('${t.$3} markup · saves ~\$0.40/tx', style: const TextStyle(color: WikColor.text3, fontSize: 11)),
              ])),
              if (sel) Icon(Icons.check_circle, color: WikColor.green, size: 20),
            ]),
          ),
        );
      }),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('GAS COMPARISON', style: WikText.label()),
          const SizedBox(height: 10),
          ...[
            ('Standard ETH', 'Must hold 0.01+ ETH', WikColor.red),
            ('WikiPaymaster', 'Pay in $_gasToken + 12% markup', WikColor.green),
            ('VIP veWIK', 'Protocol pays — free', WikColor.gold),
          ].map((r) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(children: [
              Container(width: 8, height: 8, decoration: BoxDecoration(color: r.$3, shape: BoxShape.circle)),
              const SizedBox(width: 10),
              Expanded(child: Text(r.$1, style: const TextStyle(color: WikColor.text1, fontSize: 12, fontWeight: FontWeight.w600))),
              Text(r.$2, style: TextStyle(color: r.$3, fontSize: 11, fontWeight: FontWeight.w600)),
            ]),
          )),
        ]),
      ),
    ]),
  );

  Widget _buildSessions() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text('SESSION KEYS', style: WikText.label()),
        TextButton.icon(
          onPressed: () => _showAddKeyDialog(),
          icon: const Icon(Icons.add, size: 16),
          label: const Text('New Key'),
          style: TextButton.styleFrom(foregroundColor: WikColor.accent),
        ),
      ]),
      const SizedBox(height: 8),
      ..._sessionKeys.map((k) => Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 36, height: 36, decoration: BoxDecoration(color: WikColor.gold.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.vpn_key_outlined, color: WikColor.gold, size: 18)),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(k.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 13)),
              Text('0x7f3a…b2c4', style: WikText.mono.copyWith(color: WikColor.text3, fontSize: 10)),
            ])),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: WikColor.green.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
              child: const Text('Active', style: TextStyle(color: WikColor.green, fontSize: 10, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            _keyBadge('Expires', k.$2, WikColor.gold),
            const SizedBox(width: 8),
            _keyBadge('Max/tx', k.$3, WikColor.text2),
            const Spacer(),
            TextButton(
              onPressed: () {},
              style: TextButton.styleFrom(foregroundColor: WikColor.red, minimumSize: Size.zero, padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4)),
              child: const Text('Revoke', style: TextStyle(fontSize: 11)),
            ),
          ]),
        ]),
      )),
      const SizedBox(height: 16),
      Text('BATCH TEMPLATES', style: WikText.label()),
      const SizedBox(height: 10),
      ..._batchTemplates.map((t) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
        child: Row(children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(t.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 12)),
            Text(t.$3, style: const TextStyle(color: WikColor.text3, fontSize: 11)),
          ])),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(color: WikColor.accent.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
            child: Text('${t.$2} calls', style: const TextStyle(color: WikColor.accent, fontSize: 10, fontWeight: FontWeight.w700)),
          ),
        ]),
      )),
    ]),
  );

  Widget _buildRecovery() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: const Color(0xFFA855F7).withOpacity(0.08), borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFFA855F7).withOpacity(0.25))),
        child: const Text('If you lose your private key, your 3 guardians collectively sign a recovery transaction to transfer ownership to a new wallet. No seed phrase needed.',
          style: TextStyle(color: WikColor.text2, fontSize: 12, height: 1.6)),
      ),
      const SizedBox(height: 16),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('YOUR GUARDIANS', style: WikText.label()),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: WikColor.accent.withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
              child: const Text('2-of-3 threshold', style: TextStyle(color: WikColor.accent, fontSize: 10, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 12),
          ...[
            ('0x7f3a…b2c4', 'Hardware wallet'),
            ('0x2b8c…d1e5', 'Trusted friend'),
            ('0x9d1e…4f7a', 'Backup device'),
          ].map((g) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 6),
            child: Row(children: [
              Container(width: 36, height: 36, decoration: BoxDecoration(
                  color: const Color(0xFFA855F7).withOpacity(0.12), borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFA855F7).withOpacity(0.3))),
                child: const Icon(Icons.shield_outlined, color: Color(0xFFA855F7), size: 18)),
              const SizedBox(width: 10),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(g.$1, style: WikText.mono.copyWith(color: WikColor.text1, fontSize: 12)),
                Text(g.$2, style: const TextStyle(color: WikColor.text3, fontSize: 11)),
              ])),
              const Icon(Icons.check_circle, color: WikColor.green, size: 18),
            ]),
          )),
        ]),
      ),
      const SizedBox(height: 16),
      SizedBox(
        width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () {},
          icon: const Icon(Icons.lock_reset_outlined),
          label: const Text('Initiate Recovery'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFA855F7),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
        ),
      ),
    ]),
  );

  Widget _keyBadge(String label, String value, Color c) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: c.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
    child: Text('$label: $value', style: TextStyle(color: c, fontSize: 10, fontWeight: FontWeight.w600)),
  );

  void _showAddKeyDialog() {
    showModalBottomSheet(context: context, isScrollControlled: true,
      backgroundColor: WikColor.bg1,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: EdgeInsets.only(left: 20, right: 20, top: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 32),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('New Session Key', style: TextStyle(color: WikColor.text1, fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 16),
          const TextField(decoration: InputDecoration(labelText: 'Key Label (e.g. MyBot)')),
          const SizedBox(height: 10),
          const TextField(keyboardType: TextInputType.number, decoration: InputDecoration(labelText: 'Max spend per tx (USDC)', suffixText: 'USDC')),
          const SizedBox(height: 10),
          const TextField(keyboardType: TextInputType.number, decoration: InputDecoration(labelText: 'Duration (days)', suffixText: 'days')),
          const SizedBox(height: 20),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () => Navigator.pop(context),
            style: ElevatedButton.styleFrom(backgroundColor: WikColor.gold, foregroundColor: Colors.black),
            child: const Text('Create Session Key', style: TextStyle(fontWeight: FontWeight.w900)),
          )),
        ]),
      ));
  }
}
