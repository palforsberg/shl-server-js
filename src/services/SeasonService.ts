import { Game, GameStatus } from "../models/Game";
import { Service } from "../Service";
import { SHL } from "../ShlClient";
import { GameReport, GameReportService, getStatusFromGameReport } from "./GameReportService";

class SeasonService extends Service<Game[]> {
    shl: SHL
    season: number
    gameReports: GameReportService
    gameIdToGameUuid: Record<number, string>

    constructor(
        season: number,
        expiryDelta: number,
        shl: SHL,
        gameReports: GameReportService) {
        super(`games_${season}`, [], () => Promise.resolve([]), expiryDelta)
        this.shl = shl
        this.season = season
        this.gameReports = gameReports
        this.gameIdToGameUuid = {}
        this.service = this.seasonService.bind(this)
        this.updateFromReport = this.updateFromReport.bind(this)
        this.populateGameIdCache = this.populateGameIdCache.bind(this)
    }

    seasonService(): Promise<Game[]> {
        // get all games for season
        return this.shl.getGames(this.season.toString()).then(games => {
            if (Object.keys(this.gameIdToGameUuid).length == 0) {
                games.forEach(g => {
                    this.gameIdToGameUuid[g.game_id] = g.game_uuid
                })
            }
            return games.map(g => {
                const report = this.gameReports.getFromCache(g.game_uuid)
                return SeasonService.populateFromReport(g, report)
            })
        })
    }

    async populateGameIdCache() {
        const db = await this.getDb().read()
        const games = db?.data ?? []
        games.forEach(g => {
            this.gameIdToGameUuid[g.game_id] = g.game_uuid
        })
    }

    updateFromReport(report: GameReport): Promise<any> {
        return this.read().then(allGames => {
            const gameIndex = allGames.findIndex(e => e.game_uuid == report.gameUuid)
            if (gameIndex < 0) {
                return Promise.resolve([])
            }
            allGames[gameIndex] = SeasonService.populateFromReport(allGames[gameIndex], report)
            return this.write(allGames, false)
        })
    }

    static getLiveGames(games: Game[], minutesDiff = 0): Game[] {
        const now = new Date()
        now.setMinutes(now.getMinutes() + minutesDiff)
        const hasHappened = (date: Date) => new Date(date) < now
        const isLive = (g: Game) => !g.played && hasHappened(g.start_date_time)

        return games?.filter(isLive) || []
    }

    static populateFromReport(g: Game, report: GameReport | undefined): Game {
        if (report == undefined) return {
            ...g,
            status: SeasonService.getGameStatusForNonStats(g),
        }
        const status = getStatusFromGameReport(report)
        return {
            ...g,
            away_team_result: report.awayScore,
            home_team_result: report.homeScore,
            played: status == GameStatus.Finished || g.played,
            penalty_shots: report.period == 99 || g.penalty_shots,
            overtime: report.period == 4 || g.overtime,
            gametime: report.gametime,
            status,
        }
    }

    /** 
     * Approximate GameStatus given only information in Game
     */
    static getGameStatusForNonStats(g: Game): GameStatus {
        if (g.played) {
            return GameStatus.Finished
        }
        const twoHoursAgo = new Date()
        twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)
        if (new Date(g.start_date_time) < twoHoursAgo) {
            // game started two hours ago, surely finished
            return GameStatus.Finished
        }
        return GameStatus.Coming
    }
}

export {
    SeasonService,
}