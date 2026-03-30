import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';

/// Shown when user arrives via referral link or first opens app.
/// Maximises signup conversion — shows bonus, social proof, zero friction.

class ViralOnboardScreen extends ConsumerStatefulWidget {
  final String? referralCode;
  const ViralOnboardScreen({super.key, this.referralCode});
  @override
  ConsumerState<ViralOnboardScreen> createState() => _ViralOnboardState();
}

class _ViralOnboardState extends ConsumerState<ViralOnboardScreen>
    with TickerProviderStateMixin {
  late AnimationController _pulse;
  late AnimationController _slide;
  late Animation<double> _pulseAnim, _slideAnim;
  String? _referrerAddress;
  bool _loadingRef = false;

  @override
  void initState() {
    super.initState();
    _pulse = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    _slide = AnimationController(vsync: this, duration: const Duration(milliseconds: 800))..forward();
    _pulseAnim = Tween(begin: 0.95, end: 1.05).animate(CurvedAnimation(parent: _pulse, curve: Curves.easeInOut));
    _slideAnim = Tween(begin: 0.0,  end: 1.0).  animate(CurvedAnimation(parent: _slide, curve: Curves.easeOutCubic));
    if (widget.referralCode != null) _resolveReferral();
  }

  @override
  void dispose() { _pulse.dispose(); _slide.dispose(); super.dispose(); }

  Future<void> _resolveReferral() async {
    setState(() => _loadingRef = true);
    try {
      final r = await api._dio.get('/api/bonus/resolve/${widget.referralCode}');
      if (r.data['valid'] == true) setState(() => _referrerAddress = r.data['referrer']);
    } catch (_) {}
    setState(() => _loadingRef = false);
  }

  @override
  Widget build(BuildContext context) {
    final hasReferral = widget.referralCode != null;

    return Scaffold(
      backgroundColor: WikColor.bg0,
      body: SafeArea(
        child: FadeTransition(
          opacity: _slideAnim,
          child: SlideTransition(
            position: Tween<Offset>(begin: const Offset(0, 0.05), end: Offset.zero).animate(_slideAnim),
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(children: [
                const Spacer(),

                // Logo
                Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Container(
                    width: 52, height: 52,
                    decoration: BoxDecoration(color: WikColor.accent, borderRadius: BorderRadius.circular(16),
                        boxShadow: [BoxShadow(color: WikColor.accent.withOpacity(0.4), blurRadius: 20, spreadRadius: 3)]),
                    child: const Center(child: Text('W', style: TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.w900))),
                  ),
                  const SizedBox(width: 12),
                  const Text('Wikicious', style: TextStyle(color: WikColor.text1, fontSize: 26, fontWeight: FontWeight.w900)),
                ]),

                const SizedBox(height: 32),

                // Referral context banner
                if (hasReferral) _ReferralBanner(address: _referrerAddress, loading: _loadingRef),

                // Big bonus display
                ScaleTransition(
                  scale: _pulseAnim,
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 28),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: [WikColor.gold.withOpacity(0.15), WikColor.accent.withOpacity(0.1)],
                        begin: Alignment.topLeft, end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: WikColor.gold.withOpacity(0.4), width: 1.5),
                    ),
                    child: Column(children: [
                      const Text('🎁 Welcome Bonus', style: TextStyle(color: WikColor.gold, fontSize: 14, fontWeight: FontWeight.w700)),
                      const SizedBox(height: 8),
                      const Text('\$50', style: TextStyle(color: WikColor.text1, fontSize: 64, fontWeight: FontWeight.w900, fontFamily: 'SpaceMono', height: 1)),
                      const Text('FREE TRADING CREDIT', style: TextStyle(color: WikColor.text2, fontSize: 12, letterSpacing: 2)),
                      const SizedBox(height: 12),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                        decoration: BoxDecoration(color: WikColor.gold.withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
                        child: const Text('+ \$100 on first deposit • No withdrawal needed', style: TextStyle(color: WikColor.gold, fontSize: 11)),
                      ),
                    ]),
                  ),
                ),

                const SizedBox(height: 28),

                // Social proof
                const _SocialProof(),

                const SizedBox(height: 28),

                // Feature bullets
                const Column(children: [
                  _FeatureLine('📈', '125x leverage on BTC, ETH, and 15+ markets'),
                  _FeatureLine('🏆', 'Pass evaluation → get \$10K–\$200K funded account'),
                  _FeatureLine('🐦', 'Social feed — share trades, follow top traders'),
                  _FeatureLine('🔗', 'Refer friends — earn 10% of their fees forever'),
                ]),

                const Spacer(),

                // CTA buttons
                SizedBox(width: double.infinity, child: ElevatedButton(
                  onPressed: () => context.go('/wallet-setup?ref=${widget.referralCode ?? ''}'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: WikColor.accent,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Claim \$50 & Create Wallet', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                )),

                const SizedBox(height: 10),

                SizedBox(width: double.infinity, child: OutlinedButton(
                  onPressed: () => context.go('/wallet-setup?import=true&ref=${widget.referralCode ?? ''}'),
                  style: OutlinedButton.styleFrom(
                    side: const BorderSide(color: WikColor.border),
                    foregroundColor: WikColor.text2,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Import Existing Wallet', style: TextStyle(fontSize: 14)),
                )),

                const SizedBox(height: 12),
                const Text(
                  'No KYC • Non-custodial • Arbitrum L2 • Gas < \$0.01',
                  style: TextStyle(color: WikColor.text3, fontSize: 11),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
              ]),
            ),
          ),
        ),
      ),
    );
  }
}

class _ReferralBanner extends StatelessWidget {
  final String? address;
  final bool loading;
  const _ReferralBanner({this.address, required this.loading});
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 20),
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: WikColor.greenBg,
      borderRadius: BorderRadius.circular(10),
      border: Border.all(color: WikColor.green.withOpacity(0.4)),
    ),
    child: Row(children: [
      const Icon(Icons.people, color: WikColor.green, size: 18),
      const SizedBox(width: 8),
      Expanded(child: loading
        ? const Text('Verifying referral...', style: TextStyle(color: WikColor.text2, fontSize: 12))
        : address != null
          ? Text(
              'Invited by ${address!.substring(0, 6)}...${address!.substring(38)} — both of you get \$50!',
              style: const TextStyle(color: WikColor.green, fontSize: 12, fontWeight: FontWeight.w600),
            )
          : const Text('Referral link detected — sign up to claim your bonus', style: TextStyle(color: WikColor.green, fontSize: 12)),
      ),
    ]),
  );
}

class _SocialProof extends StatelessWidget {
  const _SocialProof();
  @override
  Widget build(BuildContext context) => Row(mainAxisAlignment: MainAxisAlignment.center, children: [
    // Stacked avatars
    SizedBox(
      width: 80,
      child: Stack(children: [
        _Avatar(0xFF6366f1, 0),
        _Avatar(0xFF10b981, 20),
        _Avatar(0xFFf59e0b, 40),
        _Avatar(0xFFef4444, 60),
      ]),
    ),
    const SizedBox(width: 10),
    const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text('12,400+ traders', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 13)),
      Text('joined this week', style: TextStyle(color: WikColor.text3, fontSize: 11)),
    ]),
  ]);
}

class _Avatar extends StatelessWidget {
  final int color;
  final double left;
  const _Avatar(this.color, this.left);
  @override
  Widget build(BuildContext context) => Positioned(
    left: left,
    child: CircleAvatar(
      radius: 14,
      backgroundColor: Color(0xFF000000 | color),
      child: const Icon(Icons.person, size: 14, color: Colors.white),
    ),
  );
}

class _FeatureLine extends StatelessWidget {
  final String emoji, text;
  const _FeatureLine(this.emoji, this.text);
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 8),
    child: Row(children: [
      Text(emoji, style: const TextStyle(fontSize: 16)),
      const SizedBox(width: 10),
      Text(text, style: const TextStyle(color: WikColor.text2, fontSize: 13)),
    ]),
  );
}
