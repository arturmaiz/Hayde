import 'dart:math';
import 'dart:ui';
import 'package:flame/extensions.dart';
import 'package:flambe/game/config.dart';

class ChefPainter {
  static void paint(
    Canvas canvas,
    Vector2 size,
    double runFrame,
    double squashStretch,
    bool isJumping,
  ) {
    canvas.save();

    final cx = size.x / 2;
    final cy = size.y / 2;
    canvas.translate(cx, cy);
    canvas.scale(1.0 / squashStretch, squashStretch);
    canvas.translate(-cx, -cy);

    final w = size.x;
    final h = size.y;

    // Leg animation offset
    final legSwing = isJumping ? 0.3 : sin(runFrame * 8) * 0.4;

    // Shoes
    final shoePaint = Paint()..color = GameConfig.chefShoes;
    final shoeY = h * 0.92;
    final shoeW = w * 0.22;
    final shoeH = h * 0.08;
    // Left shoe
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.15 + legSwing * 8, shoeY, shoeW, shoeH),
        const Radius.circular(3),
      ),
      shoePaint,
    );
    // Right shoe
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.55 - legSwing * 8, shoeY, shoeW, shoeH),
        const Radius.circular(3),
      ),
      shoePaint,
    );

    // Legs (pants)
    final pantsPaint = Paint()..color = GameConfig.chefPants;
    final legTop = h * 0.65;
    final legW = w * 0.16;
    // Left leg
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.2 + legSwing * 6, legTop, legW, h * 0.28),
        const Radius.circular(4),
      ),
      pantsPaint,
    );
    // Right leg
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(w * 0.58 - legSwing * 6, legTop, legW, h * 0.28),
        const Radius.circular(4),
      ),
      pantsPaint,
    );

    // Body (chef coat)
    final coatPaint = Paint()..color = GameConfig.chefCoat;
    final coatStroke = Paint()
      ..color = const Color(0xFFE0E0E0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    final bodyRect = RRect.fromRectAndRadius(
      Rect.fromLTWH(w * 0.15, h * 0.32, w * 0.7, h * 0.38),
      const Radius.circular(8),
    );
    canvas.drawRRect(bodyRect, coatPaint);
    canvas.drawRRect(bodyRect, coatStroke);

    // Buttons on coat
    final buttonPaint = Paint()..color = const Color(0xFFBDBDBD);
    for (var i = 0; i < 3; i++) {
      canvas.drawCircle(
        Offset(w * 0.5, h * 0.40 + i * h * 0.09),
        2.5,
        buttonPaint,
      );
    }

    // Scarf / neckerchief
    final scarfPaint = Paint()..color = GameConfig.chefScarf;
    final scarfPath = Path()
      ..moveTo(w * 0.3, h * 0.33)
      ..lineTo(w * 0.5, h * 0.42)
      ..lineTo(w * 0.7, h * 0.33)
      ..close();
    canvas.drawPath(scarfPath, scarfPaint);

    // Arms
    final armPaint = Paint()..color = GameConfig.chefCoat;
    final armStroke = Paint()
      ..color = const Color(0xFFE0E0E0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    final armSwing = isJumping ? 0.2 : sin(runFrame * 8 + pi) * 0.3;
    // Left arm
    canvas.save();
    canvas.translate(w * 0.15, h * 0.36);
    canvas.rotate(armSwing * 0.5 - 0.1);
    final leftArm = RRect.fromRectAndRadius(
      Rect.fromLTWH(-w * 0.1, 0, w * 0.14, h * 0.22),
      const Radius.circular(5),
    );
    canvas.drawRRect(leftArm, armPaint);
    canvas.drawRRect(leftArm, armStroke);
    // Hand
    canvas.drawCircle(
      Offset(-w * 0.03, h * 0.22),
      w * 0.06,
      Paint()..color = GameConfig.chefSkin,
    );
    canvas.restore();
    // Right arm
    canvas.save();
    canvas.translate(w * 0.85, h * 0.36);
    canvas.rotate(-armSwing * 0.5 + 0.1);
    final rightArm = RRect.fromRectAndRadius(
      Rect.fromLTWH(-w * 0.04, 0, w * 0.14, h * 0.22),
      const Radius.circular(5),
    );
    canvas.drawRRect(rightArm, armPaint);
    canvas.drawRRect(rightArm, armStroke);
    canvas.drawCircle(
      Offset(w * 0.03, h * 0.22),
      w * 0.06,
      Paint()..color = GameConfig.chefSkin,
    );
    canvas.restore();

    // Head
    final headPaint = Paint()..color = GameConfig.chefSkin;
    final headCx = w * 0.5;
    final headCy = h * 0.24;
    final headR = w * 0.2;
    canvas.drawCircle(Offset(headCx, headCy), headR, headPaint);

    // Eyes
    final eyePaint = Paint()..color = const Color(0xFF212121);
    canvas.drawCircle(Offset(headCx - w * 0.08, headCy - h * 0.01), 2.5, eyePaint);
    canvas.drawCircle(Offset(headCx + w * 0.08, headCy - h * 0.01), 2.5, eyePaint);
    // Eye shine
    final shinePaint = Paint()..color = const Color(0xFFFFFFFF);
    canvas.drawCircle(Offset(headCx - w * 0.07, headCy - h * 0.02), 1.0, shinePaint);
    canvas.drawCircle(Offset(headCx + w * 0.09, headCy - h * 0.02), 1.0, shinePaint);

    // Smile
    final smilePaint = Paint()
      ..color = const Color(0xFF5D4037)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.5
      ..strokeCap = StrokeCap.round;
    final smilePath = Path()
      ..moveTo(headCx - w * 0.06, headCy + h * 0.04)
      ..quadraticBezierTo(headCx, headCy + h * 0.08, headCx + w * 0.06, headCy + h * 0.04);
    canvas.drawPath(smilePath, smilePaint);

    // Cheeks (blush)
    final blushPaint = Paint()..color = const Color(0x33E57373);
    canvas.drawCircle(Offset(headCx - w * 0.14, headCy + h * 0.03), 4, blushPaint);
    canvas.drawCircle(Offset(headCx + w * 0.14, headCy + h * 0.03), 4, blushPaint);

    // Chef hat (toque)
    final hatPaint = Paint()..color = GameConfig.chefHat;
    final hatStroke = Paint()
      ..color = const Color(0xFFE0E0E0)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.0;
    // Hat base band
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromLTWH(headCx - w * 0.22, headCy - headR * 0.6, w * 0.44, h * 0.06),
        const Radius.circular(3),
      ),
      hatPaint,
    );
    // Hat puff top
    final hatPath = Path()
      ..moveTo(headCx - w * 0.2, headCy - headR * 0.6)
      ..quadraticBezierTo(headCx - w * 0.25, headCy - headR * 2.2, headCx, headCy - headR * 2.4)
      ..quadraticBezierTo(headCx + w * 0.25, headCy - headR * 2.2, headCx + w * 0.2, headCy - headR * 0.6)
      ..close();
    canvas.drawPath(hatPath, hatPaint);
    canvas.drawPath(hatPath, hatStroke);

    canvas.restore();
  }
}
