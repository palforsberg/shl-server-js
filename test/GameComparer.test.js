const GameComparer = require('../src/GameComparer.js')

test('finds new game', () => {
    const oldGames = []
    const newGames = [getGame('1')]
    const result = GameComparer.compare(oldGames, newGames)
    expect(result[0].type).toBe('began')
});

test('finds ended game', () => {
    const oldGames = [getGame('1')]
    const newGames = []
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


function getGame(id) {
    return {
        game_uuid: id,
        home_team_result: 0,
        home_team_code: 'LHF',
        away_team_result: 0,
        away_team_code: 'FBK',
    }
}