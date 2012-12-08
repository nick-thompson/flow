
var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

app.configure(function () {
  app.use(express.static(__dirname + '/public'));
});

app.get('/', function (req, res) {
  res.sendfile('public/index.html');
});

server.listen(8000);

io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
    console.log(data);
  });
});

