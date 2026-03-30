import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../services/api_service.dart';
import '../services/wallet_service.dart';

// ── Price providers ───────────────────────────────────────────
final pricesProvider = StateNotifierProvider<PricesNotifier, Map<String, double>>((ref) {
  return PricesNotifier();
});

class PricesNotifier extends StateNotifier<Map<String, double>> {
  StreamSubscription? _sub;
  PricesNotifier() : super({}) {
    api.connectWs();
    _sub = api.priceStream.listen((updates) {
      state = {...state, ...updates};
    });
  }
  double getPrice(String symbol) => state[symbol] ?? 0;
  @override void dispose() { _sub?.cancel(); super.dispose(); }
}

// ── Auth provider ─────────────────────────────────────────────
class AuthState {
  final bool isLoggedIn, hasWallet, isLoading;
  final String? address, username, error;
  const AuthState({this.isLoggedIn = false, this.hasWallet = false,
    this.isLoading = false, this.address, this.username, this.error});
  AuthState copyWith({bool? isLoggedIn, bool? hasWallet, bool? isLoading,
    String? address, String? username, String? error}) => AuthState(
    isLoggedIn: isLoggedIn ?? this.isLoggedIn,
    hasWallet: hasWallet ?? this.hasWallet,
    isLoading: isLoading ?? this.isLoading,
    address: address ?? this.address,
    username: username ?? this.username,
    error: error,
  );
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) => AuthNotifier());

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState()) { _init(); }

  Future<void> _init() async {
    state = state.copyWith(isLoading: true);
    final address = await WalletService.getSavedAddress();
    final loggedIn = await api.isLoggedIn();
    String? username;
    if (loggedIn) {
      final me = await api.getMe();
      username = me?['username'];
    }
    state = state.copyWith(
      isLoggedIn: loggedIn, hasWallet: address != null,
      address: address, username: username, isLoading: false,
    );
  }

  Future<bool> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final data = await api.login(email, password);
      state = state.copyWith(isLoggedIn: true, username: data['user']?['username'], isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
      return false;
    }
  }

  Future<bool> register(String email, String username, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await api.register(email, username, password);
      state = state.copyWith(isLoggedIn: true, username: username, isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: _parseError(e));
      return false;
    }
  }

  Future<void> createWallet() async {
    final mnemonic = WalletService.generateMnemonic();
    final key = await WalletService.mnemonicToPrivateKey(mnemonic);
    final address = WalletService.privateKeyToAddress(key).hexEip55;
    await WalletService.saveWallet(mnemonic, address);
    state = state.copyWith(hasWallet: true, address: address);
  }

  Future<bool> importWallet(String mnemonic) async {
    if (!WalletService.validateMnemonic(mnemonic)) return false;
    final key = await WalletService.mnemonicToPrivateKey(mnemonic);
    final address = WalletService.privateKeyToAddress(key).hexEip55;
    await WalletService.saveWallet(mnemonic, address);
    state = state.copyWith(hasWallet: true, address: address);
    return true;
  }

  Future<void> logout() async {
    await api.logout();
    state = const AuthState();
  }

  String _parseError(dynamic e) {
    if (e is Exception) return e.toString().replaceAll('Exception: ', '');
    return 'Something went wrong';
  }
}

// ── Markets provider ──────────────────────────────────────────
final marketsProvider = FutureProvider<List<Market>>((ref) => api.getMarkets());

final selectedSymbolProvider = StateProvider<String>((ref) => 'BTCUSDT');
final selectedMarketIndexProvider = StateProvider<int>((ref) => 0);

// ── Candles provider ──────────────────────────────────────────
final chartIntervalProvider = StateProvider<String>((ref) => '1h');

final candlesProvider = FutureProvider.family<List<Candle>, (String, String)>((ref, args) {
  return api.getCandles(args.$1, args.$2);
});

// ── Orderbook provider ────────────────────────────────────────
final orderbookProvider = StreamProvider.family<OrderBook, String>((ref, symbol) {
  return Stream.periodic(const Duration(seconds: 2))
      .asyncMap((_) => api.getOrderBook(symbol))
      .asBroadcastStream();
});

// ── Trading form state ────────────────────────────────────────
class TradeFormState {
  final String side, orderType;
  final int leverage;
  final String size, limitPrice, tpPrice, slPrice;
  final bool showTPSL;
  const TradeFormState({
    this.side = 'long', this.orderType = 'market',
    this.leverage = 10, this.size = '', this.limitPrice = '',
    this.tpPrice = '', this.slPrice = '', this.showTPSL = false,
  });
  TradeFormState copyWith({String? side, String? orderType, int? leverage,
    String? size, String? limitPrice, String? tpPrice, String? slPrice, bool? showTPSL}) =>
    TradeFormState(
      side: side ?? this.side, orderType: orderType ?? this.orderType,
      leverage: leverage ?? this.leverage, size: size ?? this.size,
      limitPrice: limitPrice ?? this.limitPrice, tpPrice: tpPrice ?? this.tpPrice,
      slPrice: slPrice ?? this.slPrice, showTPSL: showTPSL ?? this.showTPSL,
    );
}

final tradeFormProvider = StateNotifierProvider<TradeFormNotifier, TradeFormState>(
    (ref) => TradeFormNotifier());

class TradeFormNotifier extends StateNotifier<TradeFormState> {
  TradeFormNotifier() : super(const TradeFormState());
  void setSide(String v)       => state = state.copyWith(side: v);
  void setOrderType(String v)  => state = state.copyWith(orderType: v);
  void setLeverage(int v)      => state = state.copyWith(leverage: v);
  void setSize(String v)       => state = state.copyWith(size: v);
  void setLimitPrice(String v) => state = state.copyWith(limitPrice: v);
  void setTpPrice(String v)    => state = state.copyWith(tpPrice: v);
  void setSlPrice(String v)    => state = state.copyWith(slPrice: v);
  void toggleTPSL()            => state = state.copyWith(showTPSL: !state.showTPSL);
  void reset()                 => state = const TradeFormState(leverage: state.leverage);
}

// ── Account providers ─────────────────────────────────────────
final balanceProvider = StreamProvider<AccountBalance>((ref) {
  final address = ref.watch(authProvider).address;
  if (address == null) return Stream.value(AccountBalance());
  return Stream.periodic(const Duration(seconds: 5))
      .asyncMap((_) => api.getBalance(address))
      .asBroadcastStream();
});

final positionsProvider = StreamProvider<List<Position>>((ref) {
  final address = ref.watch(authProvider).address;
  if (address == null) return Stream.value([]);
  return Stream.periodic(const Duration(seconds: 3))
      .asyncMap((_) => api.getPositions(address))
      .asBroadcastStream();
});

final ordersProvider = StreamProvider<List<Map<String, dynamic>>>((ref) {
  final address = ref.watch(authProvider).address;
  if (address == null) return Stream.value([]);
  return Stream.periodic(const Duration(seconds: 5))
      .asyncMap((_) => api.getOrders(address))
      .asBroadcastStream();
});

// ── Leaderboard ───────────────────────────────────────────────
final leaderboardProvider = FutureProvider<List<LeaderboardEntry>>((ref) => api.getLeaderboard());

// ── Pool stats ────────────────────────────────────────────────
final poolStatsProvider = FutureProvider<Map<String, dynamic>>((ref) => api.getPoolStats());
