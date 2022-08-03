
const fs = require('fs')
const axios = require('axios')

import { GameStats } from "../src/models/GameStats";
import { User } from "../src/models/User";
import { Service } from "../src/Service";
import { GameStatsService } from "../src/services/GameStatsService";
import { getConfig, getGame, getGameStats, getStanding, mockApn, mockAxios, mockAxiosFn } from "./utils";

const GameLoop = require('../src/GameLoop').GameLoop
const { SeasonService } = require('../src/services/SeasonService');
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

Service.prototype.hasExpired = jest.fn().mockReturnValue(true)

const config = getConfig()
const shl = new SHL(config, 1)
const userService = new UserService()
const gameStatsService = new GameStatsService(shl)
const seasonService = new SeasonService(season, 0, shl, gameStatsService)
const standingsService = new StandingService(season, 4, shl)
const looper = new GameLoop(
    config,
    seasonService,
    userService,
    gameStatsService,
    standingsService)

jest.setTimeout(20_000_000)

beforeEach(() => {
    sentNotification.mockClear()
    // @ts-ignore
    seasonService.db.write(undefined)
    Object.values(standingsService.seasons).forEach((e: any) => {
        // @ts-ignore
        e.db.write(undefined)
    })
    // @ts-ignore
    gameStatsService.db.write(undefined)
})

test("Notify on started game", async () => {
    // Given - SHL returns a live game and some stats
    await userService.addUser(new User('user_1', ['LHF'], 'apn_token'))
    mockAxios(axios, [getGame()], getGameStats())

    // When - Loop has run
    await looper.gameJob()

    // Then - Game should be saved
    const games = await seasonService.db.read()
    expect(games.length).toBe(1)
    expect(games[0].home_team_code).toBe(getGame().home_team_code)

    // Game stats should be updated
    const gameStats = await gameStatsService.db.read()
    expect(gameStats[getGame().game_uuid]).toBeDefined()
    expect(gameStats[getGame().game_uuid].recaps?.gameRecap?.awayG).toBe(getGameStats().recaps?.gameRecap?.awayG)

    // Notifications should be sent
    expect(sentNotification).toHaveBeenCalledTimes(1)
    expect(sentNotification.mock.calls[0][0].alert.title).toContain('Matchen började')
})

test("No notifications if no update", async () => {
    // Given - SHL returns a live game and some stats
    await userService.addUser(new User('user_1', ['LHF'], 'apn_token'))
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
    await userService.addUser(new User('user_1', ['LHF'], 'apn_token'))
    mockAxios(axios, [getGame(2, 0)], getGameStats(2, 0))

    // When - Loop has run with game
    await looper.gameJob()
    expect(sentNotification).toHaveBeenCalledTimes(1)
    sentNotification.mockClear()

    // When - Loop runs with score change
    const updatedGameStats = getGameStats(3, 0)
    updatedGameStats.playersByTeam!['LHF'].players[0].g = 1
    mockAxios(axios, [getGame(3, 0)], updatedGameStats)
    await looper.gameJob()

    // Then - notifications should've been sent
    expect(sentNotification).toHaveBeenCalledTimes(1)
    expect(sentNotification.mock.calls[0][0].alert.title).toEqual('MÅÅÅL för Luleå!')
    expect(sentNotification.mock.calls[0][0].alert.body).toContain('LHF 3 - 0 FBK')
    expect(sentNotification.mock.calls[0][0].alert.body).toContain('Mats Matsson')
})

test("Notification on score, only from game stats", async () => {
    // Given - SHL returns a live game and some stats
    await userService.addUser(new User('user_1', ['LHF'], 'apn_token'))
    mockAxios(axios, [getGame(0, 0)], getGameStats(0, 0))
    await looper.gameJob()
    expect(sentNotification).toHaveBeenCalledTimes(1)
    sentNotification.mockClear()

    mockAxios(axios, [getGame(0, 0)], getGameStats(2, 0))

    // When - Loop has run with game
    await looper.gameJob()
    expect(sentNotification).toHaveBeenCalledTimes(1)
    // GameStats should update the game db
    var gameStats = await gameStatsService.db.read()
    var stats = Object.values(gameStats)[0]
    expect(stats.recaps?.gameRecap?.homeG).toBe(2)
    expect(stats.recaps?.gameRecap?.awayG).toBe(0)

    var games = await seasonService.db.read()
    expect(games[0].home_team_result).toBe(2)
    expect(games[0].away_team_result).toBe(0)

    // var live = await liveGames.db.read()
    // expect(live[0].home_team_result).toBe(2)
    // expect(live[0].away_team_result).toBe(0)
    sentNotification.mockClear()

    // When - Loop runs with score change
    mockAxios(axios, [getGame(0, 0)], getGameStats(3, 0))
    await looper.gameJob()

    // Then - notifications should've been sent
    expect(sentNotification).toHaveBeenCalledTimes(1)
    expect(sentNotification.mock.calls[0][0].alert.title).toEqual('MÅÅÅL för Luleå!')
    expect(sentNotification.mock.calls[0][0].alert.body).toContain('LHF 3 - 0 FBK')

    // GameStats should update the game db
    games = await seasonService.db.read()
    expect(games[0].home_team_result).toBe(3)
    expect(games[0].away_team_result).toBe(0)
    // var live = await liveGames.db.read()
    // expect(live[0].home_team_result).toBe(3)
    // expect(live[0].away_team_result).toBe(0)
    sentNotification.mockClear()

    // When - Loop runs with no score change
    mockAxios(axios, [getGame(0, 0)], getGameStats(3, 0))
    await looper.gameJob()

    // Then - notifications should not have been sent
    expect(sentNotification).toHaveBeenCalledTimes(0)

    // GameStats should update the game db
    games = await seasonService.db.read()
    expect(games[0].home_team_result).toBe(3)
    expect(games[0].away_team_result).toBe(0)
    // var live = await liveGames.db.read()
    // expect(live[0].home_team_result).toBe(3)
    // expect(live[0].away_team_result).toBe(0)
})

test("Notification game ended", async () => {
    // Given - SHL returns a live game and some stats
    await userService.addUser(new User('user_1', ['LHF'], 'apn_token'))
    mockAxios(axios, [getGame(2, 0, false)], getGameStats())

    // When - Loop has run with game
    await looper.gameJob()
    expect(sentNotification).toHaveBeenCalledTimes(1)
    sentNotification.mockClear()

    // When - Loop runs with game now played = true
    const statsEnded = getGameStats()
    statsEnded.gameState = 'GameEnded'
    mockAxios(axios, [getGame(2, 0, true)], statsEnded)
    await looper.gameJob()

    // Then - notifications should've been sent
    expect(sentNotification).toHaveBeenCalledTimes(1)
    expect(sentNotification.mock.calls[0][0].alert.title).toContain('Matchen slutade')

    const stats = await gameStatsService.db.read()
    var firstStat = Object.values(stats)[0]
    expect(firstStat.playersByTeam?.['LHF'].players.length).toBe(3)
    expect(firstStat.playersByTeam?.['LHF'].players[0].firstName).toBe('Mats')
})

test("No live game", async () => {
    // Given - SHL returns a played game
    await userService.addUser(new User('user_1', ['LHF'], 'apn_token'))
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

test("SHL-client returns rejection for games", async () => {
    // Given
    await userService.addUser(new User('user_1', ['LHF'], 'apn_token'))
    mockAxiosFn(axios, () => Promise.reject(), () => Promise.resolve({ data: getGameStats() }))

    // When
    await looper.gameJob()

    // Then
    const games = await seasonService.db.read()
    expect(games).toBe(undefined)
})

test("SHL-client returns error code with data in db for games", async () => {
    // Given - some entries in the db
    await userService.addUser(new User('user_1', ['LHF'], 'apn_token'))
    mockAxios(axios, [getGame()], getGameStats())
    await looper.gameJob()
    var games = await seasonService.db.read()
    expect(games.length).toBe(1)

    // Next request will be rejected
    mockAxiosFn(axios, () => Promise.reject('Bad request'), () => Promise.resolve({ data: getGameStats() }))

    // When
    await looper.gameJob()

    // Then - game should still be in db
    games = await seasonService.db.read()
    expect(games.length).toBe(1)
})

test("SHL-client returns error code with data", async () => {
    // Given - some entries in the db
    await userService.addUser(new User('user_1', ['LHF'], 'apn_token'))
    mockAxiosFn(axios, () => Promise.resolve({ data: [getGame()] }), () => Promise.reject('Bad request'))

    // Next request will be rejected
    // When
    await looper.gameJob()

    // Then - stats should still be in db
    const storedStats = await gameStatsService.getFromDbOrRefresh(getGame().game_uuid, getGame().game_id)
    expect(storedStats).toBeUndefined()
})

test("SHL-client returns error code with data in db for stats", async () => {
    // Given - some entries in the db
    await userService.addUser(new User('user_1', ['LHF'], 'apn_token'))
    const stats = getGameStats()
    mockAxios(axios, [getGame()], stats)
    await looper.gameJob()

    // Next request will be rejected
    mockAxiosFn(axios, () => Promise.resolve({ data: [getGame()] }), () => Promise.reject('Bad request'))

    // When
    await looper.gameJob()

    // Then - stats should still be in db
    const storedStats = await gameStatsService.getFromDbOrRefresh(getGame().game_uuid, getGame().game_id)
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
    const standings = await standingsService.getCurrentSeason().db.read()
    expect(standings).toBeUndefined()
})

test("SHL-client returns error on standings with standing in DB", async () => {
    // Given - standing in DB
    const standing = getStanding()
    mockAxios(axios, [getGame()], getGameStats(), [standing])
    await looper.gameJob()
    var standings = await standingsService.getCurrentSeason().db.read()
    expect(standings.length).toBe(1)
    // Next request will reject
    mockAxiosFn(axios, 
        () => Promise.resolve({ data: [getGame()] }),
        () => Promise.resolve({ data: getGameStats() }),
        () => Promise.reject('Bad request'))
        
    // When
    await looper.gameJob()

    // Then - should still have same standing in DB
    standings = await standingsService.getCurrentSeason().db.read()
    expect(standings.length).toBe(1)
    expect(standings[0]).toBe(standing)
})