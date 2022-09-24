
import { GameEvent } from './models/GameEvent'
import { GameStats, Player } from './models/GameStats'

function compare(games: [GameStats | undefined, GameStats | undefined]): GameEvent[] {
    const old = games[0] || GameStats.empty()
    const updated = games[1] || GameStats.empty()
    
    const result: GameEvent[] = []

    if (!old.isLive() && updated.isLive()) {
        result.push(GameEvent.gameStart(updated))
    }

    if (old.getHomeResult() < updated.getHomeResult()) {
        const scorer = getScorer(old.getHomePlayers(), updated.getHomePlayers())
        const isPowerPlay = old.getHomePPG() < updated.getHomePPG()
        result.push(GameEvent.goal(updated, updated.getHomeTeamId(), scorer, isPowerPlay))
    }
    if (old.getAwayResult() < updated.getAwayResult()) {
        const scorer = getScorer(old.getAwayPlayers(), updated.getAwayPlayers())
        const isPowerPlay = old.getAwayPPG() < updated.getAwayPPG()
        result.push(GameEvent.goal(updated, updated.getAwayTeamId(), scorer, isPowerPlay))
    }

    if (old.getCurrentPeriodNumber() != updated.getCurrentPeriodNumber()) {
        result.push(GameEvent.periodStart(updated, updated.getCurrentPeriodNumber()))
    }

    if (!old.isPlayed() && updated.isPlayed()) {
        result.push(GameEvent.gameEnd(updated))
    }

    return result
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