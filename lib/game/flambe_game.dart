import 'dart:ui' show Color, VoidCallback;
import 'package:flame/events.dart';
import 'package:flame/game.dart';
import 'package:flambe/components/background.dart';
import 'package:flambe/components/collectible.dart';
import 'package:flambe/components/ground.dart';
import 'package:flambe/components/obstacle.dart';
import 'package:flambe/components/particle_effect.dart';
import 'package:flambe/components/player.dart';
import 'package:flambe/data/score_repository.dart';
import 'package:flambe/game/config.dart';
import 'package:flambe/managers/collectible_manager.dart';
import 'package:flambe/managers/obstacle_manager.dart';

class FlambeGame extends FlameGame with TapCallbacks, HasCollisionDetection {
  late Player player;
  late Ground ground;
  late Background background;
  late ObstacleManager obstacleManager;
  late CollectibleManager collectibleManager;
  late ScoreRepository scoreRepo;

  double gameSpeed = GameConfig.initialSpeed;
  double elapsedTime = 0;
  int score = 0;
  int bestScore = 0;
  bool isPlaying = false;
  bool isGameOver = false;

  double _scoreAccumulator = 0;

  VoidCallback? onScoreChanged;

  @override
  Future<void> onLoad() async {
    scoreRepo = ScoreRepository();
    await scoreRepo.init();
    bestScore = scoreRepo.getBestScore();

    background = Background();
    ground = Ground();
    player = Player();
    obstacleManager = ObstacleManager();
    collectibleManager = CollectibleManager();

    await add(background);
    await add(ground);
    await add(player);
    await add(obstacleManager);
    await add(collectibleManager);

    overlays.add('mainMenu');
  }

  void startGame() {
    // Remove overlays
    overlays.remove('mainMenu');
    overlays.remove('gameOver');

    // Remove old obstacles and collectibles
    children.whereType<Obstacle>().toList().forEach((o) => o.removeFromParent());
    children.whereType<Collectible>().toList().forEach((c) => c.removeFromParent());
    children.whereType<CollectParticleEffect>().toList().forEach((p) => p.removeFromParent());
    children.whereType<HitParticleEffect>().toList().forEach((p) => p.removeFromParent());

    // Reset state
    gameSpeed = GameConfig.initialSpeed;
    elapsedTime = 0;
    score = 0;
    _scoreAccumulator = 0;
    isPlaying = true;
    isGameOver = false;

    player.reset();
    ground.reset();
    background.reset();
    obstacleManager.reset();
    collectibleManager.reset();

    overlays.add('hud');
    onScoreChanged?.call();
  }

  void gameOver() {
    if (isGameOver) return;
    isGameOver = true;
    isPlaying = false;

    // Save best score
    if (score > bestScore) {
      bestScore = score;
      scoreRepo.saveBestScore(score);
    }

    // Hit particles
    add(HitParticleEffect(position: player.position + player.size / 2));

    overlays.remove('hud');
    overlays.add('gameOver');
  }

  void addScore(int points) {
    score += points;
    onScoreChanged?.call();
  }

  @override
  void update(double dt) {
    super.update(dt);
    if (!isPlaying) return;

    elapsedTime += dt;

    // Increase speed
    gameSpeed = (GameConfig.initialSpeed + elapsedTime * GameConfig.speedIncrement)
        .clamp(GameConfig.initialSpeed, GameConfig.maxSpeed);

    // Distance score
    _scoreAccumulator += dt * GameConfig.distanceScoreRate;
    if (_scoreAccumulator >= 1) {
      final points = _scoreAccumulator.floor();
      _scoreAccumulator -= points;
      addScore(points);
    }
  }

  @override
  void onTapDown(TapDownEvent event) {
    if (isPlaying) {
      player.jump();
    }
  }

  void onPlayerHitObstacle() {
    gameOver();
  }

  void onPlayerCollect(Collectible collectible, {required double colorValue}) {
    addScore(GameConfig.collectibleScore);
    add(CollectParticleEffect(
      position: collectible.position + collectible.size / 2,
      baseColor: _colorForIngredient(collectible.type),
    ));
    collectible.removeFromParent();
  }

  static Color _colorForIngredient(IngredientType type) {
    switch (type) {
      case IngredientType.pepper:
        return GameConfig.pepperRed;
      case IngredientType.garlic:
        return GameConfig.garlicWhite;
      case IngredientType.butter:
        return GameConfig.butterYellow;
      case IngredientType.herbs:
        return GameConfig.herbGreen;
      case IngredientType.tomato:
        return GameConfig.tomatoRed;
      case IngredientType.egg:
        return GameConfig.eggWhite;
      case IngredientType.mushroom:
        return GameConfig.mushroomCap;
      case IngredientType.lemon:
        return GameConfig.lemonYellow;
    }
  }
}
