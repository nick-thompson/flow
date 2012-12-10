
var context = new webkitAudioContext()
  , width = window.innerWidth
  , height = window.innerHeight
  , settings = {
      users: {},
      chunkSize: 1024,
      pathLength: 20,
      response: 0.1,
      tension: 0.9,
      inputRange: {
        low: 80,
        high: 800
      }
    }
  , socket;

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

    fn = n * context.sampleRate / settings.chunkSize;
    sumFX += fn * xn;
    sumX += xn;
  }

  return (sumX > 0) 
    ? sumFX / sumX
    : 0.0;
};

/**
 * Control flow
 * 1. Initialize a socket connection with the server, get user data.
 * 2. Acquire microphone access.
 * 3. Initialize canvas activity.
 */

async.waterfall([

  function (next) {
      
    socket = io.connect();
    socket.on("initialize", function (data) {
      var users = data.users
        , start, step;

      for (var prop in users) {

        start = width - 252;
        step = start / settings.pathLength;
        users[prop].path = [];

        for (var i = 0; i < settings.pathLength; i++) {

          users[prop].path.push({
            x: start,
            y: 0.0
          });
          start -= step;
        }
      }
      settings.id = data.you.id;
      settings.color = data.you.color;
      settings.users = data.users;
      next(null);
    });

    socket.on("data", function (data) {
      // Make sure to re-scale height here according to local height
      data.data *= height;
      settings.users[data.id].queue.push(data.data);
    });

    socket.on("userJoined", function (user) {
      var start = width - 252
        , step = start / settings.pathLength

      user.path = [];
      for (var i = 0; i < settings.pathLength; i++) {
        user.path.push({
          x: start,
          y: 0.0
        });
        start -= step;
      }

      settings.users[user.id] = user;
    });

    socket.on("userLeft", function (id) {
      delete settings.users[id];
    });

  },

  function (next) {

    navigator.webkitGetUserMedia({ audio: true }, function (stream) {
      var source = context.createMediaStreamSource(stream)
        , processor = context.createJavaScriptNode(settings.chunkSize, 1, 1)
        , fft = new FFT(settings.chunkSize, context.sampleRate);

      processor.onaudioprocess = window.audioProcess = function (e) {
        var data = e.inputBuffer.getChannelData(0)
          , denom = Math.log(settings.inputRange.high)
          , f;

        fft.forward(data);
        f = spectralCentroid(fft.spectrum);
        if (f > settings.inputRange.low && f < settings.inputRange.high) {
          f = Math.floor((Math.log(f) / denom) * height);
          settings.users[settings.id].queue.push(f);

          // Scale f by window height for the other users
          socket.emit("data", (f / height));
        }
      };

      source.connect(processor);
      processor.connect(context.destination);
      next(null);
    });

  },

  function (next) {

    settings.sketch = Sketch.create({

      container: document.getElementById("container"),

      update: function () {
        for (var prop in settings.users) {
          var user = settings.users[prop]
            , next, scaleFactor;

          for (var i = 0, n = user.path.length; i < n; i++) {
            // Better tension calculation??
            next = user.path[i - 1] || { y: user.queue.shift() || 0.0 };
            scaleFactor = ((n - i) / n) * settings.response;
            user.path[i].y += (next.y - user.path[i].y) * scaleFactor;
          }
        }
      },

      draw: function () {
        this.globalCompositeOperation = "lighter";
        for (var prop in settings.users) {
          var user = settings.users[prop];
          this.beginPath();
          this.strokeStyle = user.color;
          this.lineWidth = 2;
          this.lineCaps = "round";
          this.curveThroughPoints(user.path);
          this.stroke();
          this.closePath();
        }
      },

      curveThroughPoints: function (points) {
        var i, n, a, b, x, y;
        for (i = 1, n = points.length - 2; i < n; i++) {
          a = points[i];
          b = points[i + 1];
          x = (a.x + b.x) * 0.5;
          y = (a.y + b.y) * 0.5;
          this.quadraticCurveTo(a.x, a.y, x, y);
        }

        a = points[i];
        b = points[i + 1];
        this.quadraticCurveTo(a.x, a.y, b.x, b.y);
      }

    });

    next(null);

  }

], function (err) {
  if (err) {
    alert(err.name + ': ' + err.message);
  }
});
