import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'theme.dart';
import 'screens/shell_screen.dart';

// ── Auth ──────────────────────────────────────────────────────
import 'screens/auth/onboard_screen.dart';
import 'screens/auth/wallet_screen.dart';

// ── Shell screens ─────────────────────────────────────────────
import 'screens/trading/trade_screen.dart';
import 'screens/wallet/wallet_home_screen.dart';
import 'screens/leaderboard_screen.dart';
import 'screens/markets_screen.dart';

// ── Core Trading ──────────────────────────────────────────────
import 'screens/spot/spot_screen.dart';
import 'screens/swap/swap_screen.dart';
import 'screens/forex/forex_screen.dart';
import 'screens/vamm/vamm_screen.dart';
import 'screens/index_perps/index_perps_screen.dart';

// ── Auto Trading ──────────────────────────────────────────────
import 'screens/bots/bots_screen.dart';
import 'screens/copy_trading/copy_trading_screen.dart';
import 'screens/algo_trading/algo_trading_screen.dart';

// ── Yield & Vaults ────────────────────────────────────────────
import 'screens/staking/staking_screen.dart';
import 'screens/lending/lending_screen.dart';
import 'screens/yield_slice/yield_slice_screen.dart';
import 'screens/options_vaults/options_vaults_screen.dart';
import 'screens/strategy_vaults/strategy_vaults_screen.dart';
import 'screens/managed_vaults/managed_vaults_screen.dart';
import 'screens/liquid_restaking/liquid_restaking_screen.dart';

// ── Cross-Chain ───────────────────────────────────────────────
import 'screens/bridge/bridge_screen.dart';

// ── Launch ────────────────────────────────────────────────────
import 'screens/launchpad/launchpad_screen.dart';

// ── Prop ──────────────────────────────────────────────────────
import 'screens/prop/prop_screen.dart';

// ── Advanced Features ─────────────────────────────────────────
import 'screens/smart_wallet/smart_wallet_screen.dart';
import 'screens/zap/zap_screen.dart';
import 'screens/ai_guardrails/ai_guardrails_screen.dart';
import 'screens/agentic_dao/agentic_dao_screen.dart';
import 'screens/revenue/revenue_splitter_screen.dart';
import 'screens/institutional/institutional_screen.dart';
import 'screens/fiat_onramp/fiat_onramp_screen.dart';
import 'screens/bonding_pol/bonding_pol_screen.dart';
// ── Analytics & Tools ─────────────────────────────────────────
import 'screens/analytics/analytics_screen.dart';
import 'screens/otc/otc_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.light,
  ));
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  runApp(const ProviderScope(child: WikiciousApp()));
}

final _router = GoRouter(
  initialLocation: '/markets',
  routes: [
    GoRoute(path: '/onboard',      builder: (_, __) => const OnboardScreen()),
    GoRoute(path: '/wallet-setup', builder: (_, __) => const WalletSetupScreen()),

    ShellRoute(
      builder: (ctx, state, child) => ShellScreen(child: child),
      routes: [
        GoRoute(path: '/markets',     builder: (_, __) => const MarketsScreen()),
        GoRoute(path: '/trade',       builder: (_, s)  => TradeScreen(symbol: s.uri.queryParameters['symbol'])),
        GoRoute(path: '/wallet',      builder: (_, __) => const WalletHomeScreen()),
        GoRoute(path: '/leaderboard', builder: (_, __) => const LeaderboardScreen()),
      ],
    ),

    // ── Core Trading ──────────────────────────────────────────
    GoRoute(path: '/spot',            builder: (_, __) => const SpotScreen()),
    GoRoute(path: '/swap',            builder: (_, __) => const SwapScreen()),
    GoRoute(path: '/forex',           builder: (_, __) => const ForexScreen()),
    GoRoute(path: '/vamm',            builder: (_, __) => const VammScreen()),
    GoRoute(path: '/index-perps',     builder: (_, __) => const IndexPerpsScreen()),

    // ── Auto Trading ──────────────────────────────────────────
    GoRoute(path: '/bots',            builder: (_, __) => const BotsScreen()),
    GoRoute(path: '/copy-trading',    builder: (_, __) => const CopyTradingScreen()),
    GoRoute(path: '/algo-trading',    builder: (_, __) => const AlgoTradingScreen()),

    // ── Yield & Vaults ────────────────────────────────────────
    GoRoute(path: '/staking',         builder: (_, __) => const StakingScreen()),
    GoRoute(path: '/lending',         builder: (_, __) => const LendingScreen()),
    GoRoute(path: '/yield-slice',     builder: (_, __) => const YieldSliceScreen()),
    GoRoute(path: '/options-vaults',  builder: (_, __) => const OptionsVaultsScreen()),
    GoRoute(path: '/strategy-vaults', builder: (_, __) => const StrategyVaultsScreen()),
    GoRoute(path: '/managed-vaults',  builder: (_, __) => const ManagedVaultsScreen()),
    GoRoute(path: '/liquid-restaking',builder: (_, __) => const LiquidRestakingScreen()),

    // ── Cross-Chain ───────────────────────────────────────────
    GoRoute(path: '/bridge',          builder: (_, __) => const BridgeScreen()),

    // ── Launch ────────────────────────────────────────────────
    GoRoute(path: '/launchpad',       builder: (_, __) => const LaunchpadScreen()),

    // ── Prop ──────────────────────────────────────────────────
    GoRoute(path: '/prop',            builder: (_, __) => const PropScreen()),

    // ── Advanced Features ─────────────────────────────────────
    GoRoute(path: '/smart-wallet',    builder: (_, __) => const SmartWalletScreen()),
    GoRoute(path: '/zap',             builder: (_, __) => const ZapScreen()),
    GoRoute(path: '/ai-guardrails',   builder: (_, __) => const AiGuardrailsScreen()),
    GoRoute(path: '/agentic-dao',     builder: (_, __) => const AgenticDaoScreen()),
    GoRoute(path: '/revenue',         builder: (_, __) => const RevenueSplitterScreen()),
    GoRoute(path: '/institutional',   builder: (_, __) => const InstitutionalScreen()),
    GoRoute(path: '/fiat-onramp',     builder: (_, __) => const FiatOnRampScreen()),
    GoRoute(path: '/bonding-pol',     builder: (_, __) => const BondingPolScreen()),

    // ── Analytics ─────────────────────────────────────────────
    GoRoute(path: '/analytics',       builder: (_, __) => const AnalyticsScreen()),
    GoRoute(path: '/otc',             builder: (_, __) => const OtcScreen()),
  ],
);

class WikiciousApp extends ConsumerWidget {
  const WikiciousApp({super.key});
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return MaterialApp.router(
      title: 'Wikicious',
      theme: wikTheme(),
      routerConfig: _router,
      debugShowCheckedModeBanner: false,
    );
  }
}
