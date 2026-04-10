import 'dart:ui';
import 'package:flame/components.dart';
import 'package:flambe/game/flambe_game.dart';
import 'package:flambe/painters/kitchen_bg_painter.dart';

class Background extends PositionComponent with HasGameReference<FlambeGame> {
  final List<double> _scrollOffsets = [0, 0, 0];
  static const List<double> _speeds = [0.08, 0.25, 0.5];

  @override
  Future<void> onLoad() async {
    size = game.size;
    position = Vector2.zero();
    priority = -10;
  }

  void reset() {
    for (var i = 0; i < _scrollOffsets.length; i++) {
      _scrollOffsets[i] = 0;
    }
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (!game.isPlaying) return;
    for (var i = 0; i < _scrollOffsets.length; i++) {
      _scrollOffsets[i] += game.gameSpeed * _speeds[i] * dt;
    }
  }

  @override
  void render(Canvas canvas) {
    KitchenBgPainter.paintBackground(canvas, size.x, size.y, _scrollOffsets);
  }
}
