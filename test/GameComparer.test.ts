import { GameStats } from '../src/models/GameStats'
import * as GameComparer from '../src/GameComparer'
import { EventType, GoalInfo, PenaltyInfo, PeriodInfo } from '../src/models/GameEvent';
import { getPeriod, getPlayer } from './utils'

test('finds new game', () => {
    const oldGames: GameStats[] = []
    const newGames = getGame()
    const result = GameComparer.compare([undefined, newGames])[0]
    expect(result?.type).toBe(EventType.GameStart)
});

test('finds ended game', () => {
    const oldGames = getGame()
    oldGames.recaps!.gameRecap!.awayG = 1
    oldGames.gameState = 'Ongoing'
    const newGames = getGame()
    newGames.gameState = 'GameEnded'
    newGames.recaps!.gameRecap!.awayG = 1
    const result = GameComparer.compare([oldGames, newGames])[0]
    expect(result?.type).toBe(EventType.GameEnd)
});

test('finds home team scored', () => {
    const oldGames = getGame()
    const newGames = getGame()
    newGames.recaps!.gameRecap!.homeG++
    const result = GameComparer.compare([oldGames, newGames])[0]
    expect(result?.type).toBe(EventType.Goal)
    expect(result?.info).toEqual({
        game_uuid: newGames.game_uuid,
        homeTeamId: newGames.getHomeTeamId(),
        awayTeamId: newGames.getAwayTeamId(),
        homeResult: newGames.getHomeResult(),
        awayResult: newGames.getAwayResult(),
        periodNumber: newGames.getCurrentPeriodNumber(),
        player: undefined,
        team: newGames.getHomeTeamId(),
        teamAdvantage: '',
    } as GoalInfo)
});

test('finds away team scored', () => {
    const oldGames = getGame()
    const newGames = getGame()
    newGames.recaps!.gameRecap!.awayG++
    const result = GameComparer.compare([oldGames, newGames])[0]
    expect(result?.type).toBe(EventType.Goal)
});

test('finds home team scored during powerplay', () => {
    const oldGames = getGame()
    const newGames = getGame()
    newGames.recaps!.gameRecap!.awayG++
    newGames.recaps!.gameRecap!.awayPPG++
    const result = GameComparer.compare([oldGames, newGames])[0]
    expect(result?.type).toBe(EventType.Goal)
});

test('game going from Intermission to Ongoing should not create event', () => {
    const oldGames = getGame()
    oldGames.gameState = 'Intermission'
    const newGames = getGame()
    newGames.gameState = 'Ongoing'
    const result = GameComparer.compare([oldGames, newGames])[0]
    expect(result).toBe(undefined)
})

test('game going from Ongoing to OverTime should not create event', () => {
    const oldGames = getGame()
    oldGames.gameState = 'Ongoing'
    const newGames = getGame()
    newGames.gameState = 'OverTime'
    const result = GameComparer.compare([oldGames, newGames])
    expect(result.length).toBe(0)
})


test('game going from Ongoing to GameEnded should not create event if score is the same', () => {
    const oldGames = getGame()
    oldGames.gameState = 'Ongoing'
    const newGames = getGame()
    newGames.gameState = 'GameEnded'
    var result = GameComparer.compare([oldGames, newGames])
    expect(result.length).toBe(0)

    newGames.recaps!.gameRecap!.awayG = 1
    newGames.gameState = 'GameEnded'
    result = GameComparer.compare([oldGames, newGames])
    expect(result.length).toBe(2)
    const goalEvent = result[0]
    const endEvent = result[1]
    expect(goalEvent.type).toBe(EventType.Goal)
    expect(endEvent.type).toBe(EventType.GameEnd)
})

test('find penalty with player', () => {
    // Given
    const oldPlayer = getPlayer(1)
    const oldGame = getGame()
    oldGame.recaps!.gameRecap!.homePIM = 0
    oldGame.playersByTeam!['LHF'].players = [oldPlayer]
    const newPlayer = getPlayer(1)
    const newGame = getGame()
    newGame.recaps!.gameRecap!.homePIM = 3
    newPlayer.pim = 3
    newGame.playersByTeam!['LHF'].players = [newPlayer]

    // When
    const result = GameComparer.compare([oldGame, newGame])

    // Then
    expect(result.length).toBe(1)
    const event = result[0]
    expect(event.type).toBe(EventType.Penalty)
    expect((event.info as PenaltyInfo).team).toBe('LHF')
    expect((event.info as PenaltyInfo).player).toBe(newPlayer)
    expect((event.info as PenaltyInfo).penalty).toBe(3)
})

test('find penalty with multiple players', () => {
    const oldPlayer1 = getPlayer(1)
    const oldPlayer2 = getPlayer(2)
    const oldAPlayer3 = getPlayer(3)
    const oldGame = getGame()
    oldGame.recaps!.gameRecap!.homePIM = 0
    oldGame.recaps!.gameRecap!.awayPIM = 0
    oldGame.playersByTeam!['LHF'].players = [oldPlayer1, oldPlayer2]
    oldGame.playersByTeam!['FBK'].players = [oldAPlayer3]
    const newPlayer1 = getPlayer(1)
    const newPlayer2 = getPlayer(2)
    const newAPlayer3 = getPlayer(3)
    const newGame = getGame()
    newGame.recaps!.gameRecap!.homePIM = 5
    newGame.recaps!.gameRecap!.awayPIM = 2
    newPlayer1.pim = 3
    newPlayer2.pim = 2
    newAPlayer3.pim = 2
    newGame.playersByTeam!['LHF'].players = [newPlayer1, newPlayer2]
    newGame.playersByTeam!['FBK'].players = [newAPlayer3]

    // When
    const result = GameComparer.compare([oldGame, newGame])

    // Then
    expect(result.length).toBe(3)
    const event1 = result[0]
    expect(event1.type).toBe(EventType.Penalty)
    expect((event1.info as PenaltyInfo).team).toBe('LHF')
    expect((event1.info as PenaltyInfo).player).toBe(newPlayer1)
    expect((event1.info as PenaltyInfo).penalty).toBe(3)

    const event2 = result[1]
    expect(event2.type).toBe(EventType.Penalty)
    expect((event2.info as PenaltyInfo).team).toBe('LHF')
    expect((event2.info as PenaltyInfo).player).toBe(newPlayer2)
    expect((event2.info as PenaltyInfo).penalty).toBe(2)

    const event3 = result[2]
    expect(event3.type).toBe(EventType.Penalty)
    expect((event3.info as PenaltyInfo).team).toBe('FBK')
    expect((event3.info as PenaltyInfo).player).toBe(newAPlayer3)
    expect((event3.info as PenaltyInfo).penalty).toBe(2)
})

test('find penalty with no players', () => {
    // Given
    const oldPlayer = getPlayer(1)
    const oldGame = getGame()
    oldGame.recaps!.gameRecap!.homePIM = 0
    oldGame.playersByTeam!['LHF'].players = [oldPlayer]
    const newPlayer = getPlayer(1)
    const newGame = getGame()
    newGame.recaps!.gameRecap!.homePIM = 3
    newPlayer.pim = 0
    newGame.playersByTeam!['LHF'].players = [newPlayer]

    // When
    let result = GameComparer.compare([oldGame, newGame])

    // Then - no event found
    expect(result.length).toBe(0)

    // Given - player gets PIM
    newPlayer.pim = 2
    newGame.playersByTeam!['LHF'].players = [newPlayer]

    // When 
    result = GameComparer.compare([oldGame, newGame])

    // Then - event is found
    expect(result.length).toBe(1)
    const event = result[0]
    expect(event.type).toBe(EventType.Penalty)
    expect((event.info as PenaltyInfo).team).toBe('LHF')
    expect((event.info as PenaltyInfo).player).toBe(newPlayer)
    expect((event.info as PenaltyInfo).penalty).toBe(2)
})

test('find period start', () => {
    const oldGame = getGame()
    const newGame = getGame()

    newGame.recaps![0] = getPeriod(1)

    // When 
    const result = GameComparer.compare([oldGame, newGame])

    // Then
    expect(result.length).toBe(1)
    const event = result[0]
    expect(event.type).toBe(EventType.PeriodStart)
    expect((event.info as PeriodInfo).periodNumber).toBe(1)
})

test('find period end', () => {
    const oldGame = getGame()
    const newGame = getGame()
    oldGame.recaps![0] = getPeriod(1)
    newGame.recaps![0] = getPeriod(1)
    newGame.recaps![0].status = 'Finished'

    // When 
    const result = GameComparer.compare([oldGame, newGame])

    // Then
    expect(result.length).toBe(1)
    const event = result[0]
    expect(event.type).toBe(EventType.PeriodEnd)
    expect((event.info as PeriodInfo).periodNumber).toBe(1)
})

test('find no period end if periodnumber is differing', () => {
    const oldGame = getGame()
    const newGame = getGame()
    oldGame.recaps![0] = getPeriod(2)
    newGame.recaps![0] = getPeriod(1)
    newGame.recaps![0].status = 'Finished'

    // When 
    const result = GameComparer.compare([oldGame, newGame])
        .filter(e => e.type == EventType.PeriodEnd)

    // Then
    expect(result.length).toBe(0)
})

test('finds nothing', () => {
    const oldGames = getGame()
    const newGames = getGame()
    const result = GameComparer.compare([oldGames, newGames])
    expect(result.length).toBe(0)
});


function getGame(): GameStats {
    return new GameStats({
        game_uuid: 'game_uuid_1',
        gameState: 'Ongoing',
        playersByTeam: {
            'LHF': {
                GK: [],
                players: [],
            },
            'FBK': {
                GK: [],
                players: [],
            }
        },
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
                homePPG: 0,
                awayPPG: 0,
                status: 'Finished',
            }
        }
    })
}