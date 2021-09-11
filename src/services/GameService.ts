import { Game } from "../models/Game";
import { Service } from "../Service";
import { SHL } from "../ShlClient";

class GameService {

    seasons: Record<number, Service<Game[]>>
    getCurrentSeason: () => Service<Game[]>

    constructor(currentSeason: number, numberSeasons: number, shl: SHL) {
        this.seasons = {}
        for (let i = currentSeason; i >= currentSeason - numberSeasons; i--) {
            this.seasons[i] = new Service(`games_${i}`, () => shl.getGames(i.toString()), i == currentSeason ? 0 : -1)
         }

         this.getCurrentSeason = () => this.seasons[currentSeason]
    }

    getSeason(season: number): Service<Game[]> | undefined {
        return this.seasons[season]
    }

     updateGoals(game_uuid: string, game_id: string, home_g: number | undefined, away_g: number | undefined): Promise<Game[]> {
        return this.getCurrentSeason().db.read().then(allGames => {
            const gameIndex = allGames.findIndex(e => e.game_id == game_id && e.game_uuid == game_uuid)
            if (gameIndex < 0) {
                return Promise.resolve(allGames)
            }
            if (home_g) {
                allGames[gameIndex].home_team_result = home_g 
            }
            if (away_g) {
                allGames[gameIndex].away_team_result = away_g
            }
            return this.getCurrentSeason().db.write(allGames)
        })
    }
}

export {
    GameService,
}