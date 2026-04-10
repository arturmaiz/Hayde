import 'dart:ui';
import 'package:flame/collisions.dart';
import 'package:flame/components.dart';
import 'package:flambe/game/config.dart';
import 'package:flambe/game/flambe_game.dart';
import 'package:flambe/painters/obstacle_painters.dart';

class Obstacle extends PositionComponent with CollisionCallbacks, HasGameReference<FlambeGame> {
  final ObstacleType type;
  double _time = 0;

  Obstacle({required this.type, required Vector2 position, required Vector2 size})
      : super(position: position, size: size);

  @override
  Future<void> onLoad() async {
    add(RectangleHitbox(
      size: Vector2(size.x * 0.75, size.y * 0.85),
      position: Vector2(size.x * 0.125, size.y * 0.15),
    ));
  }

  @override
  void update(double dt) {
    super.update(dt);
    _time += dt;
    position.x -= game.gameSpeed * dt;
    if (position.x < -size.x - 50) {
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    ObstaclePainters.paint(canvas, type, size.x, size.y, _time);
  }
}
