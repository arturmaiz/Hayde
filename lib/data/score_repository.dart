import 'package:shared_preferences/shared_preferences.dart';

class ScoreRepository {
  static const String _bestScoreKey = 'flambe_best_score';
  late SharedPreferences _prefs;

  Future<void> init() async {
    _prefs = await SharedPreferences.getInstance();
  }

  int getBestScore() => _prefs.getInt(_bestScoreKey) ?? 0;

  Future<void> saveBestScore(int score) async {
    final current = getBestScore();
    if (score > current) {
      await _prefs.setInt(_bestScoreKey, score);
    }
  }
}
