import 'package:flutter/material.dart';
import 'package:flambe/game/flambe_game.dart';

class MainMenuOverlay extends StatelessWidget {
  final FlambeGame game;

  const MainMenuOverlay({super.key, required this.game});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xE6FFF3E0), Color(0xE6FFE0B2)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Chef hat icon
                const Text(
                  '\u{1F468}\u{200D}\u{1F373}',
                  style: TextStyle(fontSize: 64),
                ),
                const SizedBox(height: 16),
                // Title
                ShaderMask(
                  shaderCallback: (bounds) => const LinearGradient(
                    colors: [Color(0xFFFF6F00), Color(0xFFE53935)],
                  ).createShader(bounds),
                  child: const Text(
                    'FLAMBE',
                    style: TextStyle(
                      fontSize: 56,
                      fontWeight: FontWeight.w900,
                      color: Colors.white,
                      letterSpacing: 6,
                      shadows: [
                        Shadow(
                          blurRadius: 10,
                          color: Color(0x66FF6F00),
                          offset: Offset(0, 4),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Kitchen Runner',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w500,
                    color: Color(0xFF795548),
                    letterSpacing: 4,
                  ),
                ),
                const SizedBox(height: 40),
                // Start button
                _PulsingButton(
                  onTap: () => game.startGame(),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 40, vertical: 16),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFFF8F00), Color(0xFFE65100)],
                      ),
                      borderRadius: BorderRadius.circular(30),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x44E65100),
                          blurRadius: 12,
                          offset: Offset(0, 6),
                        ),
                      ],
                    ),
                    child: const Text(
                      'TAP TO START',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w800,
                        color: Colors.white,
                        letterSpacing: 2,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 30),
                // Best score
                if (game.bestScore > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    decoration: BoxDecoration(
                      color: const Color(0x22795548),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Text(
                      'BEST: ${game.bestScore}',
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF795548),
                        letterSpacing: 2,
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _PulsingButton extends StatefulWidget {
  final VoidCallback onTap;
  final Widget child;

  const _PulsingButton({required this.onTap, required this.child});

  @override
  State<_PulsingButton> createState() => _PulsingButtonState();
}

class _PulsingButtonState extends State<_PulsingButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) {
          final scale = 1.0 + _controller.value * 0.05;
          return Transform.scale(scale: scale, child: child);
        },
        child: widget.child,
      ),
    );
  }
}
