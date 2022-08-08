import { Game } from "../models/Game";
import { GameStats } from "../models/GameStats";
import { Service } from "../Service";
import { SHL } from "../ShlClient";
import { GameStatsService } from "./GameStatsService";

class SeasonService extends Service<Game[]> {
    shl: SHL
    season: number
    gameStats: GameStatsService

    constructor(season: number, expiryDelta: number, shl: SHL, gameStats: GameStatsService) {
        super(`games_${season}`, [], () => Promise.resolve([]), expiryDelta)
        this.shl = shl
        this.season = season
        this.gameStats = gameStats
        this.service = this.seasonService.bind(this)
        this.updateFromStats = this.updateFromStats.bind(this)
    }

    seasonService(): Promise<Game[]> {
        // get all games for season
        return this.shl.getGames(this.season.toString()).then(games => {
            return games.map(g => SeasonService.populate(g, this.gameStats.getFromDb(g.game_uuid)))
        })
    }

    updateFromStats(game_uuid: string, stats: GameStats | undefined): Promise<any> {
        if (!stats) {
            return Promise.resolve()
        }
        return this.read().then(allGames => {
            const gameIndex = allGames.findIndex(e => e.game_uuid == game_uuid)
            if (gameIndex < 0) {
                return Promise.resolve([])
            }
            allGames[gameIndex] = SeasonService.populate(allGames[gameIndex], stats)
            return this.write(allGames)
        })
    }

    static getLiveGames(games: Game[]): Game[] {
        const now = new Date()
        const hasHappened = (date: Date) => new Date(date) < now
        const isLive = (g: Game) => !g.played && hasHappened(g.start_date_time)

        return games?.filter(isLive) || []
    }

    static populate(g: Game, stats: GameStats | undefined): Game {
        if (!stats) return g
        return {
            ...g,
            away_team_result: stats.getAwayResult(),
            home_team_result: stats.getHomeResult(),
            played: stats.isPlayed(),
            period: stats.getCurrentPeriod()
        }
    }
}

export {
    SeasonService,
}