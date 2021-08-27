import { Config } from "../src/models/Config"
import { Game } from "../src/models/Game"
import { Standing } from "../src/models/Standing"

function getStanding(team_code = 'LHF', gp = 123, points = 66, rank = 1, diff = 6): Standing {
    return {
        team_code,
        gp,
        points,
        rank,
        diff,
    }
}

function getGame(home_team_result: number = 1, away_team_result: number = 0, played = false): Game {
    return {
        home_team_code: 'LHF',
        home_team_result,
        away_team_code: 'FHC',
        away_team_result,
        game_uuid: '123',
        game_id: '321',
        played,
        start_date_time: new Date(Date.now() - 20000),
        season: '2021',
        game_type: 'season'
    }
}

function getGameStats(): GameStats {
    return {
        recaps: {
            gameRecap: {
                periodNumber: 0,
                awayG: 1,
                homeG: 1,
                awayHits: 15,
                homeHits: 15,
                awayFOW: 0,
                homeFOW: 0,
                awayPIM: 6,
                homePIM: 9,
                awaySOG: 11,
                homeSOG: 66,
            }
        },
        gameState: 'begun',
    }
}

function getConfig(): Config {
    return {
        shl_client_id: "123",
        shl_client_secret: "456",
        apn_key_path: "",
        apn_key_id: "555", 
        apn_team_id: "666", 
        apn_topic: "com.testing.ios",
        admin_password: "123",
        production: false,
        port: 8080
    }
}

function mockAxios(axios: any, games: Game[], gameStats?: GameStats) {
    axios.get = jest.fn().mockImplementation(e => {
        if (e == `https://openapi.shl.se/seasons/2030/games.json`) {
            return Promise.resolve({ data: games })
        } else if (e == `https://www.shl.se/gamecenter/123/statistics/321.json`) {
            return Promise.resolve({ data: gameStats })
        }
        return Promise.resolve({ data: 'fake data' })
    })
    axios.post = jest.fn().mockResolvedValue({ data: 'fake data' })
}

const apn = require('apn')
function mockApn() {
    const sentNotification = jest.fn().mockResolvedValue({ failed: [] })
    apn.Provider = class {
        send = sentNotification
    }

    return sentNotification
}
export {
    getStanding,
    getGame,
    getGameStats,
    mockAxios,
    getConfig,
    mockApn,
}