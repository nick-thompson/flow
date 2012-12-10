
var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , users = {}
  , colors = ['#aaee22', '#04dbe5', '#ff0077', '#ffb412', '#f6c83d'];

app.configure(function () {
  app.use(express.static(__dirname + '/public'));
});

app.get('/', function (req, res) {
  res.sendfile('public/index.html');
});


server.listen(8000);
io.sockets.on('connection', function (socket) {

  // Track the user
  var user = {
    id: socket.id,
    color: colors[~~( Math.random() * 5 )],
    queue: []
  };

  users[socket.id] = user;

  // Define disconnect event
  socket.on('disconnect', function () {
    delete users[socket.id];
    socket.broadcast.emit('userLeft', socket.id);
  });

  // Forward data from a single socket to ever other connected client
  socket.on('data', function (data) {
    socket.broadcast.emit('data', {
      data: data,
      id: socket.id
    });
  });

  // Let active users know about the new guy
  socket.broadcast.emit('userJoined', user);

  // Return a state object
  socket.emit('initialize', {
    you: user,
    users: users
  });

});
