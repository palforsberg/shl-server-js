import { Game } from "../src/models/Game"
import { GameStats } from "../src/models/GameStats"
import { PlayerService } from "../src/services/PlayerService"
import { SeasonService } from "../src/services/SeasonService"
import { getGame, getGameStats, getPlayer } from "./utils"

jest.mock("fs")
const fs = require('fs')
fs.promises = {
    readFile: () => Promise.reject({ code: 'ENOENT'}),
    writeFile: () => Promise.resolve({}),
}


const season = 2023
var games: Game[] = []
const gameStats: Record<string, GameStats> = {}

const playerService = new PlayerService(season, 
    () => Promise.resolve(games),
    (game_uuid) => gameStats[game_uuid])


test('Test Player stats aggregation', async () => {
    // Given
    const p = getPlayer(1)
    p.g = 1
    const game1 = getGame(1, 2, true)
    game1.game_uuid = '1'
    const game2 = getGame(1, 2, true)
    game2.game_uuid = '2'
    const futureGame = getGame(1, 2, false)
    futureGame.game_uuid = '3'

    games = [game1, game2, futureGame]

    const stats1 = new GameStats(getGameStats(1, 1))
    stats1.playersByTeam = { LHF: { players: [p], GK: [] } }
    gameStats['1'] = stats1

    const stats2 = new GameStats(getGameStats(1, 1))
    stats2.playersByTeam = { LHF: { players: [p], GK: [] } }
    gameStats['2'] = stats2

    // When
    const players = await playerService.update()

    // Then
    const updatedP = players.find(e => e.player == p.player)!
    expect(updatedP).toBeDefined()
    expect(updatedP.firstName).toBe(p.firstName)
    expect(updatedP.familyName).toBe(p.familyName)
    expect(updatedP.g).toBe(2)
    expect(updatedP.gp).toBe(2)
})

test('Test Goalkeeper stats aggregation', async () => {
    // Given
    const p = getPlayer(1)
    p.position = 'GK'
    p.g = 0
    p.tot_svs = 1
    const game1 = getGame(1, 2, true)
    game1.game_uuid = '1'
    const game2 = getGame(1, 2, true)
    game2.game_uuid = '2'
    const futureGame = getGame(1, 2, false)
    futureGame.game_uuid = '3'

    games = [game1, game2, futureGame]

    const stats1 = new GameStats(getGameStats(1, 1))
    stats1.playersByTeam = { LHF: { players: [], GK: [p] } }
    gameStats['1'] = stats1

    const stats2 = new GameStats(getGameStats(1, 1))
    stats2.playersByTeam = { LHF: { players: [], GK: [p] } }
    gameStats['2'] = stats2

    // When
    const players = await playerService.update()

    // Then
    const updatedP = players.find(e => e.player == p.player)!
    expect(updatedP).toBeDefined()
    expect(updatedP.firstName).toBe(p.firstName)
    expect(updatedP.familyName).toBe(p.familyName)
    expect(updatedP.g).toBe(0)
    expect(updatedP.tot_svs).toBe(2)
    expect(updatedP.gp).toBe(2)
})

test('Test Player rank', async () => {
    // Given
    const p1 = getPlayer(1)
    const p2 = getPlayer(2)
    const p3 = getPlayer(3)
    const p4 = getPlayer(4)

    p1.g = 15
    p2.g = p3.g = 10
    p4.g = 2

    const game1 = getGame(1, 2, true)
    game1.game_uuid = '1'
    games = [game1]

    const stats1 = new GameStats(getGameStats(1, 1))
    stats1.playersByTeam = { LHF: { players: [p1, p2, p3, p4], GK: [] } }
    gameStats['1'] = stats1

    // When
    const players = await playerService.update()

    // Then - p2 and p3 should have same rank, p4 rank 4
    expect(players.find(e => e.player == p1.player)!.rank).toBe(1)
    expect(players.find(e => e.player == p2.player)!.rank).toBe(2)
    expect(players.find(e => e.player == p3.player)!.rank).toBe(2)
    expect(players.find(e => e.player == p4.player)!.rank).toBe(4)
})