import 'dart:math';
import 'dart:ui';
import 'package:flambe/game/config.dart';

class KitchenBgPainter {
  static void paintBackground(Canvas canvas, double w, double h, List<double> scrollOffsets) {
    // Sky gradient
    final skyPaint = Paint()
      ..shader = Gradient.linear(
        Offset.zero,
        Offset(0, h * 0.7),
        [GameConfig.skyTop, GameConfig.skyBottom],
      );
    canvas.drawRect(Rect.fromLTWH(0, 0, w, h), skyPaint);

    // Layer 0: Far wall (slowest)
    _paintWall(canvas, w, h, scrollOffsets[0]);

    // Layer 1: Shelves and utensils (medium)
    _paintShelves(canvas, w, h, scrollOffsets[1]);

    // Layer 2: Counter details (nearest)
    _paintCounter(canvas, w, h, scrollOffsets[2]);
  }

  static void _paintWall(Canvas canvas, double w, double h, double offset) {
    final wallPaint = Paint()..color = GameConfig.wallColor;
    canvas.drawRect(Rect.fromLTWH(0, 0, w, h * 0.75), wallPaint);

    // Tile pattern on wall
    final tilePaint = Paint()
      ..color = const Color(0x08000000)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 0.5;
    final tileSize = 60.0;
    final startX = -(offset % tileSize);
    for (var x = startX; x < w + tileSize; x += tileSize) {
      canvas.drawLine(Offset(x, 0), Offset(x, h * 0.75), tilePaint);
    }
    for (var y = 0.0; y < h * 0.75; y += tileSize) {
      canvas.drawLine(Offset(0, y), Offset(w, y), tilePaint);
    }

    // Windows (repeating)
    final windowSpacing = 400.0;
    final winStart = -(offset % windowSpacing);
    final windowFrame = Paint()..color = const Color(0xFF8D6E63);
    final windowGlass = Paint()..color = const Color(0xFFB3E5FC);
    final windowShine = Paint()..color = const Color(0x44FFFFFF);
    for (var x = winStart; x < w + windowSpacing; x += windowSpacing) {
      // Frame
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x + 20, h * 0.05, 100, 80),
          const Radius.circular(4),
        ),
        windowFrame,
      );
      // Glass
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x + 25, h * 0.05 + 5, 90, 70),
          const Radius.circular(2),
        ),
        windowGlass,
      );
      // Shine
      canvas.drawRect(
        Rect.fromLTWH(x + 30, h * 0.05 + 8, 20, 40),
        windowShine,
      );
      // Cross bar
      canvas.drawRect(Rect.fromLTWH(x + 25, h * 0.05 + 37, 90, 3), windowFrame);
      canvas.drawRect(Rect.fromLTWH(x + 68, h * 0.05 + 5, 3, 70), windowFrame);
    }
  }

  static void _paintShelves(Canvas canvas, double w, double h, double offset) {
    final shelfPaint = Paint()..color = GameConfig.shelfColor;
    final shelfShadow = Paint()..color = const Color(0x15000000);

    // Two shelf rows
    for (final shelfY in [h * 0.18, h * 0.38]) {
      // Shelf plank
      canvas.drawRect(Rect.fromLTWH(0, shelfY, w, 6), shelfPaint);
      canvas.drawRect(Rect.fromLTWH(0, shelfY + 6, w, 3), shelfShadow);

      // Items on shelf (repeating)
      final itemSpacing = 120.0;
      final startX = -(offset % itemSpacing);
      for (var x = startX; x < w + itemSpacing; x += itemSpacing) {
        _paintShelfItem(canvas, x + 10, shelfY, (x / itemSpacing).floor() % 4);
      }
    }

    // Hanging utensils
    final utensilSpacing = 180.0;
    final uStart = -(offset % utensilSpacing);
    final hookPaint = Paint()
      ..color = const Color(0xFF9E9E9E)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5;
    for (var x = uStart; x < w + utensilSpacing; x += utensilSpacing) {
      final type = (x / utensilSpacing).floor() % 3;
      final hookY = h * 0.12;
      // Hook
      canvas.drawArc(
        Rect.fromLTWH(x + 30, hookY - 5, 8, 10),
        0, pi, false, hookPaint,
      );
      if (type == 0) {
        // Ladle
        canvas.drawLine(Offset(x + 34, hookY + 5), Offset(x + 34, hookY + 35), hookPaint);
        canvas.drawArc(
          Rect.fromLTWH(x + 26, hookY + 30, 16, 16),
          0, pi, false, hookPaint,
        );
      } else if (type == 1) {
        // Spatula
        canvas.drawLine(Offset(x + 34, hookY + 5), Offset(x + 34, hookY + 30), hookPaint);
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(x + 28, hookY + 28, 12, 18),
            const Radius.circular(3),
          ),
          hookPaint,
        );
      } else {
        // Whisk
        canvas.drawLine(Offset(x + 34, hookY + 5), Offset(x + 34, hookY + 22), hookPaint);
        for (var i = -2; i <= 2; i++) {
          canvas.drawArc(
            Rect.fromLTWH(x + 28 + i * 2, hookY + 20, 12, 22),
            -0.3, pi + 0.6, false, hookPaint,
          );
        }
      }
    }
  }

  static void _paintShelfItem(Canvas canvas, double x, double shelfY, int type) {
    final itemY = shelfY - 28;
    switch (type) {
      case 0: // Jar
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(x, itemY, 20, 26),
            const Radius.circular(3),
          ),
          Paint()..color = const Color(0xFF80CBC4),
        );
        canvas.drawRect(
          Rect.fromLTWH(x + 2, itemY + 2, 16, 6),
          Paint()..color = const Color(0xFFB2DFDB),
        );
      case 1: // Bottle
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(x + 4, itemY, 12, 26),
            const Radius.circular(2),
          ),
          Paint()..color = const Color(0xFFEF9A9A),
        );
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(x + 6, itemY - 6, 8, 8),
            const Radius.circular(2),
          ),
          Paint()..color = const Color(0xFFEF9A9A),
        );
      case 2: // Bowl
        canvas.drawArc(
          Rect.fromLTWH(x, itemY + 6, 24, 22),
          0, pi, false,
          Paint()
            ..color = const Color(0xFFFFCC80)
            ..style = PaintingStyle.fill,
        );
      case 3: // Mug
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromLTWH(x, itemY + 2, 18, 24),
            const Radius.circular(2),
          ),
          Paint()..color = const Color(0xFFBCAAA4),
        );
        canvas.drawArc(
          Rect.fromLTWH(x + 15, itemY + 8, 10, 12),
          -pi / 2, pi, false,
          Paint()
            ..color = const Color(0xFFBCAAA4)
            ..style = PaintingStyle.stroke
            ..strokeWidth = 2,
        );
    }
  }

  static void _paintCounter(Canvas canvas, double w, double h, double offset) {
    // Counter top surface
    final counterPaint = Paint()..color = GameConfig.counterColor;
    final counterTop = h * 0.56;
    canvas.drawRect(Rect.fromLTWH(0, counterTop, w, 8), counterPaint);
    // Counter front
    canvas.drawRect(
      Rect.fromLTWH(0, counterTop + 8, w, h * 0.2),
      Paint()..color = const Color(0xFF5D4037),
    );

    // Items on counter (repeating)
    final itemSpacing = 250.0;
    final startX = -(offset % itemSpacing);
    for (var x = startX; x < w + itemSpacing; x += itemSpacing) {
      // Small cutting board
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x + 20, counterTop - 4, 40, 4),
          const Radius.circular(2),
        ),
        Paint()..color = GameConfig.woodColor,
      );
      // Salt shaker
      canvas.drawRRect(
        RRect.fromRectAndRadius(
          Rect.fromLTWH(x + 100, counterTop - 18, 10, 18),
          const Radius.circular(3),
        ),
        Paint()..color = const Color(0xFFEEEEEE),
      );
      canvas.drawRect(
        Rect.fromLTWH(x + 100, counterTop - 20, 10, 4),
        Paint()..color = const Color(0xFFBDBDBD),
      );
    }
  }
}
