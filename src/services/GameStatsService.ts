import { Db } from "../Db";
import { Game } from "../models/Game";
import { SHL } from "../ShlClient";


class GameStatsService {
    client: SHL
    db: Db<Record<string, GameStats>>

    constructor(client: SHL) {
        this.client = client
        this.db = new Db<Record<string, GameStats>>('game_stats')
    }

    update(game: Game): Promise<GameStats | undefined> {
        return this.updateGame(game.game_uuid, game.game_id)
    }

    updateGame(game_uuid: string, game_id: string): Promise<GameStats | undefined> {
        return this.client.getGameStats(game_uuid, game_id).then(stats => {
            if (!stats || stats.recaps == undefined) {
                return Promise.resolve(undefined)
            }
            return this.db.read().then(old => {
                const toWrite = old || {}
                toWrite[game_uuid] = this.normalize(stats)

                return this.db.write(toWrite).then(e => stats)
            })
        })
    }

    get(game_uuid: string, game_id: string): Promise<GameStats | undefined> {
        return this.db.read().then(map => {
            const stored = map?.[game_uuid]
            if (stored) {
                return stored
            }
            return this.updateGame(game_uuid, game_id)
        })
    } 

    private normalize(stats: GameStats): GameStats {
        delete stats.playersByTeam
        if (Array.isArray(stats.recaps.gameRecap)) {
            // gameRecap is empty array if empty, convert to undefined instead
            stats.recaps.gameRecap = undefined
        }
        return stats
    }
}

export {
    GameStatsService
}