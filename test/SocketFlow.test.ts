const fs = require('fs')
import { EventType, GoalInfo, PenaltyInfo } from "../src/models/GameEvent"
import { SeasonService } from "../src/services/SeasonService"
import { SocketMiddleware, WsGoalEvent, WsPenaltyEvent, WsPeriodEvent } from "../src/services/SocketMiddleware"
import { WsEventService } from "../src/services/WsEventService"
import { ShlSocket, WsEvent, WsGame } from "../src/ShlSocket"

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

jest.mock('../src/services/SeasonService')
const socket = new ShlSocket('hejsan')
socket.join = jest.fn()
let middleware: SocketMiddleware

const wsEventService = new WsEventService()
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
    middleware = new SocketMiddleware(seasonService, socket, wsEventService)
    socket.open()
    socket.join = jest.fn()
    wsEventService.db.write({})
})

test('Run feed for complete day', async () => {
    // Given

    // When - Push all events to socket
    rawFeed.forEach(async e => {
        await socket.onMessage(e)
    })

    // Then
    expect(socket.join).toBeCalledTimes(Object.keys(gameReportGames).length)

    const events = await wsEventService.read(Object.values(seasonService.gameIdToGameUuid)[0])
    // expect(events[0].type).toBe(EventType.GameStart)
    // expect(events[17].type).toBe(EventType.PeriodEnd)
    expect(events.length).toBe(18)
})
