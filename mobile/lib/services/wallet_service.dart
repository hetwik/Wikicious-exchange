import 'dart:convert';
import 'dart:typed_data';
import 'package:bip39/bip39.dart' as bip39;
import 'package:bip32/bip32.dart' as bip32;
import 'package:web3dart/web3dart.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:local_auth/local_auth.dart';
import 'package:hex/hex.dart';

class WalletService {
  static const _storage = FlutterSecureStorage(
    aOptions: AndroidOptions(encryptedSharedPreferences: true),
    iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
  );
  static final _auth = LocalAuthentication();

  // ── Key generation ────────────────────────────────────────
  static String generateMnemonic() => bip39.generateMnemonic(strength: 256);

  static bool validateMnemonic(String mnemonic) => bip39.validateMnemonic(mnemonic);

  static Future<EthPrivateKey> mnemonicToPrivateKey(String mnemonic, {int index = 0}) async {
    final seed = bip39.mnemonicToSeed(mnemonic);
    final root = bip32.BIP32.fromSeed(seed);
    // Derivation path: m/44'/60'/0'/0/{index}
    final child = root.derivePath("m/44'/60'/0'/0/$index");
    final privateKeyBytes = child.privateKey!;
    return EthPrivateKey.fromHex(HEX.encode(privateKeyBytes));
  }

  static EthereumAddress privateKeyToAddress(EthPrivateKey key) => key.address;

  // ── Storage ───────────────────────────────────────────────
  static Future<void> saveWallet(String mnemonic, String address) async {
    await _storage.write(key: 'wallet_mnemonic', value: mnemonic);
    await _storage.write(key: 'wallet_address', value: address);
  }

  static Future<String?> getSavedMnemonic() async =>
      _storage.read(key: 'wallet_mnemonic');

  static Future<String?> getSavedAddress() async =>
      _storage.read(key: 'wallet_address');

  static Future<bool> hasWallet() async =>
      (await _storage.read(key: 'wallet_address')) != null;

  static Future<void> deleteWallet() async {
    await _storage.delete(key: 'wallet_mnemonic');
    await _storage.delete(key: 'wallet_address');
    await _storage.delete(key: 'wallet_pk_cache');
  }

  // ── Biometric auth ────────────────────────────────────────
  static Future<bool> canUseBiometrics() async {
    try {
      return await _auth.canCheckBiometrics && await _auth.isDeviceSupported();
    } catch (_) { return false; }
  }

  static Future<bool> authenticateWithBiometrics(String reason) async {
    try {
      return await _auth.authenticate(
        localizedReason: reason,
        options: const AuthenticationOptions(
          biometricOnly: false,
          stickyAuth: true,
        ),
      );
    } catch (_) { return false; }
  }

  // ── Signing ───────────────────────────────────────────────
  static Future<EthPrivateKey?> getPrivateKey({bool requireBiometrics = true}) async {
    if (requireBiometrics) {
      final ok = await authenticateWithBiometrics('Authenticate to sign transaction');
      if (!ok) return null;
    }
    final mnemonic = await getSavedMnemonic();
    if (mnemonic == null) return null;
    return mnemonicToPrivateKey(mnemonic);
  }

  static Future<String?> signMessage(String message, {bool requireBiometrics = true}) async {
    final key = await getPrivateKey(requireBiometrics: requireBiometrics);
    if (key == null) return null;
    final msgBytes = utf8.encode(message);
    final signed = await key.signPersonalMessage(Uint8List.fromList(msgBytes));
    return '0x${HEX.encode(signed)}';
  }

  // ── Address formatting ────────────────────────────────────
  static String shortAddress(String address) {
    if (address.length < 10) return address;
    return '${address.substring(0, 6)}...${address.substring(address.length - 4)}';
  }

  static String checksumAddress(String address) {
    try {
      return EthereumAddress.fromHex(address).hexEip55;
    } catch (_) { return address; }
  }
}
