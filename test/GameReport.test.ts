import { GameStats } from "../src/models/GameStats";
import { GameStatus } from "../src/models/Game";

import { getGameReport } from "./utils"
import { getStatusFromGameReport } from "../src/services/GameReportService";

test('Test GameStatus', () => {
    let report = getGameReport()
    report.gameState = 'NotStarted'

    expect(getStatusFromGameReport(report)).toBe(GameStatus.Coming)

    // When
    report.gameState = 'NotStarted'

    // Then
    expect(getStatusFromGameReport(report)).toBe(GameStatus.Coming)

    // When
    report.gameState = 'Ongoing'

    // Then
    expect(getStatusFromGameReport(report)).toBe(GameStatus.Period1)

    // When
    report.gameState = 'Ongoing'
    report.period = 2
    
    // Then
    expect(getStatusFromGameReport(report)).toBe(GameStatus.Period2)

    // When
    report.gameState = 'Ongoing'
    report.period = 3

    // Then
    expect(getStatusFromGameReport(report)).toBe(GameStatus.Period3)

    // When
    report.gameState = 'OverTime'

    // Then
    expect(getStatusFromGameReport(report)).toBe(GameStatus.Overtime)

    // When
    report.gameState = 'Ongoing'
    report.period = 4

    // Then
    expect(getStatusFromGameReport(report)).toBe(GameStatus.Overtime)

    // When
    report.gameState = 'Intermission'
    
    // Then
    expect(getStatusFromGameReport(report)).toBe(GameStatus.Intermission)

    // When - score is differing
    report.gameState = 'GameEnded'
    
    // Then - Game finished
    expect(getStatusFromGameReport(report)).toBe(GameStatus.Finished)

    // When
    report.gameState = 'Ongoing'
    report.period = 99
    
    // Then - Game finished
    expect(getStatusFromGameReport(report)).toBe(GameStatus.Shootout)

    // When
    report.gameState = 'ShootOut'
    report.period = 1
    
    // Then - Game finished
    expect(getStatusFromGameReport(report)).toBe(GameStatus.Shootout)

})