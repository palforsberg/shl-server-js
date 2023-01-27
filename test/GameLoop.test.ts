
const fs = require('fs')
const axios = require('axios')

import { GameStats } from "../src/models/GameStats";
import { Service } from "../src/Service";
import { GameReportService } from "../src/services/GameReportService";
import { GameStatsService } from "../src/services/GameStatsService";
import { ShlSocket } from "../src/ShlSocket";
import { getConfig, getGame, getGameStats, getStanding, mockAxios, mockAxiosFn } from "./utils";

const GameLoop = require('../src/GameLoop').GameLoop
const { SeasonService } = require('../src/services/SeasonService');
const { UserService } = require('../src/services/UserService');
const { StandingService } = require('../src/services/StandingService')
const { SHL } = require('../src/ShlClient')

const season = 2030

jest.mock("axios")


jest.mock("fs")

fs.promises = {
    readFile: () => Promise.reject({ code: 'ENOENT'}),
    writeFile: () => Promise.resolve({}),
}

Service.prototype.hasExpired = jest.fn().mockReturnValue(true)

const config = getConfig()
const shl = new SHL(config, 1)
const userService = new UserService()
const reportService = new GameReportService()
const gameStatsService = new GameStatsService(shl)
const seasonService = new SeasonService(season, 0, shl, reportService, gameStatsService)
const standingsService = new StandingService(season, 4, shl)
const socket = new ShlSocket(config.shl_socket_path)

const looper = new GameLoop(
    seasonService,
    gameStatsService,
    standingsService,
    socket
)

jest.setTimeout(20_000_000)

beforeEach(() => {
    // @ts-ignore
    seasonService.write([])
    Object.values(standingsService.seasons).forEach((e: any) => {
        // @ts-ignore
        e.write([])
    })
    // @ts-ignore
    gameStatsService.db.write({})
    socket.open = jest.fn()
    socket.join = jest.fn()
    socket.close = jest.fn()
})

test("Test ignore empty response from SHLClient", async () => {
    // Given - SHL returns a live game and some stats
    await userService.addUser({ id: 'user_1', teams: ['LHF'], apn_token: 'apn_token'})
    mockAxios(axios, [getGame()], getGameStats(0, 0))
    const game_uuid = getGameStats().game_uuid

    // When - Loop has run
    await looper.gameJob()

    // Then - GameStats should be saved
    var gameStats = await gameStatsService.db.read()
    expect(gameStats[getGame().game_uuid].recaps?.gameRecap?.awayG).toBe(getGameStats().recaps?.gameRecap?.awayG)

    // Given - Invalid gameStats returned
    mockAxios(axios, [getGame()], { gameState: '', game_uuid, recaps: {}})

    // When - game loop runs
    await looper.gameJob()

    // Then
    // Game stats should not be updated
    gameStats = await gameStatsService.db.read()
    expect(gameStats[getGame().game_uuid]).toBeDefined()
    expect(gameStats[getGame().game_uuid].recaps?.gameRecap?.awayG).toBe(getGameStats().recaps?.gameRecap?.awayG)
})

test("SHL-client returns rejection for games", async () => {
    // Given
    await userService.addUser({ id: 'user_1', teams: ['LHF'], apn_token: 'apn_token'})
    mockAxiosFn(axios, () => Promise.reject(), () => Promise.resolve({ data: getGameStats() }))

    // When
    await looper.gameJob()

    // Then
    const games = await seasonService.read()
    expect(games).toStrictEqual([])
})

test("SHL-client returns error code with data in db for games", async () => {
    // Given - some entries in the db
    await userService.addUser({ id: 'user_1', teams: ['LHF'], apn_token: 'apn_token'})
    mockAxios(axios, [getGame()], getGameStats())
    await looper.gameJob()
    var games = await seasonService.read()
    expect(games.length).toBe(1)

    // Next request will be rejected
    mockAxiosFn(axios, () => Promise.reject('Bad request'), () => Promise.resolve({ data: getGameStats() }))

    // When
    await looper.gameJob()

    // Then - game should still be in db
    games = await seasonService.read()
    expect(games.length).toBe(1)
})

test("SHL-client returns error code with data", async () => {
    // Given - some entries in the db
    await userService.addUser({ id: 'user_1', teams: ['LHF'], apn_token: 'apn_token'})
    mockAxiosFn(axios, () => Promise.resolve({ data: [getGame()] }), () => Promise.reject('Bad request'))

    // Next request will be rejected
    // When
    await looper.gameJob()

    // Then - stats should still be in db
    const storedStats = gameStatsService.getFromCache(getGame().game_uuid)
    expect(storedStats).toBeUndefined()
})

test("SHL-client returns error code with data in db for stats", async () => {
    // Given - some entries in the db
    await userService.addUser({ id: 'user_1', teams: ['LHF'], apn_token: 'apn_token'})
    const stats = getGameStats()
    mockAxios(axios, [getGame()], stats)
    await looper.gameJob()

    // Next request will be rejected
    mockAxiosFn(axios, () => Promise.resolve({ data: [getGame()] }), () => Promise.reject('Bad request'))

    // When
    await looper.gameJob()

    // Then - stats should still be in db
    const storedStats = gameStatsService.getFromCache(getGame().game_uuid)
    expect(storedStats).toBeDefined()
    expect(storedStats?.playersByTeam).toBe(stats.playersByTeam)
    expect(storedStats?.gameState).toBe(stats.gameState)
    expect(storedStats?.recaps).toBe(stats.recaps)
})

test("SHL-client returns error on standings", async () => {
    // Given
    mockAxiosFn(axios, 
        () => Promise.resolve({ data: [getGame()] }),
        () => Promise.resolve({ data: getGameStats() }),
        () => Promise.reject('Bad request'))
        
    // When
    await looper.gameJob()

    // Then
    const standings = await standingsService.getCurrentSeason().read()
    expect(standings).toStrictEqual([])
})

test("SHL-client returns error on standings with standing in DB", async () => {
    // Given - standing in DB
    const standing = getStanding()
    mockAxios(axios, [getGame()], getGameStats(), [standing])
    await looper.gameJob()
    var standings = await standingsService.getCurrentSeason().read()
    expect(standings.length).toBe(1)
    // Next request will reject
    mockAxiosFn(axios, 
        () => Promise.resolve({ data: [getGame()] }),
        () => Promise.resolve({ data: getGameStats() }),
        () => Promise.reject('Bad request'))
        
    // When
    await looper.gameJob()

    // Then - should still have same standing in DB
    standings = await standingsService.getCurrentSeason().read()
    expect(standings.length).toBe(1)
    expect(standings[0]).toBe(standing)
})

test('Test with gameStats.recaps being an array / undefined', async () => {
    // Given - SHL returns a live game and some stats
    await userService.addUser({ id: 'user_1', teams: ['LHF'], apn_token: 'apn_token'})
    const gameStats = getGameStats()
    // @ts-ignore
    gameStats.recaps!.gameRecap = []
    // @ts-ignore
    gameStats.playersByTeam = []
    mockAxios(axios, [getGame(2, 0, false)], gameStats)

    // When - Loop has run with gameStats
    await looper.gameJob()

    // Then - recaps should have been converted to object
    const stats = await gameStatsService.db.read()
    var firstStat = Object.values(stats)[0]
    expect(firstStat).toBe(undefined)
})

test('Test season game without gamestats', async () => {
    // Given - Game started at least two hours ago
    let inputGame = getGame(2, 0)
    inputGame.start_date_time = new Date(Date.now() - 2 * 60 * 60 * 1001)
    mockAxios(axios, [inputGame], undefined)

    // When
    await looper.gameJob()

    // Then
    let games = await seasonService.read()
    expect(games.length).toBe(1)

    // Given - Game started in future
    inputGame = getGame(2, 0)
    inputGame.start_date_time = new Date(Date.now() + 20000)
    mockAxios(axios, [inputGame], undefined)

    // When
    await looper.gameJob()

    // Then
    games = await seasonService.read()
    expect(games.length).toBe(1)
})

test('Start socket when live games', async () => {
    // Given - Live game
    const preStats = new GameStats(getGameStats(2, 0))
    const game = getGame(2, 0)
    game.start_date_time = new Date()
    game.start_date_time.setMinutes(game.start_date_time.getMinutes() + 4)
    mockAxios(axios, [game], preStats)

    // When - Loop has run with game
    await looper.gameJob()

    // Then - socket should be opened
    expect(socket.open).toBeCalled()
    expect(socket.join).toBeCalledTimes(1)
    expect(socket.close).toBeCalledTimes(0)
})

test('Stop socket when games end', async () => {
    // Given - Live game
    const preStats = new GameStats(getGameStats(2, 0))
    const game = getGame(2, 0)
    game.start_date_time = new Date()
    mockAxios(axios, [game], preStats)

    // When - Loop has run with game
    await looper.gameJob()

    // Then - socket should be opened
    expect(socket.open).toBeCalled()
    expect(socket.close).toBeCalledTimes(0)

    // Given
    preStats.gameState = 'GameEnded'
    mockAxios(axios, [game], preStats)

    // When
    await looper.gameJob()

    // Then
    expect(socket.close).toBeCalledTimes(1)
})

test('Start fetching gamestats', async () => {
    // Given - Live game
    mockAxios(axios, [getGame(2, 0)], getGameStats(2, 0))

    // When - Loop has run with game
    await looper.gameJob()

    // Then
    expect(looper.getGamesToFetch().length).toBe(1)

    // Given - game stats no longer live
    const stats = getGameStats(2, 0)
    stats.gameState = 'GameEnded'
    mockAxios(axios, [getGame(2, 0)], stats)

    // When - Loop has run with game
    await looper.gameJob()

    // Then - no games to fetch
    expect(looper.getGamesToFetch().length).toBe(0)
})