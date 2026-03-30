import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../theme.dart';
import '../../services/wallet_service.dart';

class WalletSetupScreen extends ConsumerStatefulWidget {
  const WalletSetupScreen({super.key});
  @override
  ConsumerState<WalletSetupScreen> createState() => _WalletSetupScreenState();
}

class _WalletSetupScreenState extends ConsumerState<WalletSetupScreen> {
  int _step = 0; // 0=choice, 1=import, 2=create
  final _mnemonicCtrl = TextEditingController();
  String? _error;
  bool _loading = false;

  @override
  void dispose() { _mnemonicCtrl.dispose(); super.dispose(); }

  Future<void> _importWallet() async {
    setState(() { _loading = true; _error = null; });
    try {
      final svc = WalletService();
      await svc.importFromMnemonic(_mnemonicCtrl.text.trim());
      if (mounted) context.go('/feed');
    } catch (e) {
      setState(() { _error = 'Invalid recovery phrase. Check and try again.'; });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _createWallet() async {
    setState(() { _loading = true; _error = null; });
    try {
      final svc = WalletService();
      final mnemonic = await svc.generateMnemonic();
      if (mounted) {
        _showMnemonicDialog(mnemonic);
      }
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showMnemonicDialog(String mnemonic) {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (_) => AlertDialog(
        backgroundColor: WikColor.bg1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16), side: const BorderSide(color: WikColor.border)),
        title: const Text('Save Your Recovery Phrase', style: TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(10), border: Border.all(color: WikColor.gold.withOpacity(0.3))),
              child: Text(mnemonic, style: const TextStyle(color: WikColor.gold, fontFamily: 'SpaceMono', fontSize: 13, height: 1.8)),
            ),
            const SizedBox(height: 12),
            const Text('Write this down. Anyone with these words can access your wallet.', style: TextStyle(color: WikColor.red, fontSize: 12), textAlign: TextAlign.center),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () { Clipboard.setData(ClipboardData(text: mnemonic)); ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Copied to clipboard'))); },
            child: const Text('Copy', style: TextStyle(color: WikColor.text2)),
          ),
          ElevatedButton(
            onPressed: () { Navigator.pop(context); context.go('/feed'); },
            child: const Text("I've Saved It"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: WikColor.bg0,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: _step == 0 ? _buildChoice() : _step == 1 ? _buildImport() : _buildCreate(),
        ),
      ),
    );
  }

  Widget _buildChoice() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      const SizedBox(height: 40),
      const Text('Set Up Wallet', style: TextStyle(color: WikColor.text1, fontSize: 28, fontWeight: FontWeight.w900)),
      const SizedBox(height: 8),
      const Text('Import an existing wallet or create a new one.', style: TextStyle(color: WikColor.text2, fontSize: 14)),
      const SizedBox(height: 48),
      _OptionCard(
        icon: Icons.download_rounded,
        title: 'Import Wallet',
        subtitle: 'Use your 12 or 24-word recovery phrase',
        color: WikColor.accent,
        onTap: () => setState(() => _step = 1),
      ),
      const SizedBox(height: 14),
      _OptionCard(
        icon: Icons.add_circle_outline_rounded,
        title: 'Create New Wallet',
        subtitle: 'Generate a fresh wallet on Arbitrum',
        color: WikColor.green,
        onTap: () => setState(() => _step = 2),
      ),
      const Spacer(),
      TextButton(
        onPressed: () => context.pop(),
        child: const Text('← Back', style: TextStyle(color: WikColor.text3)),
      ),
    ],
  );

  Widget _buildImport() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      IconButton(icon: const Icon(Icons.arrow_back, color: WikColor.text2), onPressed: () => setState(() => _step = 0)),
      const SizedBox(height: 16),
      const Text('Import Wallet', style: TextStyle(color: WikColor.text1, fontSize: 24, fontWeight: FontWeight.w700)),
      const SizedBox(height: 24),
      TextField(
        controller: _mnemonicCtrl,
        maxLines: 4,
        style: const TextStyle(color: WikColor.text1, fontFamily: 'SpaceMono', fontSize: 13),
        decoration: const InputDecoration(hintText: 'Enter your 12 or 24 word recovery phrase...'),
      ),
      if (_error != null) ...[
        const SizedBox(height: 8),
        Text(_error!, style: const TextStyle(color: WikColor.red, fontSize: 12)),
      ],
      const SizedBox(height: 24),
      SizedBox(width: double.infinity,
        child: ElevatedButton(
          onPressed: _loading ? null : _importWallet,
          child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Import Wallet'),
        ),
      ),
    ],
  );

  Widget _buildCreate() => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      IconButton(icon: const Icon(Icons.arrow_back, color: WikColor.text2), onPressed: () => setState(() => _step = 0)),
      const SizedBox(height: 16),
      const Text('Create Wallet', style: TextStyle(color: WikColor.text1, fontSize: 24, fontWeight: FontWeight.w700)),
      const SizedBox(height: 12),
      const Text('A new wallet will be generated. Make sure to save your recovery phrase.', style: TextStyle(color: WikColor.text2, fontSize: 14, height: 1.6)),
      const SizedBox(height: 32),
      Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(color: WikColor.bg2, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.gold.withOpacity(0.3))),
        child: Row(children: [
          const Icon(Icons.warning_amber_rounded, color: WikColor.gold, size: 20),
          const SizedBox(width: 10),
          const Expanded(child: Text('Never share your recovery phrase with anyone.', style: TextStyle(color: WikColor.gold, fontSize: 12))),
        ]),
      ),
      const SizedBox(height: 24),
      SizedBox(width: double.infinity,
        child: ElevatedButton(
          onPressed: _loading ? null : _createWallet,
          style: ElevatedButton.styleFrom(backgroundColor: WikColor.green),
          child: _loading ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Generate Wallet'),
        ),
      ),
    ],
  );
}

class _OptionCard extends StatelessWidget {
  final IconData icon;
  final String title, subtitle;
  final Color color;
  final VoidCallback onTap;
  const _OptionCard({required this.icon, required this.title, required this.subtitle, required this.color, required this.onTap});

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: WikColor.bg1,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: WikColor.border),
      ),
      child: Row(children: [
        Container(
          width: 48, height: 48,
          decoration: BoxDecoration(color: color.withOpacity(0.15), shape: BoxShape.circle),
          child: Icon(icon, color: color, size: 24),
        ),
        const SizedBox(width: 16),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: const TextStyle(color: WikColor.text1, fontWeight: FontWeight.w700, fontSize: 16)),
          const SizedBox(height: 2),
          Text(subtitle, style: const TextStyle(color: WikColor.text2, fontSize: 13)),
        ])),
        Icon(Icons.arrow_forward_ios, color: WikColor.text3, size: 14),
      ]),
    ),
  );
}
