import { GameEvent } from "./GameEvent"
import { GameStats, PeriodStats } from "./GameStats"

class GameEventDebug extends GameEvent {
    pre: GameStats | undefined
    post: GameStats | undefined
    constructor(event: GameEvent, pre: GameStats | undefined, post: GameStats | undefined) {
        super(event.type, event.info)
        this.pre = pre
        this.post = post
    }
}

export {
    GameEventDebug
}