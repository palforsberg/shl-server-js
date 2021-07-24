import { Game } from '../src/models/Game'
import * as GameComparer from '../src/GameComparer'

test('finds new game', () => {
    const oldGames: Game[] = []
    const newGames = [getGame('1')]
    const result = GameComparer.compare(oldGames, newGames)
    expect(result[0].type).toBe('began')
});

test('finds ended game', () => {
    const oldGames = [getGame('1')]
    const newGames: Game[] = []
    const result = GameComparer.compare(oldGames, newGames)
    expect(result[0].type).toBe('ended')
});

test('finds home team scored', () => {
    const oldGames = [getGame('1')]
    const newGames = [getGame('1')]
    newGames[0].home_team_result++
    const result = GameComparer.compare(oldGames, newGames)
    expect(result[0].type).toBe('scored')
});

test('finds away team scored', () => {
    const oldGames = [getGame('1')]
    const newGames = [getGame('1')]
    newGames[0].away_team_result++
    const result = GameComparer.compare(oldGames, newGames)
    expect(result[0].type).toBe('scored')
});

test('finds nothing', () => {
    const oldGames = [getGame('1')]
    const newGames = [getGame('1')]
    const result = GameComparer.compare(oldGames, newGames)
    expect(result.length).toBe(0)
});


function getGame(id: string): Game {
    return {
        game_uuid: id,
        game_id: 123,
        home_team_result: 0,
        home_team_code: 'LHF',
        away_team_result: 0,
        away_team_code: 'FBK',
        start_date_time: new Date(),
        played: false,
    }
}