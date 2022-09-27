import { randomInt, randomUUID } from "crypto"
import { TeamsService } from "../services/TeamsService"
import { GameStats, Player } from "./GameStats"

enum EventType {
    GameStart = 'GameStart',
    GameEnd = 'GameEnd',
    Goal = 'Goal',
    Penalty = 'Penalty',
    PeriodStart = 'PeriodStart',
}

interface GameInfo {
    homeTeamId: string,
    awayTeamId: string,
    homeResult: number,
    awayResult: number,
    game_uuid: string,
}
interface GoalInfo extends GameInfo {
    periodFormatted: string,
    isPowerPlay: boolean,
    team: string,
    player?: Player
}
interface PeriodStartInfo extends GameInfo {
    periodNumber: number,
}
interface PenaltyInfo extends GameInfo {
    penalty: number,
    team: string,
    player?: Player,
}

class GameEvent {
    type: EventType
    info: GoalInfo | GameInfo | PeriodStartInfo | PenaltyInfo
    timestamp: Date
    id: string

    constructor(
        type: EventType, 
        info: GoalInfo | GameInfo | PeriodStartInfo | PenaltyInfo,
    ) {

        this.type = type
        this.info = info
        this.getTitle = this.getTitle.bind(this)
        this.getBody = this.getBody.bind(this)
        this.shouldNotify = this.shouldNotify.bind(this)
        this.toString = this.toString.bind(this)
        this.getId = this.getId.bind(this)

        this.id = this.getId()
        this.timestamp = new Date()
    }

    getTitle(excited: boolean): string {
        switch (this.type) {
            case EventType.GameStart: return 'Matchen började'
            case EventType.GameEnd: return 'Matchen slutade'
            case EventType.Goal: {
                var t = excited ? 'MÅÅÅL' : 'Mål'
                if ((this.info as GoalInfo)?.team) {
                    t += ' för ' + TeamsService.getShortName((this.info as GoalInfo)?.team)
                }
                if (excited) {
                    return t + '!'
                }
                return t
            }
            case EventType.PeriodStart:
                return `Period ${(this.info as PeriodStartInfo)?.periodNumber} började`
            case EventType.Penalty:
                return `Utvisning för ${(this.info as PenaltyInfo).team}`
            default:
                return this.type
        }
    }

    getBody(): string | undefined {
        if (this.type == EventType.GameStart) {
            return TeamsService.getName(this.info.homeTeamId)
                + ' vs ' +
                TeamsService.getName(this.info.awayTeamId)
        }
        if (this.type == EventType.GameEnd) {
            return this.getScoreString()
        }
        if (this.type == EventType.Goal) {
            let t = '';
            if ((this.info as GoalInfo)?.player) {
                const p = (this.info as GoalInfo).player!
                t += p.firstName + ' ' + p.familyName + ' i '
            }
            t += (this.info as GoalInfo)?.periodFormatted ?? ''
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

    getId(): string {
        switch (this.type) {
            case EventType.GameStart:
            case EventType.GameEnd:
                return this.type.toString()
            case EventType.Goal:
                return this.type.toString() + this.getScoreString()
            case EventType.PeriodStart:
                return this.type.toString() + (this.info as PeriodStartInfo).periodNumber
            default: // no real way of telling if event is unique or not
                return randomInt(1000).toString()
        }
    }

    private getScoreString(): string {
        const ht = this.info.homeTeamId
        const hg = this.info.homeResult
        const at = this.info.awayTeamId
        const ag = this.info.awayResult
        /**
         * FBK 0 - 5 LHF
         */
        return `${ht} ${hg} - ${ag} ${at}`
    }

    static gameStart(game: GameStats): GameEvent {
        return new GameEvent(EventType.GameStart, this.getGameInfo(game))
    }
    static gameEnd(game: GameStats): GameEvent {
        return new GameEvent(EventType.GameEnd, this.getGameInfo(game))
    }
    static goal(game: GameStats, team: string, player: Player | undefined, isPowerPlay: boolean): GameEvent {
        const info: GoalInfo = { 
            ...this.getGameInfo(game),
            periodFormatted: game.getCurrentPeriodFormatted(),
            team,
            player,
            isPowerPlay 
        }
        return new GameEvent(EventType.Goal, info)
    }
    static penalty(game: GameStats, team: string, player: Player | undefined, penalty: number): GameEvent {
        const info: PenaltyInfo = { 
            ...this.getGameInfo(game),
            penalty, 
            team,
            player,
        }
        return new GameEvent(EventType.Penalty, info)
    }
    static periodStart(game: GameStats, period: number): GameEvent {
        const info: PeriodStartInfo = { 
            ...this.getGameInfo(game),
            periodNumber: period 
        }
        return new GameEvent(EventType.PeriodStart, info)
    }

    static getGameInfo(game: GameStats): GameInfo {
        return {
            game_uuid: game.game_uuid,
            homeTeamId: game.getHomeTeamId(),
            awayTeamId: game.getAwayTeamId(),
            homeResult: game.getHomeResult(),
            awayResult: game.getAwayResult(),
        }
    }
}

export {
    GameEvent,
    EventType,
    GameInfo,
    GoalInfo,
    PenaltyInfo,
    PeriodStartInfo,
}