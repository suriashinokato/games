// iOS Safari の orientationchange で initial-scale が再計算されない問題への対症療法。
// 回転を検知したら viewport に一瞬 maximum-scale=1 を足してスケールを強制リセットし、
// レイアウト確定後に元の content に戻して通常の pinch-to-zoom を維持する。
(function () {
  var meta = document.querySelector('meta[name="viewport"]');
  if (!meta) return;
  var original = meta.getAttribute('content');
  var locked = original + ', maximum-scale=1';
  var timer = null;

  function refresh() {
    meta.setAttribute('content', locked);
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () {
      meta.setAttribute('content', original);
      timer = null;
    }, 350);
  }

  window.addEventListener('orientationchange', refresh);
  if (window.matchMedia) {
    var mq = window.matchMedia('(orientation: portrait)');
    if (mq.addEventListener) mq.addEventListener('change', refresh);
    else if (mq.addListener) mq.addListener(refresh);
  }
})();
