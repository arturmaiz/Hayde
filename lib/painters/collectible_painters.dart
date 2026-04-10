import 'dart:math';
import 'dart:ui';
import 'package:flambe/game/config.dart';

class CollectiblePainters {
  static void paint(Canvas canvas, IngredientType type, double s, double time) {
    // Glow circle behind
    final glowPaint = Paint()
      ..color = const Color(0x18FFEB3B)
      ..maskFilter = const MaskFilter.blur(BlurStyle.normal, 8);
    canvas.drawCircle(Offset(s / 2, s / 2), s * 0.45, glowPaint);

    switch (type) {
      case IngredientType.pepper:
        _paintPepper(canvas, s);
      case IngredientType.garlic:
        _paintGarlic(canvas, s);
      case IngredientType.butter:
        _paintButter(canvas, s);
      case IngredientType.herbs:
        _paintHerbs(canvas, s);
      case IngredientType.tomato:
        _paintTomato(canvas, s);
      case IngredientType.egg:
        _paintEgg(canvas, s);
      case IngredientType.mushroom:
        _paintMushroom(canvas, s);
      case IngredientType.lemon:
        _paintLemon(canvas, s);
    }

    // Sparkle dots
    final sparklePaint = Paint()..color = const Color(0x88FFFFFF);
    final angle = time * 3;
    for (var i = 0; i < 3; i++) {
      final a = angle + i * (2 * pi / 3);
      final sx = s / 2 + cos(a) * s * 0.42;
      final sy = s / 2 + sin(a) * s * 0.42;
      canvas.drawCircle(Offset(sx, sy), 1.5, sparklePaint);
    }
  }

  static void _paintPepper(Canvas canvas, double s) {
    final body = Paint()..color = GameConfig.pepperRed;
    final stem = Paint()..color = GameConfig.pepperGreen;
    // Stem
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(s * 0.4, s * 0.05, s * 0.15, s * 0.2),
        const Radius.circular(3),
      ),
      stem,
    );
    // Body
    final path = Path()
      ..moveTo(s * 0.3, s * 0.22)
      ..quadraticBezierTo(s * 0.1, s * 0.5, s * 0.35, s * 0.9)
      ..quadraticBezierTo(s * 0.5, s * 0.95, s * 0.65, s * 0.9)
      ..quadraticBezierTo(s * 0.9, s * 0.5, s * 0.7, s * 0.22)
      ..close();
    canvas.drawPath(path, body);
    // Highlight
    canvas.drawOval(
      Rect.fromLTWH(s * 0.35, s * 0.3, s * 0.12, s * 0.2),
      Paint()..color = const Color(0x33FFFFFF),
    );
  }

  static void _paintGarlic(Canvas canvas, double s) {
    final body = Paint()..color = GameConfig.garlicWhite;
    final lines = Paint()
      ..color = const Color(0xFFCCCCCC)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1;
    // Bulb
    canvas.drawOval(
      Rect.fromLTWH(s * 0.15, s * 0.25, s * 0.7, s * 0.65),
      body,
    );
    // Tip
    final tip = Path()
      ..moveTo(s * 0.35, s * 0.28)
      ..lineTo(s * 0.5, s * 0.08)
      ..lineTo(s * 0.65, s * 0.28);
    canvas.drawPath(tip, Paint()..color = GameConfig.garlicTip);
    // Clove lines
    canvas.drawLine(Offset(s * 0.5, s * 0.28), Offset(s * 0.5, s * 0.85), lines);
    canvas.drawLine(Offset(s * 0.35, s * 0.35), Offset(s * 0.3, s * 0.8), lines);
    canvas.drawLine(Offset(s * 0.65, s * 0.35), Offset(s * 0.7, s * 0.8), lines);
  }

  static void _paintButter(Canvas canvas, double s) {
    // Foil wrapper top
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(s * 0.1, s * 0.2, s * 0.8, s * 0.3),
        const Radius.circular(2),
      ),
      Paint()..color = GameConfig.butterFoil,
    );
    // Butter block
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(s * 0.1, s * 0.45, s * 0.8, s * 0.35),
        const Radius.circular(3),
      ),
      Paint()..color = GameConfig.butterYellow,
    );
    // Highlight
    canvas.drawRect(
      Rect.fromLTWH(s * 0.15, s * 0.48, s * 0.3, s * 0.08),
      Paint()..color = const Color(0x33FFFFFF),
    );
  }

  static void _paintHerbs(Canvas canvas, double s) {
    final green = Paint()..color = GameConfig.herbGreen;
    final darkGreen = Paint()..color = const Color(0xFF388E3C);
    // Cluster of leaves
    for (var i = 0; i < 5; i++) {
      final angle = -0.5 + i * 0.3;
      canvas.save();
      canvas.translate(s * 0.5, s * 0.7);
      canvas.rotate(angle);
      canvas.drawOval(
        Rect.fromLTWH(-s * 0.08, -s * 0.4, s * 0.16, s * 0.35),
        i % 2 == 0 ? green : darkGreen,
      );
      canvas.restore();
    }
    // Stem bundle
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(s * 0.42, s * 0.65, s * 0.16, s * 0.25),
        const Radius.circular(3),
      ),
      Paint()..color = const Color(0xFF2E7D32),
    );
  }

  static void _paintTomato(Canvas canvas, double s) {
    final body = Paint()..color = GameConfig.tomatoRed;
    // Body
    canvas.drawOval(
      Rect.fromLTWH(s * 0.12, s * 0.2, s * 0.76, s * 0.7),
      body,
    );
    // Highlight
    canvas.drawOval(
      Rect.fromLTWH(s * 0.2, s * 0.28, s * 0.2, s * 0.15),
      Paint()..color = const Color(0x33FFFFFF),
    );
    // Stem star
    final stem = Paint()..color = GameConfig.pepperGreen;
    for (var i = 0; i < 5; i++) {
      canvas.save();
      canvas.translate(s * 0.5, s * 0.22);
      canvas.rotate(i * pi / 2.5);
      canvas.drawOval(
        Rect.fromLTWH(-3, -8, 6, 10),
        stem,
      );
      canvas.restore();
    }
  }

  static void _paintEgg(Canvas canvas, double s) {
    // Egg shape (oval, narrower at top)
    final path = Path()
      ..moveTo(s * 0.5, s * 0.1)
      ..quadraticBezierTo(s * 0.85, s * 0.35, s * 0.8, s * 0.65)
      ..quadraticBezierTo(s * 0.75, s * 0.9, s * 0.5, s * 0.92)
      ..quadraticBezierTo(s * 0.25, s * 0.9, s * 0.2, s * 0.65)
      ..quadraticBezierTo(s * 0.15, s * 0.35, s * 0.5, s * 0.1)
      ..close();
    canvas.drawPath(path, Paint()..color = GameConfig.eggWhite);
    // Shadow
    canvas.drawOval(
      Rect.fromLTWH(s * 0.55, s * 0.5, s * 0.15, s * 0.25),
      Paint()..color = const Color(0x11000000),
    );
  }

  static void _paintMushroom(Canvas canvas, double s) {
    // Stem
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(s * 0.35, s * 0.5, s * 0.3, s * 0.4),
        const Radius.circular(4),
      ),
      Paint()..color = GameConfig.eggWhite,
    );
    // Cap
    final capPath = Path()
      ..moveTo(s * 0.1, s * 0.55)
      ..quadraticBezierTo(s * 0.1, s * 0.1, s * 0.5, s * 0.1)
      ..quadraticBezierTo(s * 0.9, s * 0.1, s * 0.9, s * 0.55)
      ..close();
    canvas.drawPath(capPath, Paint()..color = GameConfig.mushroomCap);
    // Cap spots
    canvas.drawCircle(Offset(s * 0.4, s * 0.3), 4, Paint()..color = GameConfig.mushroomBrown);
    canvas.drawCircle(Offset(s * 0.6, s * 0.25), 3, Paint()..color = GameConfig.mushroomBrown);
  }

  static void _paintLemon(Canvas canvas, double s) {
    final body = Paint()..color = GameConfig.lemonYellow;
    // Oval body
    canvas.drawOval(
      Rect.fromLTWH(s * 0.1, s * 0.2, s * 0.8, s * 0.6),
      body,
    );
    // Tips
    final tipPaint = Paint()..color = const Color(0xFF8BC34A);
    canvas.drawCircle(Offset(s * 0.12, s * 0.5), 3, tipPaint);
    canvas.drawCircle(Offset(s * 0.88, s * 0.5), 3, tipPaint);
    // Highlight
    canvas.drawOval(
      Rect.fromLTWH(s * 0.2, s * 0.28, s * 0.25, s * 0.15),
      Paint()..color = const Color(0x33FFFFFF),
    );
  }
}
