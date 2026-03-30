import 'package:flutter/material.dart';
import '../../theme.dart';

class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  final String? sub;
  const StatTile({super.key, required this.label, required this.value, this.valueColor, this.sub});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(color: WikColor.bg1, borderRadius: BorderRadius.circular(12), border: Border.all(color: WikColor.border)),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label.toUpperCase(), style: WikText.label()),
        const SizedBox(height: 6),
        Text(value, style: WikText.price(size: 18, color: valueColor ?? WikColor.accent)),
        if (sub != null) ...[
          const SizedBox(height: 2),
          Text(sub!, style: const TextStyle(color: WikColor.text3, fontSize: 11)),
        ],
      ]),
    );
  }
}
