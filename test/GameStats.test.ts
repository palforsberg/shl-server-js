import { GameStats } from "../src/models/GameStats";
import { GameStatus } from "../src/models/Game";

import { getGameStats } from "./utils"

test('Test GameStatus', () => {
    let stats = new GameStats(getGameStats())
    stats.gameState = ''

    expect(stats.getGameStatus()).toBe(GameStatus.Coming)

    // When
    stats.gameState = 'Ongoing'

    // Then
    expect(stats.getGameStatus()).toBe(GameStatus.Period1)

    // When
    stats.gameState = 'Ongoing'
    stats.recaps![0] = stats.recaps!.gameRecap
    
    // Then
    expect(stats.getGameStatus()).toBe(GameStatus.Period1)
    expect(new GameStats(stats).status).toBe(stats.getGameStatus())

    // When
    stats.gameState = 'Ongoing'
    stats.recaps![1] = stats.recaps!.gameRecap
    stats.recaps![1]!.periodNumber = 2
    
    // Then
    expect(stats.getGameStatus()).toBe(GameStatus.Period2)
    expect(new GameStats(stats).status).toBe(stats.getGameStatus())

    // When
    stats.gameState = 'Ongoing'
    stats.recaps![2] = stats.recaps!.gameRecap
    stats.recaps![2]!.periodNumber = 3

    // Then
    expect(stats.getGameStatus()).toBe(GameStatus.Period3)
    expect(new GameStats(stats).status).toBe(stats.getGameStatus())

    // When
    stats.gameState = 'OverTime'

    // Then
    expect(stats.getGameStatus()).toBe(GameStatus.Overtime)
    expect(new GameStats(stats).status).toBe(stats.getGameStatus())

    // When
    stats.gameState = 'Ongoing'
    stats.recaps![3] = stats.recaps!.gameRecap
    stats.recaps![3]!.periodNumber = 4

    // Then
    expect(stats.getGameStatus()).toBe(GameStatus.Overtime)
    expect(new GameStats(stats).status).toBe(stats.getGameStatus())

    // When
    stats.gameState = 'Intermission'
    
    // Then
    expect(stats.getGameStatus()).toBe(GameStatus.Intermission)
    expect(new GameStats(stats).status).toBe(stats.getGameStatus())

    // When - GameEnded but score is still the same
    stats.gameState = 'GameEnded'
    stats.recaps!.gameRecap!.awayG = 3
    stats.recaps!.gameRecap!.homeG = 3
    
    // Then - Still ongoing
    expect(stats.getGameStatus()).toBe(GameStatus.Overtime)
    expect(new GameStats(stats).status).toBe(stats.getGameStatus())

    // When - score is differing
    stats.gameState = 'GameEnded'
    stats.recaps!.gameRecap!.awayG = 3
    stats.recaps!.gameRecap!.homeG = 4
    
    // Then - Game finished
    expect(stats.getGameStatus()).toBe(GameStatus.Finished)
    expect(new GameStats(stats).status).toBe(stats.getGameStatus())

    // When - score is differing
    stats.gameState = 'Ongoing'
    stats.recaps![3] = stats.recaps!.gameRecap
    stats.recaps![3]!.periodNumber = 99
    
    // Then - Game finished
    expect(stats.getGameStatus()).toBe(GameStatus.Shootout)
    expect(new GameStats(stats).status).toBe(stats.getGameStatus())

})