import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import '../../theme.dart';
import '../../services/api_service.dart';
import '../../widgets/common/stat_tile.dart';

class StakingScreen extends ConsumerStatefulWidget {
  const StakingScreen({super.key});
  @override
  ConsumerState<StakingScreen> createState() => _StakingScreenState();
}

class _StakingScreenState extends ConsumerState<StakingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabs;
  final _lockAmtCtrl = TextEditingController();
  int _lockWeeks = 52;

  @override
  void initState() { super.initState(); _tabs = TabController(length: 3, vsync: this); }
  @override
  void dispose() { _tabs.dispose(); _lockAmtCtrl.dispose(); super.dispose(); }

  static const _durations = [1, 4, 12, 26, 52, 104, 208];
  double get _veWIK => (double.tryParse(_lockAmtCtrl.text) ?? 0) * (_lockWeeks / 208);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Stake & Farm'),
        bottom: TabBar(
          controller: _tabs,
          indicatorColor: WikColor.accent,
          labelColor: WikColor.accent,
          unselectedLabelColor: WikColor.text3,
          tabs: const [Tab(text: 'Lock WIK'), Tab(text: 'Farm'), Tab(text: 'Rewards')],
        ),
      ),
      body: TabBarView(
        controller: _tabs,
        children: [_buildLock(), _buildFarm(), _buildRewards()],
      ),
    );
  }

  Widget _buildLock() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      // Stats row
      Row(children: [
        Expanded(child: StatTile(label: 'Total Locked', value: '24.2M WIK', valueColor: WikColor.accent)),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Total veWIK', value: '8.4M', valueColor: WikColor.accent.withOpacity(0.8))),
      ]),
      const SizedBox(height: 10),
      Row(children: [
        Expanded(child: StatTile(label: 'APR', value: '18.5%', valueColor: WikColor.green)),
        const SizedBox(width: 10),
        Expanded(child: StatTile(label: 'Next Payout', value: '2d 4h', valueColor: WikColor.gold)),
      ]),
      const SizedBox(height: 20),

      // Lock form card
      Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(16), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Lock WIK → veWIK', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 16),
          TextField(
            controller: _lockAmtCtrl,
            onChanged: (_) => setState(() {}),
            keyboardType: TextInputType.number,
            style: WikText.price(size: 17),
            decoration: const InputDecoration(labelText: 'Amount (WIK)', suffixText: 'WIK'),
          ),
          const SizedBox(height: 16),
          Text('Lock Duration', style: WikText.label()),
          const SizedBox(height: 8),
          Wrap(spacing: 6, runSpacing: 6, children: _durations.map((w) => GestureDetector(
            onTap: () => setState(() => _lockWeeks = w),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
              decoration: BoxDecoration(
                color: _lockWeeks == w ? WikColor.accentBg : WikColor.bg2,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _lockWeeks == w ? WikColor.accent : WikColor.border),
              ),
              child: Text(
                w >= 52 ? '${w~/52}yr' : '${w}w',
                style: TextStyle(color: _lockWeeks == w ? WikColor.accent : WikColor.text3, fontWeight: FontWeight.w700, fontSize: 12),
              ),
            ),
          )).toList()),
          const SizedBox(height: 16),

          // Preview
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)),
            child: Column(children: [
              _Row('You receive', '${_veWIK.toStringAsFixed(2)} veWIK', WikColor.accent),
              _Row('Unlock date', _lockWeeks > 0 ? DateFormat('MMM d, yyyy').format(DateTime.now().add(Duration(days: _lockWeeks * 7))) : '—', WikColor.text2),
              _Row('Est. APR', '${(_lockWeeks / 208 * 24).toStringAsFixed(1)}%', WikColor.green),
            ]),
          ),
          const SizedBox(height: 14),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () => _showSnack('Lock WIK — connect wallet first'),
            child: const Text('Lock WIK'),
          )),
        ]),
      ),

      const SizedBox(height: 16),
      // veWIK benefits
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(14), border: Border.all(color: WikColor.border)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('veWIK Benefits', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
          const SizedBox(height: 12),
          for (final b in [
            ('💰', 'Protocol Fee Revenue', '100% of all trading fees'),
            ('⚡', 'Farm Boost', 'Up to 2.5× on LP rewards'),
            ('🚀', 'Launchpad Tier', 'Guaranteed IDO allocation'),
            ('🗳️', 'Governance', 'Vote on protocol parameters'),
          ]) Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Row(children: [
              Text(b.$1, style: const TextStyle(fontSize: 20)),
              const SizedBox(width: 12),
              Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(b.$2, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w600, fontSize: 13)),
                Text(b.$3, style: const TextStyle(color: WikColor.text3, fontSize: 11)),
              ]),
            ]),
          ),
        ]),
      ),
    ]),
  );

  Widget _buildFarm() => SingleChildScrollView(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      for (int i = 0; i < 4; i++) _FarmPoolCard(poolId: i),
    ]),
  );

  Widget _buildRewards() => Padding(
    padding: const EdgeInsets.all(16),
    child: Column(children: [
      Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(16), border: Border.all(color: WikColor.border)),
        child: Column(children: [
          const Text('Claimable Rewards', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 16),
          for (final r in [
            ('Protocol Fees', '124.50 USDC', WikColor.accent),
            ('WIK Farm Pool #0', '840 WIK', WikColor.green),
            ('WIK Farm Pool #1', '320 WIK', WikColor.green),
          ]) Padding(
            padding: const EdgeInsets.only(bottom: 14),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
              Text(r.$1, style: const TextStyle(color: WikColor.text2)),
              Row(children: [
                Text(r.$2, style: TextStyle(color: r.$3, fontFamily: 'SpaceMono', fontWeight: FontWeight.w700)),
                const SizedBox(width: 10),
                GestureDetector(
                  onTap: () => _showSnack('Claiming...'),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(color: r.$3.withOpacity(0.15), borderRadius: BorderRadius.circular(6), border: Border.all(color: r.$3.withOpacity(0.4))),
                    child: Text('Claim', style: TextStyle(color: r.$3, fontSize: 11, fontWeight: FontWeight.w700)),
                  ),
                ),
              ]),
            ]),
          ),
          const Divider(color: WikColor.border),
          const SizedBox(height: 10),
          SizedBox(width: double.infinity, child: ElevatedButton(
            onPressed: () => _showSnack('Claiming all rewards...'),
            child: const Text('Claim All Rewards'),
          )),
        ]),
      ),
    ]),
  );

  void _showSnack(String msg) => ScaffoldMessenger.of(context).showSnackBar(
    SnackBar(content: Text(msg), backgroundColor: WikColor.accent, behavior: SnackBarBehavior.floating, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10))),
  );
}

class _Row extends StatelessWidget {
  final String k, v; final Color c;
  const _Row(this.k, this.v, this.c);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 4),
    child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
      Text(k, style: const TextStyle(color: WikColor.text3, fontSize: 12)),
      Text(v, style: TextStyle(color: c, fontSize: 12, fontWeight: FontWeight.w600, fontFamily: 'SpaceMono')),
    ]),
  );
}

class _FarmPoolCard extends StatelessWidget {
  final int poolId;
  const _FarmPoolCard({required this.poolId});
  @override
  Widget build(BuildContext context) {
    final pools = ['WIK/USDC LP', 'WETH/USDC LP', 'ARB/USDC LP', 'sWIK Staking'];
    final aprs  = ['142.8%', '38.4%', '64.2%', '24.1%'];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(14), border: Border.all(color: WikColor.border)),
      child: Column(children: [
        Row(children: [
          CircleAvatar(backgroundColor: WikColor.accentBg, radius: 18, child: Text('${poolId+1}', style: const TextStyle(color: WikColor.accent, fontWeight: FontWeight.w800))),
          const SizedBox(width: 12),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(pools[poolId], style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 14)),
            Text('Pool #$poolId · Earn WIK', style: const TextStyle(color: WikColor.text3, fontSize: 11)),
          ])),
          Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
            Text(aprs[poolId], style: const TextStyle(color: WikColor.green, fontWeight: FontWeight.w900, fontSize: 18)),
            const Text('APR', style: TextStyle(color: WikColor.text3, fontSize: 10)),
          ]),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Expanded(child: _Row('TVL', '\$${(2.4 + poolId * 1.2).toStringAsFixed(1)}M', WikColor.text1)),
          Expanded(child: _Row('My Deposit', '—', WikColor.text2)),
          Expanded(child: _Row('Pending', '—', WikColor.green)),
        ]),
        const SizedBox(height: 10),
        Row(children: [
          Expanded(child: OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(foregroundColor: WikColor.accent, side: const BorderSide(color: WikColor.accent), padding: const EdgeInsets.symmetric(vertical: 8)),
            child: const Text('Deposit', style: TextStyle(fontSize: 12)),
          )),
          const SizedBox(width: 8),
          Expanded(child: ElevatedButton(
            onPressed: () {},
            style: ElevatedButton.styleFrom(backgroundColor: WikColor.green, foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(vertical: 8)),
            child: const Text('Harvest', style: TextStyle(fontSize: 12)),
          )),
        ]),
      ]),
    );
  }
}
