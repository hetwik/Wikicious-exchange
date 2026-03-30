import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

// ── Brand Colors ──────────────────────────────────────────────
class WikColor {
  WikColor._();

  static const bg0    = Color(0xFF08090D); // deepest background
  static const bg1    = Color(0xFF0D0F17); // card background
  static const bg2    = Color(0xFF12151F); // input background
  static const bg3    = Color(0xFF181C28); // elevated card
  static const bg4    = Color(0xFF1E2330); // selected/hover
  static const border = Color(0xFF222840); // dividers/borders

  static const text1  = Color(0xFFE8EAF0); // primary text
  static const text2  = Color(0xFF8A90A8); // secondary text
  static const text3  = Color(0xFF555C78); // muted text

  static const green  = Color(0xFF00D4A0); // long / profit
  static const red    = Color(0xFFFF4F6B); // short / loss
  static const accent = Color(0xFF5B7FFF); // brand blue
  static const gold   = Color(0xFFF5C842); // gold / warning

  static const greenBg = Color(0x1A00D4A0);
  static const redBg   = Color(0x1AFF4F6B);
  static const accentBg= Color(0x1A5B7FFF);
}

// ── Theme ─────────────────────────────────────────────────────
ThemeData wikTheme() {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.dark,
    scaffoldBackgroundColor: WikColor.bg0,
    colorScheme: const ColorScheme.dark(
      primary:   WikColor.accent,
      secondary: WikColor.green,
      surface:   WikColor.bg1,
      error:     WikColor.red,
    ),
    textTheme: GoogleFonts.dmSansTextTheme(ThemeData.dark().textTheme).copyWith(
      displayLarge:  const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700),
      bodyLarge:     const TextStyle(color: WikColor.text1),
      bodyMedium:    const TextStyle(color: WikColor.text2),
      bodySmall:     const TextStyle(color: WikColor.text3),
    ),
    appBarTheme: const AppBarTheme(
      backgroundColor: WikColor.bg1,
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      centerTitle: false,
      titleTextStyle: TextStyle(
        color: WikColor.text1, fontSize: 16, fontWeight: FontWeight.w700,
        letterSpacing: 0.5,
      ),
      iconTheme: IconThemeData(color: WikColor.text2),
    ),
    bottomNavigationBarTheme: const BottomNavigationBarThemeData(
      backgroundColor: WikColor.bg1,
      selectedItemColor: WikColor.accent,
      unselectedItemColor: WikColor.text3,
      elevation: 0,
      type: BottomNavigationBarType.fixed,
    ),
    cardTheme: CardTheme(
      color: WikColor.bg1,
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: const BorderSide(color: WikColor.border, width: 1),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: WikColor.bg2,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: WikColor.border),
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: WikColor.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: WikColor.accent, width: 1.5),
      ),
      hintStyle: const TextStyle(color: WikColor.text3, fontSize: 14),
      labelStyle: const TextStyle(color: WikColor.text3),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: WikColor.accent,
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.w700),
      ),
    ),
    dividerTheme: const DividerThemeData(color: WikColor.border, thickness: 1),
    pageTransitionsTheme: const PageTransitionsTheme(builders: {
      TargetPlatform.android: CupertinoPageTransitionsBuilder(),
      TargetPlatform.iOS:     CupertinoPageTransitionsBuilder(),
    }),
  );
}

// ── Text Styles ───────────────────────────────────────────────
class WikText {
  WikText._();
  static const mono = TextStyle(fontFamily: 'SpaceMono');
  static const monoBold = TextStyle(fontFamily: 'SpaceMono', fontWeight: FontWeight.w700);

  static TextStyle price({double size = 16, Color? color}) =>
      TextStyle(fontFamily: 'SpaceMono', fontSize: size, fontWeight: FontWeight.w700,
          color: color ?? WikColor.text1);

  static TextStyle label({double size = 11, Color? color}) =>
      TextStyle(fontSize: size, fontWeight: FontWeight.w600,
          color: color ?? WikColor.text3, letterSpacing: 0.5);
}

// ── Constants ─────────────────────────────────────────────────
class WikConst {
  WikConst._();
  static const apiUrl = String.fromEnvironment('API_URL', defaultValue: 'https://api.wikicious.io');
  static const wsUrl  = String.fromEnvironment('WS_URL',  defaultValue: 'wss://api.wikicious.io/ws');
  static const chainId = 42161; // Arbitrum

  static const List<String> popularSymbols = [
    'BTCUSDT','ETHUSDT','ARBUSDT','OPUSDT','SOLUSDT',
    'BNBUSDT','ADAUSDT','XRPUSDT','DOGEUSDT','AVAXUSDT',
    'LINKUSDT','MATICUSDT','DOTUSDT','UNIUSDT','GMXUSDT',
  ];

  static const List<int> leverages = [2, 5, 10, 20, 50, 75, 100, 125];
}
