function createGrid(width = 13, height = 13) {
    let grille = [];

    for (let y = 0; y < height; y++) {
        let ligne = [];
        for (let x = 0; x < width; x++) {
            // Murs extérieurs                                              et piliers fixes prend la valeur : 1
            if (y === 0 || y === height - 1 || x === 0 || x === width - 1 || (y % 2 === 0 && x % 2 === 0)) {
                ligne.push(1);
            } 
            // Espace libre autour des joueurs prend des valeurs : 0
            else if ((x <= 2 && y <= 2) || (x >= width - 3 && y >= height - 3)) {
                ligne.push(0);
            } 
            // Apparition de Murs cassables de maniere aléatoire (prend la valeur : 2) ou vides (0)
            else {
                ligne.push(Math.random() < 0.5 ? 2 : 0);
            }
        }
        grille.push(ligne);
    }
    return grille;
}

module.exports = { createGrid };