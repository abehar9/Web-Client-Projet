class Player {
    constructor(id, x, y, num) {
        this.id = id;       // Identifiant unique (socket.id)
        this.x = x;         // Position en X sur la grille
        this.y = y;         // Position en Y sur la grille
        this.lives = 1; 
        this.num = num;    // Nombre de vies
        this.alive = true;

        this.maxBombs = 1;     // Classic Bomberman starting limit
        this.activeBombs = 0;  // Bombs currently ticking on the grid
        this.bombRange = 1;
    }

    takeDamage(amount = 1) {
        if (!this.alive) return false;
        this.lives -= amount;
        if (this.lives <= 0) {
            this.lives = 0;
            this.alive = false;
            return true; // player died
        }
        return false; // player survived with fewer lives
    }
}

// L'exportation doit être directe :
module.exports = Player;