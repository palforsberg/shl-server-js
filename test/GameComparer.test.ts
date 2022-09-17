import { GameStats } from '../src/models/GameStats'
import * as GameComparer from '../src/GameComparer'

test('finds new game', () => {
    const oldGames: GameStats[] = []
    const newGames = getGame()
    const result = GameComparer.compare([undefined, newGames])
    expect(result?.type).toBe('began')
});

test('finds ended game', () => {
    const oldGames = getGame()
    oldGames.gameState = 'Ongoing'
    const newGames = getGame()
    newGames.gameState = 'GameEnded'
    newGames.recaps!.gameRecap!.awayG = 1
    const result = GameComparer.compare([oldGames, newGames])
    expect(result?.type).toBe('ended')
});

test('finds home team scored', () => {
    const oldGames = getGame()
    const newGames = getGame()
    newGames.recaps!.gameRecap!.homeG++
    const result = GameComparer.compare([oldGames, newGames])
    expect(result?.type).toBe('scored')
});

test('finds away team scored', () => {
    const oldGames = getGame()
    const newGames = getGame()
    newGames.recaps!.gameRecap!.awayG++
    const result = GameComparer.compare([oldGames, newGames])
    expect(result?.type).toBe('scored')
});

test('game going from Intermission to Ongoing should not create event', () => {
    const oldGames = getGame()
    oldGames.gameState = 'Intermission'
    const newGames = getGame()
    newGames.gameState = 'Ongoing'
    const result = GameComparer.compare([oldGames, newGames])
    expect(result).toBe(undefined)
})

test('game going from Ongoing to OverTime should not create event', () => {
    const oldGames = getGame()
    oldGames.gameState = 'Ongoing'
    const newGames = getGame()
    newGames.gameState = 'OverTime'
    const result = GameComparer.compare([oldGames, newGames])
    expect(result).toBe(undefined)
})


test('game going from Ongoing to GameEnded should not create event if score is the same', () => {
    const oldGames = getGame()
    oldGames.gameState = 'Ongoing'
    const newGames = getGame()
    newGames.gameState = 'GameEnded'
    var result = GameComparer.compare([oldGames, newGames])
    expect(result).toBe(undefined)

    newGames.recaps!.gameRecap!.awayG = 1
    newGames.gameState = 'GameEnded'
    result = GameComparer.compare([oldGames, newGames])
    expect(result?.type).toBe('ended')
})

test('finds nothing', () => {
    const oldGames = getGame()
    const newGames = getGame()
    const result = GameComparer.compare([oldGames, newGames])
    expect(result).toBe(undefined)
});


function getGame(): GameStats {
    return new GameStats({
        game_uuid: 'game_uuid_1',
        gameState: 'Ongoing',
        recaps: {
            gameRecap: {
                homeG: 0,
                awayG: 0,
                periodNumber: 1,
                awayHits: 0,
                homeHits: 0,
                awaySOG: 0,
                homeSOG: 0,
                homeTeamId: 'LHF',
                awayTeamId: 'FBK',
                homePIM: 0,
                awayPIM: 0,
                homeFOW: 0,
                awayFOW: 0,
                status: 'Finished',
            }
        }
    })
}