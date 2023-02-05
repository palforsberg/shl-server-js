const fs = require('fs')
import { EventType, GoalInfo, PenaltyInfo } from "../src/models/GameEvent"
import { Notifier } from "../src/Notifier"
import { GameReportService } from "../src/services/GameReportService"
import { GameStatsService } from "../src/services/GameStatsService"
import { SeasonService } from "../src/services/SeasonService"
import { SocketMiddleware, WsGoalEvent, WsPenaltyEvent, WsPeriodEvent } from "../src/services/SocketMiddleware"
import { UserService } from "../src/services/UserService"
import { WsEventService } from "../src/services/WsEventService"
import { SHL } from "../src/ShlClient"
import { ShlSocket, WsEvent, WsGame } from "../src/ShlSocket"
import { getConfig } from "./utils"

jest.mock("fs")
jest.mock('sockjs-client')

fs.promises = {
    readFile: () => Promise.reject({ code: 'ENOENT'}),
    writeFile: () => Promise.resolve({}),
}

const sentNotification = jest.fn().mockResolvedValue({ failed: [] })
jest.mock("apns2", () => ({
    ...jest.requireActual('apns2'),
    ApnsClient: class MockedApnsClient {
        constructor() {
    
        }
        on() {}
        sendMany(notifications: Notification[]) {
            sentNotification(notifications[0])
        }
    },
    Errors: {
        error: 'hejsan',
    }
}))

class MockedSeasonService extends SeasonService {
    gameIdToGameUuid: Record<number, string>
    constructor() {
        // @ts-ignore
        super(-1, -1, undefined, undefined)
        this.gameIdToGameUuid = {
            123: 'gameUuid_123',
        }
        this.cleanDecorated = jest.fn()
    }
}

jest.mock('../src/services/SeasonService')
const socket = new ShlSocket('hejsan')
socket.join = jest.fn()
let middle: SocketMiddleware

const wsEventService = new WsEventService()
const gameReportService = new GameReportService()
const notifier = new Notifier(getConfig(), new UserService())
const statsService = new GameStatsService(new SHL(getConfig()))

beforeEach(async () => {
    middle = new SocketMiddleware(new MockedSeasonService(), socket, wsEventService, gameReportService, notifier, statsService)
    await socket.open()
    socket.join = jest.fn()
    wsEventService.db.write({})
    gameReportService.db.write({})
    statsService.db.write({})
    sentNotification.mockClear()
})

test('Should clear seasonservice on gamereport', async () => {
    // Given
    const game = getGame()
    
    // When
    await middle.onGame(game)

    // Then
    const report = await gameReportService.read('gameUuid_123')
    expect(report).toBeDefined()
    expect(middle.season.cleanDecorated).toBeCalledTimes(1)
})

test('Should store GameReport', async () => {
    // Given
    const game = getGame()
    
    // When
    await  middle.onGame(game)

    // Then
    const gameReport = await gameReportService.read('gameUuid_123')
    expect(gameReport).toBeDefined()
    expect(gameReport!.gameUuid).toBe('gameUuid_123')
    expect(gameReport!.gametime).toBe(game.gametime)
})

test('Should store event', async () => {
    // Given
    const game = getGame()
   await  middle.onGame(game)
    const event: WsPeriodEvent = {
        ...getEvent(),
        extra: {
            gameStatus: 'Ongoing',
        }
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    const stored = await wsEventService.read('gameUuid_123')
    expect(stored.length).toBe(1)
    expect(stored[0]).toBe(mapped)
})

test('Should not store some event', async () => {
    // Given
    const game = getGame()
   await  middle.onGame(game)
    const event: WsPeriodEvent = {
        ...getEvent(),
        class: 'Shot',
        extra: {
            gameStatus: 'Ongoing',
        }
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    const stored = await wsEventService.read('gameUuid_123')
    expect(stored.length).toBe(0)
})

test('Should overwrite event with higher revision', async () => {
    // Given - two events with same eventId, but different revisions
    const game = getGame()
   await  middle.onGame(game)
    const event: WsPeriodEvent = {
        ...getEvent(),
        extra: {
            gameStatus: 'Ongoing',
        }
    }
    const event2: WsPeriodEvent = {
        ...getEvent(),
        revision: 2,
        extra: {
            gameStatus: 'GameEnded',
        }
    }

    await middle.onEvent(event)

 
    // When
    const mapped2 = await middle.onEvent(event2)

    // Then
    const stored = await wsEventService.read('gameUuid_123')
    expect(stored.length).toBe(1)
    expect(stored[0]).toBe(mapped2)
    expect(stored[0].type).toBe(EventType.GameEnd)
})

test('Should not overwrite event with lower revision', async () => {
    // Given - two events with same eventId, but different revisions
    const game = getGame()
   await  middle.onGame(game)
    const event: WsPeriodEvent = {
        ...getEvent(),
        extra: {
            gameStatus: 'Ongoing',
        }
    }
    const event2: WsPeriodEvent = {
        ...getEvent(),
        revision: 0,
        extra: {
            gameStatus: 'GameEnded',
        }
    }

    const mapped1 = await middle.onEvent(event)

    // When
    const mapped2 = await middle.onEvent(event2)

    // Then
    const stored = await wsEventService.read('gameUuid_123')
    expect(stored.length).toBe(1)
    expect(stored[0]).toBe(mapped1)
    expect(stored[0].type).toBe(EventType.GameStart)
})

test('Map not joined event', async () => {
    // Given
    const event: WsPeriodEvent = {
        ...getEvent(),
        extra: {
            gameStatus: 'Ongoing',
        }
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    expect(mapped?.info.homeTeamId).toBe("")
})

test('Map unknown event', async () => {
    // Given
    const event: WsPeriodEvent = {
        ...getEvent(),
        gameId: 666,
        extra: {
            gameStatus: 'Ongoing',
        }
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    expect(mapped).toBeUndefined()
})

test('Map unhandled class', async () => {
    // Given
    const event: WsEvent = {
        ...getEvent(),
        class: 'Shot',
        gameId: 666,
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    expect(mapped).toBeUndefined()
})

test('Map GameStart event', async () => {
    // Given
    const game = getGame()
    await middle.onGame(game)
    const event: WsPeriodEvent = {
        ...getEvent(),
        extra: {
            gameStatus: 'Ongoing',
        }
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    expect(mapped).toBeDefined()
    expect(mapped?.description).toBe(event.description)
    expect(mapped?.type).toBe(EventType.GameStart)
    expect(mapped?.info.homeResult).toBe(parseInt(game.homeScore))
})

test('Map Goal event', async () => {
    // Given
    const game = getGame()
   await  middle.onGame(game)
    const event: WsGoalEvent = {
        ...getEvent(),
        class: 'Goal',
        team: 'LHF',
        location: { x: 123, y: -123 },
        extra: {
            scorerLong: '123 Olle Ollson Karlsson',
            teamAdvantage: 'PP3',
            homeForward: ['13'],
            homeAgainst: ['-123'],
        }
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    expect(mapped).toBeDefined()
    expect(mapped?.description).toBe(event.description)
    expect(mapped?.type).toBe(EventType.Goal)
    expect(mapped?.info.homeResult).toBe(13)
    expect(mapped?.info.awayResult).toBe(-123)
    expect((mapped?.info as GoalInfo).player?.jersey).toBe(123)
    expect((mapped?.info as GoalInfo).player?.firstName).toBe('Olle')
    expect((mapped?.info as GoalInfo).player?.familyName).toBe('Ollson Karlsson')
    expect((mapped?.info as GoalInfo).team).toBe('LHF')
    expect((mapped?.info as GoalInfo).teamAdvantage).toBe('PP3')
})

test('Map Penalty event', async () => {
    // Given
    const game = getGame()
   await  middle.onGame(game)
    const event: WsPenaltyEvent = {
        ...getEvent(),
        class: 'Penalty',
        team: 'FBK',
        description: '1 O Ollson Karlsson utvisas 15 min + GM, Delay of game'
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    expect(mapped).toBeDefined()
    expect(mapped?.description).toBe(event.description)
    expect(mapped?.type).toBe(EventType.Penalty)
    expect(mapped?.info.homeResult).toBe(parseInt(game.homeScore))
    expect((mapped?.info as PenaltyInfo).homeResult).toBe(parseInt(game.homeScore))
    expect((mapped?.info as PenaltyInfo).player?.jersey).toBe(1)
    expect((mapped?.info as PenaltyInfo).player?.firstName).toBe('O')
    expect((mapped?.info as PenaltyInfo).player?.familyName).toBe('Ollson Karlsson')
    expect((mapped?.info as PenaltyInfo).penaltyLong).toBe('15 min + GM')
    expect((mapped?.info as PenaltyInfo).penalty).toBeUndefined()
    expect((mapped?.info as PenaltyInfo).reason).toBe('Delay of game')
    expect((mapped?.info as PenaltyInfo).team).toBe('FBK')
})

test('Map Penalty event with unusual description', async () => {
    // Given
    const game = getGame()
   await  middle.onGame(game)
    const event: WsPenaltyEvent = {
        ...getEvent(),
        class: 'Penalty',
        team: 'FBK',
        description: 'Too many players on ice'
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    expect(mapped).toBeDefined()
    expect(mapped?.description).toBe(event.description)
    expect(mapped?.type).toBe(EventType.Penalty)
    expect(mapped?.info.homeResult).toBe(parseInt(game.homeScore))
    expect((mapped?.info as PenaltyInfo).homeResult).toBe(parseInt(game.homeScore))
    expect((mapped?.info as PenaltyInfo).player).toBeUndefined()
    expect((mapped?.info as PenaltyInfo).penaltyLong).toBeUndefined()
    expect((mapped?.info as PenaltyInfo).penalty).toBeUndefined()
    expect((mapped?.info as PenaltyInfo).reason).toBe(event.description)
    expect((mapped?.info as PenaltyInfo).team).toBe('FBK')
})

test('Map Penalty shot', async () => {
    // Given
    const game = getGame()
   await  middle.onGame(game)
    const event: WsPenaltyEvent = {
        ...getEvent(),
        class: 'Penalty',
        team: 'FBK',
        description: 'Penalty shot'
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    expect(mapped).toBeUndefined()
})

test('Should send notification', async () => {
    // Given
    const game = getGame()
   await  middle.onGame(game)
    const event: WsGoalEvent = {
        ...getEvent(),
        class: 'Goal',
        team: 'LHF',
        location: { x: 123, y: -123 },
        extra: {
            scorerLong: '123 Olle Ollson Karlsson',
            teamAdvantage: 'PP3',
            homeForward: ['13'],
            homeAgainst: ['-123'],
        }
    }

    // When
    const mapped = await middle.onEvent(event)

    // Then
    expect(mapped).toBeDefined()
    expect(mapped?.type).toBe(EventType.Goal)

    expect(sentNotification).toBeCalledTimes(1)
})

function getEvent(): WsEvent {
    return {
        class: 'Period',
        eventId: '123',
        revision: 1,
        gameId: 123,
        period: 0,
        timePeriod: 39,
        gametime: '00:39',
        description: 'This is an event',
    }
}
function getGame(): WsGame {
    return {
        gameId: 123,
        homeTeamCode: 'LHF',
        homeScore: '11',
        awayTeamCode: 'FBK',
        awayScore: '0',
        gametime: '00:39',
        timePeriod: 39,
        statusString: 'P1 / 00:39',
        gameState: 'Ongoing',
        period: 1,
        arena: 'COOP Arena',
    }
}