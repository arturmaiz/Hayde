import 'dart:ui';
import 'package:flame/components.dart';
import 'package:flambe/game/config.dart';
import 'package:flambe/game/flambe_game.dart';

class Ground extends PositionComponent with HasGameReference<FlambeGame> {
  double _scrollOffset = 0;

  @override
  Future<void> onLoad() async {
    final groundY = game.size.y * GameConfig.playerGroundFraction;
    position = Vector2(0, groundY);
    size = Vector2(game.size.x, game.size.y - groundY);
  }

  void reset() {
    _scrollOffset = 0;
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (!game.isPlaying) return;
    _scrollOffset += game.gameSpeed * dt;
    _scrollOffset %= GameConfig.tileSize * 2;
  }

  @override
  void render(Canvas canvas) {
    final w = size.x;
    final h = size.y;

    // Top edge line
    canvas.drawRect(
      Rect.fromLTWH(0, 0, w, 3),
      Paint()..color = GameConfig.groundEdge,
    );

    // Checkered kitchen floor
    final tileSize = GameConfig.tileSize;
    final startX = -_scrollOffset;
    final cols = (w / tileSize).ceil() + 3;
    final rows = (h / tileSize).ceil() + 1;

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        final x = startX + col * tileSize;
        final y = 3 + row * tileSize;
        final isLight = (col + row) % 2 == 0;
        canvas.drawRect(
          Rect.fromLTWH(x, y, tileSize, tileSize),
          Paint()..color = isLight ? GameConfig.groundColor1 : GameConfig.groundColor2,
        );
      }
    }

    // Subtle shadow at the top of the ground
    canvas.drawRect(
      Rect.fromLTWH(0, 3, w, 8),
      Paint()
        ..shader = Gradient.linear(
          const Offset(0, 3),
          const Offset(0, 11),
          [const Color(0x33000000), const Color(0x00000000)],
        ),
    );
  }
}
