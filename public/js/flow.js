
var context = new webkitAudioContext()
  , width = window.innerWidth
  , height = window.innerHeight
  , settings = {
      users: {},
      chunkSize: 4096,
      pathLength: 20,
      response: 0.1,
      tension: 0.9,
      inputRange: {
        low: 200,
        high: 800
      },
      inputThreshold: 0.001
    }
  , socket;

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
        , lowpass = context.createBiquadFilter()
        , fft = new FFT(settings.chunkSize, context.sampleRate)
        , maxFreq = settings.inputRange.high - settings.inputRange.low;

      lowpass.type = 1;
      lowpass.frequency.value = settings.inputRange.high;

      processor.onaudioprocess = window.audioProcess = function (e) {
        var data = e.inputBuffer.getChannelData(0)
          , max = 0.0
          , idx = 0
          , spectrum, pitch;

        fft.forward(data);
        spectrum = fft.spectrum;
        for (var i = 0, n = spectrum.length; i < n; i++) {
          if (spectrum[i] > max) {
            max = spectrum[i];
            idx = i;
          }
        }

        if (max > settings.inputThreshold) {

          pitch = idx * context.sampleRate / settings.chunkSize;

          // Check boundaries
          pitch = (pitch < settings.inputRange.low)
            ? settings.inputRange.low
            : (pitch > settings.inputRange.high)
              ? settings.inputRange.high
              : pitch;

          // Scaling by window height
          pitch = ((pitch - settings.inputRange.low) / maxFreq) * height;

          settings.users[settings.id].queue.push(pitch);

          // Scale position by window height for the other users
          socket.emit("data", (pitch / height));

        }
      };

      source.connect(lowpass);
      lowpass.connect(processor);
      processor.connect(context.destination);
      next(null);
    }, function (err) {
      delete settings.users[settings.id];
      alert("Unable to acquire microphone input :(");
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
            next = (i > 0)
              ? user.path[i - 1]
              : { y: user.queue.shift() || user.path[i].y };

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
          this.quadraticCurveTo(a.x, height - a.y, x, height - y);
        }

        a = points[i];
        b = points[i + 1];
        this.quadraticCurveTo(a.x, height - a.y, b.x, height - b.y);
      }

    });

    next(null);

  }

], function (err) {
  if (err) {
    alert(err.name + ': ' + err.message);
  }
});
