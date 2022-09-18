const fs = require('fs')
const axios = require('axios')

import { Express } from 'jest-express/lib/express';
import { Request } from 'jest-express/lib/request';
import { Response } from 'jest-express/lib/response';
import { User } from '../src/models/User';

import { SeasonService } from "../src/services/SeasonService"
import { GameStatsService } from "../src/services/GameStatsService"
import { RestService } from "../src/services/RestService"
import { StandingService } from "../src/services/StandingService"
import { TeamsService } from "../src/services/TeamsService"
import { UserService } from "../src/services/UserService"
import { SHL } from "../src/ShlClient"
import { getConfig, getGame, getGameStats, getStanding, mockApn, mockAxios } from "./utils"
import { GameStats } from '../src/models/GameStats';

jest.mock("fs")
jest.mock("axios")

fs.promises = {
    readFile: () => Promise.reject({ code: 'ENOENT'}),
    writeFile: () => Promise.resolve({}),
}

const app = new Express()

mockApn()

const season = 2030
const config = getConfig()
const shl = new SHL(config, 1)

const userService = new UserService()
const gameStatsService = new GameStatsService(shl)
const seasonService = new SeasonService(season, 0, shl, gameStatsService)
const seasonServices = {
    2030: seasonService,
    2021: new SeasonService(2021, -1, shl, gameStatsService),
    2020: new SeasonService(2020, -1, shl, gameStatsService),
    2019: new SeasonService(2019, -1, shl, gameStatsService),
 }
const standingsService = new StandingService(season, 4, shl)
const teamsService = new TeamsService()

const getServices: Record<string, (a: any, b: any) => void> = {}
const postServices: Record<string, (a: any, b: any) => void> = {}
app.get = jest.fn().mockImplementation((e, fnc) => {
    getServices[e] = fnc
})
app.post = jest.fn().mockImplementation((e, fnc) => {
    postServices[e] = fnc
})

const restService = new RestService(
    app,
    seasonServices,
    standingsService,
    userService,
    gameStatsService,
)

restService.setupRoutes()
restService.startListen(3333)

beforeEach(async () => {
    await userService.db.write([])
    await gameStatsService.db.write({})
})

test('Get season', async () => {
    // Given
    const game = [getGame()]
    await seasonService.write(game)
    const req = new Request()
    req.setParams('season', season.toString())
    const res = new Response()

    // When
    await getServices['/games/:season'](req, res)

    // Then
    expect(res.send).toHaveBeenCalledTimes(1)
    expect(res.body).toEqual(JSON.stringify(game))
})

test('Get season with non-numberic param', async () => {
       // Given
       const req = new Request()
       req.setParams('season', 'hejsna')
       const res = new Response()
   
       // When
       await getServices['/games/:season'](req, res)
   
       // Then
       expect(res.send).toHaveBeenCalledTimes(1)
       expect(res.status).toHaveBeenCalledWith(404)
       expect(res.body).toBe('Could not find season hejsna')
})

test('Get not found season', () => {
    const req = new Request()
    req.setParams('season', '666')
    const res = new Response()
    getServices['/games/:season'](req, res)

    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(404)
})

test('Get standings', async () => {
    // Given
    const standings = [getStanding()]
    await standingsService.getCurrentSeason().write(standings)
    const req = new Request()
    req.setParams('season', season.toString())
    const res = new Response()

    // When
    await getServices['/standings/:season'](req, res)

    // Then
    expect(res.send).toHaveBeenCalledTimes(1)
    expect(res.body).toEqual(JSON.stringify(standings))
})

test('Get standings 404', async () => {
    // Given
    const req = new Request()
    req.setParams('season', '666')
    const res = new Response()

    // When
    await getServices['/standings/:season'](req, res)

    // Then
    expect(res.send).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(404)
})

test('Get empty standings', async () => {
    // Given
    const req = new Request()
    await seasonService.write([getGame()])
    await standingsService.getCurrentSeason().write([])
    req.setParams('season', season.toString())
    const res = new Response()

    // When
    await getServices['/standings/:season'](req, res)

    // Then - should get all home_teams from the game-schedule and return a standing for them
    expect(res.send).toHaveBeenCalledTimes(1)
    const body = JSON.parse(res.body)
    expect(body).toEqual([getStanding('LHF', 0, 0, 0, 0)])
})

test('Get teams', async () => {
    const res = new Response()

    // When
    await getServices['/teams'](undefined, res)

    // Then
    expect(res.send).toHaveBeenCalledTimes(1)
})

test('Get game stats', async () => {
    // Given
    const game = getGame()
    const stats = getGameStats()
    const req = new Request()
    req.setParams('game_uuid', game.game_uuid)
    req.setParams('game_id', game.game_id.toString())
    await gameStatsService.db.write({ [game.game_uuid]: stats })
    const res = new Response()

    // When
    await getServices['/game/:game_uuid/:game_id'](req, res)

    // Then
    expect(res.send).toHaveBeenCalledTimes(1)
    const body = JSON.parse(res.body)
    expect(body).toStrictEqual(stats)
})

test('Get non existing game stats', async () => {
    // Given - not stored but available game stats
    const game = getGame()
    const req = new Request()
    mockAxios(axios, [], undefined)
    req.setParams('game_uuid', game.game_uuid)
    req.setParams('game_id', game.game_id.toString())
    const res = new Response()

    // When
    await getServices['/game/:game_uuid/:game_id'](req, res)

    // Then
    expect(res.send).toHaveBeenCalledTimes(1)
    expect(res.body).toBe(JSON.stringify(GameStats.empty()))
})

test('Get non existing game stats, not found at all', async () => {
    // Given - not stored but available game stats
    const game = getGame()
    const req = new Request()
    mockAxios(axios, [], undefined)
    req.setParams('game_uuid', game.game_uuid)
    req.setParams('game_id', game.game_id.toString())
    const res = new Response()

    // When
    await getServices['/game/:game_uuid/:game_id'](req, res)

    // Then
    expect(res.send).toHaveBeenCalledTimes(1)
    expect(res.body).toBe(JSON.stringify(GameStats.empty()))
})

test('Get game stats, no params', async () => {
    // Given - not stored but available game stats
    const req = new Request()
    req.setParams('game_uuid', undefined)
    req.setParams('game_id', undefined)
    const res = new Response()

    // When
    await getServices['/game/:game_uuid/:game_id'](req, res)

    // Then
    expect(res.send).toHaveBeenCalledTimes(1)
    expect(res.body).toBe(JSON.stringify(GameStats.empty()))
})

test('Post user', async () => {
    // Given
    const user: User = { id: '123', teams: ['LHF'], apn_token: 'apn_token', ios_version: '16.0.0', app_version: 'v0.1.4'}
    const req = new Request()
    req.setBody(user)
    const res = new Response()

    // When
    await postServices['/user'](req, res)

    // Then - should add the user
    expect(res.send).toHaveBeenCalledTimes(1)
    expect(res.send).toHaveBeenCalledWith('success')

    const users = await userService.db.read()
    expect(users.length).toBe(1)
    const addedUser = users[0]
    expect(addedUser.id).toBe('123')
    expect(addedUser.teams).toStrictEqual(['LHF'])
    expect(addedUser.apn_token).toBe('apn_token')
    expect(addedUser.ios_version).toBe('16.0.0')
    expect(addedUser.app_version).toBe('v0.1.4')
})

test('Post user garbage data', async () => {
    // Given
    const user = {
        hejsan: 'svejsan',
        id: [],
        teams: 'coolio',
    }
    const req = new Request()
    req.setBody(user)
    const res = new Response()

    // When
    await postServices['/user'](req, res)

    // Then - should rejet the request and not add any users
    expect(res.status).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(500)

    const users = await userService.db.read()
    expect(users.length).toBe(0)
})


test('Post user with number for ID', async () => {
    // Given
    const user = {
        apn_token: 'svejsan',
        id: 123,
        teams: ['LHF'],
    }
    const req = new Request()
    req.setBody(user)
    const res = new Response()

    // When
    await postServices['/user'](req, res)

    // Then - should add
    const users = await userService.db.read()
    expect(users.length).toBe(1)
})

test('Post user with empty ID', async () => {
    // Given
    const user = {
        apn_token: 'svejsan',
        id: '',
        teams: ['LHF'],
    }
    const req = new Request()
    req.setBody(user)
    const res = new Response()

    // When
    await postServices['/user'](req, res)

    // Then - should add
    const users = await userService.db.read()
    expect(users.length).toBe(0)
})

test('Post user without apn_token', async () => {
    // Given
    const user: User = { id: 'user_1', teams: ['LHF'], apn_token: 'apn_token', ios_version: '16.0.0', app_version: 'v0.1.4'}
    const req = new Request()
    req.setBody(user)
    const res = new Response()

    // When - first add user
    await postServices['/user'](req, res)

    // Then - user should be added
    var users = await userService.db.read()
    expect(users.length).toBe(1)

    // When - add user without a apn_token
    user.apn_token = undefined
    req.setBody(user)
    await postServices['/user'](req, res)

    // Then - user should be removed
    users = await userService.db.read()
    expect(users.length).toBe(0)
})

test('Post user without any team', async () => {
    // Given
    const user: User = { id: 'user_1', teams: ['LHF'], apn_token: 'apn_token', ios_version: '16.0.0', app_version: 'v0.1.4'}
    const req = new Request()
    req.setBody(user)
    const res = new Response()

    // When - first add user
    await postServices['/user'](req, res)

    // Then - user should be added
    var users = await userService.db.read()
    expect(users.length).toBe(1)

    // When - adding user without any teams
    user.teams = []
    req.setBody(user)
    await postServices['/user'](req, res)

    // Then - user should be removed
    users = await userService.db.read()
    expect(users.length).toBe(0)
})