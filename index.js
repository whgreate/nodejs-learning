var app = require('express').createServer(),
    io = require('socket.io').listen(app);

app.listen(80);

app.get('/', function(req,res){
	//res.send('hello world from express module !');
	res.sendfile(__dirname + '/index.html');
});

io.sockets.on('connection',function(socket){
	//send message to client
	console.log("1.sending data to client");
	socket.emit('news', {hello:'world'});
	socket.on('my other event', function(data){
		console.log("4.receiving data from client");
		console.log(data);
	});

	//broadcast message to all users except current user
	//socket.broadcast.emit('user connected');

	//broadcast message to all clients
	//io.sockets.emit('all users');
});


