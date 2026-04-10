import 'dart:math';
import 'dart:ui';
import 'package:flame/collisions.dart';
import 'package:flame/components.dart';
import 'package:flambe/game/config.dart';
import 'package:flambe/game/flambe_game.dart';
import 'package:flambe/painters/collectible_painters.dart';

class Collectible extends PositionComponent with CollisionCallbacks, HasGameReference<FlambeGame> {
  final IngredientType type;
  double _time = 0;
  final double _baseY;
  final double _bobSpeed;

  Collectible({
    required this.type,
    required Vector2 position,
  })  : _baseY = position.y,
        _bobSpeed = 2.5 + Random().nextDouble() * 1.5,
        super(
          position: position,
          size: Vector2.all(GameConfig.collectibleSize),
        );

  @override
  Future<void> onLoad() async {
    add(CircleHitbox(
      radius: GameConfig.collectibleSize * 0.4,
      position: Vector2.all(GameConfig.collectibleSize * 0.1),
    ));
  }

  @override
  void update(double dt) {
    super.update(dt);
    _time += dt;
    position.x -= game.gameSpeed * dt;
    position.y = _baseY + sin(_time * _bobSpeed) * 8;
    if (position.x < -size.x - 50) {
      removeFromParent();
    }
  }

  @override
  void render(Canvas canvas) {
    CollectiblePainters.paint(canvas, type, size.x, _time);
  }
}
