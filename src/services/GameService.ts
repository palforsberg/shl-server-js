import { Game } from "../models/Game";
import { Service } from "../Service";
import { SHL } from "../ShlClient";

class GameService extends Service<Game[]> {
    constructor(season: number, currentSeason: number, shl: SHL) {
        super(`games_${season}`, () => shl.getGames(season.toString()), season == currentSeason ? 0 : -1)
    }
}

export {
    GameService,
}