import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../providers/providers.dart';
import '../../services/wallet_service.dart';

// ── Onboard Screen ────────────────────────────────────────────
class OnboardScreen extends ConsumerWidget {
  const OnboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      backgroundColor: WikColor.bg0,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(children: [
            const Spacer(),
            // Logo
            Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                color: WikColor.accent,
                borderRadius: BorderRadius.circular(24),
                boxShadow: [BoxShadow(color: WikColor.accent.withOpacity(0.4), blurRadius: 30, spreadRadius: 5)],
              ),
              child: const Center(child: Text('W', style: TextStyle(color: Colors.white, fontSize: 42, fontWeight: FontWeight.w900))),
            ),
            const SizedBox(height: 24),
            const Text('Wikicious', style: TextStyle(color: WikColor.text1, fontSize: 32, fontWeight: FontWeight.w900)),
            const SizedBox(height: 10),
            const Text(
              'Trade perpetuals. Share trades.\nEarn WIK. All on-chain.',
              textAlign: TextAlign.center,
              style: TextStyle(color: WikColor.text2, fontSize: 16, height: 1.5),
            ),
            const SizedBox(height: 48),
            // Feature pills
            Wrap(spacing: 8, runSpacing: 8, alignment: WrapAlignment.center, children: [
              _Pill('📈 125x Leverage',    WikColor.accentBg, WikColor.accent),
              _Pill('🐦 Social feed',       WikColor.greenBg,  WikColor.green),
              _Pill('🪙 Earn WIK rewards',  WikColor.bg3,      WikColor.gold),
              _Pill('🔒 Non-custodial',     WikColor.redBg,    WikColor.red),
              _Pill('⚡ Arbitrum L2',       WikColor.bg3,      WikColor.text2),
            ]),
            const Spacer(),
            // Buttons
            SizedBox(width: double.infinity,
              child: ElevatedButton(
                onPressed: () => context.go('/wallet-setup'),
                child: const Text('Create Wallet', style: TextStyle(fontSize: 16)),
              ),
            ),
            const SizedBox(height: 12),
            SizedBox(width: double.infinity,
              child: OutlinedButton(
                onPressed: () => context.go('/wallet-setup?import=true'),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: WikColor.border),
                  foregroundColor: WikColor.text1,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
                child: const Text('Import Existing Wallet', style: TextStyle(fontSize: 16)),
              ),
            ),
            const SizedBox(height: 20),
            const Text('Your keys. Your coins. No account needed.',
                style: TextStyle(color: WikColor.text3, fontSize: 12)),
          ]),
        ),
      ),
    );
  }
}

class _Pill extends StatelessWidget {
  final String text;
  final Color bg, fg;
  const _Pill(this.text, this.bg, this.fg);
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
    decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
    child: Text(text, style: TextStyle(color: fg, fontSize: 12, fontWeight: FontWeight.w600)),
  );
}

// ── Wallet Setup Screen ───────────────────────────────────────
class WalletSetupScreen extends ConsumerStatefulWidget {
  const WalletSetupScreen({super.key});
  @override
  ConsumerState<WalletSetupScreen> createState() => _WalletSetupState();
}

class _WalletSetupState extends ConsumerState<WalletSetupScreen> {
  final _importCtrl = TextEditingController();
  String? _mnemonic;
  String? _address;
  bool    _isImport  = false;
  bool    _revealed  = false;
  bool    _confirmed = false;
  bool    _loading   = false;

  @override
  void initState() {
    super.initState();
    final uri    = GoRouterState.of(context).uri;
    _isImport    = uri.queryParameters['import'] == 'true';
    if (!_isImport) _generateWallet();
  }

  Future<void> _generateWallet() async {
    setState(() => _loading = true);
    final mnemonic = WalletService.generateMnemonic();
    final key      = await WalletService.mnemonicToPrivateKey(mnemonic);
    final address  = WalletService.privateKeyToAddress(key).hexEip55;
    setState(() { _mnemonic = mnemonic; _address = address; _loading = false; });
  }

  Future<void> _save() async {
    if (_mnemonic == null) return;
    await WalletService.saveWallet(_mnemonic!, _address!);
    await ref.read(authProvider.notifier).createWallet();
    if (mounted) context.go('/feed');
  }

  Future<void> _import() async {
    final m = _importCtrl.text.trim();
    setState(() => _loading = true);
    final ok = await ref.read(authProvider.notifier).importWallet(m);
    setState(() => _loading = false);
    if (ok && mounted) context.go('/feed');
    else if (mounted) ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Invalid seed phrase'), backgroundColor: WikColor.red),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isImport) return _buildImport();
    if (_loading)  return const Scaffold(
      backgroundColor: WikColor.bg0,
      body: Center(child: CircularProgressIndicator(color: WikColor.accent)),
    );
    return _buildCreate();
  }

  Widget _buildCreate() => Scaffold(
    backgroundColor: WikColor.bg0,
    appBar: AppBar(backgroundColor: WikColor.bg0, title: const Text('New Wallet')),
    body: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Your Secret Recovery Phrase',
            style: TextStyle(color: WikColor.text1, fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Write these 24 words down and store them safely. Never share them with anyone.',
            style: TextStyle(color: WikColor.text2, fontSize: 14, height: 1.5)),
        const SizedBox(height: 20),
        // Seed phrase grid
        GestureDetector(
          onTap: () => setState(() => _revealed = !_revealed),
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: WikColor.bg2,
              borderRadius: BorderRadius.circular(12),
              border: const Border.fromBorderSide(BorderSide(color: WikColor.border)),
            ),
            child: _revealed
                ? _SeedGrid(mnemonic: _mnemonic ?? '')
                : const Column(children: [
                    Icon(Icons.visibility_off, color: WikColor.text3, size: 40),
                    SizedBox(height: 8),
                    Text('Tap to reveal', style: TextStyle(color: WikColor.text3)),
                  ]),
          ),
        ),
        const SizedBox(height: 16),
        if (_revealed)
          Row(children: [
            IconButton(
              icon: const Icon(Icons.copy, color: WikColor.accent),
              onPressed: () => Clipboard.setData(ClipboardData(text: _mnemonic ?? '')),
            ),
            const Text('Copy to clipboard', style: TextStyle(color: WikColor.accent)),
          ]),
        const Spacer(),
        Row(children: [
          Checkbox(
            value: _confirmed,
            onChanged: (v) => setState(() => _confirmed = v!),
            activeColor: WikColor.accent,
          ),
          const Expanded(
            child: Text('I have written down my seed phrase and stored it safely',
                style: TextStyle(color: WikColor.text2, fontSize: 13)),
          ),
        ]),
        const SizedBox(height: 12),
        SizedBox(width: double.infinity,
          child: ElevatedButton(
            onPressed: _revealed && _confirmed ? _save : null,
            child: const Text('Continue'),
          ),
        ),
      ]),
    ),
  );

  Widget _buildImport() => Scaffold(
    backgroundColor: WikColor.bg0,
    appBar: AppBar(backgroundColor: WikColor.bg0, title: const Text('Import Wallet')),
    body: Padding(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        const Text('Enter Recovery Phrase',
            style: TextStyle(color: WikColor.text1, fontSize: 18, fontWeight: FontWeight.w700)),
        const SizedBox(height: 8),
        const Text('Enter your 12 or 24-word seed phrase separated by spaces.',
            style: TextStyle(color: WikColor.text2, fontSize: 14)),
        const SizedBox(height: 20),
        TextField(
          controller: _importCtrl,
          maxLines: 5,
          obscureText: true,
          decoration: const InputDecoration(hintText: 'word1 word2 word3...'),
        ),
        const Spacer(),
        SizedBox(width: double.infinity,
          child: ElevatedButton(
            onPressed: _loading ? null : _import,
            child: _loading
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                : const Text('Import Wallet'),
          ),
        ),
      ]),
    ),
  );
}

class _SeedGrid extends StatelessWidget {
  final String mnemonic;
  const _SeedGrid({required this.mnemonic});
  @override
  Widget build(BuildContext context) {
    final words = mnemonic.split(' ');
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3, childAspectRatio: 2.8, crossAxisSpacing: 8, mainAxisSpacing: 8),
      itemCount: words.length,
      itemBuilder: (_, i) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(color: WikColor.bg3, borderRadius: BorderRadius.circular(6)),
        child: Row(children: [
          Text('${i+1}', style: WikText.label(size: 10)),
          const SizedBox(width: 4),
          Text(words[i], style: const TextStyle(color: WikColor.text1, fontSize: 12, fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }
}
