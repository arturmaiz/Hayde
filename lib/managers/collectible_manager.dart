import 'dart:math';
import 'package:flame/components.dart';
import 'package:flambe/components/collectible.dart';
import 'package:flambe/game/config.dart';
import 'package:flambe/game/flambe_game.dart';

class CollectibleManager extends Component with HasGameReference<FlambeGame> {
  double _timer = 0;
  final _rng = Random();

  void reset() {
    _timer = 0;
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (!game.isPlaying) return;

    _timer += dt;
    if (_timer >= GameConfig.collectibleInterval) {
      _timer = 0;
      _spawnCollectibles();
    }
  }

  void _spawnCollectibles() {
    final groundY = game.size.y * GameConfig.playerGroundFraction;
    final minY = groundY * 0.3;
    final maxY = groundY - GameConfig.collectibleSize - 20;
    final type = IngredientType.values[_rng.nextInt(IngredientType.values.length)];

    // Occasionally spawn an arc of 3-5 collectibles
    if (_rng.nextDouble() < 0.3) {
      final count = 3 + _rng.nextInt(3);
      final arcHeight = 40.0;
      final startX = game.size.x + 40;
      final baseY = minY + _rng.nextDouble() * (maxY - minY - arcHeight);
      for (var i = 0; i < count; i++) {
        final fraction = i / (count - 1);
        final arcY = baseY - sin(fraction * 3.14159) * arcHeight;
        game.add(Collectible(
          type: type,
          position: Vector2(startX + i * 50, arcY),
        ));
      }
    } else {
      final y = minY + _rng.nextDouble() * (maxY - minY);
      game.add(Collectible(
        type: type,
        position: Vector2(game.size.x + 40, y),
      ));
    }
  }
}
