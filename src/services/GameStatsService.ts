import { Db } from "../Db";
import { Game } from "../models/Game";
import { SHL } from "../ShlClient";
import { GameService } from "./GameService";


class GameStatsService {
    client: SHL
    db: Db<Record<string, GameStats>>
    gameService: GameService

    constructor(client: SHL, gameService: GameService) {
        this.client = client
        this.db = new Db<Record<string, GameStats>>('game_stats')
        this.gameService = gameService

        this.update = this.update.bind(this)
        this.getAndPush = this.getAndPush.bind(this)
        this.pushToGameService = this.pushToGameService.bind(this)
        this.updateGame = this.updateGame.bind(this)
        this.get = this.get.bind(this)
    }

    update(game: Game): Promise<GameStats | undefined> {
        if (game == undefined){
            return Promise.resolve(undefined)
        }
        return this.updateGame(game.game_uuid, game.game_id).then(e => {
            return this.pushToGameService(game, e)
        })
    }

    getAndPush(game: Game): Promise<GameStats | undefined> {
        if (game == undefined){
            return Promise.resolve(game)
        }
        return this.get(game.game_uuid, game.game_id).then(e => this.pushToGameService(game, e))
    }

    pushToGameService(game: Game, gameStats: GameStats | undefined): Promise<GameStats | undefined> {
        if (gameStats == undefined || gameStats.recaps == undefined) {
            return Promise.resolve(gameStats)
        }
        return this.gameService
                .updateGoals(game.game_uuid, game.game_id, gameStats.recaps.gameRecap?.homeG, gameStats.recaps.gameRecap?.awayG)
                .then(a => gameStats)
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
        }).catch(e => {
            console.error('[SERVICE] Failed to update GameStats', game_uuid, e?.toString())
            return this.getFromDb(game_uuid, game_id)
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

    private getFromDb(game_uuid: string, game_id: string): Promise<GameStats | undefined> {
        return this.db.read().then(map => {
            const stored = map?.[game_uuid]
            return Promise.resolve(stored)
        })
    }

    private normalize(stats: GameStats): GameStats {
        if (stats.recaps && Array.isArray(stats.recaps.gameRecap)) {
            // gameRecap is empty array if empty, convert to undefined instead
            stats.recaps.gameRecap = undefined
        }
        return stats
    }
}

export {
    GameStatsService
}