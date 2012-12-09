
/**
 * Module dependencies.
 */

var express = require('express')
  , app = express()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server)
  , users = {};

/**
 * Settings.
 */

app.configure(function () {
  app.use(express.static(__dirname + '/public'));
});

/**
 * Dispensing index.html
 */

app.get('/', function (req, res) {
  res.sendfile('public/index.html');
});

/**
 * Socketry!
 */

server.listen(8000);

io.sockets.on('connection', function (socket) {

  // Track the user
  var user = {
    id: socket.id,
    color: '#fd2567',
    queue: []
  };

  users[socket.id] = user;

  // Define disconnect event
  socket.on('disconnect', function () {
    delete users[socket.id];
  });

  // Forward data from a single socket
  // to ever other connected client
  socket.on('data', function (data) {
    socket.broadcast.emit('data', {
      data: data,
      id: socket.id
    });
  });

  // Let active users know about the new guy
  socket.broadcast.emit('newUser', user);

  // Return a state object
  socket.emit('users', {
    you: user,
    users: users
  });

});
