import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../../theme.dart';
import '../../providers/providers.dart';

// ── Models ────────────────────────────────────────────────────────────────
class PropTier {
  final int id;
  final String name, subtitle, color;
  final double feePct;
  final int? p1Target, p2Target;
  final int dailyDD, totalDD;
  final String duration;
  final int initialSplit;
  final List<int> sizes;
  const PropTier({
    required this.id, required this.name, required this.subtitle,
    required this.color, required this.feePct,
    this.p1Target, this.p2Target,
    required this.dailyDD, required this.totalDD,
    required this.duration, required this.initialSplit,
    required this.sizes,
  });
  double feeFor(int size) => size * feePct / 100;
}

const kTiers = [
  PropTier(id: 1, name: '1-Phase Challenge', subtitle: 'Pass once, trade funded',
      color: '#6366f1', feePct: 0.5, p1Target: 8,
      dailyDD: 4, totalDD: 8, duration: '30 days', initialSplit: 70,
      sizes: [10000, 25000, 50000, 100000, 200000]),
  PropTier(id: 2, name: '2-Phase Verification', subtitle: 'Lower fee, two-step process',
      color: '#10b981', feePct: 0.4, p1Target: 8, p2Target: 5,
      dailyDD: 5, totalDD: 10, duration: '30 + 60 days', initialSplit: 80,
      sizes: [10000, 25000, 50000, 100000, 200000]),
  PropTier(id: 3, name: 'Instant Funding', subtitle: 'Skip eval, trade now',
      color: '#f59e0b', feePct: 3.0,
      dailyDD: 3, totalDD: 6, duration: 'No limit', initialSplit: 60,
      sizes: [5000, 10000, 25000, 50000]),
];

// ── Main prop screen ──────────────────────────────────────────────────────
class PropScreen extends ConsumerStatefulWidget {
  const PropScreen({super.key});
  @override
  ConsumerState<PropScreen> createState() => _PropScreenState();
}

class _PropScreenState extends ConsumerState<PropScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() { _tabs.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WikColor.bg0,
      appBar: AppBar(
        backgroundColor: WikColor.bg0,
        title: Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF6366f1), Color(0xFF8b5cf6)]),
              borderRadius: BorderRadius.circular(6),
            ),
            child: const Text('PROP', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1)),
          ),
          const SizedBox(width: 8),
          const Text('Funded Trading'),
        ]),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: WikColor.accent,
          labelColor: WikColor.text1,
          unselectedLabelColor: WikColor.text3,
          tabs: const [
            Tab(text: 'Get Funded'),
            Tab(text: 'My Evaluation'),
            Tab(text: 'Funded Account'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _GetFundedTab(),
          _EvaluationTab(),
          _FundedAccountTab(),
        ],
      ),
    );
  }
}

// ── Tab 1: Get funded — tier selection ────────────────────────────────────
class _GetFundedTab extends StatefulWidget {
  const _GetFundedTab();
  @override
  State<_GetFundedTab> createState() => _GetFundedTabState();
}

class _GetFundedTabState extends State<_GetFundedTab> {
  int _selectedTier = 0;
  int _selectedSize = 0;

  @override
  Widget build(BuildContext context) {
    final tier = kTiers[_selectedTier];
    return ListView(padding: const EdgeInsets.all(16), children: [
      // Header
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: LinearGradient(
            colors: [const Color(0xFF6366f1).withOpacity(0.2), const Color(0xFF8b5cf6).withOpacity(0.1)],
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFF6366f1).withOpacity(0.3)),
        ),
        child: Column(children: [
          const Text('Decentralized Prop Trading', style: TextStyle(color: WikColor.text1, fontSize: 18, fontWeight: FontWeight.w800)),
          const SizedBox(height: 6),
          const Text(
            'Pass simulated evaluation → get a real funded account.\nZero risk to your capital during evaluation.',
            textAlign: TextAlign.center,
            style: TextStyle(color: WikColor.text2, fontSize: 13, height: 1.5),
          ),
          const SizedBox(height: 12),
          Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
            _StatPill('Up to \$200K', 'Account Size'),
            _StatPill('Up to 90%', 'Profit Split'),
            _StatPill('100x', 'Leverage'),
          ]),
        ]),
      ),

      const SizedBox(height: 20),

      // Split scaling info
      _SplitScalingCard(),

      const SizedBox(height: 20),

      // Tier selector
      const Text('Choose Tier', style: TextStyle(color: WikColor.text1, fontSize: 16, fontWeight: FontWeight.w700)),
      const SizedBox(height: 10),
      ...kTiers.asMap().entries.map((entry) => _TierCard(
        tier: entry.value,
        selected: _selectedTier == entry.key,
        onTap: () => setState(() { _selectedTier = entry.key; _selectedSize = 0; }),
      )),

      const SizedBox(height: 20),

      // Account size selector
      const Text('Account Size', style: TextStyle(color: WikColor.text1, fontSize: 16, fontWeight: FontWeight.w700)),
      const SizedBox(height: 10),
      Wrap(spacing: 8, runSpacing: 8, children: tier.sizes.asMap().entries.map((e) =>
        _SizeChip(
          size: e.value,
          selected: _selectedSize == e.key,
          onTap: () => setState(() => _selectedSize = e.key),
        ),
      ).toList()),

      const SizedBox(height: 20),

      // Fee summary
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: WikColor.bg2,
          borderRadius: BorderRadius.circular(12),
          border: const Border.fromBorderSide(BorderSide(color: WikColor.border)),
        ),
        child: Column(children: [
          _FeeRow('Account Size', '\$${NumberFormat('#,###').format(tier.sizes[_selectedSize])}'),
          const SizedBox(height: 8),
          _FeeRow('Evaluation Fee (${tier.feePct}%)', '\$${NumberFormat('#,##0.00').format(tier.feeFor(tier.sizes[_selectedSize]))}'),
          const Divider(color: WikColor.border, height: 20),
          _FeeRow('Initial Profit Split', '${tier.initialSplit}% to you', valueColor: WikColor.green),
          _FeeRow('Max Split (after scaling)', '90% to you', valueColor: WikColor.green),
          const SizedBox(height: 4),
          Row(children: [
            const Icon(Icons.info_outline, size: 13, color: WikColor.text3),
            const SizedBox(width: 4),
            Expanded(child: Text(
              tier.id == 3
                  ? 'Instant funding — no evaluation needed. Trades funded immediately.'
                  : 'Evaluation uses paper trading only. Zero real capital at risk.',
              style: const TextStyle(color: WikColor.text3, fontSize: 11),
            )),
          ]),
        ]),
      ),

      const SizedBox(height: 16),

      SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: () => _startEval(tier, tier.sizes[_selectedSize]),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF6366f1),
            padding: const EdgeInsets.symmetric(vertical: 14),
          ),
          child: Text(
            tier.id == 3
                ? 'Get Instant Funding — \$${NumberFormat('#,##0').format(tier.feeFor(tier.sizes[_selectedSize]))}'
                : 'Start Evaluation — \$${NumberFormat('#,##0').format(tier.feeFor(tier.sizes[_selectedSize]))}',
            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
          ),
        ),
      ),
      const SizedBox(height: 8),
      const Center(child: Text('Fee paid in USDC on Arbitrum', style: TextStyle(color: WikColor.text3, fontSize: 11))),
    ]);
  }

  void _startEval(PropTier tier, int size) {
    showDialog(context: context, builder: (_) => _ConfirmEvalDialog(tier: tier, size: size));
  }
}

// ── Tab 2: My evaluation ──────────────────────────────────────────────────
class _EvaluationTab extends ConsumerWidget {
  const _EvaluationTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // In production: fetch from contract/backend
    // Showing a demo active evaluation
    return ListView(padding: const EdgeInsets.all(16), children: [

      // Status card
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: WikColor.bg1,
          borderRadius: BorderRadius.circular(16),
          border: const Border.fromBorderSide(BorderSide(color: WikColor.border)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(color: WikColor.greenBg, borderRadius: BorderRadius.circular(5)),
              child: const Text('ACTIVE — PHASE 1', style: TextStyle(color: WikColor.green, fontSize: 11, fontWeight: FontWeight.w700)),
            ),
            const Spacer(),
            const Text('1-Phase Challenge', style: TextStyle(color: WikColor.text2, fontSize: 12)),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            Expanded(child: _BigStat(label: 'Account Size', value: '\$50,000', color: WikColor.text1)),
            Expanded(child: _BigStat(label: 'Current Balance', value: '\$52,340', color: WikColor.green)),
            Expanded(child: _BigStat(label: 'P&L', value: '+\$2,340', color: WikColor.green)),
          ]),
        ]),
      ),

      const SizedBox(height: 16),

      // Progress bars
      const Text('Evaluation Progress', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 10),
      _ProgressCard(label: 'Profit Target', current: 4.68, target: 8.0, color: WikColor.green, suffix: '%'),
      const SizedBox(height: 8),
      _ProgressCard(label: 'Daily Drawdown Used', current: 0.8, target: 4.0, color: WikColor.gold, suffix: '%', invertColors: true),
      const SizedBox(height: 8),
      _ProgressCard(label: 'Total Drawdown Used', current: 0.8, target: 8.0, color: WikColor.red, suffix: '%', invertColors: true),
      const SizedBox(height: 8),
      _ProgressCard(label: 'Days Remaining', current: 17, target: 30, color: WikColor.accent, suffix: 'd'),

      const SizedBox(height: 16),

      // Sim trading rules reminder
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF6366f1).withOpacity(0.08),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFF6366f1).withOpacity(0.3)),
        ),
        child: Row(children: [
          const Icon(Icons.science_outlined, color: Color(0xFF6366f1), size: 20),
          const SizedBox(width: 10),
          const Expanded(child: Text(
            'You are paper trading. No real money at risk.\nAll P&L is simulated using live oracle prices.',
            style: TextStyle(color: Color(0xFF6366f1), fontSize: 12, height: 1.4),
          )),
        ]),
      ),

      const SizedBox(height: 16),

      // Open sim trade button
      SizedBox(width: double.infinity,
        child: ElevatedButton.icon(
          onPressed: () => context.push('/trade?mode=eval'),
          icon: const Icon(Icons.science_outlined, size: 18),
          label: const Text('Open Simulated Trade'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF6366f1),
            padding: const EdgeInsets.symmetric(vertical: 13),
          ),
        ),
      ),

      const SizedBox(height: 16),

      // Trade history
      const Text('Recent Sim Trades', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 8),
      ..._demoTrades.map((t) => _SimTradeRow(trade: t)),
    ]);
  }

  static const _demoTrades = [
    (market: 'BTC/USD', isLong: true,  size: 10000, pnl: 1240.0,  closed: true),
    (market: 'ETH/USD', isLong: false, size: 5000,  pnl: -320.0,  closed: true),
    (market: 'BTC/USD', isLong: true,  size: 8000,  pnl: 1420.0,  closed: false),
  ];
}

// ── Tab 3: Funded account ─────────────────────────────────────────────────
class _FundedAccountTab extends ConsumerWidget {
  const _FundedAccountTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return ListView(padding: const EdgeInsets.all(16), children: [

      // Funded badge
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1a2040), Color(0xFF0d1525)],
            begin: Alignment.topLeft, end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: WikColor.gold.withOpacity(0.5)),
        ),
        child: Column(children: [
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            const Icon(Icons.workspace_premium, color: WikColor.gold, size: 20),
            const SizedBox(width: 6),
            const Text('FUNDED TRADER', style: TextStyle(color: WikColor.gold, fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 1)),
          ]),
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: _BigStat(label: 'Account Size', value: '\$50,000', color: WikColor.text1)),
            Expanded(child: _BigStat(label: 'Balance', value: '\$53,200', color: WikColor.green)),
            Expanded(child: _BigStat(label: 'Profit', value: '+\$3,200', color: WikColor.green)),
          ]),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: WikColor.gold.withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              const Text('Your split: ', style: TextStyle(color: WikColor.text2, fontSize: 13)),
              const Text('70%', style: TextStyle(color: WikColor.gold, fontWeight: FontWeight.w800, fontSize: 16)),
              const Text(' → 80% at \$100K profit', style: TextStyle(color: WikColor.text3, fontSize: 12)),
            ]),
          ),
        ]),
      ),

      const SizedBox(height: 16),

      // Drawdown gauges
      const Text('Risk Limits', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 10),
      _DrawdownGauge(label: 'Daily Drawdown', used: 0.6, limit: 4.0, color: WikColor.green),
      const SizedBox(height: 8),
      _DrawdownGauge(label: 'Total Drawdown', used: 2.1, limit: 8.0, color: WikColor.green),

      const SizedBox(height: 16),

      // Capital source info
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: WikColor.bg2,
          borderRadius: BorderRadius.circular(10),
          border: const Border.fromBorderSide(BorderSide(color: WikColor.border)),
        ),
        child: Column(children: [
          _InfoRow('Capital Source', 'WikiProp Pool + Flash Loans'),
          const SizedBox(height: 6),
          _InfoRow('Tier',          '1-Phase Challenge'),
          const SizedBox(height: 6),
          _InfoRow('Max Leverage',  '100x'),
          const SizedBox(height: 6),
          _InfoRow('Next Split',    '\$100K profit → 80%'),
        ]),
      ),

      const SizedBox(height: 16),

      // Actions
      Row(children: [
        Expanded(child: ElevatedButton.icon(
          onPressed: () => context.push('/trade?mode=funded'),
          icon: const Icon(Icons.candlestick_chart, size: 16),
          label: const Text('Trade Now'),
          style: ElevatedButton.styleFrom(backgroundColor: WikColor.accent, padding: const EdgeInsets.symmetric(vertical: 12)),
        )),
        const SizedBox(width: 10),
        Expanded(child: OutlinedButton.icon(
          onPressed: () => _showWithdraw(context),
          icon: const Icon(Icons.download, size: 16),
          label: const Text('Withdraw Profit'),
          style: OutlinedButton.styleFrom(
            side: const BorderSide(color: WikColor.green),
            foregroundColor: WikColor.green,
            padding: const EdgeInsets.symmetric(vertical: 12),
          ),
        )),
      ]),

      const SizedBox(height: 16),

      // Scale up option
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: WikColor.greenBg,
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: WikColor.green.withOpacity(0.3)),
        ),
        child: Row(children: [
          const Icon(Icons.trending_up, color: WikColor.green, size: 20),
          const SizedBox(width: 10),
          const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Scale Up Available', style: TextStyle(color: WikColor.green, fontWeight: FontWeight.w700, fontSize: 13)),
            SizedBox(height: 2),
            Text('Withdraw profits first, then request +25% account size', style: TextStyle(color: WikColor.text2, fontSize: 11)),
          ])),
          TextButton(onPressed: () {}, child: const Text('Scale +25%', style: TextStyle(color: WikColor.green, fontSize: 12))),
        ]),
      ),

      const SizedBox(height: 16),

      // Profit history
      const Text('Profit Withdrawals', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 8),
      _WithdrawalRow(date: 'Feb 28', amount: 1680, split: 70),
      _WithdrawalRow(date: 'Feb 14', amount: 840, split: 70),
    ]);
  }

  void _showWithdraw(BuildContext ctx) {
    showModalBottomSheet(
      context: ctx,
      backgroundColor: WikColor.bg1,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          const Text('Withdraw Profit', style: TextStyle(color: WikColor.text1, fontSize: 18, fontWeight: FontWeight.w700)),
          const SizedBox(height: 16),
          Container(padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)),
            child: Column(children: [
              _FeeRow('Total Profit',    '\$3,200'),
              const SizedBox(height: 8),
              _FeeRow('Your 70% Share', '\$2,240', valueColor: WikColor.green),
              _FeeRow('Pool Share',     '\$768'),
              _FeeRow('Protocol',       '\$192'),
            ]),
          ),
          const SizedBox(height: 16),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () { Navigator.pop(ctx); /* call contract */ },
            style: ElevatedButton.styleFrom(backgroundColor: WikColor.green, foregroundColor: Colors.white),
            child: const Text('Withdraw \$2,240 USDC'),
          )),
        ]),
      ),
    );
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────
class _TierCard extends StatelessWidget {
  final PropTier tier;
  final bool selected;
  final VoidCallback onTap;
  const _TierCard({required this.tier, required this.selected, required this.onTap});

  Color get _color => Color(int.parse(tier.color.replaceFirst('#', 'FF'), radix: 16));

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: selected ? _color.withOpacity(0.12) : WikColor.bg1,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: selected ? _color : WikColor.border, width: selected ? 1.5 : 1),
      ),
      child: Row(children: [
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(tier.name, style: TextStyle(color: selected ? _color : WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 2),
          Text(tier.subtitle, style: const TextStyle(color: WikColor.text3, fontSize: 11)),
        ]),
        const Spacer(),
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text('${tier.feePct}% fee', style: TextStyle(color: selected ? _color : WikColor.text2, fontWeight: FontWeight.w700, fontSize: 13)),
          const SizedBox(height: 2),
          Text('${tier.initialSplit}% split', style: const TextStyle(color: WikColor.text3, fontSize: 11)),
        ]),
        const SizedBox(width: 8),
        Icon(selected ? Icons.check_circle : Icons.radio_button_unchecked,
            color: selected ? _color : WikColor.text3, size: 20),
      ]),
    ),
  );
}

class _SizeChip extends StatelessWidget {
  final int size;
  final bool selected;
  final VoidCallback onTap;
  const _SizeChip({required this.size, required this.selected, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 120),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: BoxDecoration(
        color: selected ? WikColor.accentBg : WikColor.bg2,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: selected ? WikColor.accent : WikColor.border),
      ),
      child: Text(
        '\$${NumberFormat('#,###').format(size)}',
        style: TextStyle(color: selected ? WikColor.accent : WikColor.text2, fontWeight: FontWeight.w700, fontSize: 13),
      ),
    ),
  );
}

class _StatPill extends StatelessWidget {
  final String value, label;
  const _StatPill(this.value, this.label);
  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 15)),
    Text(label, style: WikText.label(size: 10)),
  ]);
}

class _SplitScalingCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: WikColor.bg1,
      borderRadius: BorderRadius.circular(12),
      border: const Border.fromBorderSide(BorderSide(color: WikColor.border)),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('Profit Split Scaling', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 13)),
      const SizedBox(height: 10),
      Row(children: [
        _SplitStep('Initial', '60-80%', false),
        _SplitArrow(),
        _SplitStep('2× profit', '80%', false),
        _SplitArrow(),
        _SplitStep('5× profit', '90%', true),
      ]),
    ]),
  );
}

class _SplitStep extends StatelessWidget {
  final String label, split;
  final bool isMax;
  const _SplitStep(this.label, this.split, this.isMax);
  @override
  Widget build(BuildContext context) => Expanded(child: Column(children: [
    Text(split, style: TextStyle(color: isMax ? WikColor.gold : WikColor.green, fontWeight: FontWeight.w800, fontSize: 15)),
    Text(label, style: WikText.label(size: 10), textAlign: TextAlign.center),
  ]));
}

class _SplitArrow extends StatelessWidget {
  @override
  Widget build(BuildContext context) => const Icon(Icons.arrow_forward, size: 14, color: WikColor.text3);
}

class _ProgressCard extends StatelessWidget {
  final String label, suffix;
  final double current, target;
  final Color color;
  final bool invertColors;
  const _ProgressCard({required this.label, required this.current, required this.target,
      required this.color, required this.suffix, this.invertColors = false});

  @override
  Widget build(BuildContext context) {
    final ratio = (current / target).clamp(0.0, 1.0);
    final barColor = invertColors
        ? (ratio < 0.5 ? WikColor.green : ratio < 0.8 ? WikColor.gold : WikColor.red)
        : color;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10),
          border: const Border.fromBorderSide(BorderSide(color: WikColor.border))),
      child: Column(children: [
        Row(children: [
          Text(label, style: const TextStyle(color: WikColor.text2, fontSize: 12)),
          const Spacer(),
          Text('${current.toStringAsFixed(1)}$suffix / ${target.toStringAsFixed(0)}$suffix',
              style: TextStyle(color: barColor, fontWeight: FontWeight.w700, fontSize: 12, fontFamily: 'SpaceMono')),
        ]),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: ratio, minHeight: 6,
            backgroundColor: WikColor.bg3,
            valueColor: AlwaysStoppedAnimation(barColor),
          ),
        ),
      ]),
    );
  }
}

class _DrawdownGauge extends StatelessWidget {
  final String label;
  final double used, limit;
  final Color color;
  const _DrawdownGauge({required this.label, required this.used, required this.limit, required this.color});
  @override
  Widget build(BuildContext context) {
    final ratio = (used / limit).clamp(0.0, 1.0);
    final c = ratio < 0.5 ? WikColor.green : ratio < 0.8 ? WikColor.gold : WikColor.red;
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10),
          border: const Border.fromBorderSide(BorderSide(color: WikColor.border))),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: const TextStyle(color: WikColor.text2, fontSize: 12)),
          const SizedBox(height: 6),
          ClipRRect(borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(value: ratio, minHeight: 5, backgroundColor: WikColor.bg3,
                  valueColor: AlwaysStoppedAnimation(c))),
        ])),
        const SizedBox(width: 12),
        Text('${used.toStringAsFixed(1)}% / ${limit.toStringAsFixed(0)}%',
            style: TextStyle(color: c, fontWeight: FontWeight.w700, fontSize: 12, fontFamily: 'SpaceMono')),
      ]),
    );
  }
}

class _BigStat extends StatelessWidget {
  final String label, value;
  final Color color;
  const _BigStat({required this.label, required this.value, required this.color});
  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 15, fontFamily: 'SpaceMono')),
    const SizedBox(height: 2),
    Text(label, style: WikText.label(size: 10), textAlign: TextAlign.center),
  ]);
}

class _SimTradeRow extends StatelessWidget {
  final ({String market, bool isLong, int size, double pnl, bool closed}) trade;
  const _SimTradeRow({required this.trade});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
    margin: const EdgeInsets.only(bottom: 6),
    decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(8),
        border: const Border.fromBorderSide(BorderSide(color: WikColor.border))),
    child: Row(children: [
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(trade.market, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 13)),
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
            decoration: BoxDecoration(
              color: trade.isLong ? WikColor.greenBg : WikColor.redBg,
              borderRadius: BorderRadius.circular(3),
            ),
            child: Text(trade.isLong ? 'LONG' : 'SHORT',
                style: TextStyle(color: trade.isLong ? WikColor.green : WikColor.red, fontSize: 10, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: 6),
          Text('\$${NumberFormat('#,###').format(trade.size)}', style: WikText.label(size: 11)),
        ]),
      ]),
      const Spacer(),
      Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
        Text(
          '${trade.pnl >= 0 ? '+' : ''}\$${trade.pnl.toStringAsFixed(0)}',
          style: TextStyle(
            color: trade.pnl >= 0 ? WikColor.green : WikColor.red,
            fontWeight: FontWeight.w700, fontSize: 14, fontFamily: 'SpaceMono',
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
          decoration: BoxDecoration(
            color: WikColor.bg3,
            borderRadius: BorderRadius.circular(3),
          ),
          child: Text(trade.closed ? 'SIM CLOSED' : 'SIM OPEN',
              style: TextStyle(color: trade.closed ? WikColor.text3 : WikColor.accent, fontSize: 9, fontWeight: FontWeight.w600)),
        ),
      ]),
    ]),
  );
}

class _WithdrawalRow extends StatelessWidget {
  final String date;
  final int amount, split;
  const _WithdrawalRow({required this.date, required this.amount, required this.split});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
    margin: const EdgeInsets.only(bottom: 6),
    decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(8),
        border: const Border.fromBorderSide(BorderSide(color: WikColor.border))),
    child: Row(children: [
      const Icon(Icons.download, color: WikColor.green, size: 16),
      const SizedBox(width: 8),
      Text(date, style: const TextStyle(color: WikColor.text2, fontSize: 13)),
      const SizedBox(width: 8),
      Text('$split% split', style: WikText.label(size: 11)),
      const Spacer(),
      Text('+\$${NumberFormat('#,###').format(amount)}',
          style: const TextStyle(color: WikColor.green, fontWeight: FontWeight.w700, fontFamily: 'SpaceMono')),
    ]),
  );
}

class _FeeRow extends StatelessWidget {
  final String label, value;
  final Color? valueColor;
  const _FeeRow(this.label, this.value, {this.valueColor});
  @override
  Widget build(BuildContext context) => Row(children: [
    Text(label, style: const TextStyle(color: WikColor.text2, fontSize: 12)),
    const Spacer(),
    Text(value, style: TextStyle(color: valueColor ?? WikColor.text1, fontWeight: FontWeight.w700, fontSize: 13)),
  ]);
}

class _InfoRow extends StatelessWidget {
  final String label, value;
  const _InfoRow(this.label, this.value);
  @override
  Widget build(BuildContext context) => Row(children: [
    Text(label, style: WikText.label(size: 12)),
    const Spacer(),
    Text(value, style: const TextStyle(color: WikColor.text1, fontSize: 13, fontWeight: FontWeight.w600)),
  ]);
}

class _ConfirmEvalDialog extends StatelessWidget {
  final PropTier tier;
  final int size;
  const _ConfirmEvalDialog({required this.tier, required this.size});
  @override
  Widget build(BuildContext context) => AlertDialog(
    backgroundColor: WikColor.bg2,
    title: Text('Start ${tier.name}?'),
    content: Column(mainAxisSize: MainAxisSize.min, children: [
      _FeeRow('Account Size', '\$${NumberFormat('#,###').format(size)}'),
      const SizedBox(height: 6),
      _FeeRow('Fee to pay now', '\$${NumberFormat('#,##0').format(tier.feeFor(size))} USDC'),
      const SizedBox(height: 10),
      Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.bg3, borderRadius: BorderRadius.circular(8)),
        child: Text(
          tier.id == 3
            ? 'Your wallet will be funded immediately. Breach rules apply from the start.'
            : 'Evaluation uses paper trading only. Your USDC is not at risk during eval.',
          style: const TextStyle(color: WikColor.text2, fontSize: 12, height: 1.4),
        ),
      ),
    ]),
    actions: [
      TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
      ElevatedButton(
        onPressed: () {
          Navigator.pop(context);
          // TODO: call WikiPropEval.startEval(tier.id, size) on-chain
        },
        child: const Text('Pay & Start'),
      ),
    ],
  );
}
