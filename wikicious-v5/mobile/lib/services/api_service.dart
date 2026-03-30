import 'dart:async';
import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../theme.dart';

// ── Models ────────────────────────────────────────────────────
class Market {
  final String symbol, base, quote;
  final double markPrice, change24h, volume24h;
  final double openInterestLong, openInterestShort;
  Market({required this.symbol, required this.base, required this.quote,
    required this.markPrice, required this.change24h, required this.volume24h,
    this.openInterestLong = 0, this.openInterestShort = 0});
  factory Market.fromJson(Map<String, dynamic> j) => Market(
    symbol: j['symbol'] ?? '', base: j['base'] ?? '',
    quote: j['quote'] ?? 'USDT',
    markPrice: (j['markPrice'] ?? 0).toDouble(),
    change24h: (j['change24h'] ?? 0).toDouble(),
    volume24h: (j['volume24h'] ?? 0).toDouble(),
    openInterestLong: (j['openInterestLong'] ?? 0).toDouble(),
    openInterestShort: (j['openInterestShort'] ?? 0).toDouble(),
  );
}

class Candle {
  final int openTime;
  final double open, high, low, close, volume;
  Candle({required this.openTime, required this.open, required this.high,
    required this.low, required this.close, required this.volume});
  factory Candle.fromJson(Map<String, dynamic> j) => Candle(
    openTime: (j['open_time'] ?? 0).toInt(),
    open: (j['open'] ?? 0).toDouble(), high: (j['high'] ?? 0).toDouble(),
    low: (j['low'] ?? 0).toDouble(), close: (j['close'] ?? 0).toDouble(),
    volume: (j['volume'] ?? 0).toDouble(),
  );
}

class Position {
  final int id, marketIndex, leverage;
  final bool isLong, open;
  final double size, collateral, entryPrice, liqPrice, unrealizedPnl;
  final double? takeProfit, stopLoss;
  final int openedAt;
  Position({required this.id, required this.marketIndex, required this.isLong,
    required this.size, required this.collateral, required this.entryPrice,
    required this.liqPrice, required this.leverage, required this.unrealizedPnl,
    this.takeProfit, this.stopLoss, this.open = true, this.openedAt = 0});
  factory Position.fromJson(Map<String, dynamic> j) => Position(
    id: (j['id'] ?? 0).toInt(), marketIndex: (j['marketIndex'] ?? 0).toInt(),
    isLong: j['isLong'] ?? true, size: (j['size'] ?? 0).toDouble(),
    collateral: (j['collateral'] ?? 0).toDouble(),
    entryPrice: (j['entryPrice'] ?? 0).toDouble(),
    liqPrice: (j['liqPrice'] ?? 0).toDouble(),
    leverage: (j['leverage'] ?? 1).toInt(),
    unrealizedPnl: (j['unrealizedPnl'] ?? 0).toDouble(),
    takeProfit: j['takeProfit'] != null ? (j['takeProfit']).toDouble() : null,
    stopLoss: j['stopLoss'] != null ? (j['stopLoss']).toDouble() : null,
    open: j['open'] ?? true,
    openedAt: (j['openedAt'] ?? 0).toInt(),
  );
  double get roe => collateral > 0 ? unrealizedPnl / collateral * 100 : 0;
}

class AccountBalance {
  final double freeMargin, lockedMargin, totalMargin;
  AccountBalance({this.freeMargin = 0, this.lockedMargin = 0, this.totalMargin = 0});
  factory AccountBalance.fromJson(Map<String, dynamic> j) => AccountBalance(
    freeMargin: (j['freeMargin'] ?? 0).toDouble(),
    lockedMargin: (j['lockedMargin'] ?? 0).toDouble(),
    totalMargin: (j['totalMargin'] ?? 0).toDouble(),
  );
}

class OrderBook {
  final List<Map<String, double>> bids, asks;
  OrderBook({required this.bids, required this.asks});
  factory OrderBook.fromJson(Map<String, dynamic> j) {
    List<Map<String, double>> parse(List? l) => (l ?? []).map((e) =>
      {'price': (e['price'] ?? 0).toDouble(), 'size': (e['size'] ?? 0).toDouble()}).toList();
    return OrderBook(bids: parse(j['bids']), asks: parse(j['asks']));
  }
}

class LeaderboardEntry {
  final String address, username;
  final double realizedPnl, volume;
  final int tradeCount;
  LeaderboardEntry({required this.address, required this.username,
    required this.realizedPnl, required this.volume, required this.tradeCount});
  factory LeaderboardEntry.fromJson(Map<String, dynamic> j) => LeaderboardEntry(
    address: j['address'] ?? '', username: j['username'] ?? 'Anonymous',
    realizedPnl: (j['realized_pnl'] ?? 0).toDouble(),
    volume: (j['volume'] ?? 0).toDouble(),
    tradeCount: (j['trade_count'] ?? 0).toInt(),
  );
}

// ── API Service ───────────────────────────────────────────────
class ApiService {
  late final Dio _dio;
  final _storage = const FlutterSecureStorage();
  WebSocketChannel? _ws;
  final _priceController = StreamController<Map<String, double>>.broadcast();
  final _wsMessageController = StreamController<Map<String, dynamic>>.broadcast();
  bool _wsConnected = false;
  Timer? _reconnectTimer;

  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  ApiService._internal() {
    _dio = Dio(BaseOptions(
      baseUrl: WikConst.apiUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        final token = await _storage.read(key: 'jwt_token');
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
        handler.next(options);
      },
      onError: (error, handler) {
        handler.next(error);
      },
    ));
  }

  Stream<Map<String, double>> get priceStream => _priceController.stream;
  Stream<Map<String, dynamic>> get wsMessages => _wsMessageController.stream;
  bool get isWsConnected => _wsConnected;

  // ── Auth ──────────────────────────────────────────────────
  Future<Map<String, dynamic>> login(String email, String password) async {
    final res = await _dio.post('/api/auth/login', data: {'email': email, 'password': password});
    await _storage.write(key: 'jwt_token', value: res.data['token']);
    return res.data;
  }

  Future<Map<String, dynamic>> register(String email, String username, String password) async {
    final res = await _dio.post('/api/auth/register', data: {'email': email, 'username': username, 'password': password});
    await _storage.write(key: 'jwt_token', value: res.data['token']);
    return res.data;
  }

  Future<void> logout() async {
    await _storage.delete(key: 'jwt_token');
  }

  Future<bool> isLoggedIn() async {
    final token = await _storage.read(key: 'jwt_token');
    return token != null;
  }

  Future<Map<String, dynamic>?> getMe() async {
    try {
      final res = await _dio.get('/api/auth/me');
      return res.data;
    } catch (_) { return null; }
  }

  // ── Markets ───────────────────────────────────────────────
  Future<List<Market>> getMarkets() async {
    final res = await _dio.get('/api/markets');
    return (res.data as List).map((j) => Market.fromJson(j)).toList();
  }

  Future<List<Candle>> getCandles(String symbol, String interval, {int limit = 200}) async {
    final res = await _dio.get('/api/markets/$symbol/candles',
        queryParameters: {'interval': interval, 'limit': limit});
    return (res.data as List).map((j) => Candle.fromJson(j)).toList();
  }

  Future<OrderBook> getOrderBook(String symbol, {int depth = 20}) async {
    final res = await _dio.get('/api/markets/$symbol/orderbook',
        queryParameters: {'depth': depth});
    return OrderBook.fromJson(res.data);
  }

  Future<Map<String, dynamic>> getFundingRate(String symbol) async {
    final res = await _dio.get('/api/markets/$symbol/funding');
    return res.data;
  }

  // ── Account ───────────────────────────────────────────────
  Future<AccountBalance> getBalance(String address) async {
    final res = await _dio.get('/api/account/$address/balance');
    return AccountBalance.fromJson(res.data);
  }

  Future<List<Position>> getPositions(String address) async {
    final res = await _dio.get('/api/account/$address/positions');
    return (res.data as List).map((j) => Position.fromJson(j)).toList();
  }

  Future<List<Map<String, dynamic>>> getOrders(String address) async {
    final res = await _dio.get('/api/account/$address/orders');
    return List<Map<String, dynamic>>.from(res.data);
  }

  // ── Leaderboard ───────────────────────────────────────────
  Future<List<LeaderboardEntry>> getLeaderboard() async {
    final res = await _dio.get('/api/leaderboard');
    return (res.data as List).map((j) => LeaderboardEntry.fromJson(j)).toList();
  }

  // ── Pool ──────────────────────────────────────────────────
  Future<Map<String, dynamic>> getPoolStats() async {
    final res = await _dio.get('/api/pool/stats');
    return res.data;
  }

  // ── Revenue ───────────────────────────────────────────────
  Future<Map<String, dynamic>> getRevenue() async {
    final res = await _dio.get('/api/revenue');
    return res.data;
  }

  // ── WebSocket ─────────────────────────────────────────────
  void connectWs() {
    if (_wsConnected) return;
    try {
      _ws = WebSocketChannel.connect(Uri.parse(WikConst.wsUrl));
      _wsConnected = true;
      _ws!.sink.add(jsonEncode({
        'type': 'subscribe',
        'channels': ['ticker', 'positions', 'liquidations', 'funding'],
      }));
      _ws!.stream.listen(
        (raw) {
          try {
            final msg = jsonDecode(raw as String) as Map<String, dynamic>;
            if (msg['type'] == 'ticker') {
              final updates = <String, double>{};
              (msg['data'] as Map).forEach((k, v) {
                updates[k.toString()] = (v as num).toDouble();
              });
              if (!_priceController.isClosed) _priceController.add(updates);
            }
            if (!_wsMessageController.isClosed) _wsMessageController.add(msg);
          } catch (_) {}
        },
        onDone: () {
          _wsConnected = false;
          _scheduleReconnect();
        },
        onError: (_) {
          _wsConnected = false;
          _scheduleReconnect();
        },
      );
    } catch (_) {
      _wsConnected = false;
      _scheduleReconnect();
    }
  }

  void _scheduleReconnect() {
    _reconnectTimer?.cancel();
    _reconnectTimer = Timer(const Duration(seconds: 4), connectWs);
  }

  void dispose() {
    _ws?.sink.close();
    _reconnectTimer?.cancel();
    _priceController.close();
    _wsMessageController.close();
  }
}

final api = ApiService();

  // ── Trading Actions ───────────────────────────────────────
  Future<Map<String, dynamic>> placeOrder({
    required String walletAddress,
    required int    marketIndex,
    required bool   isLong,
    required double collateral,
    required int    leverage,
    double takeProfit = 0,
    double stopLoss   = 0,
  }) async {
    final resp = await _dio.post('/api/trade/order', data: {
      'wallet':      walletAddress,
      'marketIndex': marketIndex,
      'isLong':      isLong,
      'collateral':  collateral,
      'leverage':    leverage,
      'takeProfit':  takeProfit,
      'stopLoss':    stopLoss,
    });
    return resp.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> closePosition({
    required String walletAddress,
    required int    positionId,
  }) async {
    final resp = await _dio.post('/api/trade/close', data: {
      'wallet':     walletAddress,
      'positionId': positionId,
    });
    return resp.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> depositUSDC({
    required String walletAddress,
    required double amount,
  }) async {
    final resp = await _dio.post('/api/account/deposit', data: {
      'wallet': walletAddress,
      'amount': amount,
    });
    return resp.data as Map<String, dynamic>;
  }

  Future<Map<String, dynamic>> withdrawUSDC({
    required String walletAddress,
    required double amount,
  }) async {
    final resp = await _dio.post('/api/account/withdraw', data: {
      'wallet': walletAddress,
      'amount': amount,
    });
    return resp.data as Map<String, dynamic>;
  }
