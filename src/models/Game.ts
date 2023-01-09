/**
 * Example. Note that live attributes are too slow to rely on.
 *     {
 * Used:
      "away_team_code": "DIF",
      "home_team_code": "IKO",
      "game_id": 14367,
      "game_uuid": "qZl-8uIfjbeZ1",
      "game_type": "Regular season game",
      "start_date_time": "2022-03-15T19:00:00+0100",

* Overwritten from GameStats but still used
      "away_team_result": 0,
      "home_team_result": 0,
      "played": false,
      
* Not used at all
      "live_coverage_enabled": false,
      "overtime": false,
      "penalty_shots": false,
      "season": "2021",
      "series": "SHL",
      "tv_channels": [],
      "highlights_coverage_enabled": false,
      "game_center_active": false,
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
    penalty_shots: boolean,
    start_date_time: Date,
    season: string,
    game_type: string,

    /**
     * From GameReport
     */
    status?: GameStatus,   
    gametime?: string 
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