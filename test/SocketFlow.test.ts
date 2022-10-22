const fs = require('fs')
import { EventType, PeriodInfo } from "../src/models/GameEvent"
import { GameReportService } from "../src/services/GameReportService"
import { SeasonService } from "../src/services/SeasonService"
import { SocketMiddleware } from "../src/services/SocketMiddleware"
import { WsEventService, WsGameEvent } from "../src/services/WsEventService"
import { ShlSocket, WsGame } from "../src/ShlSocket"

jest.mock("fs")
jest.mock('ws')
const _fs = jest.requireActual('fs');

fs.promises = {
    readFile: () => Promise.reject({ code: 'ENOENT'}),
    writeFile: () => Promise.resolve({}),
}

class MockedSeasonService extends SeasonService {
    constructor() {
        // @ts-ignore
        super(-1, -1, undefined, undefined)
        this.gameIdToGameUuid = {}
    }
}
const seasonService = new MockedSeasonService()
const liveStatsService = new GameReportService()
const wsEventService = new WsEventService()

jest.mock('../src/services/SeasonService')
const socket = new ShlSocket('hejsan')
socket.join = jest.fn()
let middleware: SocketMiddleware

socket.onEvent(e => {
    return middleware.onEvent(e)
})
socket.onGameReport(g => {
    return middleware.onGame(g)
})

const rawFeed: string[] = _fs.readFileSync('./test/resources/2022-10-15.log')
    .toString()
    .split('\n')
    .filter((e: string) => e !== '"o"' && e != '')
    .map((e: string) => JSON.parse(e))

const jsonFeed = rawFeed
    .map(ShlSocket.parse)

const gameReportGames: Record<number, WsGame> = {}
jsonFeed
    .filter((e: any) => e.class == 'GameReport')
    .flatMap((e: any) => e.games)
    .forEach((e: WsGame) => {
        gameReportGames[e.gameId] = e
        seasonService.gameIdToGameUuid[e.gameId] = 'game_uuid_' + e.gameId
    })

beforeEach(() => {
    middleware = new SocketMiddleware(seasonService, socket, wsEventService, liveStatsService)
    socket.open()
    socket.join = jest.fn()
    wsEventService.db.write({})
})

test('Run feed for complete day', async () => {
    // Given

    // When - Push all events to socket
    for (const e of rawFeed) {
        await socket.onMessage(e)
    }

    // Then
    expect(socket.join).toBeCalledTimes(Object.keys(gameReportGames).length)

    // Should have events for all 7 games
    const eventsForGames = await wsEventService.db.read()
    expect(Object.values(eventsForGames).length).toBe(7)

    // Should have all events for a single game
    const events = await wsEventService.read(Object.values(seasonService.gameIdToGameUuid)[0])
    expect(events.length).toBe(20)
    expect(events[0].type).toBe(EventType.GameStart)
    expect(events[19].type).toBe(EventType.PeriodEnd)

    verifyContains(events, e => e.type == EventType.PeriodStart && (e.info as PeriodInfo).periodNumber == 1)
    verifyContains(events, e => e.type == EventType.PeriodEnd && (e.info as PeriodInfo).periodNumber == 1)
    verifyContains(events, e => e.type == EventType.PeriodStart && (e.info as PeriodInfo).periodNumber == 2)
    verifyContains(events, e => e.type == EventType.PeriodEnd && (e.info as PeriodInfo).periodNumber == 2)
    verifyContains(events, e => e.type == EventType.PeriodStart && (e.info as PeriodInfo).periodNumber == 3)
    verifyContains(events, e => e.type == EventType.PeriodEnd && (e.info as PeriodInfo).periodNumber == 3)
})

function verifyContains(events: WsGameEvent[], predicate: (arg0: WsGameEvent) => Boolean, numberEvents = 1) {
    const nrMatching = events.filter(predicate).length
    expect(nrMatching).toBe(numberEvents)
}