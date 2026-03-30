import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// New 3-step mobile-first onboarding
/// Step 1: Connect Wallet
/// Step 2: Pick Strategy (Prop / Grid Bot / Funding Arb / Manual)
/// Step 3: Deposit USDC
class OnboardingNewScreen extends StatefulWidget {
  const OnboardingNewScreen({super.key});
  @override State<OnboardingNewScreen> createState() => _OnboardingNewScreenState();
}

class _OnboardingNewScreenState extends State<OnboardingNewScreen> {
  int _step = 0; // 0=connect 1=strategy 2=deposit
  String _strategy = 'prop';
  final _amountCtrl = TextEditingController();

  static const _strategies = [
    _Strat('prop','🏆','Prop Challenge','Prove your edge. Trade our capital.','\$50–\$500 fee','Up to \$200K funded','80-90% split',50,Color(0xFFFFB020)),
    _Strat('grid','🤖','Grid Bot','Set it, forget it, earn 24/7.','Min \$10 USDC','60-70% win rate','20% perf fee',10,Color(0xFF00F0A8)),
    _Strat('funding','⚡','Funding Arb','Earn while market sleeps.','Min \$10 USDC','80-90% capture','Delta neutral',10,Color(0xFF0075FF)),
    _Strat('perp','📈','Trade Manually','Up to 1000× leverage. Your rules.','Min \$10 USDC','295+ markets','All order types',10,Color(0xFF7C4FFF)),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030810),
      body: SafeArea(
        child: Column(children: [
          _buildHeader(),
          Expanded(child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: [_buildConnect(), _buildStrategy(), _buildDeposit()][_step],
          )),
          if (_step > 0) _buildBackButton(),
        ]),
      ),
    );
  }

  Widget _buildHeader() => Padding(
    padding: const EdgeInsets.fromLTRB(20,16,20,0),
    child: Column(children: [
      Row(children: [
        Container(width: 28, height: 28, decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF00F0A8),Color(0xFF0075FF)]),
          borderRadius: BorderRadius.circular(7)),
          child: const Center(child: Text('W',style: TextStyle(fontSize:13,fontWeight:FontWeight.w900,color:Colors.black)))),
        const SizedBox(width:8),
        const Text('Wikicious', style: TextStyle(fontFamily:'Syne',fontSize:16,fontWeight:FontWeight.w800,color:Color(0xFFE8F4FF))),
        const Spacer(),
        Text('Step ${_step+1} of 3', style: const TextStyle(fontSize:10,color:Color(0xFF4E6E90),fontFamily:'JetBrainsMono')),
      ]),
      const SizedBox(height:12),
      ClipRRect(borderRadius: BorderRadius.circular(2), child: LinearProgressIndicator(
        value: (_step+1)/3, backgroundColor: const Color(0xFF0E1E35),
        valueColor: const AlwaysStoppedAnimation(Color(0xFF00F0A8)), minHeight: 3)),
    ]),
  );

  Widget _buildConnect() => Column(children: [
    const SizedBox(height: 20),
    Container(width: 72, height: 72,
      decoration: BoxDecoration(color: const Color(0xFF00F0A8).withOpacity(.15),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF00F0A8).withOpacity(.3))),
      child: const Center(child: Text('🔗', style: TextStyle(fontSize: 32)))),
    const SizedBox(height: 16),
    const Text('Connect your wallet', style: TextStyle(fontFamily:'Syne',fontSize:22,fontWeight:FontWeight.w800,color:Color(0xFFE8F4FF))),
    const SizedBox(height: 8),
    const Text('Non-custodial. Your keys, your funds.', style: TextStyle(fontSize:12,color:Color(0xFF4E6E90))),
    const SizedBox(height: 24),
    ...[['🦊','MetaMask',true],['🔗','WalletConnect',true],['🔵','Coinbase Wallet',false],['🌈','Rainbow',false],['🔐','Ledger',false]].map((w) =>
      GestureDetector(
        onTap: () => setState(() => _step = 1),
        child: Container(
          margin: const EdgeInsets.only(bottom: 10),
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: const Color(0xFF0B1525),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: const Color(0xFF152840))),
          child: Row(children: [
            Text(w[0] as String, style: const TextStyle(fontSize: 22)),
            const SizedBox(width: 12),
            Text(w[1] as String, style: const TextStyle(fontSize: 14,fontWeight: FontWeight.w600,color: Color(0xFFE8F4FF))),
            const Spacer(),
            if (w[2] as bool) Container(padding: const EdgeInsets.symmetric(horizontal:8,vertical:2),
              decoration: BoxDecoration(color: const Color(0xFF00F0A8).withOpacity(.15),
                borderRadius: BorderRadius.circular(100),
                border: Border.all(color: const Color(0xFF00F0A8).withOpacity(.3))),
              child: const Text('POPULAR',style: TextStyle(fontSize:8,fontWeight:FontWeight.w700,color:Color(0xFF00F0A8),fontFamily:'JetBrainsMono'))),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: Color(0xFF4E6E90), size: 18),
          ]),
        ),
      ),
    ),
    Row(mainAxisAlignment: MainAxisAlignment.center, children: [
      ...[['✓','Non-custodial'],['✓','Audited'],['✓','Open source']].map((t) =>
        Padding(padding: const EdgeInsets.symmetric(horizontal: 10), child:
          Row(children: [Text(t[0],style: const TextStyle(color:Color(0xFF00F0A8),fontSize:11)),
            const SizedBox(width:4),Text(t[1],style: const TextStyle(color:Color(0xFF4E6E90),fontSize:11))]))),
    ]),
  ]);

  Widget _buildStrategy() => Column(children: [
    const Text('Pick your first strategy', style: TextStyle(fontFamily:'Syne',fontSize:21,fontWeight:FontWeight.w800,color:Color(0xFFE8F4FF))),
    const SizedBox(height: 6),
    const Text('You can change anytime.', style: TextStyle(fontSize:12,color:Color(0xFF4E6E90))),
    const SizedBox(height: 20),
    ..._strategies.map((s) => GestureDetector(
      onTap: () => setState(() { _strategy = s.id; _step = 2; }),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: const Color(0xFF0B1525),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _strategy == s.id ? s.color : const Color(0xFF152840), width: _strategy == s.id ? 1.5 : 1)),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(width: 40,height: 40,
              decoration: BoxDecoration(color: s.color.withOpacity(.18),borderRadius: BorderRadius.circular(11),
                border: Border.all(color: s.color.withOpacity(.3))),
              child: Center(child: Text(s.icon, style: const TextStyle(fontSize:18)))),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(s.name, style: const TextStyle(fontSize:14,fontWeight:FontWeight.w800,color:Color(0xFFE8F4FF))),
              Text(s.tagline, style: TextStyle(fontSize:11,color:s.color,fontWeight:FontWeight.w600)),
            ])),
            Container(width: 22,height: 22,
              decoration: BoxDecoration(shape: BoxShape.circle,
                color: _strategy == s.id ? s.color : const Color(0xFF152840)),
              child: _strategy == s.id ? const Icon(Icons.check, size:14,color:Colors.black) : null),
          ]),
          const SizedBox(height: 10),
          Row(children: [
            _statChip(s.stat1, s.color),
            const SizedBox(width: 7),
            _statChip(s.stat2, s.color),
            const SizedBox(width: 7),
            _statChip(s.stat3, s.color),
          ]),
        ]),
      ),
    )),
  ]);

  Widget _buildDeposit() {
    final s = _strategies.firstWhere((x) => x.id == _strategy);
    final num = double.tryParse(_amountCtrl.text) ?? 0;
    final valid = num >= s.minDeposit;
    return Column(children: [
      Container(width: 60,height: 60,
        decoration: BoxDecoration(color: const Color(0xFF00F0A8).withOpacity(.15),
          borderRadius: BorderRadius.circular(16),border: Border.all(color: const Color(0xFF00F0A8).withOpacity(.3))),
        child: const Center(child: Text('💵',style: TextStyle(fontSize:26)))),
      const SizedBox(height: 12),
      const Text('Deposit USDC', style: TextStyle(fontFamily:'Syne',fontSize:21,fontWeight:FontWeight.w800,color:Color(0xFFE8F4FF))),
      Text('Minimum \$${s.minDeposit} for ${s.name}', style: TextStyle(fontSize:12,color:s.color)),
      const SizedBox(height: 20),
      // Amount input
      Container(padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: const Color(0xFF0B1525),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: valid && num > 0 ? const Color(0xFF00F0A8) : const Color(0xFF152840))),
        child: Row(children: [
          const Text('\$', style: TextStyle(fontSize:28,color:Color(0xFF4E6E90),fontWeight:FontWeight.w300)),
          const SizedBox(width: 8),
          Expanded(child: TextField(controller: _amountCtrl, onChanged: (_) => setState((){}),
            keyboardType: TextInputType.number,
            style: const TextStyle(fontSize:32,fontWeight:FontWeight.w700,color:Color(0xFFE8F4FF),fontFamily:'JetBrainsMono'),
            decoration: const InputDecoration.collapsed(hintText:'0',
              hintStyle: TextStyle(color:Color(0xFF4E6E90),fontSize:32)))),
          const Text('USDC', style: TextStyle(fontSize:12,color:Color(0xFF4E6E90),fontFamily:'JetBrainsMono')),
        ])),
      const SizedBox(height: 10),
      // Presets
      Row(children: [10,50,100,500,1000].where((p) => p >= s.minDeposit).map((p) =>
        Expanded(child: GestureDetector(
          onTap: () { _amountCtrl.text = p.toString(); setState((){}); },
          child: Container(margin: const EdgeInsets.symmetric(horizontal:3),
            padding: const EdgeInsets.symmetric(vertical:8),
            decoration: BoxDecoration(
              color: _amountCtrl.text == p.toString() ? s.color.withOpacity(.15) : const Color(0xFF0B1525),
              borderRadius: BorderRadius.circular(10),
              border: Border.all(color: _amountCtrl.text == p.toString() ? s.color : const Color(0xFF152840))),
            child: Center(child: Text('\$$p', style: TextStyle(fontSize:11,fontWeight:FontWeight.w700,
              color: _amountCtrl.text == p.toString() ? s.color : const Color(0xFF4E6E90),fontFamily:'JetBrainsMono')))),
        ))
      ).toList()),
      const SizedBox(height: 12),
      // Fiat option
      Container(padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: const Color(0xFF0B1525),borderRadius: BorderRadius.circular(12),
          border: Border.all(color: const Color(0xFF152840))),
        child: Row(children: [
          const Text('💳',style: TextStyle(fontSize:18)),
          const SizedBox(width:10),
          const Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text("Don't have USDC?",style: TextStyle(fontSize:12,fontWeight:FontWeight.w600,color:Color(0xFFE8F4FF))),
            Text('Buy with card via MoonPay',style: TextStyle(fontSize:10,color:Color(0xFF4E6E90))),
          ])),
          Container(padding: const EdgeInsets.symmetric(horizontal:10,vertical:6),
            decoration: BoxDecoration(color: const Color(0xFF0075FF).withOpacity(.2),
              borderRadius: BorderRadius.circular(8),border: Border.all(color: const Color(0xFF0075FF).withOpacity(.4))),
            child: const Text('Buy USDC',style: TextStyle(fontSize:11,fontWeight:FontWeight.w700,color:Color(0xFF0075FF)))),
        ])),
      const SizedBox(height: 16),
      SizedBox(width: double.infinity,
        child: ElevatedButton(
          onPressed: valid ? () => context.go('/') : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: valid ? s.color : const Color(0xFF152840),
            padding: const EdgeInsets.symmetric(vertical:15),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
          child: Text(valid ? 'Deposit \$${num.toInt()} USDC →' : 'Minimum \$${s.minDeposit}',
            style: TextStyle(fontFamily:'Syne',fontSize:14,fontWeight:FontWeight.w800,
              color: valid ? Colors.black : const Color(0xFF4E6E90))),
        )),
    ]);
  }

  Widget _buildBackButton() => Padding(
    padding: const EdgeInsets.fromLTRB(20,0,20,12),
    child: SizedBox(width: double.infinity,
      child: OutlinedButton(
        onPressed: () => setState(() => _step--),
        style: OutlinedButton.styleFrom(
          side: const BorderSide(color: Color(0xFF152840)),
          padding: const EdgeInsets.symmetric(vertical:12),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
        child: const Text('← Back',style: TextStyle(color:Color(0xFF4E6E90),fontWeight:FontWeight.w600)))));

  Widget _statChip(String t, Color c) => Container(padding: const EdgeInsets.symmetric(horizontal:8,vertical:3),
    decoration: BoxDecoration(color: c.withOpacity(.1),borderRadius: BorderRadius.circular(6),
      border: Border.all(color: c.withOpacity(.2))),
    child: Text(t,style: TextStyle(fontSize:9,color:c,fontWeight:FontWeight.w700)));
}

class _Strat {
  final String id,icon,name,tagline,stat1,stat2,stat3;
  final int minDeposit;
  final Color color;
  const _Strat(this.id,this.icon,this.name,this.tagline,this.stat1,this.stat2,this.stat3,this.minDeposit,this.color);
}
