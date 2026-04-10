import 'package:flame/game.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flambe/game/flambe_game.dart';
import 'package:flambe/overlays/game_over.dart';
import 'package:flambe/overlays/hud.dart';
import 'package:flambe/overlays/main_menu.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();

  SystemChrome.setPreferredOrientations([
    DeviceOrientation.portraitUp,
  ]);

  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    systemNavigationBarColor: Colors.transparent,
  ));

  runApp(const FlambeApp());
}

class FlambeApp extends StatelessWidget {
  const FlambeApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Flambe',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFFFF8F00),
          brightness: Brightness.light,
        ),
        useMaterial3: true,
      ),
      home: const GamePage(),
    );
  }
}

class GamePage extends StatefulWidget {
  const GamePage({super.key});

  @override
  State<GamePage> createState() => _GamePageState();
}

class _GamePageState extends State<GamePage> {
  late final FlambeGame _game;

  @override
  void initState() {
    super.initState();
    _game = FlambeGame();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: GameWidget<FlambeGame>(
        game: _game,
        overlayBuilderMap: {
          'mainMenu': (context, game) => MainMenuOverlay(game: game),
          'gameOver': (context, game) => GameOverOverlay(game: game),
          'hud': (context, game) => HudOverlay(game: game),
        },
      ),
    );
  }
}
