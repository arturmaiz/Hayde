import 'package:flame/collisions.dart';
import 'package:flame/components.dart';
import 'package:flambe/components/collectible.dart';
import 'package:flambe/components/obstacle.dart';
import 'package:flambe/game/config.dart';
import 'package:flambe/game/flambe_game.dart';
import 'package:flambe/painters/chef_painter.dart';

class Player extends PositionComponent with CollisionCallbacks, HasGameReference<FlambeGame> {
  double velocityY = 0;
  bool isOnGround = true;
  double squashStretch = 1.0;
  double _runFrame = 0;
  double _groundY = 0;

  @override
  Future<void> onLoad() async {
    size = Vector2(GameConfig.playerWidth, GameConfig.playerHeight);
    _groundY = game.size.y * GameConfig.playerGroundFraction - size.y;
    position = Vector2(GameConfig.playerX, _groundY);
    anchor = Anchor.topLeft;
    add(RectangleHitbox(
      size: Vector2(size.x * 0.6, size.y * 0.85),
      position: Vector2(size.x * 0.2, size.y * 0.15),
    ));
  }

  void jump() {
    if (!isOnGround) return;
    velocityY = GameConfig.jumpForce;
    isOnGround = false;
    squashStretch = 0.7;
  }

  void reset() {
    _groundY = game.size.y * GameConfig.playerGroundFraction - size.y;
    position = Vector2(GameConfig.playerX, _groundY);
    velocityY = 0;
    isOnGround = true;
    squashStretch = 1.0;
    _runFrame = 0;
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (!game.isPlaying) return;

    // Gravity
    velocityY += GameConfig.gravity * dt;
    position.y += velocityY * dt;

    // Ground collision
    _groundY = game.size.y * GameConfig.playerGroundFraction - size.y;
    if (position.y >= _groundY) {
      position.y = _groundY;
      if (!isOnGround) {
        isOnGround = true;
        squashStretch = 1.3; // Land squash
      }
      velocityY = 0;
    }

    // Squash-stretch lerp back to normal
    if (squashStretch != 1.0) {
      squashStretch += (1.0 - squashStretch) * dt * 8;
      if ((squashStretch - 1.0).abs() < 0.01) squashStretch = 1.0;
    }

    // Run animation
    _runFrame += dt * game.gameSpeed / 40;
  }

  @override
  void onCollisionStart(Set<Vector2> intersectionPoints, PositionComponent other) {
    super.onCollisionStart(intersectionPoints, other);
    if (other is Obstacle) {
      game.onPlayerHitObstacle();
    } else if (other is Collectible) {
      game.onPlayerCollect(other, colorValue: 0);
    }
  }

  @override
  void render(canvas) {
    ChefPainter.paint(canvas, size, _runFrame, squashStretch, !isOnGround);
  }
}
