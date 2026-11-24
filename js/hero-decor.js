(function () {
  'use strict';
  var layer = document.getElementById('hero-decor-layer');
  if (!layer) return;
  // When embedded in the dashboard's live editor, the parent draws its own
  // draft overlay on top of this (empty but correctly-sized) layer instead.
  if (location.search.indexOf('noelEditor=1') !== -1) return;

  function render(value) {
    var bp = window.innerWidth <= 1080 ? 'mobile' : 'desktop';
    var items = (value && value[bp]) || [];
    var containerWidth = layer.getBoundingClientRect().width || 1;

    layer.innerHTML = items.map(function (it) {
      var widthPx = (it.wPct / 100) * containerWidth;
      var heightPx = widthPx * it.ratio;
      return (
        '<img src="' + it.src + '" alt="" style="' +
          'left:' + it.xPct + '%;top:' + it.yPct + '%;' +
          'width:' + widthPx + 'px;height:' + heightPx + 'px;' +
          'transform:rotate(' + it.rotation + 'deg);z-index:' + it.z + ';">'
      );
    }).join('');
  }

  fetch('/api/hero-decor').then(function (res) {
    if (!res.ok) throw new Error('failed');
    return res.json();
  }).then(function (value) {
    render(value);
    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { render(value); }, 150);
    });
  }).catch(function () {});
})();
