import 'dart:math';
import 'dart:ui';
import 'package:flame/components.dart';

class _Particle {
  double x, y, vx, vy;
  double life;
  final Color color;
  final double radius;

  _Particle({
    required this.x,
    required this.y,
    required this.vx,
    required this.vy,
    required this.color,
    required this.radius,
    this.life = 1.0,
  });
}

class CollectParticleEffect extends PositionComponent {
  final List<_Particle> _particles = [];
  final Color baseColor;
  static final _rng = Random();

  CollectParticleEffect({
    required Vector2 position,
    required this.baseColor,
  }) : super(position: position) {
    for (var i = 0; i < 12; i++) {
      final angle = _rng.nextDouble() * 2 * pi;
      final speed = 60 + _rng.nextDouble() * 120;
      _particles.add(_Particle(
        x: 0,
        y: 0,
        vx: cos(angle) * speed,
        vy: sin(angle) * speed,
        color: Color.lerp(baseColor, const Color(0xFFFFFFFF), _rng.nextDouble() * 0.4)!,
        radius: 2 + _rng.nextDouble() * 3,
      ));
    }
  }

  @override
  void update(double dt) {
    super.update(dt);
    var allDead = true;
    for (final p in _particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt; // gravity
      p.life -= dt * 2;
      if (p.life > 0) allDead = false;
    }
    if (allDead) removeFromParent();
  }

  @override
  void render(Canvas canvas) {
    for (final p in _particles) {
      if (p.life <= 0) continue;
      final paint = Paint()..color = p.color.withValues(alpha: p.life.clamp(0, 1));
      canvas.drawCircle(Offset(p.x, p.y), p.radius * p.life, paint);
    }
  }
}

class HitParticleEffect extends PositionComponent {
  final List<_Particle> _particles = [];
  static final _rng = Random();

  HitParticleEffect({required Vector2 position}) : super(position: position) {
    for (var i = 0; i < 20; i++) {
      final angle = _rng.nextDouble() * 2 * pi;
      final speed = 80 + _rng.nextDouble() * 180;
      final colors = [
        const Color(0xFFFF5722),
        const Color(0xFFFF9800),
        const Color(0xFFFFEB3B),
        const Color(0xFFE53935),
      ];
      _particles.add(_Particle(
        x: 0,
        y: 0,
        vx: cos(angle) * speed,
        vy: sin(angle) * speed - 50,
        color: colors[_rng.nextInt(colors.length)],
        radius: 2 + _rng.nextDouble() * 4,
      ));
    }
  }

  @override
  void update(double dt) {
    super.update(dt);
    var allDead = true;
    for (final p in _particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt * 1.5;
      if (p.life > 0) allDead = false;
    }
    if (allDead) removeFromParent();
  }

  @override
  void render(Canvas canvas) {
    for (final p in _particles) {
      if (p.life <= 0) continue;
      final paint = Paint()..color = p.color.withValues(alpha: p.life.clamp(0, 1));
      canvas.drawCircle(Offset(p.x, p.y), p.radius * p.life, paint);
    }
  }
}
