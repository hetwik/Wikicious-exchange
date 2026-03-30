import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../services/api_service.dart';
import '../../providers/providers.dart';
import '../../theme.dart';

class TradeScreen extends ConsumerStatefulWidget {
  const TradeScreen({super.key});
  @override
  ConsumerState<TradeScreen> createState() => _TradeScreenState();
}

class _TradeScreenState extends ConsumerState<TradeScreen> with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  final _sizeCtrl = TextEditingController();
  final _tpCtrl   = TextEditingController();
  final _slCtrl   = TextEditingController();
  String _symbol  = 'BTCUSDT';
  bool   _isLong  = true;
  int    _leverage = 10;
  bool   _placing  = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    _sizeCtrl.dispose();
    _tpCtrl.dispose();
    _slCtrl.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    final size = double.tryParse(_sizeCtrl.text);
    if (size == null || size <= 0) {
      setState(() => _error = 'Enter a valid collateral amount');
      return;
    }
    setState(() { _placing = true; _error = null; _success = null; });
    try {
      final walletAddress = ref.read(walletAddressProvider);
      if (walletAddress == null) {
        setState(() { _error = 'Connect wallet first'; _placing = false; });
        return;
      }
      final markets = ref.read(marketsProvider).value ?? [];
      final market  = markets.firstWhere((m) => m.symbol == _symbol,
          orElse: () => throw Exception('Market not found'));

      await ApiService.instance.placeOrder(
        walletAddress: walletAddress,
        marketIndex:   market.id,
        isLong:        _isLong,
        collateral:    size,
        leverage:      _leverage,
        takeProfit:    double.tryParse(_tpCtrl.text) ?? 0,
        stopLoss:      double.tryParse(_slCtrl.text) ?? 0,
      );

      setState(() {
        _success = '${_isLong ? "Long" : "Short"} ${_symbol.replaceAll("USDT", "")} ${_leverage}× opened';
        _placing = false;
      });
      _sizeCtrl.clear(); _tpCtrl.clear(); _slCtrl.clear();
      ref.invalidate(positionsProvider);
    } catch (e) {
      setState(() { _error = e.toString().replaceAll('Exception: ', ''); _placing = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    final marketsAsync  = ref.watch(marketsProvider);
    final markets       = marketsAsync.value ?? [];
    final market        = markets.firstWhere((m) => m.symbol == _symbol, orElse: () => Market(symbol: _symbol, base: '', quote: 'USDT', markPrice: 0, change24h: 0, volume24h: 0));
    final price         = market.markPrice;
    final notional      = (double.tryParse(_sizeCtrl.text) ?? 0) * _leverage;
    final positionsAsync = ref.watch(positionsProvider);

    return Scaffold(
      backgroundColor: WikColor.bg0,
      appBar: AppBar(
        backgroundColor: WikColor.bg1,
        title: Row(children: [
          DropdownButtonHideUnderline(child: DropdownButton<String>(
            value: _symbol,
            dropdownColor: WikColor.bg2,
            style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 15),
            onChanged: (v) => setState(() => _symbol = v!),
            items: markets.map((m) => DropdownMenuItem(value: m.symbol, child: Text(m.symbol))).toList(),
          )),
          const SizedBox(width: 12),
          Text('\$${price.toStringAsFixed(2)}',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700, fontFamily: 'JetBrainsMono',
                  color: market.change24h >= 0 ? WikColor.green : WikColor.red)),
          const SizedBox(width: 6),
          Text('${market.change24h >= 0 ? "+" : ""}${market.change24h.toStringAsFixed(2)}%',
              style: TextStyle(fontSize: 11, color: market.change24h >= 0 ? WikColor.green : WikColor.red)),
        ]),
        bottom: TabBar(
          controller: _tabCtrl,
          indicatorColor: WikColor.accent,
          labelColor: WikColor.accent,
          unselectedLabelColor: WikColor.text3,
          tabs: const [Tab(text: 'Trade'), Tab(text: 'Positions')],
        ),
      ),
      body: TabBarView(controller: _tabCtrl, children: [
        _buildTradeForm(notional),
        _buildPositions(positionsAsync),
      ]),
    );
  }

  Widget _buildTradeForm(double notional) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        // Long/Short
        Row(children: [true, false].map((lng) => Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: lng ? 6 : 0, left: lng ? 0 : 6),
            child: ElevatedButton(
              onPressed: () => setState(() => _isLong = lng),
              style: ElevatedButton.styleFrom(
                backgroundColor: _isLong == lng ? (lng ? WikColor.green : WikColor.red) : WikColor.bg2,
                foregroundColor: _isLong == lng ? Colors.black : WikColor.text3,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(11)),
                padding: const EdgeInsets.symmetric(vertical: 13),
              ),
              child: Text(lng ? 'Long ▲' : 'Short ▼', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
            ),
          ),
        )).toList()),
        const SizedBox(height: 14),
        // Collateral
        _label('COLLATERAL (USDC)'),
        _input(_sizeCtrl, '100', TextInputType.number),
        const SizedBox(height: 10),
        // Leverage
        _label('LEVERAGE: ${_leverage}×'),
        Slider(
          value: _leverage.toDouble(),
          min: 1, max: 125,
          onChanged: (v) => setState(() => _leverage = v.round()),
          activeColor: WikColor.accent,
        ),
        const SizedBox(height: 6),
        Row(children: [
          _input(_tpCtrl, 'Take Profit (0=skip)', TextInputType.number),
          const SizedBox(width: 8),
          _input(_slCtrl, 'Stop Loss (0=skip)', TextInputType.number),
        ]),
        const SizedBox(height: 10),
        if (notional > 0) Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10)),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Notional: \$${notional.toStringAsFixed(2)}', style: TextStyle(fontSize: 12, color: WikColor.text2)),
            Text('Fee: \$${(notional * 0.001).toStringAsFixed(4)}', style: TextStyle(fontSize: 12, color: WikColor.gold)),
          ]),
        ),
        if (_error != null) ...[
          const SizedBox(height: 8),
          Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: WikColor.red.withOpacity(.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.red.withOpacity(.3))),
            child: Text(_error!, style: TextStyle(color: WikColor.red, fontSize: 12))),
        ],
        if (_success != null) ...[
          const SizedBox(height: 8),
          Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: WikColor.green.withOpacity(.1), borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.green.withOpacity(.3))),
            child: Text('✅ $_success', style: TextStyle(color: WikColor.green, fontSize: 12))),
        ],
        const SizedBox(height: 14),
        ElevatedButton(
          onPressed: _placing ? null : _placeOrder,
          style: ElevatedButton.styleFrom(
            backgroundColor: _placing ? WikColor.bg2 : (_isLong ? WikColor.green : WikColor.red),
            foregroundColor: Colors.black,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
            padding: const EdgeInsets.symmetric(vertical: 15),
          ),
          child: _placing
            ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: WikColor.text2))
            : Text('${_isLong ? "Long" : "Short"} ${_symbol.replaceAll("USDT", "")} ${_leverage}×',
                style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14)),
        ),
      ]),
    );
  }

  Widget _buildPositions(AsyncValue positionsAsync) {
    return positionsAsync.when(
      loading: () => const Center(child: CircularProgressIndicator()),
      error: (e, _) => Center(child: Text('Error: $e', style: TextStyle(color: WikColor.red))),
      data: (positions) {
        if (positions.isEmpty) return Center(child: Text('No open positions', style: TextStyle(color: WikColor.text3)));
        return ListView.builder(
          padding: const EdgeInsets.all(12),
          itemCount: positions.length,
          itemBuilder: (ctx, i) {
            final p = positions[i];
            final pnl = p.unrealizedPnl;
            return Container(
              margin: const EdgeInsets.only(bottom: 10),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: WikColor.bg2,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: (pnl >= 0 ? WikColor.green : WikColor.red).withOpacity(.25)),
              ),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                  Text(p.isLong ? 'LONG' : 'SHORT', style: TextStyle(fontWeight: FontWeight.w800, color: p.isLong ? WikColor.green : WikColor.red, fontSize: 13)),
                  Text('${pnl >= 0 ? "+" : ""}\$${pnl.toStringAsFixed(2)}',
                      style: TextStyle(fontFamily: 'JetBrainsMono', fontWeight: FontWeight.w700, color: pnl >= 0 ? WikColor.green : WikColor.red, fontSize: 14)),
                ]),
                const SizedBox(height: 5),
                Text('${p.leverage}× · Entry \$${p.entryPrice.toStringAsFixed(2)} · Liq \$${p.liqPrice.toStringAsFixed(2)}',
                    style: TextStyle(fontSize: 11, color: WikColor.text3)),
              ]),
            );
          },
        );
      },
    );
  }

  Widget _label(String t) => Padding(
    padding: const EdgeInsets.only(bottom: 5),
    child: Text(t, style: TextStyle(fontSize: 9, color: WikColor.text3, fontWeight: FontWeight.w700, letterSpacing: .5)),
  );

  Widget _input(TextEditingController ctrl, String hint, TextInputType type) => Expanded(
    child: TextField(
      controller: ctrl,
      keyboardType: type,
      style: TextStyle(color: WikColor.text1, fontSize: 13),
      decoration: InputDecoration(
        hintText: hint, hintStyle: TextStyle(color: WikColor.text3, fontSize: 12),
        filled: true, fillColor: WikColor.bg2,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide(color: WikColor.border)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
    ),
  );
}
