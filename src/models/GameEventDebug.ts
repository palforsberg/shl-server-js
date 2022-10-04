import { GameEvent } from "./GameEvent"
import { GameStats } from "./GameStats"

class GameEventDebug extends GameEvent {
    pre: GameStats | undefined
    post: GameStats | undefined
    constructor(event: GameEvent, pre: GameStats | undefined, post: GameStats | undefined) {
        super(event.type, event.info)

        if (pre != undefined) {
            this.pre = new GameStats(pre)
            this.pre.playersByTeam = undefined
        }

        if (post != undefined) {
            this.post = new GameStats(post)
            this.post.playersByTeam = undefined
        }
    }
}

export {
    GameEventDebug
}