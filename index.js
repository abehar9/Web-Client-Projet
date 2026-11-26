const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { createGrid } = require('./game/game.js'); 
const Player = require('./game/player.js'); 
const MOVE_DELAY = 150;
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
const bombs = {}; // key: `${gridX},${gridY}`

// Define the 4 classic Bomberman corner spawn points
const spawnPoints = [
    { x: 1, y: 1 },                         // Top-Left
    { x: GRID_WIDTH - 2, y: GRID_HEIGHT - 2 }, // Bottom-Right (11, 11)
    { x: GRID_WIDTH - 2, y: 1 },             // Top-Right (11, 1)
    { x: 1, y: GRID_HEIGHT - 2 }             // Bottom-Left (1, 11)
];

const MAX_PLAYERS = spawnPoints.length;
io.on('connection', (socket) => {
    console.log(`Joueur connecté : ${socket.id}`);

    if (Object.keys(players).length >= MAX_PLAYERS) {
        socket.emit('roomFull');
        socket.disconnect(true);
        return;
    }
    
    // Initialisation du joueur à sa position de départ
    // Determine the next spawn point based on the number of connected players
    const spawnIndex = Object.keys(players).length % spawnPoints.length ;

    const usedNums = new Set(Object.values(players).map(p => p.num));
    let playerNum = 0;
    while (usedNums.has(playerNum) && playerNum < spawnPoints.length) {
        playerNum++;
    }
    
    playerNum = playerNum % spawnPoints.length;

    console.log("spawnIndex: ", spawnIndex)
    const spawn = spawnPoints[spawnIndex];
    players[socket.id] = new Player(socket.id, spawn.x, spawn.y, playerNum);

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

        // Anti-spam : vitesse limitée, avec 10 ms de tolérance pour la gigue réseau
        const now = Date.now();
        if (player.lastMove && now - player.lastMove < MOVE_DELAY - 10) return;

        let newX = player.x;
        let newY = player.y;

        if (direction === 'up') newY--;
        else if (direction === 'down') newY++;
        else if (direction === 'left') newX--;
        else if (direction === 'right') newX++;

        if (
            newY >= 0 && newY < gameGrid.length &&
            newX >= 0 && newX < gameGrid[0].length &&
            gameGrid[newY][newX] === 0
        ) {
            player.x = newX;
            player.y = newY;
            player.direction = direction;
            player.lastMove = now;

            //checks if touched another player
            const otherPlayer = Object.values(players).find(
                (p) => p.id !== player.id && p.alive && p.x === newX && p.y === newY
            );
    
            if (otherPlayer) {
                handlePlayerDeath(player, io);
                return;
            }

            io.emit('updatePlayerPosition', player);
        }
    });

    // Gestion de la déconnexion d'un joueur
    socket.on('disconnect', () => {
        console.log(`Joueur déconnecté : ${socket.id}`);
        delete players[socket.id];
        io.emit('removePlayer', socket.id);
    });

    socket.on('placeBomb', () => {
        const player = players[socket.id];
        if (!player) return;

        // 1. Check player's active bomb limit
        if (player.activeBombs >= player.maxBombs) return;

        // 2. Snap to current grid tile and prevent stacking two bombs on one tile
        const bx = Math.round(player.x);
        const by = Math.round(player.y);
        const key = `${bx},${by}`;
        if (bombs[key]) return;

        // 3. Create bomb and broadcast to all clients
        player.activeBombs++;
        const bomb = { id: key, ownerId: player.id, x: bx, y: by, range: player.bombRange };
        bombs[key] = bomb;
        io.emit('bombPlaced', bomb);

        // 4. Detonate after 3 seconds
        setTimeout(() => {
            delete bombs[key];
            if (players[player.id]) {
                players[player.id].activeBombs--;
            }

            // --- START: Scan blast & update gameGrid ---
            const destroyedTiles = [];
            const flames = [{ x: bx, y: by, kind: 'center', dir: null }];
            const directions = [
                { name: 'up', dx: 0, dy: -1 },
                { name: 'down', dx: 0, dy: 1 },
                { name: 'left', dx: -1, dy: 0 },
                { name: 'right', dx: 1, dy: 0 }
            ];

            for (const { name, dx, dy } of directions) {
                for (let step = 1; step <= bomb.range; step++) {
                    const tx = bx + dx * step;
                    const ty = by + dy * step;

                    if (ty < 0 || ty >= gameGrid.length || tx < 0 || tx >= gameGrid[0].length) {
                        break;
                    }

                    const tile = gameGrid[ty][tx];

                    if (tile === 1) {
                        break;
                    }

                    if (tile === 2) {
                        gameGrid[ty][tx] = 0;
                        destroyedTiles.push({ x: tx, y: ty, value: 0 });
                        flames.push({ x: tx, y: ty, kind: 'end', dir: name });
                        break;
                    }

                    const kind = step === bomb.range ? 'end' : 'side';
                    flames.push({ x: tx, y: ty, kind, dir: name });
                }
            }
            // --- END: Scan blast & update gameGrid ---

            const flameKeys = new Set(flames.map((f) => `${f.x},${f.y}`));
            console.log('Blast tiles:', [...flameKeys], 'Players:', Object.values(players).map(p => ({
                id: p.id, x: p.x, y: p.y, alive: p.alive, lives: p.lives
            })));

            for (const p of Object.values(players)) {
                if (p.alive && flameKeys.has(`${p.x},${p.y}`)) {
                    handlePlayerDeath(p, io);
                }
            }

            io.emit('bombExploded', {
                id: key,
                x: bx,
                y: by,
                range: bomb.range,
                destroyedTiles,
                flames
            });
        }, 3000);
    });
});

function handlePlayerDeath(player, io) {
    if (!player || !player.alive) return;

    const died = player.takeDamage(1);
    console.log(`Player ${player.id} hit! lives=${player.lives}, alive=${player.alive}, died=${died}`);

    if (died) {
        io.emit('playerDied', { id: player.id, x: player.x, y: player.y });
        delete players[player.id];
        io.emit('removePlayer', player.id);
    } else {
        io.emit('updatePlayerPosition', player);
    }
}

server.listen(8080, () => {
    console.log('Serveur lancé sur http://localhost:8080');
});