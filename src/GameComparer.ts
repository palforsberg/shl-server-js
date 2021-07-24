
import { Game } from './models/Game'
import { GameEvent } from './models/GameEvent'

function compare(oldLiveGames: Game[], newLiveGames: Game[]): GameEvent[] {

    const result: GameEvent[] = []
    const oldIds: Record<string,Game> = arrToMap(oldLiveGames, e => e.game_uuid)
    const newIds = arrToMap(newLiveGames, e => e.game_uuid)


    Object.keys(newIds).filter(e => oldIds[e] == undefined).forEach(e => {
        result.push(GameEvent.began(newIds[e]))
    })
    Object.keys(oldIds).filter(e => newIds[e] == undefined).forEach(e => {
        result.push(GameEvent.ended(oldIds[e]))
    })
    const ongoing = Object.keys(oldIds).filter(e => newIds[e] !== undefined)
    ongoing.forEach(e => {
        const old = oldIds[e]
        const updated = newIds[e]
        /**
         * there is a risk that a goal is made within the first or last 3 seconds of a game
         * in this case it'll not be picked up here but will be considered as a new or ended game
         */
        if (old.home_team_result < updated.home_team_result) {
            result.push(GameEvent.scored(updated))
        }
        if (old.home_team_result > updated.home_team_result) {
            result.push(GameEvent.scored(updated))
        }
        if (old.away_team_result < updated.away_team_result) {
            result.push(GameEvent.scored(updated))
        }
        if (old.away_team_result > updated.away_team_result) {
            result.push(GameEvent.scored(updated))
        }
    })

    return result
}

function arrToMap<V>(arr:V[] , keyMapper: (a: V) => string): Record<string,V> {
    const map: Record<string,V> = {}
    arr.forEach(e => map[keyMapper(e)] = e)
    return map
}

export {
    compare
}