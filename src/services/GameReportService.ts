import { Db } from "../Db"
import { GameStatus } from "../models/Game"

interface GameReport {
    gameUuid: string

    gametime: string
    timePeriod: number
    statusString: string
    gameState: string
    period: number

    homeTeamCode?: string
    awayTeamCode?: string
    homeScore: number
    awayScore: number

    attendance?: string
}

function getStatusFromGameReport(report: GameReport): GameStatus {
    if (report.gameState == 'GameEnded') {
        return GameStatus.Finished
    }
    if (report.gameState == 'Intermission') {
        return GameStatus.Intermission
    }
    if (report.gameState == 'NotStarted') {
        return GameStatus.Coming
    }
    if (report.gameState == 'OverTime') {
        return GameStatus.Overtime
    }
    if (report.gameState == 'ShootOut') {
        return GameStatus.Shootout
    }
    if (report.gameState == 'Ongoing') {
        return getStatusFromPeriod(report.period)
    }
    return GameStatus.Coming
}
function getStatusFromPeriod(p: number): GameStatus {
    switch (p) {
        case 1: return GameStatus.Period1
        case 2: return GameStatus.Period2
        case 3: return GameStatus.Period3
        case 4:
        case 5:
        case 6:
        case 7:
        case 8:
        case 9:
        case 10: return GameStatus.Overtime // can be multiple overtimes in playoffs
        case 99: return GameStatus.Shootout
    }
    return GameStatus.Coming
}

class GameReportService {
    db: Db<Record<string, GameReport>>

    constructor() {
        this.db = new Db('live_status', {})

        this.store = this.store.bind(this)
        this.read = this.read.bind(this)
        this.getFromCache = this.getFromCache.bind(this)
    }

    async store(status: GameReport) {
        const state = await this.db.read()
        state[status.gameUuid] = status

        await this.db.write(state)
    }

    async read(gameUuid: string): Promise<GameReport | undefined> {
        const state = await this.db.read()
        return state[gameUuid]
    }

    getFromCache(gameUuid: string): GameReport | undefined {
        return this.db.readCached()[gameUuid]
    }
}

export {
    GameReport,
    GameReportService,
    getStatusFromGameReport,
    getStatusFromPeriod,
}