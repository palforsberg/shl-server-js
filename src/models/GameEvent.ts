import { Game } from './Game'

class GameEvent {
    type: string
    info: Game
    constructor(type: string, info: Game) {
        this.type = type
        this.info = info
    }

    static began(game: Game): GameEvent {
        return new GameEvent('began', game)
    }
    static ended(game: Game): GameEvent {
        return new GameEvent('ended', game)
    }
    static scored(game: Game): GameEvent {
        return new GameEvent('scored', game)
    }
}

export {
    GameEvent
}