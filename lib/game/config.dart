import 'dart:ui';

class GameConfig {
  // Physics
  static const double gravity = 1400.0;
  static const double jumpForce = -580.0;
  static const double playerGroundFraction = 0.78;

  // Speed / difficulty
  static const double initialSpeed = 220.0;
  static const double maxSpeed = 550.0;
  static const double speedIncrement = 6.0;
  static const double initialObstacleInterval = 2.2;
  static const double minObstacleInterval = 0.7;
  static const double collectibleInterval = 1.8;

  // Player
  static const double playerWidth = 55.0;
  static const double playerHeight = 75.0;
  static const double playerX = 80.0;

  // Obstacles
  static const double obstacleMinWidth = 45.0;
  static const double obstacleMaxWidth = 75.0;
  static const double obstacleMinHeight = 50.0;
  static const double obstacleMaxHeight = 95.0;

  // Collectibles
  static const double collectibleSize = 36.0;
  static const int collectibleScore = 10;
  static const int distanceScoreRate = 5;

  // Ground
  static const double groundHeight = 50.0;
  static const double tileSize = 48.0;

  // Colors - warm kitchen palette
  static const Color skyTop = Color(0xFFFFF8E1);
  static const Color skyBottom = Color(0xFFFFE0B2);
  static const Color groundColor1 = Color(0xFFBCAAA4);
  static const Color groundColor2 = Color(0xFFA1887F);
  static const Color groundEdge = Color(0xFF795548);
  static const Color wallColor = Color(0xFFFFF3E0);
  static const Color shelfColor = Color(0xFF8D6E63);
  static const Color counterColor = Color(0xFF6D4C41);

  // Player colors
  static const Color chefCoat = Color(0xFFFAFAFA);
  static const Color chefSkin = Color(0xFFFFCC80);
  static const Color chefHat = Color(0xFFFFFFFF);
  static const Color chefScarf = Color(0xFFE53935);
  static const Color chefPants = Color(0xFF37474F);
  static const Color chefShoes = Color(0xFF212121);

  // Obstacle colors
  static const Color potColor = Color(0xFF78909C);
  static const Color potHandle = Color(0xFF546E7A);
  static const Color panColor = Color(0xFF37474F);
  static const Color fireOrange = Color(0xFFFF9800);
  static const Color fireYellow = Color(0xFFFFEB3B);
  static const Color fireRed = Color(0xFFFF5722);
  static const Color woodColor = Color(0xFF8D6E63);
  static const Color woodDark = Color(0xFF5D4037);

  // Collectible colors
  static const Color pepperRed = Color(0xFFE53935);
  static const Color pepperGreen = Color(0xFF43A047);
  static const Color garlicWhite = Color(0xFFF5F5F5);
  static const Color garlicTip = Color(0xFFE8E8E8);
  static const Color butterYellow = Color(0xFFFFF176);
  static const Color butterFoil = Color(0xFFBDBDBD);
  static const Color herbGreen = Color(0xFF66BB6A);
  static const Color tomatoRed = Color(0xFFEF5350);
  static const Color eggWhite = Color(0xFFFFFDE7);
  static const Color mushroomBrown = Color(0xFF8D6E63);
  static const Color mushroomCap = Color(0xFFA1887F);
  static const Color lemonYellow = Color(0xFFFFF59D);
}

enum ObstacleType { pot, pan, fireBurst, rollingPin, knifeBlock }

enum IngredientType { pepper, garlic, butter, herbs, tomato, egg, mushroom, lemon }
