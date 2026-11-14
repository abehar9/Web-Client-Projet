const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createGrid } = require('./game/game.js'); 
const Player = require('./game/player.js'); 

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sert les fichiers statiques du dossier public
app.use(express.static('public'));

// Génération de la grille de jeu initiale

const GRID_WIDTH = 13;
const GRID_HEIGHT = 13;
const gameGrid = createGrid(GRID_WIDTH, GRID_HEIGHT);
const players = {}; 

// Define the 4 classic Bomberman corner spawn points
const spawnPoints = [
    { x: 1, y: 1 },                         // Top-Left
    { x: GRID_WIDTH - 2, y: GRID_HEIGHT - 2 }, // Bottom-Right (11, 11)
    { x: GRID_WIDTH - 2, y: 1 },             // Top-Right (11, 1)
    { x: 1, y: GRID_HEIGHT - 2 }             // Bottom-Left (1, 11)
];
io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);
    
    // Initialisation du joueur à sa position de départ
    // Determine the next spawn point based on the number of connected players
    const spawnIndex = Object.keys(players).length % spawnPoints.length;
    const spawn = spawnPoints[spawnIndex];

    // Initialisation du joueur à sa position de départ unique
    players[socket.id] = new Player(socket.id, spawn.x, spawn.y);

    // Informe les autres participants de l'arrivée d'un nouveau joueur
    socket.broadcast.emit('newPlayer', players[socket.id]);

    // Envoi des données de jeu lorsque le client est prêt à les recevoir
    socket.on('requestGameData', () => {
        socket.emit('initGrid', gameGrid);
        socket.emit('currentPlayers', players);
    });

    // Gestion des déplacements avec validation des collisions sur la grille
    socket.on('playerMove', (direction) => {
        const player = players[socket.id];
        if (!player) return;

        let newX = player.x;
        let newY = player.y;

        if (direction === 'up') newY--;
        else if (direction === 'down') newY++;
        else if (direction === 'left') newX--;
        else if (direction === 'right') newX++;

        // Vérification des limites de la grille et si la case est libre (0)
        if (
            newY >= 0 && newY < gameGrid.length &&
            newX >= 0 && newX < gameGrid[0].length &&
            gameGrid[newY][newX] === 0
        ) {
            player.x = newX;
            player.y = newY;
            player.direction = direction;
            io.emit('updatePlayerPosition', player);
        }
    });

    // Gestion de la déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log(`Joueur déconnecté : ${socket.id}`);
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });
});

server.listen(8080, () => {
    console.log('Serveur lancé sur http://localhost:8080');
});