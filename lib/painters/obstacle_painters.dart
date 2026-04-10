import 'dart:math';
import 'dart:ui';
import 'package:flambe/game/config.dart';

class ObstaclePainters {
  static void paint(Canvas canvas, ObstacleType type, double w, double h, double time) {
    switch (type) {
      case ObstacleType.pot:
        _paintPot(canvas, w, h);
      case ObstacleType.pan:
        _paintPan(canvas, w, h);
      case ObstacleType.fireBurst:
        _paintFire(canvas, w, h, time);
      case ObstacleType.rollingPin:
        _paintRollingPin(canvas, w, h);
      case ObstacleType.knifeBlock:
        _paintKnifeBlock(canvas, w, h);
    }
  }

  static void _paintPot(Canvas canvas, double w, double h) {
    final bodyPaint = Paint()..color = GameConfig.potColor;
    final handlePaint = Paint()..color = GameConfig.potHandle;
    final lidPaint = Paint()..color = const Color(0xFF90A4AE);
    final highlight = Paint()..color = const Color(0x33FFFFFF);

    // Pot body
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.1, h * 0.3, w * 0.8, h * 0.65),
        const Radius.circular(6),
      ),
      bodyPaint,
    );
    // Highlight stripe
    canvas.drawRect(
      Rect.fromLTWH(w * 0.15, h * 0.35, w * 0.15, h * 0.55),
      highlight,
    );
    // Left handle
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(-w * 0.05, h * 0.45, w * 0.18, h * 0.1),
        const Radius.circular(3),
      ),
      handlePaint,
    );
    // Right handle
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.87, h * 0.45, w * 0.18, h * 0.1),
        const Radius.circular(3),
      ),
      handlePaint,
    );
    // Lid
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.05, h * 0.25, w * 0.9, h * 0.1),
        const Radius.circular(4),
      ),
      lidPaint,
    );
    // Lid knob
    canvas.drawCircle(Offset(w * 0.5, h * 0.22), w * 0.06, handlePaint);

    // Steam puffs
    final steamPaint = Paint()..color = const Color(0x22FFFFFF);
    canvas.drawCircle(Offset(w * 0.3, h * 0.12), 6, steamPaint);
    canvas.drawCircle(Offset(w * 0.5, h * 0.06), 8, steamPaint);
    canvas.drawCircle(Offset(w * 0.7, h * 0.1), 5, steamPaint);
  }

  static void _paintPan(Canvas canvas, double w, double h) {
    final panPaint = Paint()..color = GameConfig.panColor;
    final innerPaint = Paint()..color = const Color(0xFF455A64);
    final handlePaint = Paint()..color = GameConfig.woodColor;

    // Handle
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.65, h * 0.4, w * 0.4, h * 0.12),
        const Radius.circular(4),
      ),
      handlePaint,
    );
    // Pan body (circle)
    canvas.drawOval(
      Rect.fromLTWH(w * 0.02, h * 0.15, w * 0.7, h * 0.7),
      panPaint,
    );
    // Inner pan surface
    canvas.drawOval(
      Rect.fromLTWH(w * 0.08, h * 0.22, w * 0.58, h * 0.56),
      innerPaint,
    );
    // Highlight
    canvas.drawOval(
      Rect.fromLTWH(w * 0.12, h * 0.25, w * 0.2, h * 0.15),
      Paint()..color = const Color(0x22FFFFFF),
    );
  }

  static void _paintFire(Canvas canvas, double w, double h, double time) {
    final rng = (time * 3).floor() % 3;
    final flicker = sin(time * 12) * 2;

    void drawFlame(double cx, double baseY, double fw, double fh, Color color) {
      final flamePath = Path()
        ..moveTo(cx - fw / 2, baseY)
        ..quadraticBezierTo(cx - fw / 3, baseY - fh * 0.6, cx + flicker, baseY - fh)
        ..quadraticBezierTo(cx + fw / 3, baseY - fh * 0.6, cx + fw / 2, baseY)
        ..close();
      canvas.drawPath(flamePath, Paint()..color = color);
    }

    // Outer red flame
    drawFlame(w * 0.5, h * 0.95, w * 0.8, h * 0.85 + rng * 2, GameConfig.fireRed);
    // Middle orange flame
    drawFlame(w * 0.5, h * 0.95, w * 0.55, h * 0.7 + rng * 1.5, GameConfig.fireOrange);
    // Inner yellow flame
    drawFlame(w * 0.5, h * 0.95, w * 0.3, h * 0.5 + rng.toDouble(), GameConfig.fireYellow);
    // Core white
    drawFlame(w * 0.5, h * 0.95, w * 0.12, h * 0.25, const Color(0xFFFFF9C4));
  }

  static void _paintRollingPin(Canvas canvas, double w, double h) {
    final woodPaint = Paint()..color = GameConfig.woodColor;
    final darkWood = Paint()..color = GameConfig.woodDark;
    final highlight = Paint()..color = const Color(0x33FFFFFF);

    // Main cylinder
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.15, h * 0.25, w * 0.7, h * 0.5),
        Radius.circular(h * 0.25),
      ),
      woodPaint,
    );
    // Highlight
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.2, h * 0.3, w * 0.6, h * 0.12),
        const Radius.circular(6),
      ),
      highlight,
    );
    // Left handle
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.0, h * 0.32, w * 0.2, h * 0.36),
        const Radius.circular(6),
      ),
      darkWood,
    );
    // Right handle
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.8, h * 0.32, w * 0.2, h * 0.36),
        const Radius.circular(6),
      ),
      darkWood,
    );
  }

  static void _paintKnifeBlock(Canvas canvas, double w, double h) {
    final blockPaint = Paint()..color = GameConfig.woodColor;
    final darkPaint = Paint()..color = GameConfig.woodDark;
    final metalPaint = Paint()..color = const Color(0xFFBDBDBD);
    final handlePaint = Paint()..color = const Color(0xFF3E2723);

    // Block base (trapezoid-ish)
    final blockPath = Path()
      ..moveTo(w * 0.15, h * 0.4)
      ..lineTo(w * 0.1, h * 1.0)
      ..lineTo(w * 0.9, h * 1.0)
      ..lineTo(w * 0.85, h * 0.4)
      ..close();
    canvas.drawPath(blockPath, blockPaint);
    // Front face darker
    final frontPath = Path()
      ..moveTo(w * 0.15, h * 0.4)
      ..lineTo(w * 0.1, h * 1.0)
      ..lineTo(w * 0.5, h * 1.0)
      ..lineTo(w * 0.5, h * 0.4)
      ..close();
    canvas.drawPath(frontPath, darkPaint);

    // Knife handles sticking out
    for (var i = 0; i < 3; i++) {
      final x = w * (0.3 + i * 0.2);
      // Blade (metal)
      canvas.drawRect(
        Rect.fromLTWH(x - 2, h * 0.35, 4, h * 0.08),
        metalPaint,
      );
      // Handle
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x - 4, h * 0.05, 8, h * 0.32),
          const Radius.circular(2),
        ),
        handlePaint,
      );
    }
  }
}
