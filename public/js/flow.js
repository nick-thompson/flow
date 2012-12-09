
/**
 * Global application setings
 */

var context = "hi"
  , width = window.innerWidth
  , height = window.innerHeight
  , settings = {
      context: new webkitAudioContext(),
      users: {},
      chunkSize: 1024,
      pathLength: 20,
      response: 0.1,
      tension: 0.5
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

    fn = n * settings.context.sampleRate / settings.chunkSize;
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
    socket.on('users', function (data) {
      var users = data.users
        , start, step;

      for (var prop in users) {

        start = window.innerWidth / 2;
        step = start / settings.pathLength;
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
      next(null);
    });

    socket.on('data', function (data) {
      settings.users[data.id].queue.push(data.data);
    });

    socket.on('newUser', function (user) {
      var start = window.innerWidth / 2
        , step = start / settings.pathLength

      user.path = [];
      for (var i = 0; i < settings.pathLength; i++) {
        user.path.push({
          x: start,
          y: 10.0
        });
        start -= step;
      }

      settings.users[user.id] = user;
    });

  },

  function (next) {

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
          freq -= 99;
          freq = (Math.log(freq) / Math.LN10) / (Math.log(1000) / Math.LN10);
          freq *= height;

          settings.users[settings.id].queue.push(Math.floor(freq));
          socket.emit('data', Math.floor(freq));
        }
      };

      source.connect(processor);
      processor.connect(settings.context.destination);
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
            next = user.path[i - 1] || { y: user.queue.shift() || 0.0 };
            scaleFactor = ((n - i) / n) * settings.response;
            user.path[i].y += (next.y - user.path[i].y) * scaleFactor;
          }
        }
      },

      draw: function () {
        for (var prop in settings.users) {
          var user = settings.users[prop];
          this.beginPath();
          this.strokeStyle = user.color;
          this.lineWidth = 1;
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
