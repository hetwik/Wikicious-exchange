// ════════════════════════════════════════════════════════════════
//  WIKICIOUS MOBILE — Bots Screen
//
//  Three tabs:
//    My Bots      — start/pause/stop bots, view PnL and trades
//    Strategies   — browse + create bots from templates
//    Copy Trading — discover master traders, manage subscriptions
// ════════════════════════════════════════════════════════════════

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:wikicious/services/api_service.dart';
import 'package:wikicious/theme.dart';

// ── Data providers ────────────────────────────────────────────
final botsProvider = FutureProvider.autoDispose<List<Map>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final data = await api.get('/api/bots');
  return List<Map>.from(data);
});

final strategiesProvider = FutureProvider.autoDispose<List<Map>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final data = await api.get('/api/bots/strategies');
  return List<Map>.from(data);
});

final copyMastersProvider = FutureProvider.autoDispose<List<Map>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final data = await api.get('/api/copy/masters');
  return List<Map>.from(data);
});

final copySubsProvider = FutureProvider.autoDispose<List<Map>>((ref) async {
  final api = ref.read(apiServiceProvider);
  final data = await api.get('/api/copy/subscriptions');
  return List<Map>.from(data);
});


class BotsScreen extends ConsumerStatefulWidget {
  const BotsScreen({super.key});
  @override
  ConsumerState<BotsScreen> createState() => _BotsScreenState();
}

class _BotsScreenState extends ConsumerState<BotsScreen>
    with SingleTickerProviderStateMixin {
  late final TabController _tabs;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabs.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WikiTheme.bgDark,
      appBar: AppBar(
        backgroundColor: WikiTheme.bgCard,
        title: const Text('Auto Trading', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller:      _tabs,
          indicatorColor:  WikiTheme.accent,
          labelColor:      WikiTheme.accent,
          unselectedLabelColor: Colors.grey,
          tabs: const [
            Tab(text: '🤖 My Bots'),
            Tab(text: '⚡ Strategies'),
            Tab(text: '📋 Copy Trade'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: const [
          _MyBotsTab(),
          _StrategiesTab(),
          _CopyTradingTab(),
        ],
      ),
    );
  }
}


// ════════════════════════════════════════════════════════════════
//  MY BOTS TAB
// ════════════════════════════════════════════════════════════════

class _MyBotsTab extends ConsumerWidget {
  const _MyBotsTab();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final botsAsync = ref.watch(botsProvider);

    return botsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error:   (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: Colors.red))),
      data:    (bots) {
        if (bots.isEmpty) {
          return Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('🤖', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 12),
              const Text('No bots yet', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              const Text('Go to Strategies to create one.', style: TextStyle(color: Colors.grey)),
            ]),
          );
        }

        // Summary header
        final totalPnl    = bots.fold<double>(0, (s, b) => s + (b['pnl'] as num? ?? 0).toDouble());
        final runningCount = bots.where((b) => b['status'] == 'running').length;

        return Column(children: [
          // Stats bar
          Container(
            color: WikiTheme.bgCard,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
              _statChip('Total',   '${bots.length}',     Colors.white),
              _statChip('Running', '$runningCount',       WikiTheme.green),
              _statChip('PnL',     '\$${totalPnl.toStringAsFixed(2)}',
                totalPnl >= 0 ? WikiTheme.green : WikiTheme.red),
            ]),
          ),

          // Bot list
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.all(12),
              itemCount: bots.length,
              itemBuilder: (context, i) => _BotCard(bot: bots[i], ref: ref),
            ),
          ),
        ]);
      },
    );
  }

  Widget _statChip(String label, String value, Color color) => Column(
    mainAxisSize: MainAxisSize.min,
    children: [
      Text(value, style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold)),
      Text(label, style: const TextStyle(color: Colors.grey, fontSize: 11)),
    ],
  );
}


class _BotCard extends StatelessWidget {
  const _BotCard({ required this.bot, required this.ref });
  final Map bot;
  final WidgetRef ref;

  static const _statusColor = {
    'running': Color(0xFF00FF88),
    'paused':  Color(0xFFF0A500),
    'stopped': Colors.grey,
    'error':   Color(0xFFFF4466),
  };

  @override
  Widget build(BuildContext context) {
    final api    = ref.read(apiServiceProvider);
    final status = bot['status'] as String? ?? 'stopped';
    final pnl    = (bot['pnl'] as num?)?.toDouble() ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: WikiTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: (_statusColor[status] ?? Colors.grey).withOpacity(0.3),
        ),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header row
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: WikiTheme.accent.withOpacity(0.15),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                (bot['type'] as String? ?? '').toUpperCase(),
                style: TextStyle(color: WikiTheme.accent, fontSize: 11, fontWeight: FontWeight.bold),
              ),
            ),
            const SizedBox(width: 8),
            Text(bot['symbol'] as String? ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600)),
          ]),
          // PnL
          Text(
            '${pnl >= 0 ? '+' : ''}\$${pnl.toStringAsFixed(2)}',
            style: TextStyle(color: pnl >= 0 ? WikiTheme.green : WikiTheme.red, fontWeight: FontWeight.bold),
          ),
        ]),

        const SizedBox(height: 8),

        // Status + trades
        Row(children: [
          Container(width: 8, height: 8, margin: const EdgeInsets.only(right: 6),
            decoration: BoxDecoration(color: _statusColor[status] ?? Colors.grey, shape: BoxShape.circle)),
          Text(status, style: TextStyle(color: _statusColor[status] ?? Colors.grey, fontSize: 12)),
          const SizedBox(width: 16),
          Text('${bot['total_trades'] ?? 0} trades', style: const TextStyle(color: Colors.grey, fontSize: 12)),
        ]),

        if (bot['error_msg'] != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text('⚠️ ${(bot['error_msg'] as String).substring(0, 60)}',
              style: const TextStyle(color: Color(0xFFFF4466), fontSize: 11)),
          ),

        const SizedBox(height: 12),

        // Action buttons
        Row(children: [
          if (status != 'running')
            _actionBtn('▶ Start', WikiTheme.green, () async {
              await api.patch('/api/bots/${bot['id']}/start');
              ref.invalidate(botsProvider);
            }),
          if (status == 'running')
            _actionBtn('⏸ Pause', const Color(0xFFF0A500), () async {
              await api.patch('/api/bots/${bot['id']}/pause');
              ref.invalidate(botsProvider);
            }),
          const SizedBox(width: 8),
          _actionBtn('✕ Remove', const Color(0xFFFF4466), () async {
            final ok = await showDialog<bool>(context: context, builder: (_) => AlertDialog(
              backgroundColor: WikiTheme.bgCard,
              title: const Text('Remove Bot?', style: TextStyle(color: Colors.white)),
              content: const Text('This will stop and delete the bot.', style: TextStyle(color: Colors.grey)),
              actions: [
                TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                TextButton(onPressed: () => Navigator.pop(context, true),  child: const Text('Remove', style: TextStyle(color: Color(0xFFFF4466)))),
              ],
            ));
            if (ok == true) {
              await api.delete('/api/bots/${bot['id']}');
              ref.invalidate(botsProvider);
            }
          }),
        ]),
      ]),
    );
  }

  Widget _actionBtn(String label, Color color, VoidCallback onTap) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
    ),
  );
}


// ════════════════════════════════════════════════════════════════
//  STRATEGIES TAB
// ════════════════════════════════════════════════════════════════

class _StrategiesTab extends ConsumerWidget {
  const _StrategiesTab();

  static const _strategyColors = {
    'grid':     Color(0xFF4A9EFF),
    'dca':      Color(0xFF00C896),
    'rsi':      Color(0xFFF0A500),
    'macd':     Color(0xFFAA66FF),
    'breakout': Color(0xFFFF6644),
    'copy':     Color(0xFF00D4FF),
    'custom':   Color(0xFFFFCC00),
  };

  static const _strategyIcons = {
    'grid': '⊞', 'dca': '📅', 'rsi': '📈',
    'macd': '〰', 'breakout': '🚀', 'copy': '📋', 'custom': '🐍',
  };

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final strategiesAsync = ref.watch(strategiesProvider);

    return strategiesAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error:   (e, _) => Center(child: Text('$e', style: const TextStyle(color: Colors.red))),
      data:    (strategies) => ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: strategies.length,
        itemBuilder: (context, i) {
          final s     = strategies[i];
          final key   = s['key'] as String;
          final color = _strategyColors[key] ?? WikiTheme.accent;
          final icon  = _strategyIcons[key] ?? '🤖';

          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: WikiTheme.bgCard,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: color.withOpacity(0.35)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Text(icon, style: const TextStyle(fontSize: 24)),
                const SizedBox(width: 12),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(s['name'] as String, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  Text(s['bestFor'] as String? ?? '', style: TextStyle(color: color, fontSize: 12)),
                ])),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(20)),
                  child: Text('Risk: ${s['risk']}', style: TextStyle(color: color, fontSize: 11)),
                ),
              ]),
              const SizedBox(height: 8),
              Text(s['description'] as String? ?? '', style: const TextStyle(color: Colors.grey, fontSize: 13)),
              const SizedBox(height: 12),
              GestureDetector(
                onTap: () => context.push('/bots/create', extra: s),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 10),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.15),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: color.withOpacity(0.4)),
                  ),
                  alignment: Alignment.center,
                  child: Text('Select Strategy →', style: TextStyle(color: color, fontWeight: FontWeight.w600)),
                ),
              ),
            ]),
          );
        },
      ),
    );
  }
}


// ════════════════════════════════════════════════════════════════
//  COPY TRADING TAB
// ════════════════════════════════════════════════════════════════

class _CopyTradingTab extends ConsumerStatefulWidget {
  const _CopyTradingTab();
  @override
  ConsumerState<_CopyTradingTab> createState() => _CopyTradingTabState();
}

class _CopyTradingTabState extends ConsumerState<_CopyTradingTab> {
  bool _showMine = false;

  @override
  Widget build(BuildContext context) {
    return Column(children: [
      // Sub-nav
      Container(
        color: WikiTheme.bgCard,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(children: [
          _subNavBtn('🔍 Discover', !_showMine),
          const SizedBox(width: 8),
          _subNavBtn('📋 My Copies', _showMine),
        ]),
      ),
      Expanded(child: _showMine ? _buildMyCopies() : _buildDiscover()),
    ]);
  }

  Widget _subNavBtn(String label, bool active) => GestureDetector(
    onTap: () => setState(() => _showMine = label.contains('Copies')),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
      decoration: BoxDecoration(
        color: active ? WikiTheme.accent : Colors.transparent,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: active ? WikiTheme.accent : Colors.grey.withOpacity(0.3)),
      ),
      child: Text(label, style: TextStyle(color: active ? Colors.black : Colors.grey, fontWeight: FontWeight.w600, fontSize: 12)),
    ),
  );

  Widget _buildDiscover() {
    final mastersAsync = ref.watch(copyMastersProvider);
    return mastersAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error:   (e, _) => Center(child: Text('$e', style: const TextStyle(color: Colors.red))),
      data:    (masters) => ListView.builder(
        padding: const EdgeInsets.all(12),
        itemCount: masters.length,
        itemBuilder: (context, i) => _MasterCard(master: masters[i], ref: ref),
      ),
    );
  }

  Widget _buildMyCopies() {
    final subsAsync = ref.watch(copySubsProvider);
    return subsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error:   (e, _) => Center(child: Text('$e', style: const TextStyle(color: Colors.red))),
      data:    (subs) {
        if (subs.isEmpty) {
          return Center(
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              const Text('📋', style: TextStyle(fontSize: 48)),
              const SizedBox(height: 12),
              const Text('No active subscriptions', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              GestureDetector(
                onTap: () => setState(() => _showMine = false),
                child: Text('Discover Traders →', style: TextStyle(color: WikiTheme.accent)),
              ),
            ]),
          );
        }
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: subs.length,
          itemBuilder: (context, i) => _SubCard(sub: subs[i], ref: ref),
        );
      },
    );
  }
}


class _MasterCard extends StatelessWidget {
  const _MasterCard({ required this.master, required this.ref });
  final Map master;
  final WidgetRef ref;

  Color get _riskColor {
    final score = (master['risk_score'] as num?)?.toInt() ?? 5;
    if (score <= 3) return const Color(0xFF00C896);
    if (score <= 6) return const Color(0xFFF0A500);
    return const Color(0xFFFF4466);
  }

  @override
  Widget build(BuildContext context) {
    final monthlyPnl = (master['monthly_pnl'] as num?)?.toDouble() ?? 0;
    final winRate    = (master['win_rate'] as num?)?.toDouble() ?? 0;
    final totalPnl   = (master['total_pnl'] as num?)?.toDouble() ?? 0;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: WikiTheme.bgCard,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        // Header
        Row(children: [
          CircleAvatar(backgroundColor: WikiTheme.accent.withOpacity(0.2),
            child: Text((master['username'] as String? ?? '?')[0].toUpperCase(),
              style: TextStyle(color: WikiTheme.accent, fontWeight: FontWeight.bold))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(children: [
              Text(master['username'] as String? ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              if ((master['verified'] as int?) == 1)
                Container(margin: const EdgeInsets.only(left: 6), padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 1),
                  decoration: BoxDecoration(color: WikiTheme.green.withOpacity(0.2), borderRadius: BorderRadius.circular(4)),
                  child: Text('✓ Verified', style: TextStyle(color: WikiTheme.green, fontSize: 10))),
            ]),
            Text('${(master['address'] as String? ?? '').substring(0, 8)}…', style: const TextStyle(color: Colors.grey, fontSize: 12)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text('+${monthlyPnl.toStringAsFixed(1)}%', style: TextStyle(color: WikiTheme.green, fontWeight: FontWeight.bold, fontSize: 16)),
            const Text('monthly', style: TextStyle(color: Colors.grey, fontSize: 11)),
          ]),
        ]),

        const SizedBox(height: 12),

        // Stats row
        Row(mainAxisAlignment: MainAxisAlignment.spaceEvenly, children: [
          _miniStat('Win Rate', '${winRate.toStringAsFixed(1)}%'),
          _miniStat('Total PnL', '\$${(totalPnl / 1000).toStringAsFixed(0)}K'),
          _miniStat('Followers', '${master['followers'] ?? 0}'),
          _miniStat('Risk', '${master['risk_score']}/10', color: _riskColor),
        ]),

        const SizedBox(height: 12),

        // Copy button
        GestureDetector(
          onTap: () => _showSubscribeSheet(context),
          child: Container(
            width: double.infinity, padding: const EdgeInsets.symmetric(vertical: 10),
            decoration: BoxDecoration(
              color: WikiTheme.accent.withOpacity(0.15), borderRadius: BorderRadius.circular(8),
              border: Border.all(color: WikiTheme.accent.withOpacity(0.4)),
            ),
            alignment: Alignment.center,
            child: Text('📋 Copy This Trader', style: TextStyle(color: WikiTheme.accent, fontWeight: FontWeight.w600)),
          ),
        ),
      ]),
    );
  }

  Widget _miniStat(String label, String value, {Color? color}) => Column(children: [
    Text(value, style: TextStyle(color: color ?? Colors.white, fontWeight: FontWeight.bold)),
    Text(label, style: const TextStyle(color: Colors.grey, fontSize: 10)),
  ]);

  void _showSubscribeSheet(BuildContext context) {
    double copyRatio    = 1.0;
    double maxTradeSize = 100;

    showModalBottomSheet(
      context: context,
      backgroundColor: WikiTheme.bgCard,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => StatefulBuilder(builder: (ctx, setState) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Copy ${master['username']}', style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          Text('Copy Ratio: ${copyRatio.toStringAsFixed(2)}×', style: const TextStyle(color: Colors.grey)),
          Slider(value: copyRatio, min: 0.1, max: 5, divisions: 49, activeColor: WikiTheme.accent,
            onChanged: (v) => setState(() => copyRatio = v)),
          Text('Max Trade Size: \$${maxTradeSize.toStringAsFixed(0)} USDC', style: const TextStyle(color: Colors.grey)),
          Slider(value: maxTradeSize, min: 5, max: 1000, divisions: 199, activeColor: WikiTheme.accent,
            onChanged: (v) => setState(() => maxTradeSize = v)),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: WikiTheme.accent, foregroundColor: Colors.black),
              onPressed: () async {
                final api = ref.read(apiServiceProvider);
                await api.post('/api/copy/subscribe', data: {
                  'masterAddress': master['address'],
                  'copyRatio':     copyRatio,
                  'maxTradeSize':  maxTradeSize,
                });
                if (ctx.mounted) {
                  Navigator.pop(ctx);
                  ref.invalidate(copySubsProvider);
                  ref.invalidate(copyMastersProvider);
                }
              },
              child: const Text('Start Copying', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        ]),
      )),
    );
  }
}


class _SubCard extends StatelessWidget {
  const _SubCard({ required this.sub, required this.ref });
  final Map sub;
  final WidgetRef ref;

  @override
  Widget build(BuildContext context) {
    final totalPnl = (sub['total_pnl'] as num?)?.toDouble() ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: WikiTheme.bgCard, borderRadius: BorderRadius.circular(12)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(sub['username'] as String? ?? '', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
          Text('${totalPnl >= 0 ? '+' : ''}\$${totalPnl.toStringAsFixed(2)}',
            style: TextStyle(color: totalPnl >= 0 ? WikiTheme.green : WikiTheme.red, fontWeight: FontWeight.bold)),
        ]),
        const SizedBox(height: 8),
        Text('Ratio: ${sub['copy_ratio']}×  ·  Max: \$${sub['max_trade_size']}  ·  Trades: ${sub['total_trades']}',
          style: const TextStyle(color: Colors.grey, fontSize: 12)),
        const SizedBox(height: 12),
        GestureDetector(
          onTap: () async {
            final api = ref.read(apiServiceProvider);
            await api.delete('/api/copy/subscribe/${sub['id']}');
            ref.invalidate(copySubsProvider);
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFFF4466).withOpacity(0.12),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: const Color(0xFFFF4466).withOpacity(0.4)),
            ),
            child: const Text('✕ Unsubscribe', style: TextStyle(color: Color(0xFFFF4466), fontSize: 12)),
          ),
        ),
      ]),
    );
  }
}
