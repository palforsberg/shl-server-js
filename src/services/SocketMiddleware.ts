import { EventPlayer, EventType, GameInfo, GoalInfo, PenaltyInfo, PeriodInfo } from '../models/GameEvent'
import { Notifier } from '../Notifier'
import { WsEventService, WsGameEvent } from '../services/WsEventService'
import { ShlSocket, WsEvent, WsGame } from '../ShlSocket'
import { GameReportService, GameReport } from './GameReportService'
import { GameStatsService } from './GameStatsService'
import { SeasonService } from './SeasonService'

class SocketMiddleware {
    socket: ShlSocket
    season: SeasonService
    wsEventService: WsEventService
    wsGames: Record<number, WsGame>
    gameReportService: GameReportService
    statsService: GameStatsService
    notifier: Notifier

    constructor(
        season: SeasonService, 
        socket: ShlSocket,
        wsEventService: WsEventService,
        gameReportService: GameReportService,
        notifier: Notifier,
        statsService: GameStatsService,
    ) {
        this.socket = socket
        this.season = season
        this.wsEventService = wsEventService
        this.gameReportService = gameReportService
        this.notifier = notifier
        this.statsService = statsService
        this.wsGames = {}        

        this.onGame = this.onGame.bind(this)
        this.onEvent = this.onEvent.bind(this)
        this.mapEvent = this.mapEvent.bind(this)
        this.mapPenaltyEvent = this.mapPenaltyEvent.bind(this)
        this.mapPenaltyEvent = this.mapPenaltyEvent.bind(this)
        this.mapPeriodEvent = this.mapPeriodEvent.bind(this)
        this.getGameInfoFromEvent = this.getGameInfoFromEvent.bind(this)
    }

    async onGame(m: WsGame) {
        const gameUuid = this.season.gameIdToGameUuid[m.gameId]
        if (gameUuid == undefined) {
            console.log(`[MIDDLE] Unknown game ${m.homeTeamCode} - ${m.awayTeamCode} ${m.gameId}`)
            return
        }
        console.log(`[MIDDLE] REPORT - ${m.statusString} ${m.homeTeamCode} ${m.homeScore} - ${m.awayScore} ${m.awayTeamCode} ${m.period} ${m.gameState}`)
        this.wsGames[m.gameId] = m

        const report = wsGameToGameReport(gameUuid, m)
        await this.gameReportService.store(report)
        await this.season.updateFromReport(report)
    }

    async onEvent(m: WsEvent): Promise<WsGameEvent | undefined> {
        const gameUuid = this.season.gameIdToGameUuid[m.gameId]
        if (gameUuid == undefined) {
            console.log(`[MIDDLE] Unknown game event ${(m as WsGoalEvent)?.team} - ${m.gameId}`)
            return undefined
        }

        console.log(`[MIDDLE] EVENT - ${m.class} ${m.gametime} ${(m as WsGoalEvent)?.team} ${m.description} [${m.eventId} ${m.revision}]`)

        const wsEvent = this.mapEvent(gameUuid, m)
        if (!wsEvent) return undefined
    
        const isNewEvent = await this.wsEventService.store(wsEvent)

        if (isNewEvent && wsEvent.shouldNotify()) {
            await this.notifier.sendNotification(wsEvent)
        }

        return wsEvent
    }

    clearJoinedGameIds() {
        this.wsGames = {}
        console.log('[MIDDLE] Cleared wsGames')
    }
    
    private mapEvent(gameUuid: string, m: WsEvent): WsGameEvent | undefined {
        switch (m.class) {
            case 'Goal':
                return this.mapGoalEvent(gameUuid, m as WsGoalEvent)
            case 'Period':
                return this.mapPeriodEvent(gameUuid, m as WsPeriodEvent)
            case 'Penalty':
                return this.mapPenaltyEvent(gameUuid, m as WsPenaltyEvent)
            case 'Shot':
            case 'ShotBlocked':
            case 'ShotIron':
            case 'ShotWide':
            case 'Timeout':
            case 'GoolkeeperEvent':
            case 'ShootoutPenaltyShot':
            default:
                return undefined
        }
    }

    private mapGoalEvent(gameUuid: string, event: WsGoalEvent): WsGameEvent {
        const parts = event.extra.scorerLong.split(' ')
        const player: EventPlayer = {
            jersey: parseInt(parts[0]),
            firstName: parts[1],
            familyName: event.extra.scorerLong.replace(`${parts[0]} ${parts[1]} `, ''),
        }
        const info: GoalInfo = {
            ...this.getGameInfoFromEvent(gameUuid, event),
            homeResult: parseInt(event.extra.homeForward[0]),
            awayResult: parseInt(event.extra.homeAgainst[0]),
            team: event.team,
            player,
            teamAdvantage: event.extra.teamAdvantage,
        }
        return new WsGameEvent(EventType.Goal, info, event)
    }

    private mapPenaltyEvent(gameUuid: string, event: WsPenaltyEvent): WsGameEvent | undefined {
        if (event.description == 'Penalty shot') {
            return undefined
        }
        let reason = event.description
        let penaltyLong: string | undefined = undefined
        let player: EventPlayer | undefined = undefined

        if (event.description.includes(' utvisas ')) {
            const regex = new RegExp(/^(\d*) (.) (.*) utvisas (.*), (.*)$/, 'g')
            const parts = regex.exec(event.description) ?? []
            player = {
                jersey: parseInt(parts[1]),
                firstName: parts[2],
                familyName: parts[3],
            }
            penaltyLong = parts[4]
            reason = parts[5]
        }

        const info: PenaltyInfo = {
            ...this.getGameInfoFromEvent(gameUuid, event),
            team: event.team,
            player,
            reason,
            penaltyLong,
        }
        return new WsGameEvent(EventType.Penalty, info, event)
    }

    private mapPeriodEvent(gameUuid: string, event: WsPeriodEvent): WsGameEvent | undefined {
        if (event.period == 0) {
            const info: GameInfo = this.getGameInfoFromEvent(gameUuid, event)
            if (event.extra.gameStatus == 'Ongoing') {
                return new WsGameEvent(EventType.GameStart, info, event)
            } else if (event.extra.gameStatus == 'GameEnded') {
                return new WsGameEvent(EventType.GameEnd, info, event)
            } // Intermission
        } else {
            const info: PeriodInfo = this.getGameInfoFromEvent(gameUuid, event)
            if (event.extra.gameStatus == 'Playing') {
                return new WsGameEvent(EventType.PeriodStart, info, event)
            } else if (event.extra.gameStatus == 'Finished') {
                return new WsGameEvent(EventType.PeriodEnd, info, event)
            }
        }
        return undefined
    }

    private getGameInfoFromEvent(gameUuid: string, event: WsEvent): GameInfo {
        const wsGame = this.wsGames[event.gameId]
        if (!wsGame) {
            const stats = this.statsService.getFromCache(gameUuid)
            return {
                homeTeamId: stats?.getHomeTeamId() ?? "",
                awayTeamId: stats?.getAwayTeamId() ?? "",
                homeResult: stats?.getHomeResult() ?? 0,
                awayResult: stats?.getAwayResult() ?? 0,
                periodNumber: event.period,
                game_uuid: gameUuid,
            }
        }
        return {
            homeTeamId: wsGame.homeTeamCode,
            awayTeamId: wsGame.awayTeamCode,
            homeResult: parseInt(wsGame.homeScore),
            awayResult: parseInt(wsGame.awayScore),
            periodNumber: event.period,
            game_uuid: gameUuid,
        }
    }
}

function wsGameToGameReport(gameUuid: string, wsGame: WsGame): GameReport {
    return {
        gameUuid,
        gametime: wsGame.gametime,
        timePeriod: wsGame.timePeriod,
        period: wsGame.period,
        statusString: wsGame.statusString,
        gameState: wsGame.gameState,
        homeScore: parseInt(wsGame.homeScore),
        awayScore: parseInt(wsGame.awayScore),
        attendance: wsGame.attendance
    }
}

// {"eventId":44,"revision":2,"hash":"16029-44","channel":"All","gametime":"06:53","timePeriod":413,"gameId":16029,"realTime":"20221001161314","time":"1664633925.1865","period":2,"class":"Goal","type":"1-1","description":"1-1 (PP1) 20 J Connolly (2)","extra":{"pop":"POP: 14, 20, 23, 34, 47, 60","nep":"NEP: 4, 7, 26, 33, 37","assist":"14 J Berglund (1)","homeForward":["1"],"homeAgainst":["1"],"teamAdvantage":"PP1","scorerLong":"20 Jack Connolly","assistOneLong":"14 Jonas Berglund (1)"},"action":"message","source":"Parser","sourceport":"6600","team":"LHF","messagetype":"all","actiontype":"new","teamId":"1a71-1a71gTHKh","location":{"x":30,"y":-48},"status":"update","queue":"parser"}
interface WsGoalEvent extends WsEvent {
    team: string,
    location: { x: number, y: number},
    extra: {
        scorerLong: string,
        teamAdvantage: string,
        homeAgainst: [string],
        homeForward: [string],
    }
}

// {"eventId":42,"revision":1,"hash":"16029-42","channel":16029,"gametime":"05:29","timePeriod":329,"gameId":16029,"realTime":"20221001161123","time":"1664633513.7004","period":2,"class":"Penalty","type":"Utvisning","description":"15 D Sexton utvisas 2 min, Tripping","extra":[],"action":"message","source":"Parser","sourceport":"6600","team":"VLH","messagetype":"all","actiontype":"new","teamId":"fe02-fe02mf1FN","status":"new","queue":"parser"}
interface WsPenaltyEvent extends WsEvent {
    team: string,
}

// {"eventId":100002,"revision":1,"hash":"16029-100002","channel":16029,"gametime":"00:00","timePeriod":0,"gameId":16029,"realTime":"20221001160348","time":"1664633062.1117","period":2,"class":"Period","type":"Period","description":"Period 2 startade","extra":{"gameStatus":"Playing"},"action":"message","source":"Parser","sourceport":"6600","team":["LHF"],"messagetype":"all","actiontype":"new","teamId":"1a71-1a71gTHKh","status":"new","queue":"parser"}
// {"eventId":200002,"revision":1,"hash":"16029-200002","channel":16029,"gametime":"20:00","timePeriod":1200,"gameId":16029,"realTime":"20221001160348","time":"1664634941.2949","period":2,"class":"Period","type":"Period","description":"Period 2 avslutad","extra":{"gameStatus":"Finished"},"action":"message","source":"Parser","sourceport":"6600","team":["LHF"],"messagetype":"all","actiontype":"new","teamId":"1a71-1a71gTHKh","status":"new","queue":"parser"}
// Period > 0 -> Period (Playing + Finished)
// period == 0 -> Game (NotStarted + Ongoing + GameEnded)
interface WsPeriodEvent extends WsEvent {
    extra: {
        gameStatus: string,
    },
}

export {
    SocketMiddleware,
    WsPeriodEvent,
    WsPenaltyEvent,
    WsGoalEvent,
}