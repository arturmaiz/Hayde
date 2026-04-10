import 'dart:math';
import 'package:flame/components.dart';
import 'package:flambe/components/obstacle.dart';
import 'package:flambe/game/config.dart';
import 'package:flambe/game/flambe_game.dart';

class ObstacleManager extends Component with HasGameReference<FlambeGame> {
  double _timer = 0;
  double _spawnInterval = GameConfig.initialObstacleInterval;
  final _rng = Random();

  void reset() {
    _timer = 0;
    _spawnInterval = GameConfig.initialObstacleInterval;
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (!game.isPlaying) return;

    _timer += dt;

    // Decrease spawn interval over time
    _spawnInterval = (GameConfig.initialObstacleInterval -
            game.elapsedTime * 0.02)
        .clamp(GameConfig.minObstacleInterval, GameConfig.initialObstacleInterval);

    if (_timer >= _spawnInterval) {
      _timer = 0;
      _spawnObstacle();
    }
  }

  void _spawnObstacle() {
    final type = ObstacleType.values[_rng.nextInt(ObstacleType.values.length)];
    final w = GameConfig.obstacleMinWidth +
        _rng.nextDouble() * (GameConfig.obstacleMaxWidth - GameConfig.obstacleMinWidth);
    final h = GameConfig.obstacleMinHeight +
        _rng.nextDouble() * (GameConfig.obstacleMaxHeight - GameConfig.obstacleMinHeight);
    final groundY = game.size.y * GameConfig.playerGroundFraction;

    game.add(Obstacle(
      type: type,
      position: Vector2(game.size.x + 20, groundY - h),
      size: Vector2(w, h),
    ));
  }
}
