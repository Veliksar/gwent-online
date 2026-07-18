(function () {
  var startedAt = Date.now();

  var originalEndGame = Game.prototype.endGame;

  Game.prototype.endGame = async function () {
    await originalEndGame.call(this);

    try {
      var raw = localStorage.getItem('gwent-auth');
      if (!raw) return;

      var stored = JSON.parse(raw);
      var token = stored && stored.state && stored.state.token;
      if (!token) return;

      var isDraw = player_op.health <= 0 && player_me.health <= 0;
      var wonByPlayer = !isDraw && player_op.health === 0;
      var duration = Math.floor((Date.now() - startedAt) / 1000);

      var apiBase = window.location.origin;

      await fetch(apiBase + '/api/match/bot-save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({
          is_draw: isDraw,
          won_by_player: wonByPlayer,
          duration_seconds: duration,
        }),
      });
    } catch (_e) {
    }
  };
})();
