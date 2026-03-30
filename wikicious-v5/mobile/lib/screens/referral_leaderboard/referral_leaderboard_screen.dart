import 'package:flutter/material.dart';

class ReferralLeaderboardScreen extends StatelessWidget {
  const ReferralLeaderboardScreen({super.key});

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
            decoration: BoxDecoration(color: const Color(0xFFFFB020).withOpacity(.18),
              borderRadius: BorderRadius.circular(9),
              border: Border.all(color: const Color(0xFFFFB020).withOpacity(.3))),
            child: const Center(child: Text('🏅', style: TextStyle(fontSize: 15)))),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: const [
            Text('Affiliate Leaderboard', style: TextStyle(fontFamily: 'Syne', fontSize: 14,
              fontWeight: FontWeight.w800, color: Color(0xFFE8F4FF))),
            Text('Monthly contest · $4,000 prize pool · On-chain prizes', style: TextStyle(fontSize: 10, color: Color(0xFF4E6E90))),
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
                border: Border.all(color: const Color(0xFFFFB020).withOpacity(.2)),
              ),
              child: Column(children: [
          _row('1st place prize', '$2,000 USDC', const Color(0xFFFFB020)),
          _row('2nd place prize', '$1,000 USDC', const Color(0xFFFFB020)),
          _row('3rd place prize', '$500 USDC', const Color(0xFFFFB020)),
          _row('4th-10th place', 'Share $500', const Color(0xFFFFB020)),
          _row('Score formula', '60% vol + 25% traders + 15% retention', const Color(0xFFFFB020)),
          _row('Your rank this month', '#23', const Color(0xFFFFB020)),
              ]),
            ),
            const SizedBox(height: 16),

            // CTA
            SizedBox(width: double.infinity,
              child: ElevatedButton(
                onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Connect wallet to continue'))),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFFFB020),
                  padding: const EdgeInsets.symmetric(vertical: 15),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
                ),
                child: Text('Claim Prize',
                  style: TextStyle(fontFamily: 'Syne', fontSize: 14, fontWeight: FontWeight.w800,
                    color: "#000")),
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
