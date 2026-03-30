import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../theme.dart';
import '../providers/providers.dart';

class ShellScreen extends ConsumerWidget {
  final Widget child;
  const ShellScreen({super.key, required this.child});

  static const _tabs = [
    (icon: Icons.bar_chart_outlined,              active: Icons.bar_chart,              label: 'Markets',  path: '/markets'),
    (icon: Icons.candlestick_chart_outlined,      active: Icons.candlestick_chart,      label: 'Trade',    path: '/trade'),
    (icon: Icons.account_balance_wallet_outlined, active: Icons.account_balance_wallet, label: 'Wallet',   path: '/wallet'),
    (icon: Icons.leaderboard_outlined,            active: Icons.leaderboard,            label: 'Rankings', path: '/leaderboard'),
  ];

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final location  = GoRouterState.of(context).uri.path;
    final currentIdx = _tabs.indexWhere((t) => location.startsWith(t.path));

    return Scaffold(
      backgroundColor: WikColor.bg0,
      body: Stack(children: [
        child,

      ]),
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: WikColor.border)),
        ),
        child: BottomNavigationBar(
          currentIndex: currentIdx < 0 ? 0 : currentIdx,
          onTap: (i) => context.go(_tabs[i].path),
          items: _tabs.map((t) => BottomNavigationBarItem(
            icon: Stack(children: [
              Icon(t.icon),

            ]),
            activeIcon: Icon(t.active),
            label: t.label,
          )).toList(),
        ),
      ),
    );
  }
}


// ── More features bottom sheet (triggered from wallet tab) ────
class MoreFeaturesSheet extends StatelessWidget {
  const MoreFeaturesSheet({super.key});

  static const _items = [
    // ── Trading ───────────────────────────────────────────────
    (icon: Icons.candlestick_chart_outlined,   label: 'Spot',            path: '/spot',            color: Color(0xFF5B7FFF)),
    (icon: Icons.swap_horiz_rounded,           label: 'Swap',            path: '/swap',            color: Color(0xFF00D4A0)),
    (icon: Icons.currency_exchange_outlined,   label: 'Forex',           path: '/forex',           color: Color(0xFFF5C842)),
    (icon: Icons.electric_bolt_outlined,       label: 'vAMM 1000×',      path: '/vamm',            color: Color(0xFFFF4F6B)),
    (icon: Icons.bar_chart_outlined,           label: 'Index Perps',     path: '/index-perps',     color: Color(0xFF00D4FF)),
    (icon: Icons.diamond_outlined,             label: 'NFT Perps',       path: '/nft-perps',       color: Color(0xFFA855F7)),
    // ── Auto Trading ──────────────────────────────────────────
    (icon: Icons.smart_toy_outlined,           label: 'Trade Bots',      path: '/bots',            color: Color(0xFF00D4FF)),
    (icon: Icons.people_outline,               label: 'Copy Trade',      path: '/copy-trading',    color: Color(0xFF5B7FFF)),
    (icon: Icons.code_outlined,                label: 'Algo Trading',    path: '/algo-trading',    color: Color(0xFF00D4A0)),
    // ── Yield & Vaults ────────────────────────────────────────
    (icon: Icons.lock_outline,                 label: 'Stake & Farm',    path: '/staking',         color: Color(0xFF5B7FFF)),
    (icon: Icons.account_balance_outlined,     label: 'Lend & Borrow',   path: '/lending',         color: Color(0xFF00D4A0)),
    (icon: Icons.content_cut_outlined,         label: 'Yield Slicing',   path: '/yield-slice',     color: Color(0xFFA855F7)),
    (icon: Icons.workspace_premium_outlined,   label: 'Options Vaults',  path: '/options-vaults',  color: Color(0xFFFF8C42)),
    (icon: Icons.auto_graph_outlined,          label: 'Strategy Vaults', path: '/strategy-vaults', color: Color(0xFF00D4FF)),
    (icon: Icons.precision_manufacturing_outlined, label: 'Managed LP',  path: '/managed-vaults',  color: Color(0xFF00D4A0)),
    (icon: Icons.loop_outlined,                label: 'Restaking',       path: '/liquid-restaking',color: Color(0xFFA855F7)),
    // ── New Session 3 ─────────────────────────────────────────
    (icon: Icons.account_balance_wallet_outlined, label: 'Smart Wallet', path: '/smart-wallet',    color: Color(0xFF5B7FFF)),
    (icon: Icons.flash_on_outlined,            label: 'Zap LP',          path: '/zap',             color: Color(0xFF00D4A0)),
    (icon: Icons.shield_outlined,              label: 'AI Guardrails',   path: '/ai-guardrails',   color: Color(0xFFFF4F6B)),
    (icon: Icons.how_to_vote_outlined,         label: 'Agentic DAO',     path: '/agentic-dao',     color: Color(0xFF5B7FFF)),
    (icon: Icons.pie_chart_outline,            label: 'Revenue',         path: '/revenue',         color: Color(0xFFF5C842)),
    (icon: Icons.business_outlined,            label: 'Institutional',   path: '/institutional',   color: Color(0xFFF5C842)),
    (icon: Icons.credit_card_outlined,         label: 'Buy Crypto',      path: '/fiat-onramp',     color: Color(0xFF00D4A0)),
    (icon: Icons.link_outlined,                label: 'Bond POL',        path: '/bonding-pol',     color: Color(0xFF00D4FF)),
    // ── Other ─────────────────────────────────────────────────
    (icon: Icons.swap_vertical_circle_outlined,label: 'Bridge',          path: '/bridge',          color: Color(0xFFF5C842)),
    (icon: Icons.rocket_launch_outlined,       label: 'Launchpad',       path: '/launchpad',       color: Color(0xFFFF8C42)),
    (icon: Icons.emoji_events_outlined,        label: 'Prop Trading',    path: '/prop',            color: Color(0xFFFFD700)),
    (icon: Icons.handshake_outlined,           label: 'OTC Desk',        path: '/otc',             color: Color(0xFFA855F7)),
    (icon: Icons.analytics_outlined,           label: 'Analytics',       path: '/analytics',       color: Color(0xFF5B7FFF)),
    (icon: Icons.card_giftcard_outlined,       label: 'Referral',        path: '/bonus',           color: Color(0xFFFF4F6B)),
  ];

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
      decoration: const BoxDecoration(
        color: WikColor.bg1,
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: WikColor.border, borderRadius: BorderRadius.circular(2)))),
          const SizedBox(height: 16),
          const Text('All Features (30)', style: TextStyle(color: WikColor.text1, fontSize: 16, fontWeight: FontWeight.w700)),
          const SizedBox(height: 14),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 5,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            children: _items.map((item) => GestureDetector(
              onTap: () { Navigator.pop(context); context.push(item.path); },
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    width: 52, height: 52,
                    decoration: BoxDecoration(
                      color: item.color.withOpacity(0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: item.color.withOpacity(0.3)),
                    ),
                    child: Icon(item.icon, color: item.color, size: 24),
                  ),
                  const SizedBox(height: 6),
                  Text(item.label, style: const TextStyle(color: WikColor.text2, fontSize: 10, fontWeight: FontWeight.w600), textAlign: TextAlign.center, maxLines: 2),
                ],
              ),
            )).toList(),
          ),
        ],
      ),
    );
  }
}
