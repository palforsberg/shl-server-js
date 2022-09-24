import { TeamsService } from "../services/TeamsService"
import { GameStats, Player } from "./GameStats"

enum EventType {
    GameStart = 'GameStart',
    GameEnd = 'GameEnd',
    Goal = 'Goal',
    Penalty = 'Penalty',
    PeriodStart = 'PeriodStart',
}
class GameEvent {
    type: EventType
    game: GameStats
    team?: string
    player?: Player
    info?: Object

    constructor(
        type: EventType, 
        game: GameStats, 
        team: string | undefined = undefined,
        player: Player | undefined = undefined, 
    ) {
        this.type = type
        this.game = new GameStats({ ...game })
        this.game.playersByTeam = undefined // to reduce size of stored event
        this.team = team
        this.player = player
        this.getTitle = this.getTitle.bind(this)
        this.getBody = this.getBody.bind(this)
        this.shouldNotify = this.shouldNotify.bind(this)
        this.toString = this.toString.bind(this)
    }

    getTitle(excited: boolean): string {
        switch (this.type) {
            case EventType.GameStart: return 'Matchen började'
            case EventType.GameEnd: return 'Matchen slutade'
            case EventType.Goal: {
                var t = excited ? 'MÅÅÅL' : 'Mål'
                if (this.team) {
                    t += ' för ' + TeamsService.getShortName(this.team)
                }
                if (excited) {
                    return t + '!'
                }
                return t
            }
        }
        return 'Pucken'
    }

    getBody(): string | undefined {
        if (this.type == EventType.GameStart) {
            return TeamsService.getName(this.game.getHomeTeamId())
                + ' vs ' +
                TeamsService.getName(this.game.getAwayTeamId())
        }
        if (this.type == EventType.GameEnd) {
            return this.getScoreString()
        }
        if (this.type == EventType.Goal) {
            let t = '';
            if (this.player) {
                t += this.player.firstName + ' ' + this.player.familyName + ' i '
            }
            t += this.game.getCurrentPeriodFormatted()
            if (t) {
                t = '\n' + t
            }
            return this.getScoreString() + t
        }
        return undefined
    }

    shouldNotify(): boolean {
        switch (this.type) {
            case EventType.GameStart:
            case EventType.GameEnd:
            case EventType.Goal:
                return true
            default:
                return false
        }
    }

    toString(excited: boolean): string {
        return this.getTitle(excited) + ' ' + this.getBody() 
    }

    private getScoreString(): string {
        const ht = this.game.getHomeTeamId()
        const hg = this.game.getHomeResult()
        const at = this.game.getAwayTeamId()
        const ag = this.game.getAwayResult()
        /**
         * FBK 0 - 5 LHF
         */
        return `${ht} ${hg} - ${ag} ${at}`
    }

    static gameStart(game: GameStats): GameEvent {
        return new GameEvent(EventType.GameStart, game)
    }
    static gameEnd(game: GameStats): GameEvent {
        return new GameEvent(EventType.GameEnd, game)
    }
    static goal(game: GameStats, team: string, scorer: Player | undefined, isPowerPlay: boolean): GameEvent {
        const event = new GameEvent(EventType.Goal, game, team, scorer)
        event.info = { isPowerPlay }
        return event
    }
    static penalty(game: GameStats, player: Player, penalty: number): GameEvent {
        const event = new GameEvent(EventType.Penalty, game, player.team, player)
        event.info = { penalty }
        return event
    }
    static periodStart(game: GameStats, period: number): GameEvent {
        const event = new GameEvent(EventType.PeriodStart, game)
        event.info = { periodNumber: period }
        return event
    }
}

export {
    GameEvent,
    EventType,
}