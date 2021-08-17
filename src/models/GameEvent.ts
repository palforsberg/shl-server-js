import { Game } from './Game'

class GameEvent {
    type: string
    game: Game

    constructor(type: string, game: Game) {
        this.type = type
        this.game = game
    }

    getDescription(): string {
        switch (this.type) {
            case 'began': return 'Matchen började'
            case 'ended': return 'Matchen slutade'
            case 'scored': return 'Mål!'
            default: return ''
        }
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