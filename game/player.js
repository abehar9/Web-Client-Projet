class Player {
    constructor(id, x, y, num) {
        this.id = id;       // Identifiant unique (socket.id)
        this.x = x;         // Position en X sur la grille
        this.y = y;         // Position en Y sur la grille
        this.lives = 3; 
        this.num = num;    // Nombre de vies

        this.maxBombs = 1;     // Classic Bomberman starting limit
        this.activeBombs = 0;  // Bombs currently ticking on the grid
        this.bombRange = 1;
    }
}

// L'exportation doit être directe :
module.exports = Player;