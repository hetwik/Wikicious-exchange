import 'package:flutter/material.dart';

class DarkPoolScreen extends StatelessWidget {
  const DarkPoolScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF030810),
      appBar: AppBar(
        backgroundColor: const Color(0xFF060C18),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Color(0xFFE8F4FF), size: 18),
          onPressed: () => Navigator.pop(context),
        ),
        title: Row(children: [
          Container(width: 32, height: 32,
            decoration: BoxDecoration(color: const Color(0xFF7C4FFF).withOpacity(.18),
              borderRadius: BorderRadius.circular(9),
              border: Border.all(color: const Color(0xFF7C4FFF).withOpacity(.3))),
            child: const Center(child: Text('🌑', style: TextStyle(fontSize: 15)))),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
            Text('Dark Pool', style: TextStyle(fontFamily: 'Syne', fontSize: 14,
              fontWeight: FontWeight.w800, color: Color(0xFFE8F4FF))),
            Text('Commit-reveal · $50K min · 0.15% fee', style: TextStyle(fontSize: 10, color: Color(0xFF4E6E90))),
          ]),
        ]),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Stats card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF0B1525),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFF7C4FFF).withOpacity(.2)),
              ),
              child: Column(children: [
          _row('Minimum order', '$50,000 USDC', const Color(0xFF7C4FFF)),
          _row('Taker fee', '0.15%', const Color(0xFF7C4FFF)),
          _row('Maker rebate', '0.02%', const Color(0xFF7C4FFF)),
          _row('Phase 1 — Commit', 'Submit order hash', const Color(0xFF7C4FFF)),
          _row('Phase 2 — Reveal', 'Within 10 blocks', const Color(0xFF7C4FFF)),
          _row('Phase 3 — Match', 'Midpoint price', const Color(0xFF7C4FFF)),
              ]),
            ),
            const SizedBox(height: 16),

            // CTA
            SizedBox(width: double.infinity,
              child: ElevatedButton(
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Connect wallet to continue'))),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C4FFF),
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
                ),
                child: Text('Place Dark Order',
                  style: TextStyle(fontFamily: 'Syne', fontSize: 14, fontWeight: FontWeight.w800,
                    color: "Colors.white")),
              ),
            ),
          ]),
        ),
      ),
    );
  }

  Widget _row(String k, String v, Color c) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 6),
    child: Row(children: [
      Expanded(child: Text(k, style: const TextStyle(fontSize: 12, color: Color(0xFF4E6E90)))),
      Text(v, style: TextStyle(fontSize: 12, fontFamily: 'JetBrainsMono',
        fontWeight: FontWeight.w600, color: c)),
    ]),
  );
}
