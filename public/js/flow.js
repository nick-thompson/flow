
/**
 * Global application setings
 */

var settings = {
  context: new webkitAudioContext(),
  users: {},
  chunkSize: 1024,
  pathLength: 20,
  response: 0.1,
  tension: 0.5
};

/**
 * Socket actions
 */

var socket = io.connect('http://localhost');

// Sent from the server after initial connection is made
socket.on('users', function (data) {
  var start = window.innerWidth / 2
    , step = start / settings.pathLength
    , users = data.users;

  for (var prop in users) {
    users[prop].path = [];
    for (var i = 0; i < settings.pathLength; i++) {
      users[prop].path.push({
        x: start,
        y: 10.0
      });
      start -= step;
    }
  }
  settings.id = data.you.id;
  settings.color = data.you.color;
  settings.users = data.users;
  build();
});

// Server forwards a packet of data corresponding to a user's
// position update.
socket.on('data', function (data) {
  settings.users[data.id].queue.push(data);
});

/**
 * Returns a weighted avarage of frequencies present
 * in a signal.
 * Borrowed from: https://github.com/jsantell/beatbox
 */

var spectralCentroid = function (spectrum) {
  var threshold = 0.005
    , sumFX = 0.0
    , sumX = 0.0
    , n = spectrum.length
    , xn, fn;

  while (n--) {
    xn = Math.abs(spectrum[n]) < threshold
      ? 0.0
      : spectrum[n];

    fn = n * settings.context.sampleRate / settings.chunkSize;
    sumFX += fn * xn;
    sumX += xn;
  }

  return (sumX > 0) 
    ? sumFX / sumX
    : 0.0;
};

/**
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

/**
 * Acquire microphone input and initialize
 * the flow sketch.
 */

var build = function () {
  settings.sketch = Sketch.create({

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
            settings.users[settings.id].queue.push(Math.floor(freq));
            socket.emit('data', Math.floor(freq));
          }
        };

        source.connect(processor);
        processor.connect(settings.context.destination);

      });
    },

    update: function () {
      for (var prop in settings.users) {
        var user = settings.users[prop]
          , next, scaleFactor;

        for (var i = 0, n = user.path.length; i < n; i++) {
          next = user.path[i - 1] || { y: user.queue.shift() || 0.0 };
          scaleFactor = ((n - i) / n) * settings.response;
          user.path[i].y += (next.y - user.path[i].y) * scaleFactor;
        }
      }
    },

    draw: function () {
      for (var prop in settings.users) {
        var user = settings.users[prop]
          , i = 4;

        while (i--) {
          this.beginPath();
          this.strokeStyle = (i === 0) 
            ? "rgba(253, 37, 103, 1.0)"
            : "rgba(253, 37, 103, 0.2)";

          this.lineWidth = (i + 1) * 3 - 2;
          curveThroughPoints(user.path, this);
          this.stroke();
          this.closePath();
        }
      }
    }

  });
};
