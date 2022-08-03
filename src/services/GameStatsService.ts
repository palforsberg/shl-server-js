import { Db } from "../Db";
import { Game } from "../models/Game";
import { GameStats, GameStatsIf } from "../models/GameStats";
import { SHL } from "../ShlClient";

class GameStatsService {
    client: SHL
    db: Db<Record<string, GameStatsIf>>

    constructor(client: SHL) {
        this.client = client
        this.db = new Db<Record<string, GameStatsIf>>('game_stats')

        this.update = this.update.bind(this)
        this.updateGame = this.updateGame.bind(this)
        this.getFromDbOrRefresh = this.getFromDbOrRefresh.bind(this)
        this.getFromDb = this.getFromDb.bind(this)
    }

    update(game: Game): Promise<GameStats | undefined> {
        if (game == undefined){
            return Promise.resolve(undefined)
        }
        return this.updateGame(game.game_uuid, game.game_id)
    }

    getFromDbOrRefresh(game_uuid: string, game_id: string): Promise<GameStats | undefined> {
        const cached = this.getFromDb(game_uuid)
        if (cached) {
            return Promise.resolve(cached)
        }
        return this.updateGame(game_uuid, game_id)
    } 

    getFromDb(game_uuid: string): GameStats | undefined {
        const cached = this.db.readCached()?.[game_uuid]
        if (!cached) {
            return undefined
        }
        return new GameStats(cached)
    }

    private updateGame(game_uuid: string, game_id: string): Promise<GameStats | undefined> {
        return this.client.getGameStats(game_uuid, game_id).then(stats => {
            if (!stats || stats.recaps == undefined) {
                return Promise.resolve(undefined)
            }
            return this.db.read().then(old => {
                const toWrite = old || {}
                toWrite[game_uuid] = stats

                return this.db.write(toWrite).then(e => stats)
            })
        }).catch(e => {
            console.error('[SERVICE] Failed to update GameStats', game_uuid, e?.toString())
            return Promise.resolve(this.getFromDb(game_uuid))
        })
    }
}

export {
    GameStatsService
}