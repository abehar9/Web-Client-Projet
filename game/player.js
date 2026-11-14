class Player {
    constructor(id, x, y) {
        this.id = id;       // Identifiant unique (socket.id)
        this.x = x;         // Position en X sur la grille
        this.y = y;         // Position en Y sur la grille
        this.lives = 3;     // Nombre de vies
    }
}

// L'exportation doit être directe :
module.exports = Player;