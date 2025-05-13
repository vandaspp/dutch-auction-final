
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(__dirname + '/public'));

let auction = {
  item: null,
  price: 0,
  minPrice: 0,
  decrement: 0,
  interval: 0,
  timer: null,
  running: false
};

let users = {}; // socket.id -> nickname

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('set-nickname', (nickname) => {
    users[socket.id] = nickname;
  });

  socket.on('start-auction', (data) => {
    if (auction.running) return;
    auction = {
      ...auction,
      item: data.item,
      price: data.startPrice,
      minPrice: data.minPrice,
      decrement: data.decrement,
      interval: data.interval,
      running: true
    };

    io.emit('auction-started', auction);

    auction.timer = setInterval(() => {
      if (auction.price <= auction.minPrice) {
        clearInterval(auction.timer);
        auction.running = false;
        io.emit('auction-ended', { reason: 'no-bid' });
        return;
      }
      auction.price -= auction.decrement;
      io.emit('price-updated', { price: auction.price });
    }, auction.interval);
  });

  socket.on('bid', () => {
    if (!auction.running) return;
    clearInterval(auction.timer);
    auction.running = false;
    const nickname = users[socket.id] || socket.id;
    io.emit('auction-won', { winner: nickname, price: auction.price });
  });

  socket.on('disconnect', () => {
    delete users[socket.id];
  });
});

server.listen(3000, () => console.log('Server running on http://localhost:3000'));
