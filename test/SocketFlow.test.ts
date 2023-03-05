const fs = require('fs')
import { EventType, GameEvent, PeriodInfo } from "../src/models/GameEvent"
import { Notifier } from "../src/Notifier"
import { GameReportService } from "../src/services/GameReportService"
import { GameStatsService } from "../src/services/GameStatsService"
import { SeasonService } from "../src/services/SeasonService"
import { SocketMiddleware } from "../src/services/SocketMiddleware"
import { UserService } from "../src/services/UserService"
import { WsEventService } from "../src/services/WsEventService"
import { SHL } from "../src/ShlClient"
import { ShlSocket, WsGame } from "../src/ShlSocket"
import { getConfig } from "./utils"

jest.mock("fs")
jest.mock('sockjs-client')
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
const userService = new UserService()
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
    .map(parse)

function parse(str: string): any {
    return JSON.parse(JSON.parse(str.substring(1))[0])
}

const gameReportGames: Record<number, WsGame> = {}
jsonFeed
    .filter((e: any) => e.class == 'GameReport')
    .flatMap((e: any) => e.games)
    .forEach((e: WsGame) => {
        gameReportGames[e.gameId] = e
        seasonService.gameIdToGameUuid[e.gameId] = 'game_uuid_' + e.gameId
    })

beforeEach(async () => {
    middleware = new SocketMiddleware(seasonService, wsEventService, liveStatsService, new Notifier(getConfig(), userService), new GameStatsService(new SHL(getConfig())))
    await socket.open()
    socket.join = jest.fn()
    wsEventService.db.write({})
})

test('Run feed for complete day', async () => {
    // Given

    // When - Push all events to socket
    for (const e of jsonFeed) {
        await socket.onMessage(JSON.stringify(e))
    }

    // Then
    // expect(socket.join).toBeCalledTimes(Object.keys(gameReportGames).length)

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

function verifyContains(events: GameEvent[], predicate: (arg0: GameEvent) => Boolean, numberEvents = 1) {
    const nrMatching = events.filter(predicate).length
    expect(nrMatching).toBe(numberEvents)
}
