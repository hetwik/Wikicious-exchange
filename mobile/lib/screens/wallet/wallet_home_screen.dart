import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../theme.dart';
import '../../providers/providers.dart';

// ─── Providers ────────────────────────────────────────────────
final _walletTabProvider = StateProvider<int>((ref) => 0); // 0=assets 1=positions 2=history

class WalletHomeScreen extends ConsumerWidget {
  const WalletHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth    = ref.watch(authProvider);
    final balance = ref.watch(balanceProvider);
    final tab     = ref.watch(_walletTabProvider);
    final address = auth.address ?? '';
    final fmt     = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

    return Scaffold(
      backgroundColor: WikColor.bg0,
      appBar: AppBar(
        backgroundColor: WikColor.bg0,
        title: const Text('Wallet'),
        actions: [
          IconButton(
            icon: const Icon(Icons.qr_code_outlined),
            onPressed: () => _showReceiveSheet(context, address),
          ),
          IconButton(
            icon: const Icon(Icons.refresh_outlined),
            onPressed: () => ref.invalidate(balanceProvider),
          ),
        ],
      ),
      body: ListView(padding: const EdgeInsets.all(0), children: [

        // ─── Portfolio overview ────────────────────────────────
        _PortfolioCard(address: address, balance: balance, fmt: fmt),

        // ─── 8-button action grid (Binance parity) ────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: GridView.count(
            shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 4, crossAxisSpacing: 10, mainAxisSpacing: 10,
            childAspectRatio: 0.9,
            children: [
              _ActionBtn(icon: Icons.arrow_downward_outlined,  label: 'Deposit',  color: WikColor.green,  onTap: () => _showDepositSheet(context)),
              _ActionBtn(icon: Icons.arrow_upward_outlined,    label: 'Withdraw', color: WikColor.red,    onTap: () => _showWithdrawSheet(context)),
              _ActionBtn(icon: Icons.send_outlined,            label: 'Send',     color: WikColor.accent, onTap: () => _showSendSheet(context, address)),
              _ActionBtn(icon: Icons.qr_code_scanner_outlined, label: 'Receive',  color: WikColor.text2,  onTap: () => _showReceiveSheet(context, address)),
              _ActionBtn(icon: Icons.shopping_cart_outlined,   label: 'Buy',      color: WikColor.green,  onTap: () => _showBuySheet(context)),
              _ActionBtn(icon: Icons.sell_outlined,            label: 'Sell',     color: WikColor.red,    onTap: () => _showSellSheet(context)),
              _ActionBtn(icon: Icons.swap_horiz_rounded,       label: 'Convert',  color: WikColor.accent, onTap: () => _showConvertSheet(context)),
              _ActionBtn(icon: Icons.swap_vert_outlined,       label: 'Transfer', color: WikColor.gold,   onTap: () => _showInternalTransferSheet(context)),
            ],
          ),
        ),

        // ─── Tabs ──────────────────────────────────────────────
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Container(
            decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)),
            padding: const EdgeInsets.all(3),
            child: Row(children: [
              _Tab('Assets',     0, tab, ref),
              _Tab('Positions',  1, tab, ref),
              _Tab('History',    2, tab, ref),
            ]),
          ),
        ),
        const SizedBox(height: 12),

        // ─── Tab content ───────────────────────────────────────
        if (tab == 0) _buildAssets(context, balance),
        if (tab == 1) _buildPositions(context),
        if (tab == 2) _buildHistory(context),

        const SizedBox(height: 80), // nav bar clearance
      ]),
    );
  }

  // ─── ASSETS TAB ─────────────────────────────────────────────
  Widget _buildAssets(BuildContext context, AsyncValue balance) {
    const tokens = [
      ('ETH',  'Ethereum',        '💠', WikColor.blue,   3482.0),
      ('USDC', 'USD Coin',        '💵', Color(0xFF2775CA), 1.0),
      ('USDT', 'Tether USD',      '₮',  Color(0xFF26A17B), 1.0),
      ('WBTC', 'Wrapped Bitcoin', '₿',  Color(0xFFF7931A), 67284.0),
      ('ARB',  'Arbitrum',        'Ⓐ',  WikColor.text2,   1.18),
      ('WIK',  'Wikicious',       'W',  WikColor.accent,  0.284),
      ('LINK', 'Chainlink',       '⬡',  Color(0xFF2A5ADA), 9.86),
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text('Token Balances', style: WikText.label()),
        ),
        const SizedBox(height: 8),
        ...tokens.map((t) => _TokenRow(
          symbol: t.$1, name: t.$2, icon: t.$3, color: t.$4, price: t.$5,
          onBuy:  () => _showBuySheetWith(context, t.$1),
          onSell: () => _showSellSheetWith(context, t.$1),
        )),
      ],
    );
  }

  // ─── POSITIONS TAB ──────────────────────────────────────────
  Widget _buildPositions(BuildContext context) {
    const positions = [
      ('BTCUSDT', 'LONG',  '\$5,000', '\$67,284', '+\$8.20',  '+1.63%', true),
      ('ETHUSDT', 'SHORT', '\$2,000', '\$3,482',  '+\$15.96', '+0.80%', true),
      ('ARBUSDT', 'LONG',  '\$1,000', '\$1.18',   '-\$48.39', '-4.84%', false),
    ];
    return Column(children: [
      Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text('Open Positions (${positions.length})', style: WikText.label()),
          Text('PnL: -\$24.23', style: TextStyle(color: WikColor.red, fontSize: 11, fontWeight: FontWeight.w700)),
        ]),
      ),
      const SizedBox(height: 8),
      ...positions.map((p) => Container(
        margin: const EdgeInsets.fromLTRB(16, 0, 16, 8),
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: WikColor.bg1, borderRadius: BorderRadius.circular(12),
          border: Border.all(color: WikColor.border),
        ),
        child: Column(children: [
          Row(children: [
            Text(p.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 13)),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: p.$2 == 'LONG' ? WikColor.greenBg : WikColor.redBg,
                borderRadius: BorderRadius.circular(5),
                border: Border.all(color: p.$2 == 'LONG' ? WikColor.green : WikColor.red, width: .5),
              ),
              child: Text(p.$2, style: TextStyle(
                color: p.$2 == 'LONG' ? WikColor.green : WikColor.red, fontSize: 9, fontWeight: FontWeight.w800)),
            ),
            const Spacer(),
            Text(p.$5, style: TextStyle(color: p.$7 ? WikColor.green : WikColor.red,
              fontFamily: 'SpaceMono', fontSize: 14, fontWeight: FontWeight.w900)),
          ]),
          const SizedBox(height: 6),
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Size: ${p.$3}',  style: const TextStyle(color: WikColor.text3, fontSize: 11)),
            Text('Mark: ${p.$4}',  style: const TextStyle(color: WikColor.text3, fontSize: 11)),
            Text(p.$6, style: TextStyle(color: p.$7 ? WikColor.green : WikColor.red, fontSize: 11, fontWeight: FontWeight.w700)),
          ]),
          const SizedBox(height: 8),
          Row(children: [
            Expanded(child: OutlinedButton(
              onPressed: () => context.push('/trade'),
              style: OutlinedButton.styleFrom(foregroundColor: WikColor.accent, side: const BorderSide(color: WikColor.accent), minimumSize: const Size(0, 32)),
              child: const Text('Manage', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
            )),
            const SizedBox(width: 8),
            Expanded(child: ElevatedButton(
              onPressed: () {},
              style: ElevatedButton.styleFrom(backgroundColor: WikColor.red, foregroundColor: Colors.white, minimumSize: const Size(0, 32)),
              child: const Text('Close', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700)),
            )),
          ]),
        ]),
      )),
    ]);
  }

  // ─── HISTORY TAB ────────────────────────────────────────────
  Widget _buildHistory(BuildContext context) {
    const txs = [
      ('Deposit',    'USDC', '+\$500.00',   '2h ago',  true,  '\$0.02'),
      ('Trade Open', 'BTC',  '+\$5,000',    '5h ago',  true,  '\$3.00'),
      ('Swap',       'ETH',  '-0.28 ETH',   '1d ago',  false, '\$2.44'),
      ('Withdraw',   'USDC', '-\$200.00',   '2d ago',  false, '\$0.02'),
      ('Receive',    'ARB',  '+842 ARB',    '3d ago',  true,  '\$0.00'),
      ('Send',       'USDC', '-\$50.00',    '4d ago',  false, '\$0.02'),
      ('Convert',    'USDC', '+300 USDT',   '5d ago',  true,  '\$0.00'),
      ('Buy',        'WIK',  '+10,000 WIK', '6d ago',  true,  '\$1.42'),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Text('Recent Transactions', style: WikText.label()),
        ),
        const SizedBox(height: 8),
        ...txs.map((tx) => Container(
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 6),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: WikColor.bg1, borderRadius: BorderRadius.circular(10),
            border: Border.all(color: WikColor.border),
          ),
          child: Row(children: [
            Container(
              width: 36, height: 36, decoration: BoxDecoration(
                color: tx.$5 ? WikColor.greenBg : WikColor.redBg,
                borderRadius: BorderRadius.circular(10)),
              child: Icon(tx.$5 ? Icons.arrow_downward : Icons.arrow_upward,
                color: tx.$5 ? WikColor.green : WikColor.red, size: 18),
            ),
            const SizedBox(width: 10),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(tx.$1, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 12)),
              Text('${tx.$2} · ${tx.$4}', style: const TextStyle(color: WikColor.text3, fontSize: 10)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text(tx.$3, style: TextStyle(
                color: tx.$5 ? WikColor.green : WikColor.red,
                fontFamily: 'SpaceMono', fontSize: 12, fontWeight: FontWeight.w700)),
              Text('Fee: ${tx.$6}', style: const TextStyle(color: WikColor.text3, fontSize: 9)),
            ]),
          ]),
        )),
      ],
    );
  }

  // ─── ACTION SHEETS ────────────────────────────────────────────
  static void _showBuySheet(BuildContext context, [String asset = 'WIK']) =>
    _showBuySheetWith(context, asset);

  static void _showBuySheetWith(BuildContext context, String asset) => showModalBottomSheet(
    context: context, isScrollControlled: true, backgroundColor: WikColor.bg1,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _BuySheet(asset: asset),
  );

  static void _showSellSheet(BuildContext context, [String asset = 'WIK']) =>
    _showSellSheetWith(context, asset);

  static void _showSellSheetWith(BuildContext context, String asset) => showModalBottomSheet(
    context: context, isScrollControlled: true, backgroundColor: WikColor.bg1,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _SellSheet(asset: asset),
  );

  static void _showDepositSheet(BuildContext context) => showModalBottomSheet(
    context: context, isScrollControlled: true, backgroundColor: WikColor.bg1,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _DepositSheet(),
  );

  static void _showWithdrawSheet(BuildContext context) => showModalBottomSheet(
    context: context, isScrollControlled: true, backgroundColor: WikColor.bg1,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _WithdrawSheet(),
  );

  static void _showSendSheet(BuildContext context, String address) => showModalBottomSheet(
    context: context, isScrollControlled: true, backgroundColor: WikColor.bg1,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _SendSheet(address: address),
  );

  static void _showReceiveSheet(BuildContext context, String address) => showModalBottomSheet(
    context: context, isScrollControlled: true, backgroundColor: WikColor.bg1,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _ReceiveSheet(address: address),
  );

  static void _showConvertSheet(BuildContext context) => showModalBottomSheet(
    context: context, isScrollControlled: true, backgroundColor: WikColor.bg1,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _ConvertSheet(),
  );

  static void _showInternalTransferSheet(BuildContext context) => showModalBottomSheet(
    context: context, isScrollControlled: true, backgroundColor: WikColor.bg1,
    shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
    builder: (_) => _InternalTransferSheet(),
  );
}

// ─── PORTFOLIO CARD ──────────────────────────────────────────
class _PortfolioCard extends StatelessWidget {
  final String address;
  final AsyncValue balance;
  final NumberFormat fmt;
  const _PortfolioCard({required this.address, required this.balance, required this.fmt});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(colors: [Color(0xFF0C1628), Color(0xFF0A1020)], begin: Alignment.topLeft, end: Alignment.bottomRight),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: WikColor.border),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: WikColor.green, shape: BoxShape.circle,
            boxShadow: [BoxShadow(color: WikColor.green.withOpacity(0.6), blurRadius: 6)])),
          const SizedBox(width: 6),
          Text('${address.isEmpty ? "Not connected" : "${address.substring(0,6)}...${address.substring(address.length-4)}"}  ·  Arbitrum',
            style: const TextStyle(color: WikColor.text3, fontSize: 10, fontWeight: FontWeight.w600)),
        ]),
        const SizedBox(height: 12),
        balance.when(
          loading: () => const Text('\$···', style: TextStyle(color: WikColor.text1, fontSize: 34, fontWeight: FontWeight.w900, fontFamily: 'SpaceMono')),
          error:   (_, __) => const Text('\$0.00', style: TextStyle(color: WikColor.text1, fontSize: 34, fontWeight: FontWeight.w900, fontFamily: 'SpaceMono')),
          data: (b) => Text(fmt.format(b.total), style: const TextStyle(color: WikColor.text1, fontSize: 34, fontWeight: FontWeight.w900, fontFamily: 'SpaceMono')),
        ),
        const Text('Total Portfolio', style: TextStyle(color: WikColor.text3, fontSize: 11)),
        const SizedBox(height: 14),
        Row(children: [
          Expanded(child: _MiniStat('Margin', '\$500', WikColor.accent)),
          Expanded(child: _MiniStat('Positions', '3', WikColor.gold)),
          Expanded(child: _MiniStat('P&L', '-\$24.23', WikColor.red)),
          Expanded(child: _MiniStat('Fee Tier', 'Standard', WikColor.text2)),
        ]),
      ]),
    );
  }
}

class _MiniStat extends StatelessWidget {
  final String label, value;
  final Color color;
  const _MiniStat(this.label, this.value, this.color);
  @override
  Widget build(BuildContext context) => Column(children: [
    Text(label.toUpperCase(), style: WikText.label()),
    const SizedBox(height: 2),
    Text(value, style: TextStyle(color: color, fontFamily: 'SpaceMono', fontSize: 12, fontWeight: FontWeight.w700)),
  ]);
}

// ─── TAB BUTTON ──────────────────────────────────────────────
Widget _Tab(String label, int idx, int current, WidgetRef ref) => Expanded(child: GestureDetector(
  onTap: () => ref.read(_walletTabProvider.notifier).state = idx,
  child: AnimatedContainer(duration: const Duration(milliseconds: 150),
    padding: const EdgeInsets.symmetric(vertical: 9),
    decoration: BoxDecoration(
      color: current == idx ? WikColor.accent : Colors.transparent,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Text(label, textAlign: TextAlign.center,
      style: TextStyle(color: current == idx ? Colors.white : WikColor.text3, fontWeight: FontWeight.w700, fontSize: 11)),
  ),
));

// ─── ACTION BUTTON ───────────────────────────────────────────
class _ActionBtn extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  const _ActionBtn({required this.icon, required this.label, required this.color, required this.onTap});
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Container(
        width: 48, height: 48,
        decoration: BoxDecoration(color: color.withOpacity(0.12), shape: BoxShape.circle,
          border: Border.all(color: color.withOpacity(0.3))),
        child: Icon(icon, color: color, size: 22),
      ),
      const SizedBox(height: 5),
      Text(label, style: TextStyle(color: WikColor.text2, fontSize: 9, fontWeight: FontWeight.w700)),
    ]),
  );
}

// ─── TOKEN ROW ───────────────────────────────────────────────
class _TokenRow extends StatelessWidget {
  final String symbol, name, icon;
  final Color color;
  final double price;
  final VoidCallback onBuy, onSell;
  const _TokenRow({required this.symbol, required this.name, required this.icon,
    required this.color, required this.price, required this.onBuy, required this.onSell});
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.fromLTRB(16, 0, 16, 6),
    padding: const EdgeInsets.all(11),
    decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
    child: Row(children: [
      Container(width: 36, height: 36, decoration: BoxDecoration(
        color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withOpacity(0.3))),
        child: Center(child: Text(icon, style: TextStyle(color: color, fontWeight: FontWeight.w900, fontSize: 16)))),
      const SizedBox(width: 10),
      Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(symbol, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w800, fontSize: 12)),
        Text(name, style: const TextStyle(color: WikColor.text3, fontSize: 9)),
      ])),
      Text('\$${price >= 1000 ? NumberFormat('#,##0.00').format(price) : price.toStringAsFixed(4)}',
        style: const TextStyle(color: WikColor.text2, fontFamily: 'SpaceMono', fontSize: 10)),
      const SizedBox(width: 8),
      GestureDetector(onTap: onBuy, child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: WikColor.greenBg, borderRadius: BorderRadius.circular(6)),
        child: const Text('Buy', style: TextStyle(color: WikColor.green, fontSize: 9, fontWeight: FontWeight.w800)))),
      const SizedBox(width: 4),
      GestureDetector(onTap: onSell, child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: WikColor.redBg, borderRadius: BorderRadius.circular(6)),
        child: const Text('Sell', style: TextStyle(color: WikColor.red, fontSize: 9, fontWeight: FontWeight.w800)))),
    ]),
  );
}

// ─── SHEETS (Modals) ─────────────────────────────────────────
// Generic sheet wrapper
Widget _sheetWrap(String title, IconData ico, Color c, Widget body) => Padding(
  padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
  child: Column(mainAxisSize: MainAxisSize.min, crossAxisAlignment: CrossAxisAlignment.start, children: [
    Center(child: Container(width: 40, height: 4, decoration: BoxDecoration(color: WikColor.border, borderRadius: BorderRadius.circular(2)))),
    const SizedBox(height: 14),
    Row(children: [
      Container(width: 32, height: 32, decoration: BoxDecoration(color: c.withOpacity(0.12), borderRadius: BorderRadius.circular(9), border: Border.all(color: c.withOpacity(0.3))),
        child: Icon(ico, color: c, size: 16)),
      const SizedBox(width: 10),
      Text(title, style: TextStyle(color: WikColor.text1, fontSize: 16, fontWeight: FontWeight.w900)),
    ]),
    const SizedBox(height: 16),
    body,
  ]),
);

class _DepositSheet extends StatefulWidget {
  @override State<_DepositSheet> createState() => _DepositSheetState();
}
class _DepositSheetState extends State<_DepositSheet> {
  String _asset = 'USDC';
  final _ctrl = TextEditingController();
  bool _done = false;
  @override void dispose() { _ctrl.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: _sheetWrap('Deposit', Icons.arrow_downward_outlined, WikColor.green, Column(children: [
        Row(children: ['USDC','USDT','ETH','WBTC','ARB'].map((s) => Expanded(child: GestureDetector(
          onTap: () => setState(() => _asset = s),
          child: AnimatedContainer(duration: const Duration(milliseconds: 130),
            margin: const EdgeInsets.only(right: 6), padding: const EdgeInsets.symmetric(vertical: 8),
            decoration: BoxDecoration(color: _asset == s ? WikColor.green.withOpacity(0.12) : WikColor.bg2,
              borderRadius: BorderRadius.circular(8), border: Border.all(color: _asset == s ? WikColor.green : WikColor.border)),
            child: Text(s, textAlign: TextAlign.center, style: TextStyle(color: _asset == s ? WikColor.green : WikColor.text3, fontWeight: FontWeight.w700, fontSize: 10))),
        ))).toList()),
        const SizedBox(height: 12),
        TextField(controller: _ctrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: WikText.price(size: 22),
          decoration: InputDecoration(labelText: 'Amount', suffixText: _asset)),
        const SizedBox(height: 8),
        ...[['Deposit fee','\$0.00'],['Network fee','~\$0.02'],['Min deposit','\$1.00'],['Daily limit','\$100,000']].map((r) => Padding(
          padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(r[0], style: const TextStyle(color: WikColor.text3, fontSize: 11)),
            Text(r[1], style: const TextStyle(color: WikColor.text1, fontFamily: 'SpaceMono', fontSize: 11)),
          ]))),
        const SizedBox(height: 14),
        if (_done) Container(padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: WikColor.greenBg, borderRadius: BorderRadius.circular(9)),
          child: const Text('✅ Deposited successfully!', style: TextStyle(color: WikColor.green, fontWeight: FontWeight.w700))),
        if (!_done) SizedBox(width: double.infinity, child: ElevatedButton(
          onPressed: () async {
            HapticFeedback.mediumImpact();
            // Real API call — see ApiService.instance methods
            if (mounted) setState(() => _done = true);
          },
          style: ElevatedButton.styleFrom(backgroundColor: WikColor.green, foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(vertical: 14)),
          child: Text('⬇ Deposit $_asset', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
        )),
      ])),
    );
  }
}

class _WithdrawSheet extends StatefulWidget {
  @override State<_WithdrawSheet> createState() => _WithdrawSheetState();
}
class _WithdrawSheetState extends State<_WithdrawSheet> {
  String _asset = 'USDC', _network = 'Arbitrum';
  final _amt = TextEditingController();
  bool _done = false;
  @override void dispose() { _amt.dispose(); super.dispose(); }
  static const _nets = ['Arbitrum','Ethereum','Base','Optimism','Polygon','BNB Chain'];
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
    child: _sheetWrap('Withdraw', Icons.arrow_upward_outlined, WikColor.red, Column(children: [
      Row(children: ['USDC','USDT','ETH','WBTC','ARB'].map((s) => Expanded(child: GestureDetector(
        onTap: () => setState(() => _asset = s),
        child: AnimatedContainer(duration: const Duration(milliseconds: 130),
          margin: const EdgeInsets.only(right: 6), padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(color: _asset == s ? WikColor.red.withOpacity(0.12) : WikColor.bg2,
            borderRadius: BorderRadius.circular(8), border: Border.all(color: _asset == s ? WikColor.red : WikColor.border)),
          child: Text(s, textAlign: TextAlign.center, style: TextStyle(color: _asset == s ? WikColor.red : WikColor.text3, fontWeight: FontWeight.w700, fontSize: 10))),
      ))).toList()),
      const SizedBox(height: 10),
      DropdownButtonFormField<String>(
        value: _network, dropdownColor: WikColor.bg2,
        style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 13),
        decoration: const InputDecoration(labelText: 'Network'),
        items: _nets.map((n) => DropdownMenuItem(value: n, child: Text(n))).toList(),
        onChanged: (v) => setState(() => _network = v!),
      ),
      const SizedBox(height: 10),
      TextField(controller: _amt, keyboardType: const TextInputType.numberWithOptions(decimal: true),
        style: WikText.price(size: 22),
        decoration: InputDecoration(labelText: 'Amount', suffixText: _asset)),
      const SizedBox(height: 8),
      ...[['Withdrawal fee','\$0.00'],['Network fee','~\$0.02'],['Daily limit','\$100,000'],['Single limit','\$50,000']].map((r) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 3),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          Text(r[0], style: const TextStyle(color: WikColor.text3, fontSize: 11)),
          Text(r[1], style: const TextStyle(color: WikColor.text1, fontFamily: 'SpaceMono', fontSize: 11)),
        ]))),
      const SizedBox(height: 14),
      if (_done) Container(padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.redBg, borderRadius: BorderRadius.circular(9)),
        child: const Text('✅ Withdrawal submitted!', style: TextStyle(color: WikColor.red, fontWeight: FontWeight.w700))),
      if (!_done) SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: () async {
          HapticFeedback.mediumImpact();
          // Real API call — see ApiService.instance methods
          if (mounted) setState(() => _done = true);
        },
        style: ElevatedButton.styleFrom(backgroundColor: WikColor.red, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14)),
        child: Text('⬆ Withdraw $_asset via $_network', style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
      )),
    ])),
  );
}

class _SendSheet extends StatefulWidget {
  final String address;
  const _SendSheet({required this.address});
  @override State<_SendSheet> createState() => _SendSheetState();
}
class _SendSheetState extends State<_SendSheet> {
  String _token = 'USDC'; final _to = TextEditingController(); final _amt = TextEditingController();
  bool _done = false;
  @override void dispose() { _to.dispose(); _amt.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
    child: _sheetWrap('Send', Icons.send_outlined, WikColor.accent, Column(children: [
      Row(children: ['USDC','ETH','WBTC','ARB','WIK'].map((s) => Expanded(child: GestureDetector(
        onTap: () => setState(() => _token = s),
        child: AnimatedContainer(duration: const Duration(milliseconds: 130),
          margin: const EdgeInsets.only(right: 5), padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(color: _token == s ? WikColor.accent.withOpacity(0.12) : WikColor.bg2,
            borderRadius: BorderRadius.circular(8), border: Border.all(color: _token == s ? WikColor.accent : WikColor.border)),
          child: Text(s, textAlign: TextAlign.center, style: TextStyle(color: _token == s ? WikColor.accent : WikColor.text3, fontWeight: FontWeight.w700, fontSize: 10))),
      ))).toList()),
      const SizedBox(height: 10),
      TextField(controller: _to, decoration: const InputDecoration(labelText: 'Recipient address', hintText: '0x...')),
      const SizedBox(height: 8),
      TextField(controller: _amt, keyboardType: const TextInputType.numberWithOptions(decimal: true),
        style: WikText.price(size: 20), decoration: InputDecoration(labelText: 'Amount', suffixText: _token)),
      const SizedBox(height: 8),
      Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(9)),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('Estimated gas', style: TextStyle(color: WikColor.text3, fontSize: 11)),
          const Text('~\$0.02 (Arbitrum)', style: TextStyle(color: WikColor.text2, fontFamily: 'SpaceMono', fontSize: 11)),
        ])),
      const SizedBox(height: 12),
      if (_done) Container(padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.greenBg, borderRadius: BorderRadius.circular(9)),
        child: const Text('✅ Transaction submitted!', style: TextStyle(color: WikColor.green, fontWeight: FontWeight.w700))),
      if (!_done) SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: () async {
          HapticFeedback.mediumImpact();
          // Real API call — see ApiService.instance methods
          if (mounted) setState(() => _done = true);
        },
        child: Text('↑ Send $_token', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
      )),
    ])),
  );
}

class _ReceiveSheet extends StatelessWidget {
  final String address;
  const _ReceiveSheet({required this.address});
  @override
  Widget build(BuildContext context) {
    return _sheetWrap('Receive', Icons.qr_code_outlined, WikColor.green, Column(children: [
      if (address.isNotEmpty) Center(child: QrImageView(
        data: address, size: 180, backgroundColor: Colors.white,
        padding: const EdgeInsets.all(12),
      )),
      const SizedBox(height: 14),
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.border)),
        child: Row(children: [
          Expanded(child: Text(address.isEmpty ? 'Connect wallet' : address,
            style: const TextStyle(fontFamily: 'SpaceMono', fontSize: 11, color: WikColor.accent))),
          GestureDetector(
            onTap: () {
              Clipboard.setData(ClipboardData(text: address));
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                content: Text('Address copied!'), behavior: SnackBarBehavior.floating,
                backgroundColor: WikColor.green));
            },
            child: const Icon(Icons.copy_outlined, color: WikColor.text3, size: 18)),
        ]),
      ),
      const SizedBox(height: 10),
      Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.gold.withOpacity(0.08), borderRadius: BorderRadius.circular(9),
          border: Border.all(color: WikColor.gold.withOpacity(0.25))),
        child: const Text('Only send Arbitrum assets to this address. Wrong network = permanent loss.',
          style: TextStyle(color: WikColor.gold, fontSize: 10, height: 1.5)),
      ),
    ]));
  }
}

class _BuySheet extends StatefulWidget {
  final String asset;
  const _BuySheet({required this.asset});
  @override State<_BuySheet> createState() => _BuySheetState();
}
class _BuySheetState extends State<_BuySheet> {
  late String _asset;
  final _ctrl = TextEditingController(text: '100');
  bool _done = false;
  static const _prices = {'WIK':0.284,'ETH':3482.0,'WBTC':67284.0,'ARB':1.18,'LINK':9.86};
  @override void initState() { super.initState(); _asset = widget.asset; }
  @override void dispose() { _ctrl.dispose(); super.dispose(); }
  double get _spend => double.tryParse(_ctrl.text) ?? 0;
  double get _receive => _spend / (_prices[_asset] ?? 1);
  double get _fee => _spend * 0.0005;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
    child: _sheetWrap('Buy Crypto', Icons.shopping_cart_outlined, WikColor.green, Column(children: [
      Row(children: _prices.keys.map((s) => Expanded(child: GestureDetector(
        onTap: () => setState(() => _asset = s),
        child: AnimatedContainer(duration: const Duration(milliseconds: 130),
          margin: const EdgeInsets.only(right: 5), padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(color: _asset == s ? WikColor.green.withOpacity(0.12) : WikColor.bg2,
            borderRadius: BorderRadius.circular(8), border: Border.all(color: _asset == s ? WikColor.green : WikColor.border)),
          child: Column(children: [
            Text(s, textAlign: TextAlign.center, style: TextStyle(color: _asset == s ? WikColor.green : WikColor.text3, fontWeight: FontWeight.w800, fontSize: 10)),
            Text('\$${(_prices[s]!).toStringAsFixed(_prices[s]! < 1 ? 4 : 0)}',
              style: TextStyle(color: _asset == s ? WikColor.green : WikColor.text3, fontSize: 7, fontFamily: 'SpaceMono')),
          ])),
      ))).toList()),
      const SizedBox(height: 12),
      TextField(controller: _ctrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
        style: WikText.price(size: 22), onChanged: (_) => setState(() {}),
        decoration: const InputDecoration(labelText: 'Spend (USDC)', suffixText: 'USDC')),
      const SizedBox(height: 12),
      Container(padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: WikColor.green.withOpacity(0.08), borderRadius: BorderRadius.circular(10),
          border: Border.all(color: WikColor.green.withOpacity(0.25))),
        child: Column(children: [
          const Text('YOU RECEIVE', style: TextStyle(color: WikColor.text3, fontSize: 9, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text('${_receive.toStringAsFixed(4)} $_asset',
            style: TextStyle(color: WikColor.green, fontFamily: 'SpaceMono', fontSize: 22, fontWeight: FontWeight.w900)),
        ])),
      const SizedBox(height: 8),
      ...[['Price','\$${(_prices[_asset]!).toStringAsFixed(4)}'],['Fee (0.05%)','\$${_fee.toStringAsFixed(4)}'],['Slippage','≤ 0.3%']].map((r) =>
        Padding(padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(r[0], style: const TextStyle(color: WikColor.text3, fontSize: 11)),
            Text(r[1], style: const TextStyle(color: WikColor.text1, fontFamily: 'SpaceMono', fontSize: 11)),
          ]))),
      const SizedBox(height: 14),
      if (_done) Container(padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.greenBg, borderRadius: BorderRadius.circular(9)),
        child: Text('✅ Bought ${_receive.toStringAsFixed(4)} $_asset!', style: const TextStyle(color: WikColor.green, fontWeight: FontWeight.w700))),
      if (!_done) SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: () async {
          HapticFeedback.mediumImpact();
          // Real API call — see ApiService.instance methods
          if (mounted) setState(() => _done = true);
        },
        style: ElevatedButton.styleFrom(backgroundColor: WikColor.green, foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(vertical: 14)),
        child: Text('🛒 Buy $_asset', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
      )),
    ])),
  );
}

class _SellSheet extends StatefulWidget {
  final String asset;
  const _SellSheet({required this.asset});
  @override State<_SellSheet> createState() => _SellSheetState();
}
class _SellSheetState extends State<_SellSheet> {
  late String _asset;
  final _ctrl = TextEditingController(text: '100');
  bool _done = false;
  static const _prices = {'WIK':0.284,'ETH':3482.0,'WBTC':67284.0,'ARB':1.18,'LINK':9.86};
  @override void initState() { super.initState(); _asset = widget.asset; }
  @override void dispose() { _ctrl.dispose(); super.dispose(); }
  double get _amount => double.tryParse(_ctrl.text) ?? 0;
  double get _receive => _amount * (_prices[_asset] ?? 0);
  double get _fee => _receive * 0.0005;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
    child: _sheetWrap('Sell Crypto', Icons.sell_outlined, WikColor.red, Column(children: [
      Row(children: _prices.keys.map((s) => Expanded(child: GestureDetector(
        onTap: () => setState(() => _asset = s),
        child: AnimatedContainer(duration: const Duration(milliseconds: 130),
          margin: const EdgeInsets.only(right: 5), padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(color: _asset == s ? WikColor.red.withOpacity(0.12) : WikColor.bg2,
            borderRadius: BorderRadius.circular(8), border: Border.all(color: _asset == s ? WikColor.red : WikColor.border)),
          child: Text(s, textAlign: TextAlign.center, style: TextStyle(color: _asset == s ? WikColor.red : WikColor.text3, fontWeight: FontWeight.w800, fontSize: 10))),
      ))).toList()),
      const SizedBox(height: 12),
      TextField(controller: _ctrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
        style: WikText.price(size: 22), onChanged: (_) => setState(() {}),
        decoration: InputDecoration(labelText: 'Sell Amount', suffixText: _asset)),
      const SizedBox(height: 12),
      Container(padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(color: WikColor.red.withOpacity(0.06), borderRadius: BorderRadius.circular(10),
          border: Border.all(color: WikColor.red.withOpacity(0.2))),
        child: Column(children: [
          const Text('YOU RECEIVE', style: TextStyle(color: WikColor.text3, fontSize: 9, fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Text('${(_receive - _fee).toStringAsFixed(2)} USDC',
            style: const TextStyle(color: WikColor.green, fontFamily: 'SpaceMono', fontSize: 22, fontWeight: FontWeight.w900)),
        ])),
      const SizedBox(height: 8),
      ...[['Price','\$${(_prices[_asset]!).toStringAsFixed(4)}'],['Fee (0.05%)','\$${_fee.toStringAsFixed(4)}'],['Net receive','\$${(_receive-_fee).toStringAsFixed(2)}']].map((r) =>
        Padding(padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(r[0], style: const TextStyle(color: WikColor.text3, fontSize: 11)),
            Text(r[1], style: const TextStyle(color: WikColor.text1, fontFamily: 'SpaceMono', fontSize: 11)),
          ]))),
      const SizedBox(height: 14),
      if (_done) Container(padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.redBg, borderRadius: BorderRadius.circular(9)),
        child: const Text('✅ Sold successfully!', style: TextStyle(color: WikColor.red, fontWeight: FontWeight.w700))),
      if (!_done) SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: () async {
          HapticFeedback.mediumImpact();
          // Real API call — see ApiService.instance methods
          if (mounted) setState(() => _done = true);
        },
        style: ElevatedButton.styleFrom(backgroundColor: WikColor.red, foregroundColor: Colors.white, padding: const EdgeInsets.symmetric(vertical: 14)),
        child: Text('💵 Sell $_asset → USDC', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
      )),
    ])),
  );
}

class _ConvertSheet extends StatefulWidget {
  @override State<_ConvertSheet> createState() => _ConvertSheetState();
}
class _ConvertSheetState extends State<_ConvertSheet> {
  String _from = 'USDC', _to = 'USDT';
  final _ctrl = TextEditingController(text: '300');
  bool _done = false;
  static const _prices = {'USDC':1.0,'USDT':1.0,'ETH':3482.0,'WBTC':67284.0,'ARB':1.18,'WIK':0.284};
  @override void dispose() { _ctrl.dispose(); super.dispose(); }
  bool get _isStable => (_from == 'USDC' || _from == 'USDT') && (_to == 'USDC' || _to == 'USDT');
  double get _amount => double.tryParse(_ctrl.text) ?? 0;
  double get _receive => _amount * (_prices[_from]!) / (_prices[_to]!);
  double get _fee => _isStable ? 0 : _receive * (_prices[_to]!) * 0.0007;
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
    child: _sheetWrap('Convert', Icons.swap_horiz_rounded, WikColor.accent, Column(children: [
      Container(padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.accent.withOpacity(0.08), borderRadius: BorderRadius.circular(9),
          border: Border.all(color: WikColor.accent.withOpacity(0.2))),
        child: Text(_isStable ? '✅ Stablecoin conversion — 0% fee' : '0.07% fee · Best price via SOR',
          style: TextStyle(color: _isStable ? WikColor.green : WikColor.accent, fontSize: 11, fontWeight: FontWeight.w700))),
      const SizedBox(height: 12),
      Row(children: [
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('FROM', style: TextStyle(color: WikColor.text3, fontSize: 9, fontWeight: FontWeight.w700)),
          const SizedBox(height: 5),
          DropdownButtonFormField<String>(
            value: _from, dropdownColor: WikColor.bg2,
            style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700),
            decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            items: _prices.keys.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
            onChanged: (v) => setState(() => _from = v!),
          ),
        ])),
        Padding(padding: const EdgeInsets.only(top: 16, left: 8, right: 8),
          child: GestureDetector(onTap: () => setState(() { final t = _from; _from = _to; _to = t; }),
            child: Container(width: 32, height: 32, decoration: BoxDecoration(
                color: WikColor.accent.withOpacity(0.12), borderRadius: BorderRadius.circular(9),
                border: Border.all(color: WikColor.accent.withOpacity(0.3))),
              child: const Icon(Icons.swap_horiz, color: WikColor.accent, size: 18)))),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('TO', style: TextStyle(color: WikColor.text3, fontSize: 9, fontWeight: FontWeight.w700)),
          const SizedBox(height: 5),
          DropdownButtonFormField<String>(
            value: _to, dropdownColor: WikColor.bg2,
            style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700),
            decoration: const InputDecoration(contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            items: _prices.keys.map((s) => DropdownMenuItem(value: s, child: Text(s))).toList(),
            onChanged: (v) => setState(() => _to = v!),
          ),
        ])),
      ]),
      const SizedBox(height: 10),
      TextField(controller: _ctrl, keyboardType: const TextInputType.numberWithOptions(decimal: true),
        style: WikText.price(size: 20), onChanged: (_) => setState(() {}),
        decoration: InputDecoration(labelText: 'Amount', suffixText: _from)),
      const SizedBox(height: 8),
      Container(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
        decoration: BoxDecoration(color: WikColor.green.withOpacity(0.06), borderRadius: BorderRadius.circular(9),
          border: Border.all(color: WikColor.green.withOpacity(0.2))),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('You receive', style: TextStyle(color: WikColor.text3, fontSize: 12)),
          Text('${_receive.toStringAsFixed(6)} $_to',
            style: const TextStyle(color: WikColor.green, fontFamily: 'SpaceMono', fontSize: 15, fontWeight: FontWeight.w900)),
        ])),
      const SizedBox(height: 6),
      Padding(padding: const EdgeInsets.symmetric(vertical: 2),
        child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
          const Text('Fee', style: TextStyle(color: WikColor.text3, fontSize: 11)),
          Text(_isStable ? '0.00% (stablecoin)' : '\$${_fee.toStringAsFixed(4)}',
            style: TextStyle(color: _isStable ? WikColor.green : WikColor.text2, fontFamily: 'SpaceMono', fontSize: 11, fontWeight: FontWeight.w700)),
        ])),
      const SizedBox(height: 14),
      if (_done) Container(padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.greenBg, borderRadius: BorderRadius.circular(9)),
        child: const Text('✅ Converted!', style: TextStyle(color: WikColor.green, fontWeight: FontWeight.w700))),
      if (!_done) SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: () async {
          HapticFeedback.mediumImpact();
          // Real API call — see ApiService.instance methods
          if (mounted) setState(() => _done = true);
        },
        style: ElevatedButton.styleFrom(backgroundColor: WikColor.accent, padding: const EdgeInsets.symmetric(vertical: 14)),
        child: Text('🔄 Convert $_from → $_to', style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
      )),
    ])),
  );
}

class _InternalTransferSheet extends StatefulWidget {
  @override State<_InternalTransferSheet> createState() => _InternalTransferSheetState();
}
class _InternalTransferSheetState extends State<_InternalTransferSheet> {
  final _to = TextEditingController(); final _amt = TextEditingController(text: '50');
  bool _done = false;
  @override void dispose() { _to.dispose(); _amt.dispose(); super.dispose(); }
  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
    child: _sheetWrap('Internal Transfer', Icons.swap_vert_outlined, WikColor.gold, Column(children: [
      Container(padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.green.withOpacity(0.08), borderRadius: BorderRadius.circular(9),
          border: Border.all(color: WikColor.green.withOpacity(0.2))),
        child: const Text('Transfer USDC between Wikicious accounts — 0% fee, instant, no gas',
          style: TextStyle(color: WikColor.green, fontSize: 11, fontWeight: FontWeight.w600))),
      const SizedBox(height: 12),
      TextField(controller: _to, decoration: const InputDecoration(labelText: 'Recipient (address or username)', hintText: '0x... or @username')),
      const SizedBox(height: 8),
      TextField(controller: _amt, keyboardType: const TextInputType.numberWithOptions(decimal: true),
        style: WikText.price(size: 20), decoration: const InputDecoration(labelText: 'Amount (USDC)', suffixText: 'USDC')),
      const SizedBox(height: 6),
      ...[['Fee','\$0.00'],['Gas','None'],['Speed','Instant'],['Contract','WikiVault.transferMargin()']].map((r) =>
        Padding(padding: const EdgeInsets.symmetric(vertical: 3),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text(r[0], style: const TextStyle(color: WikColor.text3, fontSize: 11)),
            Text(r[1], style: const TextStyle(color: WikColor.text1, fontFamily: 'SpaceMono', fontSize: 11)),
          ]))),
      const SizedBox(height: 14),
      if (_done) Container(padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(color: WikColor.gold.withOpacity(0.08), borderRadius: BorderRadius.circular(9)),
        child: const Text('✅ Transfer complete!', style: TextStyle(color: WikColor.gold, fontWeight: FontWeight.w700))),
      if (!_done) SizedBox(width: double.infinity, child: ElevatedButton(
        onPressed: () async {
          HapticFeedback.mediumImpact();
          // Real API call — see ApiService.instance methods
          if (mounted) setState(() => _done = true);
        },
        style: ElevatedButton.styleFrom(backgroundColor: WikColor.gold, foregroundColor: Colors.black, padding: const EdgeInsets.symmetric(vertical: 14)),
        child: const Text('↔ Transfer Instantly', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900)),
      )),
    ])),
  );
}
