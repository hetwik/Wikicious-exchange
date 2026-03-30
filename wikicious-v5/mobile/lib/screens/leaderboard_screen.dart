import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import '../theme.dart';
import 'providers/providers.dart';
import 'providers/social_providers.dart';

// ── Leaderboard Screen ────────────────────────────────────────
class LeaderboardScreen extends ConsumerWidget {
  const LeaderboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final lb = ref.watch(leaderboardProvider);

    return Scaffold(
      backgroundColor: WikColor.bg0,
      appBar: AppBar(backgroundColor: WikColor.bg0, title: const Text('Leaderboard')),
      body: lb.when(
        loading: () => const Center(child: CircularProgressIndicator(color: WikColor.accent)),
        error:   (e, _) => Center(child: Text('$e')),
        data: (entries) => ListView.builder(
          itemCount: entries.length,
          itemBuilder: (_, i) => _LeaderRow(entry: entries[i], rank: i + 1),
        ),
      ),
    );
  }
}

class _LeaderRow extends StatelessWidget {
  final LeaderboardEntry entry;
  final int rank;
  const _LeaderRow({required this.entry, required this.rank});

  Color get _rankColor => rank == 1 ? WikColor.gold
      : rank == 2 ? const Color(0xFFC0C0C0)
      : rank == 3 ? const Color(0xFFCD7F32)
      : WikColor.text3;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: () => context.push('/profile/${entry.address}'),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: WikColor.border))),
      child: Row(children: [
        // Rank
        SizedBox(
          width: 32,
          child: Text('$rank', style: TextStyle(color: _rankColor, fontWeight: FontWeight.w800,
              fontSize: rank <= 3 ? 18 : 14, fontFamily: 'SpaceMono')),
        ),
        // Avatar placeholder
        CircleAvatar(radius: 18, backgroundColor: WikColor.bg3,
            child: Text(entry.username[0].toUpperCase(),
                style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700))),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(entry.username, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700)),
          Text('${entry.tradeCount} trades  ·  \$${NumberFormat.compact().format(entry.volume)} vol',
              style: WikText.label(size: 11)),
        ])),
        // PnL
        Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
          Text(
            '${entry.realizedPnl >= 0 ? '+' : ''}\$${NumberFormat.compact().format(entry.realizedPnl)}',
            style: TextStyle(
              color: entry.realizedPnl >= 0 ? WikColor.green : WikColor.red,
              fontWeight: FontWeight.w700, fontSize: 14, fontFamily: 'SpaceMono',
            ),
          ),
          Text('PnL', style: WikText.label(size: 10)),
        ]),
      ]),
    ),
  );
}
