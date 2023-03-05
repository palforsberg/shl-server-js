import { randomInt } from "crypto"
import { TeamsService } from "../services/TeamsService"
import { GameStats, Player } from "./GameStats"

enum EventType {
    GameStart = 'GameStart',
    GameEnd = 'GameEnd',
    Goal = 'Goal',
    Penalty = 'Penalty',
    PeriodStart = 'PeriodStart',
    PeriodEnd = 'PeriodEnd',
}

interface EventPlayer {
    firstName: string
    familyName: string
    jersey: number
}

interface GameInfo {
    homeTeamId: string,
    awayTeamId: string,
    homeResult: number,
    awayResult: number,
    game_uuid: string,
    periodNumber: number,
}
interface GoalInfo extends GameInfo {
    team: string,
    player?: EventPlayer
    teamAdvantage: string
    assist?: string
}
interface PeriodInfo extends GameInfo {
}
interface PenaltyInfo extends GameInfo {
    penalty?: number,
    penaltyLong?: string,
    reason?: string,
    team: string,
    player?: EventPlayer,
}

class GameEvent {
    type: EventType
    info: GoalInfo | GameInfo | PeriodInfo | PenaltyInfo
    timestamp: Date
    id: string

    eventId: string
    revision: number
    gametime: string
    timePeriod: number
    description: string

    constructor(
        type: EventType, info: GameInfo, eventId: string, revision: number, gametime: string, timePeriod: number, description: string
    ) {
        this.type = type
        this.info = info

        this.eventId = eventId
        this.revision = revision
        this.gametime = gametime
        this.timePeriod = timePeriod
        this.description = description

        this.getTitle = this.getTitle.bind(this)
        this.getBody = this.getBody.bind(this)
        this.shouldNotify = this.shouldNotify.bind(this)
        this.toString = this.toString.bind(this)
        this.getId = this.getId.bind(this)
        this.getInfo = this.getInfo.bind(this)

        this.id = this.getId()
        this.timestamp = new Date()
    }

    getTitle(userTeam: string[] = []): string {
        switch (this.type) {
            case EventType.GameStart: return 'Matchen började'
            case EventType.GameEnd: {
                if (this.info.homeResult == this.info.awayResult) {
                    return 'Matchen slutade'
                }
                const victor = this.info.homeResult > this.info.awayResult ? this.info.homeTeamId : this.info.awayTeamId
                const userFavorsVictor = userTeam.includes(victor)
                if (userFavorsVictor) {
                    return `${TeamsService.getShortName(victor)} vinner! 🎉`
                } else {
                    return `${TeamsService.getShortName(victor)} vann matchen`
                } 
            }
            case EventType.Goal: {
                const excited = userTeam.includes((this.info as GoalInfo)?.team ?? '')
                if (excited) {
                    return `MÅÅÅL för ${TeamsService.getShortName((this.info as GoalInfo)?.team)}! 🎉`
                } else {
                    return `Mål för ${TeamsService.getShortName((this.info as GoalInfo)?.team)}`
                }
            }
            case EventType.PeriodStart:
                return `Period ${(this.info as PeriodInfo)?.periodNumber} började`
            case EventType.PeriodEnd:
                return `Period ${(this.info as PeriodInfo)?.periodNumber} slutade`
            case EventType.Penalty:
                return `Utvisning för ${(this.info as PenaltyInfo).team}`
            default:
                return this.type
        }
    }

    getBody(): string | undefined {
        if (this.type == EventType.GameStart) {
            return TeamsService.getShortName(this.info.homeTeamId)
                + ' - ' +
                TeamsService.getShortName(this.info.awayTeamId)
        }
        if (this.type == EventType.GameEnd) {
            return this.getScoreString()
        }        
        if (this.type == EventType.Goal) {
            let t = '';
            if ((this.info as GoalInfo)?.player) {
                const p = (this.info as GoalInfo).player!
                t += `${p.firstName.charAt(0)}. ${p.familyName} • `
            }
            t += this.getInfo()
            return this.getScoreString() + '\n' + t
        }
        return undefined
    }

    getImages(): string[] | undefined {
        const { homeTeamId, awayTeamId } = this.info
        switch (this.type) {
            case EventType.GameStart: {
                return [homeTeamId, awayTeamId]
            }
            case EventType.GameEnd: {
                const victor = this.info.homeResult >= this.info.awayResult ? homeTeamId : awayTeamId
                const loser = victor == homeTeamId ? awayTeamId : homeTeamId
                return [victor, loser]
            }
            case EventType.Goal: {
                const scorer = (this.info as GoalInfo)?.team ?? homeTeamId
                return [scorer]
            }
            default: {
                return undefined
            }
        }
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

    toString(): string {
        return `${this.gametime} ${this.getScoreString()} - ${this.type} ${this.description} [${this.eventId} ${this.revision}]`
    }

    getId(): string {
        switch (this.type) {
            case EventType.GameStart:
            case EventType.GameEnd:
                return this.type.toString()
            case EventType.Goal:
                return this.type.toString() + this.getScoreString()
            case EventType.PeriodStart:
            case EventType.PeriodEnd: 
                return this.type.toString() + (this.info as PeriodInfo).periodNumber
            default: // no real way of telling if event is unique or not
                return randomInt(1000).toString()
        }
    }

    protected getScoreString(): string {
        const ht = this.info.homeTeamId
        const hg = this.info.homeResult
        const at = this.info.awayTeamId
        const ag = this.info.awayResult
        /**
         * FBK 0 - 5 LHF
         */
        return `${ht} ${hg} - ${ag} ${at}`
    }

    private getInfo(): string {
        switch (this.info.periodNumber) {
          case 99:
            return 'Straffar'
          case 4:
            return `Övertid ${this.gametime}`
          case 3:
            return `P3 ${this.gametime}`
          case 2:
            return `P2 ${this.gametime}`
          case 1:
            return `P1 ${this.gametime}`
          default:
            return this.gametime
        }
    }

    static gameStart(game: GameStats): GameEvent {
        return new GameEvent(EventType.GameStart, this.getGameInfo(game), '', 1, '', 0, '')
    }
    static gameEnd(game: GameStats): GameEvent {
        return new GameEvent(EventType.GameEnd, this.getGameInfo(game), '', 3, '', 0, '')
    }
    static goal(game: GameStats, team: string, player: Player | undefined, isPowerPlay: boolean): GameEvent {
        const info: GoalInfo = { 
            ...this.getGameInfo(game),
            team,
            player,
            teamAdvantage: isPowerPlay ? 'PP' : '',
        }
        return new GameEvent(EventType.Goal, info, '', 1, '', 0, '')
    }
    static penalty(game: GameStats, team: string, player: Player | undefined, penalty: number): GameEvent {
        const info: PenaltyInfo = { 
            ...this.getGameInfo(game),
            penalty, 
            team,
            player,
        }
        return new GameEvent(EventType.Penalty, info, '', 1, '', 0, '')
    }
    static periodStart(game: GameStats): GameEvent {
        const info: PeriodInfo = { 
            ...this.getGameInfo(game),
        }
        return new GameEvent(EventType.PeriodStart, info, '', 1, '', 0, '')
    }

    static periodEnd(game: GameStats): GameEvent {
        const info: PeriodInfo = { 
            ...this.getGameInfo(game),
        }
        return new GameEvent(EventType.PeriodEnd, info, '', 1, '', 0, '')
    }

    static getGameInfo(game: GameStats): GameInfo {
        return {
            game_uuid: game.game_uuid,
            homeTeamId: game.getHomeTeamId(),
            awayTeamId: game.getAwayTeamId(),
            homeResult: game.getHomeResult(),
            awayResult: game.getAwayResult(),
            periodNumber: game.getCurrentPeriodNumber(),
        }
    }

    static getPeriodFormatted(period: number): string {
        switch (period) {
          case 99:
            return 'efter straffar'
          case 4:
            return 'i övertid'
          case 3:
            return 'i 3:e perioden'
          case 2:
            return 'i 2:a perioden'
          case 1:
          default:
            return 'i 1:a perioden'
        }
    }
}

export {
    GameEvent,
    EventType,
    GameInfo,
    GoalInfo,
    PenaltyInfo,
    PeriodInfo,
    EventPlayer,
}