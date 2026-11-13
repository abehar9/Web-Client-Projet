const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createGrid } = require('./game/game.js'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sert les fichiers du dossier "public" (dont index.html)
app.use(express.static('public'));

// Génération de la grille de la partie
const gameGrid = createGrid(13, 13);

io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);
    
    // Envoie la grille au joueur qui vient de se connecter
    socket.emit('initGrid', gameGrid);
});

server.listen(8080, () => {
    console.log('Serveur lancé sur http://localhost:8080');
});