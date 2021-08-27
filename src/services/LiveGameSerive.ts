import { Game } from "../models/Game";
import { Service } from "../Service";

class LiveGameService extends Service<Game[]> {

    constructor(currentSeason: Service<Game[]>) {
        super('live_games', () => currentSeason.db.read().then(this.getLiveGames))
    }
     
    getLiveGames(games: Game[]): Game[] {
        const now = new Date()
        const hasHappened = (date: Date) => new Date(date) < now
        const isLive = (g: Game) => !g.played && hasHappened(g.start_date_time)

        return games?.filter(isLive) || []
     }
}

export {
    LiveGameService,
}