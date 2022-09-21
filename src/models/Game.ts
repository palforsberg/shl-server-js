/**
 * example
 *     {
      "away_team_code": "DIF",
      "away_team_result": 0,
      "game_center_active": false,
      "game_id": 14367,
      "game_type": "Regular season game",
      "game_uuid": "qZl-8uIfjbeZ1",
      "highlights_coverage_enabled": false,
      "home_team_code": "IKO",
      "home_team_result": 0,
      "live_coverage_enabled": false,
      "overtime": false,
      "penalty_shots": false,
      "played": false,
      "season": "2021",
      "series": "SHL",
      "start_date_time": "2022-03-15T19:00:00+0100",
      "tv_channels": [],
      "venue": "Be-Ge Hockey Center"
    },
 */

interface Game {
    home_team_code: string
    home_team_result: number    
    away_team_code: string,
    away_team_result: number,
    game_uuid: string,
    game_id: number,
    played: boolean,
    overtime: boolean,
    penalty_shots: false,
    start_date_time: Date,
    season: string,
    game_type: string,

    /**
     * From GameStats
     */
    status?: GameStatus,    
}

enum GameStatus {
    Coming = 'Coming',
    Period1 = 'Period1',
    Period2 = 'Period2',
    Period3 = 'Period3',
    Overtime = 'Overtime',
    Shootout = 'Shootout',
    Finished = 'Finished',
    Intermission = 'Intermission',
}

export {
    GameStatus,
    Game,
}