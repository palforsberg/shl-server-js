import { Config } from "../src/models/Config"
import { Game } from "../src/models/Game"
import { GameStats, GameStatsIf, PeriodStats, Player } from "../src/models/GameStats"
import { Standing } from "../src/models/Standing"
import { GameReport } from "../src/services/GameReportService"
import { WsPeriodEvent } from "../src/services/SocketMiddleware"
import { WsEvent, WsGame } from "../src/ShlSocket"

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
        game_id: 321,
        played,
        overtime: false,
        penalty_shots: false,
        start_date_time: new Date(Date.now() - 20000),
        season: '2021',
        game_type: 'season'
    }
}

function getGameStats(homeG = 0, awayG = 0): GameStatsIf {
    return {
        game_uuid: 'game_uuid',
        recaps: {
            gameRecap: getPeriod(undefined, undefined, undefined, homeG, awayG),
            0: getPeriod(1, undefined, undefined, homeG, awayG, 'Playing')
        },
        gameState: 'Ongoing',
        playersByTeam: {
            "LHF": {
                players: [getPlayer(1), getPlayer(2), getPlayer(3)],
                GK: [],
            },
            "FHC": {
                players: [getPlayer(1), getPlayer(2)],
                GK: [],
            }
        }
    }
}

function getGameReport(): GameReport {
    return {
        gameUuid: 'game_uuid',
        gametime: '00:00',
        timePeriod: 0,
        statusString: 'Ongoing',
        gameState: 'Ongoing',
        period: 1,
        homeScore: 0,
        awayScore: 0,
    }
}

function getWsGame(): WsGame {
    return {
        gameId: 321,

        homeTeamCode: 'LHF',
        awayTeamCode: 'FBK',
        homeScore: '2',
        awayScore: '0',
        gametime: '00:00',
        timePeriod: 0,
        statusString: 'Ongoing',
        gameState: 'Ongoing',
        period: 1,
        arena: 'Coop arena',
    }
}

function getWsPeriodEvent(): WsPeriodEvent {
    return {
        eventId: '123',
        gameId: 321,
        revision: 1,
        period: 1,
        timePeriod: 0,
        gametime: '00:00',
        description: 'Description',
        class: 'Period',
        extra: {
            gameStatus: 'GameEnded',
        }
    }
}

function getPeriod(periodNumber = 0, homeTeamId = 'LHF', awayTeamId = 'FBK', homeG = 0, awayG = 0, status = 'Playing'): PeriodStats {
    return {

        homeTeamId,
        awayTeamId,
        periodNumber,
        awayG,
        homeG,
        awayHits: 15,
        homeHits: 15,
        awayFOW: 0,
        homeFOW: 0,
        awayPIM: 0,
        homePIM: 0,
        awaySOG: 11,
        homeSOG: 66,
        awayPPG: 0,
        homePPG: 0,
        status,
    }
}

function getPlayer(player: number): Player {
    return {
        player,
        jersey: 69,
        team: 'LHF',
        firstName: 'Mats',
        familyName: 'Matsson',
        g: 0,
        a: 1,
        pim: 0,
        toi: '23:21',
        position: 'CE',
        line: 1,
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
        port: 8080,
        shl_path: "http://localhost:8000",
        shl_stats_path: "http://localhost:8000",
        shl_socket_path: "ws://localhost:8090",
        send_notifications: true,
    }
}

function mockAxios(axios: any, games: Game[], gameStats?: GameStatsIf, standings: Standing[] = [getStanding()]) {
    mockAxiosFn(axios,
        () => Promise.resolve({ data: games }),
        () => Promise.resolve({ data: gameStats }),
        () => Promise.resolve({ data: standings }))
}

function mockAxiosFn(
    axios: any, 
    games: () => Promise<any>, 
gameStats: () => Promise<any>,
standings: (() => Promise<any>) = () => Promise.resolve({ data: getStanding() })) {
    axios.get = jest.fn().mockImplementation(e => {
        if (e == `http://localhost:8000/seasons/2030/games.json`) {
            return games()
        } else if (e == `http://localhost:8000/gamecenter/123/statistics/321.json`) {
            return gameStats()
        } else if (e == `http://localhost:8000/seasons/2030/statistics/teams/standings.json`) {
            return standings()
        }
        return Promise.resolve({ data: 'fake data' })
    })
    axios.post = jest.fn().mockResolvedValue({ data: 'fake data' })
}

export {
    getStanding,
    getGame,
    getPeriod,
    getGameStats,
    getPlayer,
    mockAxios,
    mockAxiosFn,
    getConfig,
    getGameReport,
    getWsGame,
    getWsPeriodEvent,
}