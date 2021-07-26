import { Db } from "./Db";
import { Game } from "./models/Game";
import { SHL } from "./ShlClient";


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
            if (!stats) {
                return Promise.resolve(undefined)
            }
            return this.db.read().then(old => {
                delete stats.playersByTeam
                const toWrite = old || {}
                toWrite[game_uuid] = stats

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
}

export {
    GameStatsService
}