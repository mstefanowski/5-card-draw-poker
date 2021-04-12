var http = require('http');
var fs = require('fs');
var socket = require('socket.io');
const { Console } = require('console');
var html = fs.readFileSync("index.html");


class Card {
	constructor(rank, suit) {
		this.rank = rank;
		this.suit = suit;
	}

	equals(that) {
		return (this.rank == that.rank
			&& this.suit == that.suit);
	}

	getRank() {
		return this.rank;
	}

	getSuit() {
		return this.suit;
	}

	get [Symbol.toStringTag]() {
		return ranks[this.rank] + " " + suits[this.suit];
	}
}

var suits = ["C", "D", "H", "S"];
var ranks = [null, "A", "2", "3", "4", "5", "6",
	"7", "8", "9", "10", "J", "Q", "K"];


var deck = [];

var index = 0;
for (var suit = 0; suit <= 3; suit++) {
	for (var rank = 1; rank <= 13; rank++) {
		deck[index] = new Card(rank, suit);
		index++;
	}
}

var i = 1;
var rozmowa = [];
var moves = [];
var td = [];
var last = 0;
var players = [];
var winner = undefined;
var hands = [];

var count = 0;

var isSwapped = [];




//create a server object
var server = http.createServer(function (req, res) { // function to handle request
	if (req.url.endsWith('.png')) {
		res.writeHead(200, { "Content-Type": "image/png" });
		var fileName = req.url.split("/")[2];
		res.write(fs.readFileSync("PNG/" + fileName))
		res.end();
	} else {
		res.write(html)
		res.end();
	}
});

var io = socket(server);

io.on('connection', function (socket) {
	// powstaje nowy socket przez który będziemy gadać z kolejnym klientem
	socket.id = i++;

	// wysyłamy wartość nadanego id
	socket.emit("id", socket.id)

	// wysyłamy dotychczasowy przebieg rozmowy
	for (let msg of rozmowa)
		socket.emit('chat message', msg);


	for (let x of moves)
		socket.emit('move', x);

	// ustawiamy sposób reakcji na otrzymywane wiadomości
	socket.on('chat message', function (msg) {
		rozmowa.push(msg)             // zapamiętaj  
		io.emit('chat message', msg); // i wyślij do wszystkich
	})

	socket.on('nick', function (nick) {
		socket.nick = nick;
		socket.emit('chat message', "Witaj " + nick + "!"); // i wyślij do wszystkich
	})

	socket.on('game start', function () {
		if (!players.includes(socket))
			if (players[0] == undefined)
				players[0] = socket;
			else if (players[1] == undefined) {
				players[1] = socket;

				//rozdanie
				hands = rozdanie(deck);
				io.emit('chat message', "Gra: " + info(players[0]) + " vs " + info(players[1]))
				players[0].emit('hand', hands[0]);
				players[1].emit('hand', hands[1]);

				
			}
	})

	socket.on('swapCards', function (swapIndexes) {
		if (socket == players[0]){
			var swapCards = getCards(deck, swapIndexes.length);
			for(var i=0; i<swapIndexes.length; i++){
				hands[0][swapIndexes[i]] = swapCards[i]
			}
			count++
		}
		if (socket == players[1]){
			var swapCards = getCards(deck, swapIndexes.length);
			for(var i=0; i<swapIndexes.length; i++){
				hands[1][swapIndexes[i]] = swapCards[i]
			}
			count++
		}

		if(count == 2){
			players[0].emit('getCards', hands[0]);
			players[1].emit('getCards', hands[1]);

			players[0].emit('getOppCards', hands[1]);
			players[1].emit('getOppCards', hands[0]);
		}
	})





	

	socket.on('reset', function (msg) {
		rozmowa = [];
		moves = [];
		td = [];
		last = '';
		winner = undefined;
		players = [];
		io.emit('reset', msg); // do wszystkich
	})

	socket.on("disconnect", function (msg) {
		if (players.includes(socket)) {
			let [a, b] = players;
			winner = socket == a ? b : a;
			let msg = info(socket) + " się rozłączył. Gra przerwana. " + info(winner) + " wygrywa!";
			io.emit('chat message', msg);
			rozmowa.push(msg);
		}
	});
});


function rozdanie(talia) {
	var hand1 = [];
	var hand2 = [];

	for (var i = 0; i < 5; i++) {
		var num1 = Math.floor(Math.random() * (talia.length));
		hand1.push(talia[num1])
		talia.splice(num1, 1);
		var num2 = Math.floor(Math.random() * (talia.length));
		hand2.push(talia[num2])
		talia.splice(num2, 1);
	}

	return [hand1, hand2];
}

function getCards(talia, n) {
	var cards = [];
	for (var i = 0; i < n; i++) {
		var num1 = Math.floor(Math.random() * (talia.length));
		cards.push(talia[num1])
		talia.splice(num1, 1);
	}

	return cards;
}

server.listen(1111);

function info(player) {
	return player.nick + " (" + player.id + ")";
}