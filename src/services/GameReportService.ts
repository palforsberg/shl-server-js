import { Db } from "../Db"

interface GameReport {
    gameUuid: string

    gametime: string
    timePeriod: number
    statusString: string
    gameState: string
    period: number

    homeScore: number
    awayScore: number
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
}