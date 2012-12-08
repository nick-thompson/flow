
/*
 * Global application setings
 */

var path = [], queue = [];

var settings = {
  context: new webkitAudioContext(),
  users: {},
  chunkSize: 1024
};

/*
 * Returns a weighted avarage of frequencies present
 * in a signal.
 * Borrowed from: https://github.com/jsantell/beatbox
 */

var spectralCentroid = function (spectrum) {
  var threshold = 0.05
    , sumFX = 0.0
    , sumX = 0.0
    , n = spectrum.length
    , xn, fn;

  while (n--) {
    xn = Math.abs(spectrum[n]) < threshold
      ? 0.0
      : spectrum[n];

    fn = n * 44100.0 / 1024.0;
    sumFX += fn * xn;
    sumX += xn;
  }

  return (sumX > 0) 
    ? sumFX / sumX
    : 0.0;

};

/*
 * Draw a quadratic curve through n points
 * on a given context.
 * Borrowed from: https://github.com/soulwire/Muscular-Hydrostats
 */

var curveThroughPoints = function (points, ctx) {

  var i, n, a, b, x, y;

  for (i = 1, n = points.length - 2; i < n; i++) {

    a = points[i];
    b = points[i + 1];

    x = (a.x + b.x) * 0.5;
    y = (a.y + b.y) * 0.5;

    ctx.quadraticCurveTo(a.x, a.y, x, y);
  }

  a = points[i];
  b = points[i + 1];

  ctx.quadraticCurveTo(a.x, a.y, b.x, b.y);
};

/*
 * Acquire microphone input and initialize
 * the flow sketch.
 */

var sketch = Sketch.create({

  setup: function () {

    var that = this;
    navigator.webkitGetUserMedia({ audio: true }, function (stream) {

      var source = settings.context.createMediaStreamSource(stream)
        , processor = settings.context.createJavaScriptNode(settings.chunkSize, 1, 1)
        , fft = new FFT(settings.chunkSize, settings.context.sampleRate);

      processor.onaudioprocess = window.audioProcess = function (e) {
        var data = e.inputBuffer.getChannelData(0)
          , freq;

        fft.forward(data);
        freq = spectralCentroid(fft.spectrum);
        if (freq > 100 && freq < 1000) {
          freq = ((freq - 100) / 1000) * that.height;
          queue.push(Math.floor(freq));
        }
      };

      source.connect(processor);
      processor.connect(settings.context.destination);

    });


    // Initialize the path
    // TODO: Move this...
    var width = this.width
      , half = width / 2
      , step = half / 20;

    for (var i = 0; i < 20; i++) {
      path.push({
        x: half - step * i,
        y: 0.0
      });
    }

  },

  update: function () {
    var next = queue.shift() || 0.0;
    path[0].y += (next - path[0].y) * 0.02;
    for (var i = 1; i < path.length; i++) {
      path[i].y += (path[i-1].y - path[i].y) * (0.05 * i);
    }
  },

  draw: function () {
    this.strokeStyle = "#fd2567";
    this.lineWidth = 1;
    curveThroughPoints(path, this);
    this.stroke();
  },

});
