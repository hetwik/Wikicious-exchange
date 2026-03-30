import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../theme.dart';
import '../../widgets/common/stat_tile.dart';

class AgenticDaoScreen extends ConsumerStatefulWidget {
  const AgenticDaoScreen({super.key});
  @override ConsumerState<AgenticDaoScreen> createState() => _State();
}

class _State extends ConsumerState<AgenticDaoScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _titleCtrl = TextEditingController();
  final _descCtrl  = TextEditingController();

  static const _proposals = [
    ('AI','Increase BTC/USDT fee to 0.08%','Vol spike 4.2% vs 2.1% baseline — protect LPs.','ACTIVE','18h veto','#VOLATILITY_SPIKE',true),
    ('AI','ETH pool rewards +5%','Utilisation 28% vs 62% target.','EXECUTED','','#UTILISATION_LOW',false),
    ('HUMAN','Add PEPE/USDC trading pair','\$2M TVL commitment from community.','PASSED','','',false),
    ('AI','Activate circuit breaker on SHIB2','SHIB2 flagged CRITICAL (score 94).','VETOED','','#TVL_DROP',false),
  ];

  static const _metrics = [
    ('TVL',        '\$284M', WikColor.accent),
    ('24h Volume', '\$48M',  WikColor.gold),
    ('Avg Fee',    '0.061%', WikColor.green),
    ('LP Util',    '64%',    Color(0xFFA855F7)),
  ];

  @override void initState() { super.initState(); _tabs = TabController(length: 3, vsync: this); }
  @override void dispose() { _tabs.dispose(); _titleCtrl.dispose(); _descCtrl.dispose(); super.dispose(); }

  Color _statusColor(String s) {
    switch (s) {
      case 'ACTIVE':   return WikColor.gold;
      case 'EXECUTED':
      case 'PASSED':   return WikColor.green;
      case 'VETOED':   return WikColor.red;
      default:         return WikColor.text3;
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: const Text('Agentic DAO'),
      bottom: TabBar(controller: _tabs, indicatorColor: WikColor.accent, labelColor: WikColor.accent,
        unselectedLabelColor: WikColor.text3,
        tabs: const [Tab(text: 'Proposals'), Tab(text: 'Metrics'), Tab(text: 'Propose')]),
    ),
    body: TabBarView(controller: _tabs, children: [_buildProposals(), _buildMetrics(), _buildPropose()]),
  );

  Widget _buildProposals() => ListView.separated(
    padding: const EdgeInsets.all(12),
    itemCount: _proposals.length,
    separatorBuilder: (_, __) => const SizedBox(height: 8),
    itemBuilder: (_, i) {
      final p = _proposals[i];
      final isAI = p.$1 == 'AI';
      return Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: WikColor.bg1, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: isAI ? WikColor.accent.withOpacity(0.3) : WikColor.border),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: (isAI ? WikColor.accent : WikColor.green).withOpacity(0.12),
                borderRadius: BorderRadius.circular(6)),
              child: Text(isAI ? '🤖 AI AGENT' : '👤 HUMAN',
                style: TextStyle(color: isAI ? WikColor.accent : WikColor.green, fontSize: 9, fontWeight: FontWeight.w800)),
            ),
            if (p.$6.isNotEmpty) ...[
              const SizedBox(width: 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(color: WikColor.gold.withOpacity(0.12), borderRadius: BorderRadius.circular(5)),
                child: Text(p.$6, style: const TextStyle(color: WikColor.gold, fontSize: 8, fontWeight: FontWeight.w700)),
              ),
            ],
            const Spacer(),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: _statusColor(p.$4).withOpacity(0.12), borderRadius: BorderRadius.circular(6)),
              child: Text(p.$4, style: TextStyle(color: _statusColor(p.$4), fontSize: 10, fontWeight: FontWeight.w700)),
            ),
          ]),
          const SizedBox(height: 8),
          Text(p.$2, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 13)),
          const SizedBox(height: 4),
          Text(p.$3, style: const TextStyle(color: WikColor.text3, fontSize: 12, height: 1.5)),
          if (p.$4 == 'ACTIVE') ...[
            const SizedBox(height: 10),
            Row(children: [
              Expanded(child: ElevatedButton(
                onPressed: () {},
                style: ElevatedButton.styleFrom(
                  backgroundColor: WikColor.green, foregroundColor: Colors.black,
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: const Text('✅ Support', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
              )),
              if (isAI) ...[
                const SizedBox(width: 8),
                Expanded(child: OutlinedButton(
                  onPressed: () {},
                  style: OutlinedButton.styleFrom(
                    foregroundColor: WikColor.red, side: BorderSide(color: WikColor.red.withOpacity(0.4)),
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: Text('🚫 Veto (${p.$5})', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800)),
                )),
              ],
            ]),
          ],
        ]),
      );
    },
  );

  Widget _buildMetrics() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      GridView.count(
        shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
        crossAxisCount: 2, crossAxisSpacing: 10, mainAxisSpacing: 10, childAspectRatio: 2.2,
        children: _metrics.map((m) => StatTile(label: m.$1, value: m.$2, valueColor: m.$3)).toList(),
      ),
      const SizedBox(height: 14),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('AI TRIGGER THRESHOLDS', style: WikText.label()),
          const SizedBox(height: 10),
          ...[
            ('TVL drop > 20%',       'TVL_DROP trigger → circuit breaker'),
            ('Volume spike > 3×',    'VOLUME_SPIKE → fee optimization'),
            ('Utilisation < 30%',    'UTIL_LOW → rewards rebalancing'),
            ('Volatility > 10%',     'VOL_SPIKE → dynamic fee increase'),
          ].map((r) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 5),
            child: Row(children: [
              Container(width: 6, height: 6, decoration: const BoxDecoration(color: WikColor.accent, shape: BoxShape.circle)),
              const SizedBox(width: 10),
              Expanded(child: Text(r.$1, style: const TextStyle(color: WikColor.text1, fontSize: 12, fontWeight: FontWeight.w600))),
              Expanded(child: Text(r.$2, style: const TextStyle(color: WikColor.text3, fontSize: 11))),
            ]),
          )),
        ]),
      ),
      const SizedBox(height: 14),
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('AI PROPOSAL STATS', style: WikText.label()),
          const SizedBox(height: 10),
          ...[ ('Total AI Proposals','18'), ('Executed','14 (78%)'), ('Vetoed','3 (17%)'), ('Pending','1') ].map((r) =>
            Padding(padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                Text(r.$1, style: const TextStyle(color: WikColor.text3, fontSize: 12)),
                Text(r.$2, style: const TextStyle(color: WikColor.text1, fontFamily: 'SpaceMono', fontSize: 12, fontWeight: FontWeight.w700)),
              ]))),
        ]),
      ),
    ]),
  );

  Widget _buildPropose() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: WikColor.gold.withOpacity(0.08), borderRadius: BorderRadius.circular(10),
          border: Border.all(color: WikColor.gold.withOpacity(0.25))),
        child: const Row(children: [
          Icon(Icons.lock_outline, color: WikColor.gold, size: 18),
          SizedBox(width: 10),
          Expanded(child: Text('Minimum 50,000 veWIK required to submit a proposal.',
            style: TextStyle(color: WikColor.gold, fontSize: 12, fontWeight: FontWeight.w600))),
        ]),
      ),
      const SizedBox(height: 16),
      TextField(controller: _titleCtrl, decoration: const InputDecoration(labelText: 'Proposal Title')),
      const SizedBox(height: 10),
      TextField(controller: _descCtrl, maxLines: 4, decoration: const InputDecoration(labelText: 'Description', alignLabelWithHint: true)),
      const SizedBox(height: 10),
      const TextField(decoration: InputDecoration(labelText: 'Target Contract (optional)', hintText: '0x...')),
      const SizedBox(height: 20),
      SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: () {},
        style: ElevatedButton.styleFrom(padding: const EdgeInsets.symmetric(vertical: 14)),
        child: const Text('Submit Proposal', style: TextStyle(fontWeight: FontWeight.w900)),
      )),
    ]),
  );
}
