
import { GameEvent } from './models/GameEvent'
import { GameStats, Player } from './models/GameStats'

function compare(games: [GameStats | undefined, GameStats | undefined]): GameEvent | undefined {
    const old = games[0] || GameStats.empty()
    const updated = games[1] || GameStats.empty()
    
    if (!old.isLive() && updated.isLive()) {
        return GameEvent.began(updated!)
    } else if (!old.isPlayed() && updated.isPlayed()) {
        return GameEvent.ended(updated!)
    }

    if (old.getHomeResult() < updated.getHomeResult()) {
        const scorer = getScorer(old.getHomeTeam(), updated.getHomeTeam())
        return GameEvent.scored(updated!, updated.getHomeTeamId(), scorer)
    }
    if (old.getAwayResult() < updated.getAwayResult()) {
        const scorer = getScorer(old.getAwayTeam(), updated.getAwayTeam())
        return GameEvent.scored(updated!, updated.getAwayTeamId(), scorer)
    }
    return undefined
}

function getScorer(old: Player[], updated: Player[]): Player | undefined {
    const updatedById = arrToMap(updated, e => e.player)

    for (const e of old) {
        const u = updatedById[e.player]
        if (u == undefined) continue;
        if ((u.g || 0) > (e.g || 0)) {
            return u;
        }
    }
    return undefined
}

function arrToMap<V>(arr:V[] , keyMapper: (a: V) => string | number): Record<string | number, V> {
    const map: Record<string | number, V> = {}
    arr.forEach(e => map[keyMapper(e)] = e)
    return map
}

export {
    compare
}