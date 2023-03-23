const fs = require('fs')
import { Notification } from "apns2";
import { EventType, GameEvent } from "../src/models/GameEvent";
import { ContentState, LiveActivityService } from "../src/services/LiveActivityService";
import { getConfig, getGameReport } from "./utils";

jest.mock("fs")

fs.promises = {
    readFile: () => Promise.reject({ code: 'ENOENT'}),
    writeFile: () => Promise.resolve({}),
}

var sentNotifications: Notification[] = []

const push = (e: Notification[]) => {
    sentNotifications = e
    return Promise.resolve(e)
}
const event = new GameEvent(EventType.GameStart, { homeTeamId: 'LHF', awayTeamId: 'TIK', homeResult: 0, awayResult: 0, game_uuid: '123', periodNumber: 1 }, '1', 1, '00:00', 0, 'desc')
const general_game_report = getGameReport()
const liveActivityService = new LiveActivityService(getConfig(), (a) => Promise.resolve(general_game_report), (a) => Promise.resolve([event]), (a) => undefined, push)

beforeEach(async () => {
    await liveActivityService.db.write({})
    sentNotifications = []
})

test('Test subscribe', async () => {
    // Given
    const game_uuid = 'game_uuid'
    // When
    await liveActivityService.subscribe(game_uuid, 'token123', 'user_id')
    
    // Then
    let db = liveActivityService.db.readCached()
    let entry = db[game_uuid]
    expect(entry.length).toBe(1)
    expect(entry[0]).toStrictEqual({game_uuid, token: 'token123', user_id: 'user_id' })

    // When - entry is overwritten
    await liveActivityService.subscribe(game_uuid, 'token123_1', 'user_id')
    
    // Then
    db = liveActivityService.db.readCached()
    entry = db[game_uuid]
    expect(entry.length).toBe(1)
    expect(entry[0]).toStrictEqual({game_uuid, token: 'token123_1', user_id: 'user_id' })


    // When - new user subscribes
    await liveActivityService.subscribe(game_uuid, 'token123_2', 'user_id_2')
    
    // Then
    db = liveActivityService.db.readCached()
    entry = db[game_uuid]
    expect(entry.length).toBe(2)
    expect(entry[1]).toStrictEqual({game_uuid, token: 'token123_2', user_id: 'user_id_2' })
})

test('Test unsubscribe', async () => {
    // Given
    const game_uuid = 'game_uuid'
    await liveActivityService.subscribe(game_uuid, 'token123_1', 'user_id_1')
    await liveActivityService.subscribe(game_uuid, 'token123_2', 'user_id_2')
    
    // When
    await liveActivityService.unsubscribe(game_uuid, 'user_id_1')

    // Then
    let db = await liveActivityService.db.read()
    let entry = db[game_uuid]
    expect(entry.length).toBe(1)
    expect(entry[0]).toStrictEqual({game_uuid, token: 'token123_2', user_id: 'user_id_2' })

    // When
    await liveActivityService.unsubscribe(game_uuid, 'user_id_2')

    // Then
    db = liveActivityService.db.readCached()
    entry = db[game_uuid]
    expect(entry).toBeUndefined()
})

test('Test onEvent', async () => {
    // Given
    const game_uuid = 'game_uuid'
    await liveActivityService.subscribe(game_uuid, 'token123_1', 'user_id_1')

    const event = new GameEvent(EventType.GameStart, { homeTeamId: 'LHF', awayTeamId: 'TIK', homeResult: 0, awayResult: 0, game_uuid: game_uuid, periodNumber: 1 }, '1', 1, '00:00', 0, 'desc')

    // When
    await liveActivityService.onEvent(event)

    // Then
    expect(sentNotifications.length).toBe(1)
    const notif = sentNotifications[0].buildApnsOptions()
    const contentState = notif.aps['content-state'] as ContentState

    expect(contentState.event?.title).toBe(event.getTitle())
    expect(contentState.report.gametime).toBe('00:00')
})

test('Test onEvent with undefined gameport', async () => {
    // Given
    const game_uuid = 'game_uuid'
    liveActivityService.getReport = () => Promise.resolve(undefined)
    await liveActivityService.subscribe(game_uuid, 'token123_1', 'user_id_1')

    const event = new GameEvent(EventType.GameEnd, { homeTeamId: 'LHF', awayTeamId: 'TIK', homeResult: 0, awayResult: 0, game_uuid: game_uuid, periodNumber: 1 }, '1', 1, '00:00', 0, 'desc')

    // When
    await liveActivityService.onEvent(event)

    // Then
    expect(sentNotifications.length).toBe(1)
    const notif = sentNotifications[0].buildApnsOptions()
    const contentState = notif.aps['content-state'] as ContentState

    expect(contentState.event?.title).toBe(event.getTitle())
    expect(contentState.report.gametime).toBe('00:00')
})

test('Test onReport', async () => {
    // Given
    const game_uuid = 'game_uuid'
    await liveActivityService.subscribe(game_uuid, 'token123_1', 'user_id_1')

    const report = getGameReport()
    report.gameUuid = game_uuid
    report.homeScore = 9
    report.gametime = '13:37'

    // When
    await liveActivityService.onReport(report)

    // Then
    expect(sentNotifications.length).toBe(1)
    const notif = sentNotifications[0].buildApnsOptions()
    const contentState = notif.aps['content-state'] as ContentState

    expect(contentState.event?.title).toBe(event.getTitle())
    expect(contentState.report.gametime).toBe(report.gametime)
    expect(contentState.report.homeScore).toBe(report.homeScore)
})