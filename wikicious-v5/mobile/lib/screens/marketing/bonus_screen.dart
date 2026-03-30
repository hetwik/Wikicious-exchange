import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:share_plus/share_plus.dart';
import '../../theme.dart';
import '../../providers/providers.dart';
import '../../services/api_service.dart';

// ── Models ────────────────────────────────────────────────────────────────
class BonusAccount {
  final double creditBalance, totalGranted, feesGenerated;
  final int    daysLeft, expiresAt;
  final bool   signupClaimed, depositMatchClaimed, isExpired;
  final ReferralInfo referral;
  const BonusAccount({
    required this.creditBalance, required this.totalGranted,
    required this.feesGenerated, required this.daysLeft,
    required this.expiresAt, required this.signupClaimed,
    required this.depositMatchClaimed, required this.isExpired,
    required this.referral,
  });
  factory BonusAccount.fromJson(Map<String, dynamic> j) => BonusAccount(
    creditBalance:      (j['creditBalance']      ?? 0).toDouble(),
    totalGranted:       (j['totalGranted']        ?? 0).toDouble(),
    feesGenerated:      (j['feesGenerated']       ?? 0).toDouble(),
    daysLeft:           (j['daysLeft']            ?? 0).toInt(),
    expiresAt:          (j['expiresAt']           ?? 0).toInt(),
    signupClaimed:       j['signupClaimed']        ?? false,
    depositMatchClaimed: j['depositMatchClaimed']  ?? false,
    isExpired:           j['isExpired']            ?? false,
    referral: ReferralInfo.fromJson(j['referral'] ?? {}),
  );
}

class ReferralInfo {
  final int    totalReferrals, qualifiedReferrals;
  final double totalBonusEarned, revenueShareEarned, pendingRevShare;
  final String myCode;
  const ReferralInfo({
    required this.totalReferrals, required this.qualifiedReferrals,
    required this.totalBonusEarned, required this.revenueShareEarned,
    required this.pendingRevShare, required this.myCode,
  });
  factory ReferralInfo.fromJson(Map<String, dynamic> j) => ReferralInfo(
    totalReferrals:     (j['totalReferrals']     ?? 0).toInt(),
    qualifiedReferrals: (j['qualifiedReferrals'] ?? 0).toInt(),
    totalBonusEarned:   (j['totalBonusEarned']   ?? 0).toDouble(),
    revenueShareEarned: (j['revenueShareEarned'] ?? 0).toDouble(),
    pendingRevShare:    (j['pendingRevShare']     ?? 0).toDouble(),
    myCode:              j['myCode']?.toString()  ?? '',
  );
}

// ── Provider ──────────────────────────────────────────────────────────────
final bonusProvider = FutureProvider.family<BonusAccount, String>((ref, address) async {
  final r = await api._dio.get('/api/bonus/$address');
  return BonusAccount.fromJson(r.data);
});

final referralLinkProvider = FutureProvider.family<Map<String, dynamic>, String>((ref, address) async {
  final r = await api._dio.get('/api/bonus/referral-link/$address');
  return Map<String, dynamic>.from(r.data);
});

// ── Bonus Dashboard Screen ────────────────────────────────────────────────
class BonusDashboardScreen extends ConsumerWidget {
  const BonusDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final address = ref.watch(authProvider).address ?? '';
    final bonus   = ref.watch(bonusProvider(address));

    return Scaffold(
      backgroundColor: WikColor.bg0,
      appBar: AppBar(
        backgroundColor: WikColor.bg0,
        title: const Text('Bonuses & Referrals'),
      ),
      body: bonus.when(
        loading: () => const Center(child: CircularProgressIndicator(color: WikColor.accent)),
        error:   (e, _) => Center(child: Text('$e')),
        data:    (acc) => RefreshIndicator(
          color: WikColor.accent,
          onRefresh: () => ref.refresh(bonusProvider(address).future),
          child: ListView(padding: const EdgeInsets.all(16), children: [
            _BonusBalanceCard(acc: acc),
            const SizedBox(height: 16),
            _BonusProgressList(acc: acc, address: address),
            const SizedBox(height: 16),
            _ReferralCard(acc: acc, address: address),
            const SizedBox(height: 16),
            if (acc.referral.pendingRevShare > 0)
              _RevShareClaimCard(pending: acc.referral.pendingRevShare),
            const SizedBox(height: 16),
            _ReferralLeaderboard(),
            const SizedBox(height: 16),
            _HowItWorksCard(),
          ]),
        ),
      ),
    );
  }
}

// ── Bonus balance card ────────────────────────────────────────────────────
class _BonusBalanceCard extends StatelessWidget {
  final BonusAccount acc;
  const _BonusBalanceCard({required this.acc});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      gradient: const LinearGradient(
        colors: [Color(0xFF1a2040), Color(0xFF0d1525)],
        begin: Alignment.topLeft, end: Alignment.bottomRight,
      ),
      borderRadius: BorderRadius.circular(16),
      border: Border.all(
        color: acc.isExpired ? WikColor.red.withOpacity(0.5) : WikColor.gold.withOpacity(0.5),
      ),
    ),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(children: [
        const Icon(Icons.card_giftcard, color: WikColor.gold, size: 18),
        const SizedBox(width: 6),
        const Text('Trading Credit', style: TextStyle(color: WikColor.gold, fontWeight: FontWeight.w700, fontSize: 13)),
        const Spacer(),
        if (acc.isExpired)
          _Badge('EXPIRED', WikColor.red)
        else if (acc.daysLeft <= 14)
          _Badge('${acc.daysLeft}d left', WikColor.gold)
        else
          _Badge('${acc.daysLeft}d left', WikColor.green),
      ]),
      const SizedBox(height: 12),
      Text(
        '\$${acc.creditBalance.toStringAsFixed(2)}',
        style: const TextStyle(color: WikColor.text1, fontSize: 32, fontWeight: FontWeight.w900, fontFamily: 'SpaceMono'),
      ),
      const SizedBox(height: 4),
      Text('Available to trade • Not withdrawable', style: WikText.label(size: 11)),
      const SizedBox(height: 16),
      Row(children: [
        Expanded(child: _MiniStat('\$${acc.totalGranted.toStringAsFixed(0)}', 'Total Earned')),
        Expanded(child: _MiniStat('\$${acc.feesGenerated.toStringAsFixed(2)}', 'Fees Generated')),
        Expanded(child: _MiniStat('0.10%', 'Fee Rate')),
      ]),
      if (!acc.isExpired && acc.creditBalance > 0) ...[
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: ElevatedButton.icon(
          onPressed: () => context.push('/trade?useBonus=true'),
          icon: const Icon(Icons.candlestick_chart, size: 16),
          label: const Text('Trade with Credit'),
          style: ElevatedButton.styleFrom(
            backgroundColor: WikColor.gold,
            foregroundColor: Colors.black,
            padding: const EdgeInsets.symmetric(vertical: 10),
          ),
        )),
      ],
    ]),
  );
}

// ── Bonus progress checklist ──────────────────────────────────────────────
class _BonusProgressList extends StatelessWidget {
  final BonusAccount acc;
  final String address;
  const _BonusProgressList({required this.acc, required this.address});

  @override
  Widget build(BuildContext context) => Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
    const Text('Earn More Bonuses', style: TextStyle(color: WikColor.text1, fontSize: 16, fontWeight: FontWeight.w700)),
    const SizedBox(height: 10),
    _BonusItem(
      icon:      Icons.person_add_outlined,
      title:     'Create account',
      subtitle:  'Sign up with a wallet',
      amount:    50,
      claimed:   acc.signupClaimed,
      color:     WikColor.accent,
      onClaim:   acc.signupClaimed ? null : () => context.push('/onboard'),
    ),
    _BonusItem(
      icon:      Icons.account_balance_wallet_outlined,
      title:     'First deposit \$100+',
      subtitle:  'Deposit USDC into your account',
      amount:    100,
      claimed:   acc.depositMatchClaimed,
      color:     WikColor.green,
      onClaim:   acc.depositMatchClaimed ? null : () => context.push('/wallet'),
    ),
    _BonusItem(
      icon:      Icons.people_outline,
      title:     'Refer a friend',
      subtitle:  'Each friend who deposits earns you \$50',
      amount:    50,
      claimed:   false,
      color:     WikColor.gold,
      badge:     acc.referral.qualifiedReferrals > 0 ? '${acc.referral.qualifiedReferrals} done' : null,
      onClaim:   () => _shareReferral(context, address),
    ),
    _BonusItem(
      icon:      Icons.emoji_events_outlined,
      title:     'Refer 5 friends',
      subtitle:  'Streak bonus — one-time \$200 reward',
      amount:    200,
      claimed:   acc.referral.qualifiedReferrals >= 5,
      color:     const Color(0xFF8b5cf6),
      badge:     '${acc.referral.qualifiedReferrals}/5',
      onClaim:   acc.referral.qualifiedReferrals >= 5 ? null : () => _shareReferral(context, address),
    ),
  ]);

  void _shareReferral(BuildContext ctx, String address) {
    context.push('/referral/$address');
  }
}

class _BonusItem extends StatelessWidget {
  final IconData icon;
  final String   title, subtitle;
  final int      amount;
  final bool     claimed;
  final Color    color;
  final String?  badge;
  final VoidCallback? onClaim;
  const _BonusItem({
    required this.icon, required this.title, required this.subtitle,
    required this.amount, required this.claimed, required this.color,
    this.badge, this.onClaim,
  });

  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 8),
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: claimed ? WikColor.bg1 : WikColor.bg2,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: claimed ? WikColor.border : color.withOpacity(0.3)),
    ),
    child: Row(children: [
      Container(
        width: 40, height: 40,
        decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, color: claimed ? WikColor.text3 : color, size: 20),
      ),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(title, style: TextStyle(
          color: claimed ? WikColor.text3 : WikColor.text1,
          fontWeight: FontWeight.w700, fontSize: 13,
          decoration: claimed ? TextDecoration.lineThrough : null,
        )),
        Text(subtitle, style: WikText.label(size: 11)),
      ])),
      if (badge != null)
        Container(
          margin: const EdgeInsets.only(right: 8),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(4)),
          child: Text(badge!, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
        ),
      if (claimed)
        const Icon(Icons.check_circle, color: WikColor.green, size: 20)
      else
        GestureDetector(
          onTap: onClaim,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
            decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
            child: Text('+\$$amount', style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 13)),
          ),
        ),
    ]),
  );
}

// ── Referral card ─────────────────────────────────────────────────────────
class _ReferralCard extends ConsumerWidget {
  final BonusAccount acc;
  final String address;
  const _ReferralCard({required this.acc, required this.address});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final linkData = ref.watch(referralLinkProvider(address));

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: WikColor.bg1,
        borderRadius: BorderRadius.circular(16),
        border: const Border.fromBorderSide(BorderSide(color: WikColor.border)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.share, color: WikColor.accent, size: 18),
          const SizedBox(width: 8),
          const Text('Your Referral Link', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 15)),
        ]),
        const SizedBox(height: 6),
        const Text(
          'Friends get \$50 free credit. You get \$50 + 10% of their trading fees forever.',
          style: TextStyle(color: WikColor.text2, fontSize: 12, height: 1.4),
        ),
        const SizedBox(height: 14),

        // Stats row
        Row(children: [
          Expanded(child: _RefStat('${acc.referral.qualifiedReferrals}', 'Friends', WikColor.accent)),
          Expanded(child: _RefStat('\$${acc.referral.totalBonusEarned.toStringAsFixed(0)}', 'Bonus Earned', WikColor.gold)),
          Expanded(child: _RefStat('\$${acc.referral.revenueShareEarned.toStringAsFixed(2)}', 'Rev Share', WikColor.green)),
        ]),
        const SizedBox(height: 14),

        // Link display
        linkData.when(
          loading: () => const LinearProgressIndicator(color: WikColor.accent),
          error:   (_, __) => const Text('Failed to load link', style: TextStyle(color: WikColor.red)),
          data:    (data) => _ReferralLinkBox(data: data),
        ),
      ]),
    );
  }
}

class _ReferralLinkBox extends StatelessWidget {
  final Map<String, dynamic> data;
  const _ReferralLinkBox({required this.data});

  @override
  Widget build(BuildContext context) {
    final link = data['link'] as String? ?? '';
    final tweet = data['tweetText'] as String? ?? '';

    return Column(children: [
      // Link box
      Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: WikColor.bg3,
          borderRadius: BorderRadius.circular(8),
          border: const Border.fromBorderSide(BorderSide(color: WikColor.border)),
        ),
        child: Row(children: [
          Expanded(child: Text(link, style: const TextStyle(color: WikColor.accent, fontSize: 12, fontFamily: 'SpaceMono'), overflow: TextOverflow.ellipsis)),
          GestureDetector(
            onTap: () {
              Clipboard.setData(ClipboardData(text: link));
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Link copied!'), backgroundColor: WikColor.green, duration: Duration(seconds: 1)),
              );
            },
            child: const Padding(
              padding: EdgeInsets.only(left: 8),
              child: Icon(Icons.copy, color: WikColor.accent, size: 16),
            ),
          ),
        ]),
      ),
      const SizedBox(height: 10),
      // Share buttons
      Row(children: [
        Expanded(child: _ShareBtn(
          icon: Icons.share,
          label: 'Share',
          color: WikColor.accent,
          onTap: () => Share.share(data['shareText'] ?? link),
        )),
        const SizedBox(width: 8),
        Expanded(child: _ShareBtn(
          icon: Icons.alternate_email,
          label: 'Tweet',
          color: const Color(0xFF1DA1F2),
          onTap: () {
            // Launch Twitter with pre-filled tweet
            final encoded = Uri.encodeComponent(tweet);
            // launchUrl(Uri.parse('https://twitter.com/intent/tweet?text=$encoded'));
          },
        )),
        const SizedBox(width: 8),
        Expanded(child: _ShareBtn(
          icon: Icons.telegram,
          label: 'Telegram',
          color: const Color(0xFF0088cc),
          onTap: () => Share.share(link),
        )),
      ]),
    ]);
  }
}

class _ShareBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ShareBtn({required this.icon, required this.label, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(vertical: 10),
      decoration: BoxDecoration(color: color.withOpacity(0.12), borderRadius: BorderRadius.circular(8),
          border: Border.all(color: color.withOpacity(0.3))),
      child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(icon, color: color, size: 15),
        const SizedBox(width: 4),
        Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w700)),
      ]),
    ),
  );
}

// ── Rev share claim ───────────────────────────────────────────────────────
class _RevShareClaimCard extends StatelessWidget {
  final double pending;
  const _RevShareClaimCard({required this.pending});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: WikColor.greenBg,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: WikColor.green.withOpacity(0.4)),
    ),
    child: Row(children: [
      const Icon(Icons.attach_money, color: WikColor.green, size: 24),
      const SizedBox(width: 12),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Revenue Share Ready', style: TextStyle(color: WikColor.green, fontWeight: FontWeight.w700, fontSize: 14)),
        Text('10% of your referrals\' trading fees', style: WikText.label(size: 11)),
      ])),
      ElevatedButton(
        onPressed: () { /* call bonus.claimRevShare() on-chain */ },
        style: ElevatedButton.styleFrom(backgroundColor: WikColor.green, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8)),
        child: Text('Claim \$${pending.toStringAsFixed(2)}'),
      ),
    ]),
  );
}

// ── Referral leaderboard ──────────────────────────────────────────────────
class _ReferralLeaderboard extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return FutureBuilder(
      future: api._dio.get('/api/bonus/leaderboard/referrals'),
      builder: (ctx, snap) {
        if (!snap.hasData) return const SizedBox.shrink();
        final data = (snap.data!.data as List).take(5).toList();
        return Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Top Referrers', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 15)),
          const SizedBox(height: 8),
          ...data.asMap().entries.map((e) => _LeaderRow(entry: e.value, rank: e.key + 1)),
        ]);
      },
    );
  }
}

class _LeaderRow extends StatelessWidget {
  final dynamic entry;
  final int rank;
  const _LeaderRow({required this.entry, required this.rank});
  Color get _rc => rank == 1 ? WikColor.gold : rank == 2 ? const Color(0xFFC0C0C0) : rank == 3 ? const Color(0xFFCD7F32) : WikColor.text3;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 6),
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
    decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(8),
        border: const Border.fromBorderSide(BorderSide(color: WikColor.border))),
    child: Row(children: [
      SizedBox(width: 24, child: Text('$rank', style: TextStyle(color: _rc, fontWeight: FontWeight.w800))),
      Expanded(child: Text(
        '${(entry['address'] as String).substring(0, 6)}...${(entry['address'] as String).substring(38)}',
        style: const TextStyle(color: WikColor.text1, fontSize: 13, fontFamily: 'SpaceMono'),
      )),
      Text('${entry['qualifiedReferrals']} friends', style: WikText.label(size: 11)),
      const SizedBox(width: 12),
      Text('\$${NumberFormat('#,##0').format(entry['bonusEarned'])}', style: const TextStyle(color: WikColor.gold, fontWeight: FontWeight.w700, fontSize: 13)),
    ]),
  );
}

// ── How it works card ─────────────────────────────────────────────────────
class _HowItWorksCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12),
        border: const Border.fromBorderSide(BorderSide(color: WikColor.border))),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      const Text('How trading credit works', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
      const SizedBox(height: 12),
      _HowRow('💰', 'Credit is virtual — it never leaves the platform as cash'),
      _HowRow('📈', 'Use it as collateral to open real trades'),
      _HowRow('✅', 'Profits from your trades are 100% real and withdrawable'),
      _HowRow('⚡', 'Fee on bonus trades is 0.10% (double normal rate)'),
      _HowRow('⏱', 'Credit expires 90 days after last grant — use it!'),
      _HowRow('🔗', 'Referral revenue share (10%) is paid in real USDC forever'),
    ]),
  );
}

class _HowRow extends StatelessWidget {
  final String emoji, text;
  const _HowRow(this.emoji, this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(emoji, style: const TextStyle(fontSize: 14)),
      const SizedBox(width: 8),
      Expanded(child: Text(text, style: const TextStyle(color: WikColor.text2, fontSize: 12, height: 1.4))),
    ]),
  );
}

// ── Helper widgets ────────────────────────────────────────────────────────
class _Badge extends StatelessWidget {
  final String text;
  final Color color;
  const _Badge(this.text, this.color);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
    decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(5)),
    child: Text(text, style: TextStyle(color: color, fontSize: 10, fontWeight: FontWeight.w700)),
  );
}

class _MiniStat extends StatelessWidget {
  final String value, label;
  const _MiniStat(this.value, this.label);
  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 13, fontFamily: 'SpaceMono')),
    Text(label, style: WikText.label(size: 10)),
  ]);
}

class _RefStat extends StatelessWidget {
  final String value, label;
  final Color color;
  const _RefStat(this.value, this.label, this.color);
  @override
  Widget build(BuildContext context) => Column(children: [
    Text(value, style: TextStyle(color: color, fontWeight: FontWeight.w800, fontSize: 16, fontFamily: 'SpaceMono')),
    Text(label, style: WikText.label(size: 10)),
  ]);
}
