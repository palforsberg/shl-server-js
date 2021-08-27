
const fs = require('fs')
const axios = require('axios')

import { GameStatsService } from "../src/services/GameStatsService";
import { getConfig, getGame, getGameStats, mockApn, mockAxios } from "./utils";

const GameLoop = require('../src/GameLoop').GameLoop
const { LiveGameService } = require('../src/services/LiveGameSerive');
const { GameService } = require('../src/services/GameService');
const { UserService } = require('../src/services/UserService');
const { StandingService } = require('../src/services/StandingService')
const { SHL } = require('../src/ShlClient')

const season = 2030

jest.mock("axios")
jest.mock("apn")
jest.mock("fs")

fs.promises = {
    readFile: () => Promise.reject({ code: 'ENOENT'}),
    writeFile: () => Promise.resolve({}),
}

const sentNotification = mockApn()

const config = getConfig()
const shl = new SHL(config.shl_client_id, config.shl_client_secret, 1)
const currentSeason = new GameService(season, season, shl)
const liveGames = new LiveGameService(currentSeason)
const userService = new UserService()
const gameStatsService = new GameStatsService(shl)
const looper = new GameLoop(
    config,
    liveGames,
    currentSeason,
    userService,
    gameStatsService,
    new StandingService(season, season, shl))

jest.setTimeout(20_000_000)

beforeEach(() => {
    sentNotification.mockClear()
    liveGames.db.write([])
})

test("Notify on started game", async () => {
    // Given - SHL returns a live game and some stats
    await userService.addUser('user_1', ['LHF'], 'apn_token')
    mockAxios(axios, [getGame()], getGameStats())

    // When - Loop has run
    await looper.gameJob()

    // Then - Game should be saved
    const games = await currentSeason.db.read()
    expect(games.length).toBe(1)
    expect(games[0].home_team_code).toBe(getGame().home_team_code)

    // Live game should be saved
    const live = await liveGames.db.read()
    expect(live.length).toBe(1)

    // Game stats should be updated
    const gameStats = await gameStatsService.db.read()
    expect(gameStats[getGame().game_uuid]).toBeDefined()
    expect(gameStats[getGame().game_uuid].recaps.gameRecap?.awayG).toBe(getGameStats().recaps.gameRecap?.awayG)

    // Notifications should be sent
    expect(sentNotification).toHaveBeenCalledTimes(1)
    expect(sentNotification.mock.calls[0][0].alert).toContain('Matchen började')
})

test("No notifications if no update", async () => {
    // Given - SHL returns a live game and some stats
    await userService.addUser('user_1', ['LHF'], 'apn_token')
    mockAxios(axios, [getGame()], getGameStats())

    // When - Loop has run twice with same underlying data
    await looper.gameJob()
    expect(sentNotification).toHaveBeenCalledTimes(1)
    sentNotification.mockClear()
    await looper.gameJob()

    // Notifications should not have been sent
    expect(sentNotification).toHaveBeenCalledTimes(0)
})

test("Notification on score", async () => {
    // Given - SHL returns a live game and some stats
    await userService.addUser('user_1', ['LHF'], 'apn_token')
    mockAxios(axios, [getGame(2, 0)], getGameStats())

    // When - Loop has run with game
    await looper.gameJob()
    expect(sentNotification).toHaveBeenCalledTimes(1)
    sentNotification.mockClear()

    // When - Loop runs with score change
    mockAxios(axios, [getGame(3, 0)], getGameStats())
    await looper.gameJob()

    // Then - notifications should've been sent
    expect(sentNotification).toHaveBeenCalledTimes(1)
    expect(sentNotification.mock.calls[0][0].alert).toContain('Mål!')
})

test("Notification game ended", async () => {
    // Given - SHL returns a live game and some stats
    await userService.addUser('user_1', ['LHF'], 'apn_token')
    mockAxios(axios, [getGame(2, 0, false)], getGameStats())

    // When - Loop has run with game
    await looper.gameJob()
    expect(sentNotification).toHaveBeenCalledTimes(1)
    sentNotification.mockClear()

    // When - Loop runs with game now played = true
    mockAxios(axios, [getGame(2, 0, true)], getGameStats())
    await looper.gameJob()

    // Then - notifications should've been sent
    expect(sentNotification).toHaveBeenCalledTimes(1)
    expect(sentNotification.mock.calls[0][0].alert).toContain('Matchen slutade')
})

test("No live game", async () => {
    // Given - SHL returns a played game
    await userService.addUser('user_1', ['LHF'], 'apn_token')
    mockAxios(axios, [getGame(2, 0, true)], getGameStats())

    // When - Loop has run with game, no notification
    await looper.gameJob()
    expect(sentNotification).toHaveBeenCalledTimes(0)
    sentNotification.mockClear()

    // When - Loop runs with score change, but not live
    mockAxios(axios, [getGame(5, 0, true)], getGameStats())
    await looper.gameJob()

    // Then - notifications should not have been sent
    expect(sentNotification).toHaveBeenCalledTimes(0)
})
