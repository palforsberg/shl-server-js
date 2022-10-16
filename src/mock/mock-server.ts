
import { randomInt } from 'crypto'
import express, { Response, Request } from 'express'
import { Game } from '../models/Game'
import { GameStats, GameStatsIf, PeriodStats, Player } from '../models/GameStats'
import { Standing } from '../models/Standing'

const app = express().use(express.json())
const port = 8000

class Season {
    liveGames: Game[]
    comingGames: Game[]
    playedGames: Game[]
    constructor() {
        this.liveGames = [...Array(5).keys()].map(getLiveGame)
        this.comingGames = [...Array(250).keys()].map(getComingGame)
        this.playedGames = [...Array(250).keys()].map(getPlayedGame)
    }

    getAllGames(): Game[] {
        return [...this.liveGames, ...this.comingGames, ...this.playedGames]
    }

    getRandomLiveGames(): Game[] {
        const num = rand() % 2 + 1
        const shuffled = [...this.liveGames].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, num);
    }
}

app.post('/oauth2/token', (req: Request, res: Response) => {
    return res.send(JSON.stringify({ access_token: 'hejsan_svejsan' }))
})
app.get('/seasons/:season/games.json', (req: Request, res: Response) => {
    return res.send(JSON.stringify(seasonGames))
})
app.get('/gamecenter/:game_uuid/statistics/:game_id.json', (req: Request, res: Response) => {
    const stats = gameStats[req.params.game_uuid]
    if (rand() % 10 == 0) {
        // return bad stats
        console.log('luring')
        return res.send(JSON.stringify({ gameState: '', game_uuid: req.params.game_uuid, recaps: {}} as GameStatsIf))    
    }

    return res.send(JSON.stringify(stats))
})
app.get('/seasons/:season/statistics/teams/standings.json', (req: Request, res: Response) => {
    return res.send(JSON.stringify(standings))
})

app.listen(port, () => console.log(`[MOCK]: Mock is running at http://localhost:${port}`))

const teams = Object.keys(getTeams())
const season = new Season()
const seasonGames = season.getAllGames()
const standings = getStandings(teams)
const gameStats = getAllGameStats(seasonGames)
const nrUpdatesPerGame: Record<string, number> = {}
console.log('Setup season of games: ', seasonGames.length)
console.log('Live games ' + season.liveGames.map(e => e.home_team_code + ' vs ' + e.away_team_code).join(', '))

loop()

function loop() {
    const liveGames = season.getRandomLiveGames()
    liveGames.forEach(e => {
        const stats = gameStats[e.game_uuid]
        const nrUpdates = (nrUpdatesPerGame[e.game_uuid] || 0)
        if (stats.recaps?.gameRecap) {
            const type = rand() % 3
            if (nrUpdates % 5 == 0) {
                // new period
                const period = stats.getCurrentPeriodNumber()
                if (period == 3) {
                    stats.gameState = 'GameEnded'
                }
                if (period == 2) {
                    stats.recaps[2] = getPeriod(e, 3)
                } else if (period == 1) {
                    stats.recaps[1] = getPeriod(e, 2)
                } else {
                    stats.recaps[0] = getPeriod(e, 1)
                }
            } else if (type == 0) {
                // away goal
                stats.recaps.gameRecap.awayG += 1
                const player = getRandomPlayer(stats.playersByTeam?.[stats.getAwayTeamId()]?.players)
                player!.g! += 1
            } else if (type == 1) {
                // home goal
                stats.recaps.gameRecap.homeG += 1
                const player = getRandomPlayer(stats.playersByTeam?.[stats.getHomeTeamId()]?.players)
                player!.g! += 1
            } else {
                // penalty
                stats.recaps.gameRecap.homePIM += 2
                const player = getRandomPlayer(stats.playersByTeam?.[stats.getHomeTeamId()]?.players)
                player!.pim! += 2
            }
        }
        nrUpdatesPerGame[e.game_uuid] = nrUpdates + 1
    })
    console.log('[LOOP] games updated ', liveGames.map(e => e.game_uuid))
    setTimeout(loop, 60 * 1000)
}
function rand(): number {
    let max = 10000;
    return randomInt(max)
}
function getRandomTeam(): string {
    return teams[rand() % teams.length]
}

function getStandings(teamCodes: string[]): Standing[] {
    return teamCodes.map((e, i) => ({
        team_code: e,
        gp: 12,
        rank: i + 1,
        points: (100 - i),
        diff: rand()
    }))
}

function getAllGameStats(season: Game[]): Record<string, GameStats> {
    return season.map(e => [e.game_uuid, getGameStats(e)] as [string, GameStats])
        .reduce((acc, stats) => {
            return {...acc, [stats[0]]: stats[1]};
        }, {})
}

function getGameStats(game: Game): GameStats {
    if (!game.played && game.start_date_time < new Date()) {
        // live
        return new GameStats({
            game_uuid: game.game_uuid,
            playersByTeam: {
                [game.home_team_code]: {
                    GK: [],
                    players: getPlayers(game.home_team_code),
                },
                [game.away_team_code]: {
                    GK: [],
                    players: getPlayers(game.away_team_code),
                }
            },
            recaps: {
                0: getPeriod(game, 1),
                gameRecap: getPeriod(game, 1),
            },
            gameState: 'Ongoing'
        })

    } else if (game.played) {
        // played
        return new GameStats({
            game_uuid: game.game_uuid,
            playersByTeam: {
                [game.home_team_code]: {
                    GK: [],
                    players: getPlayers(game.home_team_code),
                },
                [game.away_team_code]: {
                    GK: [],
                    players: getPlayers(game.away_team_code),
                }
            },
            recaps: {
                0: getPeriod(game, 1),
                gameRecap: getPeriod(game, 0),
            },
            gameState: 'GameEnded'
        })
    } else {
        // coming
        return new GameStats({
            game_uuid: game.game_uuid,
            recaps: {},
            gameState: ''
        })
    }
}


function getPeriod(game: Game, nr: number): PeriodStats {
    return {
        periodNumber: nr,
        homeG: game.home_team_result,
        homeFOW: 0,
        homeHits: 0,
        homePIM: 0,
        homeSOG: 0,
        homeTeamId: game.home_team_code,

        awayG: game.away_team_result,
        awayFOW: 0,
        awayHits: 0,
        awayPIM: 0,
        awaySOG: 0,
        homePPG: 0,
        awayPPG: 0,
        awayTeamId: game.away_team_code,

        status: 'Playing',
    }
}
function getLiveGame(e: number): Game {
    const g = generateSeasonGame('live', e);
    g.start_date_time.setMinutes(g.start_date_time.getMinutes() - 5);
    return g
}

function getPlayedGame(e: number): Game {
    const g = generateSeasonGame('played', e);
    g.start_date_time.setMilliseconds(0)
    g.start_date_time.setDate(g.start_date_time.getDate() - 5 - (e * 2));
    g.played = true
    g.home_team_result = rand() % 6
    g.away_team_result = rand() % 4
    return g
}

function getComingGame(e: number): Game {
    const g = generateSeasonGame('coming', e);
    g.start_date_time.setDate(g.start_date_time.getDate() + (e * 2));
    g.start_date_time.setMilliseconds(0)
    g.played = false
    return g
}

function generateSeasonGame(type: string, e: number): Game {
    return {
        home_team_code: getRandomTeam(),
        home_team_result: 0,
        away_team_code: getRandomTeam(),
        away_team_result: 0,
        game_uuid: 'game_' + type + '_' + e,
        game_id: Number(e),
        played: false,
        overtime: false,
        penalty_shots: false,
        start_date_time: new Date(),
        season: '2022',
        game_type: 'Regular season game',
        status: undefined,
    }
}


function firstnames(): string[] {
    return [
        'Olle',
        'Molle',
        'Mats',
        'Elsie',
        'Bibbi',
    ]
}

function familynames(): string[] {
    return [
        'Persson',
        'Mollson',
        'Olsson',
        'Forsberg',
    ]
}

function getPlayers(team: string): Player[] {
    const first = firstnames()
    const family = familynames()
    return [...Array(10).keys()].map(e => ({
        firstName: first[rand() % first.length],
        familyName: family[rand() % family.length],
        jersey: rand() % 99,
        line: 1,
        player: rand(),
        position: 'CK',
        team,
        g: 0,
        a: 0,
        toi: '13:37',
        pim: 0,
        sog: 0,
        pop: 0,
        nep: 0,
    }))
}

function getRandomPlayer(players: undefined | Player[]): Player | undefined {
    if (!players) return undefined
    return players[rand() % players.length]
}

function getTeams(): Record<string, string> {
    return {
        "TIK": "Timrå IK",
        "VLH": "Växjö Lakers",
        "RBK": "Rögle BK",
        "LIF": "Leksands IF",
        "SAIK": "Skellefteå AIK",
        "LHF": "Luleå HF",
        "OHK": "Örebro Hockey",
        "FHC": "Frölunda HC",
        "FBK": "Färjestad BK",
        "MIF": "IF Malmö Redhawks",
        "DIF": "Djurgården Hockey",
        "IKO": "IK Oskarshamn",
        "LHC": "Linköpings HC",
        "BIF": "Brynäs IF",
        "HV71": "HV71"
    }
}