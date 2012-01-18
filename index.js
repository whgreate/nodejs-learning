var express = require('express');
var app = express.createServer(),
	fs=require('fs'),
	url = require('url'),
    io = require('socket.io').listen(app);

var parseCookie = require('connect').utils.parseCookie,
	MemoryStore = require('connect').session.MemoryStore;

var storeMemory = new MemoryStore({
			reapInterval: 60000 * 10  //ten minutes
		});
var events = require('events'),
	mongo = require('mongodb');

app.configure(function(){
		app.use(express.bodyParser());
		app.use(express.cookieParser());

		app.use(express.session({
			secret: 'wyq',
			store: storeMemory
		}));
		app.use(express.methodOverride());
		app.use(app.router);
		app.set('views',__dirname+'/views');
		app.set('view engine','jade');
		app.use(express.static(__dirname + '/public'));
	});

io.set('authorization',function(handshakeData,callback){
		handshakeData.cookie = parseCookie(handshakeData.headers.cookie);
		var connect_sid = handshakeData.cookie['connect.sid'];

		if(connect_sid){
			storeMemory.get(connect_sid,function(error,session){
				if(error)
					callback(error.message,false);
				else{
					handshakeData.session = session;
					callback(null,true);
				}
			});
		}else{
			callback('nosession');
		}
});

app.listen(80);

app.get('/', function(req,res){
	//res.send('hello world from express module !');
	
if(req.session.name && req.session.name !== ''){
		//res.sendfile(__dirname + '/views/index.html');
		res.redirect('/chat');
	}else{
		//res.sendfile(__dirname + '/views/err.html');
		var realpath = __dirname + '/views/'+url.parse('login.html').pathname;
		var txt = fs.readFileSync(realpath);
		res.end(txt);
	}
});

app.get('/chat', function(req,res){
	if(req.session.name && req.session.name !== ''){
		res.render('chat',{name:req.session.name});
	}else{
		res.redirect('/');
	}
	
});

app.post('/chat', function(req,res){
	var name = req.body.nick;
	if(name && name!==''){
		req.session.name=name;
		res.render('chat',{name:name});
	}
	else{
		res.end('nickname can\'t be null');
	}
});

app.get('/mongodb', function(req,res){
	var products_emitter = new events.EventEmitter(),
      // 创建到test数据库的链接,相当于use test
    db = new mongo.Db("test", new mongo.Server('localhost', 27017, {}), {});	
	var listener = function(products){
		var html = [], len = products.length;
     	html.push('<!DOCTYPE html>');
      	html.push('<html>');
      	html.push('<head>');
     	html.push('<title>Nodejs</title>');
      	html.push('</head>');
     	html.push('<body>');
      	if(len > 0) {
        	html.push('<ul>');
        	for(var i = 0; i < len; i++) {
          		html.push('<li>' + products[i].name + '</li>');
        	}
        	html.push('</ul>');
      	}
      	html.push('</body>');
      	html.push('</html>');
 
      	res.writeHead(200, "Content-Type: text/html");
     	res.write(html.join(''));
		res.end();
		
		
		clearTimeout(timeout);
	};	

	products_emitter.on('products',listener);
	
	//10s若还没有取到数据，则显示空
	var timeout = setTimeout(function() {
		products_emitter.emit('products', []);
		products_emitter.removeListener('products', listener);
	}, 10000);

	db.open(function(){
		db.collection('products',function(err, collection){
			collection.find(function(err, cursor){
				cursor.toArray(function(err, items){
					console.log('---'+items);
					products_emitter.emit('products', items);
				});
			});
		});
	});
});

var usersWS = {};

io.sockets.on('connection',function(socket){
	//send message to client
	console.log('-----');
	var session = socket.handshake.session;
	var name = session.name;
	usersWS[name] = socket;
	var refresh_online = function(){
		var n=[];
		for(var i in usersWS)
			n.push(i);
		io.sockets.emit('online list',n);
	};
	refresh_online();

	socket.broadcast.emit('system message','['+name+'] is comming back!');

	//public message
	socket.on('public message', function(msg, fn){
		console.log('-----received public message from '+name); 
		socket.broadcast.emit('public message',name,msg);
		fn(true);
	});

	socket.on('private message',function(to,msg,fn){
		var target = usersWS[to];
		if(target){
			fn(true);
			target.emit('private message',name+'[private message]',msg);
		}else{
			fn(false);
			socket.emit('message error',to,msg);
		}
	});


	socket.on('disconnect',function(){
		delete usersWS[name];
		session = null;
		socket.broadcast.emit('system message','['+name+'] left');
		refresh_online();
	});
	//broadcast message to all users except current user
	//socket.broadcast.emit('user connected');

	//broadcast message to all clients
	//io.sockets.emit('all users');
});


