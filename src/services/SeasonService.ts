import { Game, GameStatus } from "../models/Game";
import { GameStats } from "../models/GameStats";
import { Service } from "../Service";
import { SHL } from "../ShlClient";
import { GameReport, GameReportService, getStatusFromGameReport } from "./GameReportService";
import { GameStatsService } from "./GameStatsService";

class SeasonService extends Service<Game[]> {
    shl: SHL
    season: number
    gameReports: GameReportService
    statsService: GameStatsService
    gameIdToGameUuid: Record<number, string>
    decorated: Game[] | undefined

    constructor(
        season: number,
        expiryDelta: number,
        shl: SHL,
        gameReports: GameReportService,
        statsService: GameStatsService) {

        super(`games_${season}`, [], () => Promise.resolve([]), expiryDelta)
        this.shl = shl
        this.season = season
        this.gameReports = gameReports
        this.statsService = statsService
        this.gameIdToGameUuid = {}
        this.decorated = undefined

        this.service = this.seasonService.bind(this) // overwrite the .season function in Service
        this.getDecorated = this.getDecorated.bind(this)
        this.cleanDecorated = this.cleanDecorated.bind(this)
        this.decorate = this.decorate.bind(this)
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
            this.decorated = this.decorate(games)
            return this.decorated
        })
    }

    async getDecorated(): Promise<Game[]> {
        if (!this.decorated) {
            const games = await this.read()
            this.decorated = this.decorate(games)
        }
        return this.decorated
    }

    cleanDecorated() {
        this.decorated = undefined
    }

    private decorate(games: Game[]): Game[] {
        console.log('[SEASON] Redecorate')
        return games.map(g => {
            const report = this.gameReports.getFromCache(g.game_uuid)
            const stats = this.statsService.getFromCache(g.game_uuid)
            return SeasonService.populateFromReport(g, report, stats)
        })
    }

    async populateGameIdCache() {
        const db = await this.getDb().read()
        const games = db?.data ?? []
        games.forEach(g => {
            this.gameIdToGameUuid[g.game_id] = g.game_uuid
        })
    }

    static getLiveGames(games: Game[], minutesDiff = 0): Game[] {
        const now = new Date()
        now.setMinutes(now.getMinutes() + minutesDiff)
        const hasHappened = (date: Date) => new Date(date) < now
        const isLive = (g: Game) => !g.played && hasHappened(g.start_date_time)

        return games?.filter(isLive) || []
    }

    static populateFromReport(g: Game, report: GameReport | undefined, stats: GameStats | undefined): Game {
        if (report == undefined && stats == undefined) return {
            ...g,
            status: SeasonService.getGameStatusForNonStats(g),
        }
        if (report != undefined) {
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
        } else {
            const status = stats!.status
            return {
                ...g,
                away_team_result: stats!.getAwayResult(),
                home_team_result: stats!.getHomeResult(),
                played: status == GameStatus.Finished || g.played,
                penalty_shots: status == GameStatus.Shootout || g.penalty_shots,
                overtime: status == GameStatus.Overtime || g.overtime,
                gametime: undefined,
                status,
            }
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