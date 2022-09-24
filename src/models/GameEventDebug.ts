import { GameEvent } from "./GameEvent"
import { GameStats, PeriodStats } from "./GameStats"

class GameEventDebug extends GameEvent {
    pre: PeriodStats | undefined
    constructor(event: GameEvent, pre: GameStats | undefined) {
        super(event.type, event.game, event.team, event.player)
        this.info = event.info
        this.pre = pre?.recaps?.gameRecap
    }
}

export {
    GameEventDebug
}