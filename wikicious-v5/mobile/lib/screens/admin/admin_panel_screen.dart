// admin_panel_screen.dart
// Complete admin panel for Wikicious V5 — salary, vesting, team, payments
// Connects to WikiDAOTreasury.sol and WikiTokenVesting.sol

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

// ── Colours ───────────────────────────────────────────────────────────────────
const _bg    = Color(0xFF060912);
const _card  = Color(0xFF0F1828);
const _b     = Color(0xFF182338);
const _b2    = Color(0xFF1E2D48);
const _t1    = Color(0xFFE8EDF8);
const _t2    = Color(0xFF7A8BA8);
const _green = Color(0xFF00E5A0);
const _red   = Color(0xFFFF3850);
const _gold  = Color(0xFFFFB800);
const _blue  = Color(0xFF3B82F6);
const _sky   = Color(0xFF00BFFF);
const _purple= Color(0xFF8B5CF6);
const _orange= Color(0xFFFF7A00);

// ── Mock data (replace with actual Web3 calls in production) ──────────────────
class TreasuryData {
  final double usdcBalance;
  final double monthlyBurn;
  final int    runwayMonths;
  final double totalSalaryPaid;
  final int    activeContributors;
  final double claimableAmount;
  final int    claimablePeriods;
  final bool   isRegistered;
  final String role;
  final double salaryPerPeriod;
  final String frequency;
  final double totalPaidToYou;

  const TreasuryData({
    required this.usdcBalance,
    required this.monthlyBurn,
    required this.runwayMonths,
    required this.totalSalaryPaid,
    required this.activeContributors,
    required this.claimableAmount,
    required this.claimablePeriods,
    required this.isRegistered,
    required this.role,
    required this.salaryPerPeriod,
    required this.frequency,
    required this.totalPaidToYou,
  });
}

class VestingData {
  final double totalAllocated;
  final double totalVested;
  final double totalClaimed;
  final double claimableNow;
  final DateTime cliffEndsAt;
  final DateTime fullyVestedAt;
  final double monthlyUnlock;
  final bool cliffPassed;

  const VestingData({
    required this.totalAllocated,
    required this.totalVested,
    required this.totalClaimed,
    required this.claimableNow,
    required this.cliffEndsAt,
    required this.fullyVestedAt,
    required this.monthlyUnlock,
    required this.cliffPassed,
  });
}

// Mock providers (replace with actual wagmi/web3 equivalents)
final treasuryProvider = Provider<TreasuryData>((ref) => const TreasuryData(
  usdcBalance: 48294.28, monthlyBurn: 25000, runwayMonths: 24,
  totalSalaryPaid: 180000, activeContributors: 4,
  claimableAmount: 15000, claimablePeriods: 1,
  isRegistered: true, role: 'Founder / CEO',
  salaryPerPeriod: 15000, frequency: 'Monthly',
  totalPaidToYou: 45000,
));

final vestingProvider = Provider<VestingData>((ref) => VestingData(
  totalAllocated: 90000000, totalVested: 0, totalClaimed: 0,
  claimableNow: 0, monthlyUnlock: 2500000, cliffPassed: false,
  cliffEndsAt: DateTime.now().add(const Duration(days: 365)),
  fullyVestedAt: DateTime.now().add(const Duration(days: 365 + 1095)),
));

// ── Main screen ───────────────────────────────────────────────────────────────

class AdminPanelScreen extends ConsumerStatefulWidget {
  const AdminPanelScreen({super.key});

  @override
  ConsumerState<AdminPanelScreen> createState() => _AdminPanelScreenState();
}

class _AdminPanelScreenState extends ConsumerState<AdminPanelScreen>
    with SingleTickerProviderStateMixin {

  late TabController _tabCtrl;
  bool _txLoading = false;
  String? _toast;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  void _showToast(String msg, {bool error = false}) {
    setState(() => _toast = msg);
    // Real API call
    });
  }

  Future<void> _mockTx(String action) async {
    setState(() => _txLoading = true);
    await // Real API call
    setState(() => _txLoading = false);
    _showToast('$action confirmed ✅');
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  String _usdc(double v) =>
      '\$${v.toStringAsFixed(v >= 1000 ? 0 : 2).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';

  String _wik(double v) {
    if (v >= 1e6) return '${(v / 1e6).toStringAsFixed(2)}M WIK';
    if (v >= 1e3) return '${(v / 1e3).toStringAsFixed(1)}K WIK';
    return '${v.toStringAsFixed(0)} WIK';
  }

  String _dateStr(DateTime d) =>
      '${d.day} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.month-1]} ${d.year}';

  String _countdown(DateTime d) {
    final diff = d.difference(DateTime.now());
    if (diff.isNegative) return 'Now';
    if (diff.inDays > 0) return '${diff.inDays}d ${diff.inHours % 24}h';
    return '${diff.inHours}h ${diff.inMinutes % 60}m';
  }

  // ── Build ─────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    final treasury = ref.watch(treasuryProvider);
    final vesting  = ref.watch(vestingProvider);

    return Scaffold(
      backgroundColor: _bg,
      body: Stack(children: [
        SafeArea(
          child: Column(children: [
            _buildHeader(),
            _buildStatBar(treasury),
            _buildTabBar(),
            Expanded(
              child: TabBarView(
                controller: _tabCtrl,
                children: [
                  _buildSalaryTab(treasury),
                  _buildVestingTab(vesting),
                  _buildTeamTab(treasury),
                  _buildPaymentsTab(treasury),
                ],
              ),
            ),
          ]),
        ),
        if (_toast != null) _buildToast(),
      ]),
    );
  }

  // ── Header ─────────────────────────────────────────────────────────────────
  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(children: [
        Container(
          width: 42, height: 42,
          decoration: BoxDecoration(
            color: _gold.withOpacity(.12),
            borderRadius: BorderRadius.circular(11),
            border: Border.all(color: _gold.withOpacity(.3)),
          ),
          child: const Center(child: Text('⚙️', style: TextStyle(fontSize: 20))),
        ),
        const SizedBox(width: 12),
        Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Admin Panel', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: _t1)),
          Text('Treasury · Salary · Vesting', style: TextStyle(fontSize: 12, color: _t2)),
        ]),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: _green.withOpacity(.12),
            borderRadius: BorderRadius.circular(100),
            border: Border.all(color: _green.withOpacity(.3)),
          ),
          child: const Text('🟢 Connected', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: _green)),
        ),
      ]),
    );
  }

  // ── Stat bar ───────────────────────────────────────────────────────────────
  Widget _buildStatBar(TreasuryData t) {
    final stats = [
      ('TREASURY', _usdc(t.usdcBalance), _green),
      ('BURN/MO',  _usdc(t.monthlyBurn), _gold),
      ('RUNWAY',   '${t.runwayMonths}mo',_sky),
      ('TEAM',     '${t.activeContributors}', _purple),
    ];
    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
      child: Row(children: stats.map((s) => Expanded(
        child: Container(
          margin: const EdgeInsets.symmetric(horizontal: 4),
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          decoration: BoxDecoration(
            color: _card, borderRadius: BorderRadius.circular(10),
            border: Border.all(color: _b2),
          ),
          child: Column(children: [
            Text(s.$1, style: TextStyle(fontSize: 8, color: _t2, fontWeight: FontWeight.w700, letterSpacing: .5)),
            const SizedBox(height: 4),
            Text(s.$2, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: s.$3, fontFamily: 'monospace')),
          ]),
        ),
      )).toList()),
    );
  }

  // ── Tab bar ────────────────────────────────────────────────────────────────
  Widget _buildTabBar() {
    const tabs = [('💵', 'Salary'), ('⏳', 'Tokens'), ('👥', 'Team'), ('📤', 'Pay')];
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: Color(0xFF0A0F1C), borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _b),
      ),
      child: TabBar(
        controller: _tabCtrl,
        indicator: BoxDecoration(borderRadius: BorderRadius.circular(9), color: _blue),
        labelColor: Colors.white,
        unselectedLabelColor: _t2,
        labelStyle: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
        tabs: tabs.map((t) => Tab(text: '${t.$1} ${t.$2}')).toList(),
      ),
    );
  }

  // ── SALARY TAB ─────────────────────────────────────────────────────────────
  Widget _buildSalaryTab(TreasuryData t) {
    return ListView(padding: const EdgeInsets.symmetric(horizontal: 12), children: [

      // Big claim card
      _AnimatedCard(
        color: t.claimableAmount > 0 ? _green : _t2,
        child: Column(children: [
          Text('CLAIMABLE RIGHT NOW', style: TextStyle(fontSize: 10, color: _t2, fontWeight: FontWeight.w700, letterSpacing: .8)),
          const SizedBox(height: 8),
          Text(
            _usdc(t.claimableAmount),
            style: TextStyle(fontSize: 40, fontWeight: FontWeight.w900, color: t.claimableAmount > 0 ? _green : _t2, fontFamily: 'monospace'),
          ),
          if (t.claimablePeriods > 0) ...[
            const SizedBox(height: 4),
            Text('${t.claimablePeriods} period${t.claimablePeriods > 1 ? "s" : ""} accumulated', style: TextStyle(fontSize: 12, color: _t2)),
          ],
          const SizedBox(height: 16),
          _TxButton(
            label: t.claimableAmount > 0
                ? 'Withdraw ${_usdc(t.claimableAmount)} USDC'
                : 'No salary due yet',
            color: t.claimableAmount > 0 ? _green : _b2,
            textColor: t.claimableAmount > 0 ? Colors.black : _t2,
            loading: _txLoading,
            disabled: t.claimableAmount <= 0,
            onPressed: () => _mockTx('Salary claim'),
          ),
        ]),
      ),

      const SizedBox(height: 12),

      // My profile
      _SectionCard(
        title: 'My Contributor Profile',
        icon: '👤',
        accent: _blue,
        child: Column(children: [
          _Row('Role', t.role, color: _t1, mono: false),
          _Row('Salary per month', _usdc(t.salaryPerPeriod), color: _green),
          _Row('Pay frequency', t.frequency, color: _gold, mono: false),
          _Row('Status', '🟢 Active', color: _green, mono: false),
          _Row('Total received (all time)', _usdc(t.totalPaidToYou)),
        ]),
      ),

      const SizedBox(height: 12),

      // Request salary change
      _SectionCard(
        title: 'Update My Salary',
        icon: '✏️',
        accent: _gold,
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          _InfoBox(
            '⚠️ Requires multisig (3-of-5) to execute. Cannot change your own salary unilaterally.',
            _gold,
          ),
          const SizedBox(height: 12),
          _AdminTextField(label: 'WALLET (YOUR ADDRESS)', hint: '0x...', prefilled: '0xYour...wallet'),
          _AdminTextField(label: 'NEW MONTHLY SALARY (USDC)', hint: 'e.g. 20000', keyboardType: TextInputType.number),
          const SizedBox(height: 8),
          _TxButton(
            label: 'Request Salary Update (Multisig)',
            color: _gold,
            textColor: Colors.black,
            loading: _txLoading,
            onPressed: () => _mockTx('Salary update'),
          ),
        ]),
      ),

      const SizedBox(height: 20),
    ]);
  }

  // ── VESTING TAB ────────────────────────────────────────────────────────────
  Widget _buildVestingTab(VestingData v) {
    final pctVested  = v.totalAllocated > 0 ? v.totalVested  / v.totalAllocated : 0.0;
    final pctClaimed = v.totalVested   > 0 ? v.totalClaimed / v.totalVested    : 0.0;

    return ListView(padding: const EdgeInsets.symmetric(horizontal: 12), children: [

      // Big claim card
      _AnimatedCard(
        color: v.cliffPassed ? _purple : _gold,
        child: Column(children: [
          Text(
            v.cliffPassed ? 'CLAIMABLE WIK TOKENS' : 'IN CLIFF PERIOD',
            style: TextStyle(fontSize: 10, color: _t2, fontWeight: FontWeight.w700, letterSpacing: .8),
          ),
          const SizedBox(height: 8),
          Text(
            _wik(v.claimableNow),
            style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: v.cliffPassed ? _purple : _gold, fontFamily: 'monospace'),
          ),
          if (!v.cliffPassed) ...[
            const SizedBox(height: 6),
            Text('Cliff ends: ${_dateStr(v.cliffEndsAt)}', style: TextStyle(fontSize: 12, color: _gold)),
            Text('Countdown: ${_countdown(v.cliffEndsAt)}', style: TextStyle(fontSize: 12, color: _t2)),
          ],
          const SizedBox(height: 16),
          _TxButton(
            label: v.cliffPassed ? 'Claim ${_wik(v.claimableNow)}' : '🔒 Locked until cliff ends',
            color: v.cliffPassed ? _purple : _b2,
            textColor: v.cliffPassed ? Colors.white : _t2,
            loading: _txLoading,
            disabled: !v.cliffPassed || v.claimableNow <= 0,
            onPressed: () => _mockTx('WIK claim'),
          ),
        ]),
      ),

      const SizedBox(height: 12),

      // Progress bars
      _SectionCard(
        title: 'Vesting Progress',
        icon: '📈',
        accent: _green,
        child: Column(children: [
          _ProgBar('Vested', pctVested.toDouble(), _purple),
          const SizedBox(height: 10),
          _ProgBar('Claimed', pctClaimed.toDouble(), _sky),
          const SizedBox(height: 14),
          _Row('Total allocated', _wik(v.totalAllocated)),
          _Row('Total vested', _wik(v.totalVested), color: _purple),
          _Row('Already claimed', _wik(v.totalClaimed), color: _t2),
          _Row('Claimable now', _wik(v.claimableNow), color: _green),
          _Row('Monthly unlock rate', _wik(v.monthlyUnlock), color: _gold),
          _Row('Fully vested at', _dateStr(v.fullyVestedAt), color: _sky),
        ]),
      ),

      const SizedBox(height: 12),

      // Tip box
      Container(
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: _purple.withOpacity(.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _purple.withOpacity(.3)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('💡 What to do with vested WIK', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _purple)),
          const SizedBox(height: 8),
          Text(
            '• Lock 70% as veWIK → earn 40% of all protocol trading fees weekly in USDC\n'
            '• Sell 30% gradually (never dump — max ~10-20% of monthly unlock)\n'
            '• veWIK holders vote on gauge pools and earn external bribes\n'
            '• At 15% of veWIK supply: ~\$10,800/month passive income at \$10M daily vol',
            style: TextStyle(fontSize: 12, color: _t2, height: 1.7),
          ),
        ]),
      ),

      const SizedBox(height: 20),
    ]);
  }

  // ── TEAM TAB ───────────────────────────────────────────────────────────────
  Widget _buildTeamTab(TreasuryData t) {
    final mockTeam = [
      ('0x1234...5678', 'Founder / CEO', 15000.0, 'Monthly', true, 45000.0),
      ('0x2345...6789', 'Lead Developer', 10000.0, 'Monthly', true, 30000.0),
      ('0x3456...7890', 'UI/UX Designer', 6000.0,  'Monthly', true, 18000.0),
      ('0x4567...8901', 'Marketing Lead', 5000.0,  'Monthly', false, 5000.0),
    ];

    return ListView(padding: const EdgeInsets.symmetric(horizontal: 12), children: [

      _SectionCard(
        title: 'Add Contributor',
        icon: '➕',
        accent: _green,
        child: Column(children: [
          _InfoBox('Requires multisig (3-of-5). Add team members, advisors, or contractors.', _sky),
          const SizedBox(height: 12),
          _AdminTextField(label: 'WALLET ADDRESS', hint: '0x...'),
          _AdminTextField(label: 'ROLE / TITLE', hint: 'e.g. Lead Developer'),
          _AdminTextField(label: 'SALARY (USDC/MONTH)', hint: 'e.g. 8000', keyboardType: TextInputType.number),
          _TxButton(label: 'Add Contributor (Multisig)', color: _green, textColor: Colors.black, loading: _txLoading, onPressed: () => _mockTx('Add contributor')),
        ]),
      ),

      const SizedBox(height: 12),

      _SectionCard(
        title: 'Active Contributors (${mockTeam.where((m) => m.$5).length})',
        icon: '👥',
        accent: _blue,
        child: Column(
          children: mockTeam.map((m) => Container(
            margin: const EdgeInsets.only(bottom: 8),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Color(0xFF0A0F1C),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: m.$2 == 'Founder / CEO' ? _green.withOpacity(.4) : _b),
            ),
            child: Row(children: [
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(children: [
                  Text(m.$2, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _t1)),
                  if (m.$2 == 'Founder / CEO') ...[
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                      decoration: BoxDecoration(color: _green.withOpacity(.15), borderRadius: BorderRadius.circular(4), border: Border.all(color: _green.withOpacity(.4))),
                      child: Text('YOU', style: TextStyle(fontSize: 8, color: _green, fontWeight: FontWeight.w800)),
                    ),
                  ],
                ]),
                const SizedBox(height: 2),
                Text(m.$1, style: TextStyle(fontSize: 11, color: _t2, fontFamily: 'monospace')),
              ])),
              Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
                Text(
                  '\$${m.$3.toStringAsFixed(0)}/mo',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _gold, fontFamily: 'monospace'),
                ),
                const SizedBox(height: 2),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(
                    color: (m.$5 ? _green : _red).withOpacity(.12),
                    borderRadius: BorderRadius.circular(100),
                  ),
                  child: Text(m.$5 ? '● Active' : '● Inactive', style: TextStyle(fontSize: 9, color: m.$5 ? _green : _red, fontWeight: FontWeight.w700)),
                ),
              ]),
            ]),
          )).toList(),
        ),
      ),

      const SizedBox(height: 20),
    ]);
  }

  // ── PAYMENTS TAB ───────────────────────────────────────────────────────────
  Widget _buildPaymentsTab(TreasuryData t) {
    return ListView(padding: const EdgeInsets.symmetric(horizontal: 12), children: [

      _SectionCard(
        title: 'Propose One-Time Payment',
        icon: '📤',
        accent: _blue,
        child: Column(children: [
          _InfoBox('48-hour timelock. After 48h anyone can execute. Requires multisig to propose.', _sky),
          const SizedBox(height: 12),
          _AdminTextField(label: 'RECIPIENT WALLET', hint: '0x...'),
          _AdminTextField(label: 'AMOUNT (USDC)', hint: 'e.g. 15000', keyboardType: TextInputType.number),
          _AdminTextField(label: 'REASON (STORED ON-CHAIN)', hint: 'e.g. Trail of Bits audit Q1 2026'),
          _TxButton(label: 'Propose Payment (48h timelock)', color: _blue, textColor: Colors.white, loading: _txLoading, onPressed: () => _mockTx('Payment proposal')),
        ]),
      ),

      const SizedBox(height: 12),

      _SectionCard(
        title: 'Quick Templates',
        icon: '⚡',
        accent: _orange,
        child: Column(
          children: [
            ('Security Audit (Trail of Bits)', '\$15,000'),
            ('Bug Bounty Pool (Immunefi)', '\$10,000'),
            ('Marketing Campaign', '\$5,000'),
            ('Legal Review', '\$3,000'),
            ('Server / Infrastructure', '\$500'),
          ].map((t) => Container(
            margin: const EdgeInsets.only(bottom: 6),
            child: Material(
              color: Color(0xFF0A0F1C),
              borderRadius: BorderRadius.circular(9),
              child: InkWell(
                borderRadius: BorderRadius.circular(9),
                onTap: () => _showToast('Template loaded: ${t.$1}'),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
                  decoration: BoxDecoration(
                    border: Border.all(color: _b),
                    borderRadius: BorderRadius.circular(9),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(t.$1, style: TextStyle(fontSize: 12, color: _t1)),
                      Text(t.$2, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _gold, fontFamily: 'monospace')),
                    ],
                  ),
                ),
              ),
            ),
          )).toList(),
        ),
      ),

      const SizedBox(height: 20),
    ]);
  }

  // ── Toast ──────────────────────────────────────────────────────────────────
  Widget _buildToast() {
    return Positioned(
      bottom: 24, left: 16, right: 16,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
        decoration: BoxDecoration(
          color: _green.withOpacity(.15),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: _green.withOpacity(.4)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(.3), blurRadius: 20)],
        ),
        child: Text(_toast ?? '', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: _green), textAlign: TextAlign.center),
      ),
    );
  }

  // ── Shared widgets ─────────────────────────────────────────────────────────

  Widget _Row(String k, String v, {Color color = const Color(0xFFE8EDF8), bool mono = true}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 5),
      child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(k, style: TextStyle(fontSize: 12, color: _t2)),
        Text(v, style: TextStyle(fontSize: 12, color: color, fontWeight: FontWeight.w600, fontFamily: mono ? 'monospace' : null)),
      ]),
    );
  }

  Widget _ProgBar(String label, double pct, Color c) {
    return Column(children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: TextStyle(fontSize: 11, color: _t2)),
        Text('${(pct * 100).toStringAsFixed(1)}%', style: TextStyle(fontSize: 11, color: c, fontWeight: FontWeight.w700)),
      ]),
      const SizedBox(height: 4),
      ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: LinearProgressIndicator(value: pct, backgroundColor: _b2, valueColor: AlwaysStoppedAnimation(c), minHeight: 6),
      ),
    ]);
  }

  Widget _InfoBox(String text, Color c) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(color: c.withOpacity(.08), borderRadius: BorderRadius.circular(9), border: Border.all(color: c.withOpacity(.3))),
      child: Text(text, style: TextStyle(fontSize: 11, color: c, height: 1.6)),
    );
  }

  Widget _AdminTextField({required String label, required String hint, TextInputType keyboardType = TextInputType.text, String? prefilled}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: TextStyle(fontSize: 9, color: _t2, fontWeight: FontWeight.w700, letterSpacing: .6)),
        const SizedBox(height: 5),
        TextField(
          controller: prefilled != null ? TextEditingController(text: prefilled) : null,
          keyboardType: keyboardType,
          style: const TextStyle(color: _t1, fontFamily: 'monospace', fontSize: 14),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: _t2),
            filled: true, fillColor: Color(0xFF0A0F1C),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(9), borderSide: BorderSide(color: _b2)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(9), borderSide: BorderSide(color: _b2)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(9), borderSide: BorderSide(color: _blue)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 13, vertical: 11),
          ),
        ),
      ]),
    );
  }
}

// ── Reusable widgets ──────────────────────────────────────────────────────────

class _AnimatedCard extends StatelessWidget {
  final Color color;
  final Widget child;
  const _AnimatedCard({required this.color, required this.child});

  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: color.withOpacity(.06),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(color: color.withOpacity(.3)),
    ),
    child: child,
  );
}

class _SectionCard extends StatelessWidget {
  final String title, icon;
  final Color accent;
  final Widget child;
  const _SectionCard({required this.title, required this.icon, required this.accent, required this.child});

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(color: _card, borderRadius: BorderRadius.circular(16), border: Border.all(color: _b2)),
    child: Column(children: [
      Container(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 10),
        decoration: BoxDecoration(border: Border(bottom: BorderSide(color: _b))),
        child: Row(children: [
          Container(width: 32, height: 32, decoration: BoxDecoration(color: accent.withOpacity(.12), borderRadius: BorderRadius.circular(8), border: Border.all(color: accent.withOpacity(.3))),
            child: Center(child: Text(icon, style: const TextStyle(fontSize: 15)))),
          const SizedBox(width: 10),
          Text(title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: _t1)),
        ]),
      ),
      Padding(padding: const EdgeInsets.all(16), child: child),
    ]),
  );
}

class _TxButton extends StatelessWidget {
  final String label;
  final Color color, textColor;
  final bool loading, disabled;
  final VoidCallback? onPressed;
  const _TxButton({required this.label, required this.color, required this.textColor, this.loading = false, this.disabled = false, this.onPressed});

  @override
  Widget build(BuildContext context) => SizedBox(
    width: double.infinity,
    child: ElevatedButton(
      onPressed: (disabled || loading) ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: (disabled || loading) ? _b2 : color,
        foregroundColor: (disabled || loading) ? _t2 : textColor,
        padding: const EdgeInsets.symmetric(vertical: 13),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
        elevation: 0,
      ),
      child: loading
          ? Row(mainAxisAlignment: MainAxisAlignment.center, children: [
              SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: textColor)),
              const SizedBox(width: 8),
              Text('Sending...', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13)),
            ])
          : Text(label, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13)),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTO COMPOUND SCREEN — Add as a tab in AdminPanelScreen
// ─────────────────────────────────────────────────────────────────────────────

class AutoCompoundScreen extends ConsumerStatefulWidget {
  const AutoCompoundScreen({super.key});
  @override
  ConsumerState<AutoCompoundScreen> createState() => _AutoCompoundScreenState();
}

class _AutoCompoundScreenState extends ConsumerState<AutoCompoundScreen>
    with SingleTickerProviderStateMixin {

  bool _enabled        = false;
  bool _compoundFees   = true;
  bool _extendLock     = true;
  bool _txLoading      = false;
  String _interval     = '7';
  String _lockDays     = '1460';
  String _minWIK       = '1000';
  late AnimationController _pulseCtrl;
  late Animation<double> _pulse;

  @override
  void initState() {
    super.initState();
    _pulseCtrl = AnimationController(duration: const Duration(seconds: 2), vsync: this)..repeat(reverse: true);
    _pulse     = Tween(begin: .4, end: 1.0).animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));
  }

  @override
  void dispose() { _pulseCtrl.dispose(); super.dispose(); }

  Future<void> _toggle() async {
    setState(() => _txLoading = true);
    await // Real API call
    setState(() { _txLoading = false; _enabled = !_enabled; });
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text(_enabled ? 'Auto-compound enabled ✅' : 'Disabled'),
        backgroundColor: _enabled ? _green : _red,
        duration: const Duration(seconds: 3),
      ));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: ListView(padding: const EdgeInsets.all(14), children: [

          // Status banner
          AnimatedBuilder(
            animation: _pulse,
            builder: (_, __) => Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: (_enabled ? _green : _gold).withOpacity(.06 * _pulse.value),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: (_enabled ? _green : _gold).withOpacity(.3)),
              ),
              child: Row(children: [
                Text(_enabled ? '🔄' : '⏸', style: const TextStyle(fontSize: 28)),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(
                    _enabled ? 'Auto-Compounding Active' : 'Auto-Compounding Inactive',
                    style: TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: _enabled ? _green : _gold),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    _enabled
                        ? 'Keeper bot runs weekly · veWIK grows automatically'
                        : 'Enable to auto-stake vested WIK and fee income',
                    style: TextStyle(fontSize: 11, color: _t2),
                  ),
                ])),
              ]),
            ),
          ),

          const SizedBox(height: 14),

          // Growth projection card
          _SectionCard(
            title: '5-Year Growth Projection',
            icon: '📈',
            accent: _purple,
            child: Column(children: [
              Text(
                'Assumes 90M WIK vesting over 3yr post-cliff · fees reinvested · lock at 4yr max · \$10M daily volume',
                style: TextStyle(fontSize: 11, color: _t2, height: 1.6),
              ),
              const SizedBox(height: 14),
              ...['Now', 'Year 1', 'Year 2', 'Year 3', 'Year 4'].asMap().entries.map((e) {
                final i = e.key;
                final label = e.value;
                final veWIK = ['0', '30M', '60M', '82M', '98M'][i];
                final fees  = ['\$0/mo', '\$3,600/mo', '\$7,200/mo', '\$9,840/mo', '\$11,760/mo'][i];
                final pct   = [0.0, 0.33, 0.67, 0.89, 1.0][i];

                return Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: Column(children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      Row(children: [
                        Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: i == 0 ? _t2 : _t1)),
                        const SizedBox(width: 10),
                        Text(fees, style: TextStyle(fontSize: 11, color: _green, fontFamily: 'monospace')),
                      ]),
                      Text('$veWIK veWIK', style: TextStyle(fontSize: 12, fontFamily: 'monospace', color: i == 0 ? _t3 : _purple)),
                    ]),
                    const SizedBox(height: 4),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                        value: pct, minHeight: 5, backgroundColor: _b2,
                        valueColor: const AlwaysStoppedAnimation(Color(0xFF8B5CF6)),
                      ),
                    ),
                  ]),
                );
              }),

              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: _green.withOpacity(.08), borderRadius: BorderRadius.circular(10), border: Border.all(color: _green.withOpacity(.25))),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('At full compounding (Year 4+):', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: _green)),
                  const SizedBox(height: 6),
                  Text('~100M veWIK · ~15% of total supply\nFees at \$10M vol: ~\$11,760/mo\nFees at \$100M vol: ~\$117,600/mo\nAll compounding automatically, forever.',
                    style: TextStyle(fontSize: 11, color: _t2, height: 1.7)),
                ]),
              ),
            ]),
          ),

          const SizedBox(height: 14),

          // Config
          _SectionCard(
            title: 'Configuration',
            icon: '⚙️',
            accent: _green,
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [

              // Toggle: reinvest fees
              _ToggleRow(
                label: 'Reinvest USDC fees → buy more WIK',
                hint: 'Fee income buys WIK → stakes as veWIK → earns more fees',
                value: _compoundFees,
                color: _green,
                onChanged: (v) => setState(() => _compoundFees = v),
              ),

              const SizedBox(height: 8),

              // Toggle: extend lock
              _ToggleRow(
                label: 'Re-extend lock to max each compound',
                hint: 'Prevents 25%/yr veWIK decay. Lock always at full power.',
                value: _extendLock,
                color: _sky,
                onChanged: (v) => setState(() => _extendLock = v),
              ),

              const SizedBox(height: 14),

              _AdminTextField(label: 'LOCK TARGET (DAYS)', hint: '1460 = 4yr max', prefilled: _lockDays),
              _AdminTextField(label: 'COMPOUND EVERY (DAYS)', hint: '7 = weekly', prefilled: _interval),
              _AdminTextField(label: 'MIN WIK TO TRIGGER', hint: '1000 WIK minimum', prefilled: _minWIK),

              const SizedBox(height: 12),
              _TxButton(
                label: _enabled ? 'Disable Auto-Compound' : '🔄 Enable Auto-Compound',
                color: _enabled ? _red : _green,
                textColor: _enabled ? Colors.white : Colors.black,
                loading: _txLoading,
                onPressed: _toggle,
              ),
            ]),
          ),

          const SizedBox(height: 14),

          // How it works
          _SectionCard(
            title: 'How the Growth Loop Works',
            icon: '🔁',
            accent: _sky,
            child: Column(children: [
              ...{
                '1': ('Vesting unlocks', 'Monthly WIK arrives in wallet', _green),
                '2': ('Fees claimed', 'USDC income from protocol fees', _gold),
                '3': ('Fees → WIK', 'Buys WIK with USDC automatically', _sky),
                '4': ('All staked', 'Added to veWIK lock', _purple),
                '5': ('Lock extended', 'Reset to 4yr max, no decay', _blue),
                '6': ('MORE FEES', 'Bigger veWIK → bigger share forever', _green),
              }.entries.map((e) => Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(children: [
                  Container(
                    width: 28, height: 28,
                    decoration: BoxDecoration(
                      color: e.value.$3.withOpacity(.15),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: e.value.$3.withOpacity(.4)),
                    ),
                    child: Center(child: Text(e.key, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: e.value.$3))),
                  ),
                  const SizedBox(width: 12),
                  Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(e.value.$1, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: e.value.$3)),
                    Text(e.value.$2, style: TextStyle(fontSize: 10, color: _t2)),
                  ])),
                  if (e.key != '6')
                    Icon(Icons.arrow_downward, size: 14, color: _t3),
                ]),
              )),
            ]),
          ),

          const SizedBox(height: 20),
        ]),
      ),
    );
  }
}

class _ToggleRow extends StatelessWidget {
  final String label, hint;
  final bool value;
  final Color color;
  final ValueChanged<bool> onChanged;
  const _ToggleRow({required this.label, required this.hint, required this.value, required this.color, required this.onChanged});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: () => onChanged(!value),
    child: AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: value ? color.withOpacity(.06) : Color(0xFF0A0F1C),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: value ? color.withOpacity(.3) : _b),
      ),
      child: Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(label, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: value ? color : _t2)),
          const SizedBox(height: 2),
          Text(hint, style: TextStyle(fontSize: 10, color: _t3)),
        ])),
        const SizedBox(width: 12),
        Switch(value: value, onChanged: onChanged, activeColor: color, materialTapTargetSize: MaterialTapTargetSize.shrinkWrap),
      ]),
    ),
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// OPS VAULT SCREEN — Owner Only (mobile)
// ─────────────────────────────────────────────────────────────────────────────

class OpsVaultScreen extends ConsumerStatefulWidget {
  const OpsVaultScreen({super.key});
  @override
  ConsumerState<OpsVaultScreen> createState() => _OpsVaultScreenState();
}

class _OpsVaultScreenState extends ConsumerState<OpsVaultScreen>
    with SingleTickerProviderStateMixin {

  late TabController _tabCtrl;
  bool _txLoading = false;
  int _activePanel = 0;

  // Mock vault data — replace with useReadContract calls
  final _totalValue    = 686127.0;
  final _idleUSDC      = 68612.0;
  final _inLending     = 274450.0;
  final _inBackstop    = 274450.0;
  final _inFunding     = 68615.0;
  final _yieldEarned   = 38127.0;
  final _estimatedAPY  = 12.4;
  final _instantLiquid = 343062.0;

  double _lendAlloc    = 40;
  double _backstopAlloc= 40;
  double _fundingAlloc = 10;
  double _idleAlloc    = 10;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 4, vsync: this);
  }

  @override
  void dispose() { _tabCtrl.dispose(); super.dispose(); }

  Future<void> _mockTx(String action) async {
    setState(() => _txLoading = true);
    await // Real API call
    setState(() => _txLoading = false);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(
        content: Text('$action confirmed ✅'),
        backgroundColor: _green,
        duration: const Duration(seconds: 3),
      ));
    }
  }

  String _usdc(double v) => '\$\${v.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (m) => '\${m[1]},')}';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _bg,
      body: SafeArea(
        child: Column(children: [

          // Owner badge
          Container(
            margin: const EdgeInsets.all(12),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: _green.withOpacity(.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: _green.withOpacity(.3)),
            ),
            child: Row(children: [
              const Text('🔐', style: TextStyle(fontSize: 20)),
              const SizedBox(width: 10),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('Ops Vault — Owner Only', style: TextStyle(fontSize: 13, fontWeight: FontWeight.w800, color: _green)),
                Text('Visible only to your wallet', style: TextStyle(fontSize: 10, color: _t2)),
              ]),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: _green.withOpacity(.15), borderRadius: BorderRadius.circular(100)),
                child: Text('🟢 OWNER', style: TextStyle(fontSize: 9, fontWeight: FontWeight.w700, color: _green, fontFamily: 'monospace')),
              ),
            ]),
          ),

          // Tab bar
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12),
            padding: const EdgeInsets.all(4),
            decoration: BoxDecoration(color: Color(0xFF0A0F1C), borderRadius: BorderRadius.circular(12), border: Border.all(color: _b)),
            child: TabBar(
              controller: _tabCtrl,
              indicator: BoxDecoration(borderRadius: BorderRadius.circular(9), color: _green),
              labelColor: Colors.black,
              unselectedLabelColor: _t2,
              labelStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700),
              tabs: const [Tab(text: '📊 Dash'), Tab(text: '💵 Withdraw'), Tab(text: '⚙️ Strategy'), Tab(text: '📈 Growth')],
            ),
          ),

          const SizedBox(height: 8),

          Expanded(
            child: TabBarView(controller: _tabCtrl, children: [
              _buildDashboard(),
              _buildWithdraw(),
              _buildStrategies(),
              _buildGrowth(),
            ]),
          ),
        ]),
      ),
    );
  }

  // DASHBOARD
  Widget _buildDashboard() {
    return ListView(padding: const EdgeInsets.symmetric(horizontal: 12), children: [
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          gradient: LinearGradient(colors: [Color(0xFF0A1830), Color(0xFF0F2040)]),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: _green.withOpacity(.25)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('TOTAL VAULT VALUE', style: TextStyle(fontSize: 9, color: _t2, fontWeight: FontWeight.w700, letterSpacing: .8)),
          const SizedBox(height: 6),
          Text(_usdc(_totalValue), style: TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: _green, fontFamily: 'monospace', letterSpacing: -2)),
          const SizedBox(height: 12),
          Row(children: [
            _miniStat('Yield Earned', _usdc(_yieldEarned), _gold),
            const SizedBox(width: 16),
            _miniStat('Est APY', '\${_estimatedAPY}%', _sky),
            const SizedBox(width: 16),
            _miniStat('Instant Liquid', _usdc(_instantLiquid), _green),
          ]),
        ]),
      ),
      const SizedBox(height: 12),
      ...[ 
        ['💵 Idle USDC',       _idleUSDC,    '0% · Instant',    _t2],
        ['🏦 WikiLending',     _inLending,   '~6% · Instant',   _blue],
        ['🛡 Backstop Vault',  _inBackstop,  '~20% · 7-day',    _gold],
        ['📊 Funding Arb',     _inFunding,   '~10% · 1-3 day',  const Color(0xFF8B5CF6)],
      ].map((s) => _stratCard(s[0] as String, s[1] as double, s[2] as String, s[3] as Color)),
      const SizedBox(height: 12),
      _TxButton(
        label: '🔄 Rebalance — Deploy Idle Funds',
        color: _blue, textColor: Colors.white,
        loading: _txLoading,
        onPressed: () => _mockTx('Rebalance'),
      ),
      const SizedBox(height: 20),
    ]);
  }

  // WITHDRAW
  Widget _buildWithdraw() {
    final amounts = [1000.0, 5000.0, 10000.0, 25000.0];
    return ListView(padding: const EdgeInsets.symmetric(horizontal: 12), children: [
      _SectionCard(title: 'Quick Withdraw (Instant)', icon: '⚡', accent: _sky, child: Column(
        children: [
          Text('Only touches idle + lending. Zero delay.', style: TextStyle(fontSize: 11, color: _t2)),
          const SizedBox(height: 10),
          ...amounts.map((amt) => Padding(
            padding: const EdgeInsets.only(bottom: 7),
            child: _TxButton(
              label: 'Withdraw \${_usdc(amt)} → My Wallet',
              color: _sky.withOpacity(.15),
              textColor: _sky,
              loading: _txLoading,
              onPressed: () => _mockTx('Instant withdraw \${_usdc(amt)}'),
            ),
          )),
        ],
      )),
      const SizedBox(height: 12),
      _SectionCard(title: 'Custom Amount', icon: '💵', accent: _green, child: Column(children: [
        _AdminTextField(label: 'AMOUNT (USDC)', hint: 'e.g. 50000', keyboardType: TextInputType.number),
        _AdminTextField(label: 'RECIPIENT WALLET', hint: '0x...'),
        _TxButton(label: 'Withdraw Custom Amount', color: _green, textColor: Colors.black, loading: _txLoading, onPressed: () => _mockTx('Custom withdraw')),
      ])),
      const SizedBox(height: 12),
      _SectionCard(title: 'Withdraw Everything', icon: '🏦', accent: _red, child: Column(children: [
        _TxButton(label: 'Withdraw All Liquid Funds', color: _red, textColor: Colors.white, loading: _txLoading, onPressed: () => _mockTx('Withdraw all')),
        const SizedBox(height: 8),
        Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: _gold.withOpacity(.08), borderRadius: BorderRadius.circular(9), border: Border.all(color: _gold.withOpacity(.3))),
          child: Text('Backstop has 7-day delay. Use Request Backstop Unstake first.', style: TextStyle(fontSize: 11, color: _gold, height: 1.6))),
        const SizedBox(height: 10),
        _TxButton(label: 'Request Backstop Unstake (7-day)', color: _orange, textColor: Colors.white, loading: _txLoading, onPressed: () => _mockTx('Backstop unstake request')),
      ])),
      const SizedBox(height: 20),
    ]);
  }

  // STRATEGIES
  Widget _buildStrategies() {
    final sum = _lendAlloc + _backstopAlloc + _fundingAlloc + _idleAlloc;
    final ok = (sum - 100).abs() < 0.1;
    return ListView(padding: const EdgeInsets.symmetric(horizontal: 12), children: [
      _SectionCard(title: 'Allocation Targets', icon: '⚖️', accent: const Color(0xFF8B5CF6), child: Column(children: [
        ...[
          ['Lending (6% APY · instant)',  _lendAlloc,     (v) => setState(() => _lendAlloc = v),     _blue],
          ['Backstop (20% APY · 7-day)', _backstopAlloc, (v) => setState(() => _backstopAlloc = v), _gold],
          ['Funding Arb (10% · 1-3d)',   _fundingAlloc,  (v) => setState(() => _fundingAlloc = v),  const Color(0xFF8B5CF6)],
          ['Idle Buffer (0% · instant)',  _idleAlloc,     (v) => setState(() => _idleAlloc = v),     _t2],
        ].map((s) => _sliderRow(s[0] as String, s[1] as double, s[2] as Function(double), s[3] as Color)),
        Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: ok ? _green.withOpacity(.08) : _red.withOpacity(.08),
            borderRadius: BorderRadius.circular(9),
            border: Border.all(color: ok ? _green.withOpacity(.3) : _red.withOpacity(.3)),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Total allocation', style: TextStyle(fontSize: 12, color: _t2)),
            Text('\${sum.toStringAsFixed(0)}% \${ok ? "✅" : "❌ must be 100%"}', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: ok ? _green : _red)),
          ]),
        ),
        const SizedBox(height: 10),
        _TxButton(label: 'Save Allocation', color: ok ? const Color(0xFF8B5CF6) : _b2, textColor: Colors.white, loading: _txLoading, disabled: !ok, onPressed: () => _mockTx('Save allocation')),
      ])),
      const SizedBox(height: 12),
      _SectionCard(title: 'Emergency Controls', icon: '🚨', accent: _red, child: Row(children: [
        Expanded(child: _TxButton(label: '⏸ Pause', color: _red, textColor: Colors.white, loading: _txLoading, onPressed: () => _mockTx('Pause vault'))),
        const SizedBox(width: 8),
        Expanded(child: _TxButton(label: '▶ Resume', color: _green, textColor: Colors.black, loading: _txLoading, onPressed: () => _mockTx('Unpause vault'))),
      ])),
      const SizedBox(height: 20),
    ]);
  }

  // GROWTH
  Widget _buildGrowth() {
    final rows = [
      ['M1',  54000,   900],
      ['M3',  163680,  5616],
      ['M6',  332486,  14922],
      ['M12', 686127,  38127],
    ];
    return ListView(padding: const EdgeInsets.symmetric(horizontal: 12), children: [
      _SectionCard(title: '12-Month Projection', icon: '📈', accent: _green, child: Column(children: [
        Text('\$54K/mo inflow (\$10M/day vol) · 12.4% blended APY', style: TextStyle(fontSize: 11, color: _t2)),
        const SizedBox(height: 12),
        ...rows.map((r) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Column(children: [
            Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(r[0] as String, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
              Row(children: [
                Text(_usdc((r[1] as int).toDouble()), style: TextStyle(fontSize: 12, fontFamily: 'monospace', color: _green, fontWeight: FontWeight.w700)),
                const SizedBox(width: 10),
                Text('+\${_usdc((r[2] as int).toDouble())} yield', style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: _gold)),
              ]),
            ]),
            const SizedBox(height: 4),
            ClipRRect(borderRadius: BorderRadius.circular(2), child: LinearProgressIndicator(
              value: (r[1] as int) / 686127.0, minHeight: 4,
              backgroundColor: _b2, valueColor: AlwaysStoppedAnimation(_green),
            )),
          ]),
        )),
      ])),
      const SizedBox(height: 12),
      _SectionCard(title: 'At Different Volumes', icon: '🎯', accent: _gold, child: Column(children: [
        ...[
          ['\$10M/day', '\$54K/mo', '\$686K', '+\$38K/yr'],
          ['\$50M/day', '\$270K/mo', '\$3.4M', '+\$191K/yr'],
          ['\$100M/day', '\$540K/mo', '\$6.9M', '+\$381K/yr'],
        ].map((r) => Padding(
          padding: const EdgeInsets.only(bottom: 10),
          child: Row(children: [
            Text(r[0], style: TextStyle(fontSize: 11, fontFamily: 'monospace', fontWeight: FontWeight.w700, color: _gold)),
            const SizedBox(width: 10),
            Expanded(child: Text(r[1], style: TextStyle(fontSize: 11, color: _t2))),
            Text(r[2], style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: _t1)),
            const SizedBox(width: 8),
            Text(r[3], style: TextStyle(fontSize: 11, fontFamily: 'monospace', color: _sky, fontWeight: FontWeight.w700)),
          ]),
        )),
      ])),
      const SizedBox(height: 20),
    ]);
  }

  // Helper widgets
  Widget _miniStat(String l, String v, Color c) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    Text(l, style: TextStyle(fontSize: 9, color: _t2)),
    Text(v, style: TextStyle(fontSize: 13, fontWeight: FontWeight.w700, color: c, fontFamily: 'monospace')),
  ]);

  Widget _stratCard(String label, double val, String note, Color c) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: _card, borderRadius: BorderRadius.circular(10), border: Border.all(color: c.withOpacity(.25))),
    child: Row(children: [
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w700)),
        Text(note, style: TextStyle(fontSize: 10, color: _t2)),
      ])),
      Text(_usdc(val), style: TextStyle(fontSize: 15, fontWeight: FontWeight.w700, color: c, fontFamily: 'monospace')),
    ]),
  );

  Widget _sliderRow(String label, double val, Function(double) onChanged, Color c) => Padding(
    padding: const EdgeInsets.only(bottom: 12),
    child: Column(children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Text(label, style: TextStyle(fontSize: 11, color: _t2)),
        Text('\${val.toStringAsFixed(0)}%', style: TextStyle(fontSize: 12, fontFamily: 'monospace', fontWeight: FontWeight.w700, color: c)),
      ]),
      Slider(value: val, min: 0, max: 80, onChanged: onChanged, activeColor: c, inactiveColor: _b2),
    ]),
  );
}
