import { Game } from "../models/Game";
import { GameStats, Player, PlayersOnTeam } from "../models/GameStats";
import { Service } from "../Service";

/**
 * PlayerService
 * Best player on each team
 * Best player vs before game
 * Best at end of season
 */
class PlayerService extends Service<Player[]> {
    
    getGames: () => Promise<Game[]>
    getGameStats: (game_uuid: string) => (GameStats | undefined)

    teamCache: Record<string, Player[]>

    constructor(
        season: number, 
        getGames: () => Promise<Game[]>, 
        getGameStats: (game_uuid: string) => (GameStats | undefined)) {
        super('players_' + season, [], () => this.aggregatePlayers(), 0)
        this.getGames = getGames
        this.getGameStats = getGameStats
        this.teamCache = {}

        this.getPlayersForTeam = this.getPlayersForTeam.bind(this)
        this.aggregatePlayers = this.aggregatePlayers.bind(this)
    }

    getPlayersForTeam(team: string): Promise<Player[]> {
        if (this.teamCache[team] !== undefined) {
            return Promise.resolve(this.teamCache[team])
        }
        return this.read().then(players => {
            const playersForTeam = players.filter((e: Player) => e.team == team)
            this.teamCache[team] = playersForTeam
            return playersForTeam
        })
    }

    private async aggregatePlayers(): Promise<Player[]> {
        console.log('[PLAYERS] Start aggregate')
        this.teamCache = {}
        const games = await this.getGames()
        const players: Record<number, Player> = {}
        const playedGames = games
            .filter(e => {
                if (e.start_date_time < new Date() && !e.played) {
                    console.log('not finished: ', e)
                }
                return e.played
            })
            .map(e => this.getGameStats(e.game_uuid))
            .filter(e => {
                if (e == undefined || e.playersByTeam == undefined) { console.log('undefined game')}
                return e != undefined
            })
        
        playedGames.flatMap(e => Object.values(e?.playersByTeam || {}))
            .flatMap(PlayerService.getAllPlayers)
            .forEach(e => {
                const player: Player = players[e.player] || {
                    player: e.player,
                    team: e.team,
                    firstName: e.firstName,
                    familyName: e.familyName,
                    jersey: e.jersey,
                    position: e.position,
                    line: e.line,
                }
                const toiSeconds = PlayerService.parseToi(e.toi)
                const hasPlayed = toiSeconds > 0 || (e.tot_svs ?? 0) > 0

                // Player stats
                player.g =          PlayerService.add(player.g, e.g)
                player.a =          PlayerService.add(player.a, e.a)
                player.sog =        PlayerService.add(player.sog, e.sog)
                player.pim =        PlayerService.add(player.pim, e.pim)
                player.pop =        PlayerService.add(player.pop, e.pop)
                player.nep =        PlayerService.add(player.nep, e.nep)
                player.toiSeconds = PlayerService.add(player.toiSeconds, toiSeconds)
                player.gp =         PlayerService.add(player.gp, hasPlayed ? 1 : 0)

                // GK stats
                player.tot_ga =     PlayerService.add(player.tot_ga, e.tot_ga)
                player.tot_soga =   PlayerService.add(player.tot_soga, e.tot_soga)
                player.tot_svs =    PlayerService.add(player.tot_svs, e.tot_svs)
                
                players[e.player] = player
            })

        const playerRank = Object.values(players)
            .filter(e => e.position != "GK")
            .sort((a, b) => PlayerService.getPoints(b) - PlayerService.getPoints(a))

        if (playerRank.length > 0) {
            var currentRank = 1
            var currentScore = PlayerService.getPoints(playerRank[0])
            playerRank.forEach((p, i) => {
                if (PlayerService.getPoints(p) < currentScore) {
                    currentRank = i + 1
                    currentScore = PlayerService.getPoints(p)
                }
                players[p.player].rank = currentRank
            })
        }

        const gkRank = Object.values(players)
            .filter(e => e.position == "GK")
            .sort((a, b) => PlayerService.getPoints(b) - PlayerService.getPoints(a))
            
        if (gkRank.length > 0) {
            var currentGkRank = 1
            var currentGkScore = PlayerService.getPoints(gkRank[0])
            gkRank.forEach((p, i) => {
                if (PlayerService.getPoints(p) < currentGkScore) {
                    currentGkRank = i + 1
                    currentGkScore = PlayerService.getPoints(p)
                }
                players[p.player].rank = currentGkRank
            })
        }
        console.log(`[PLAYERS] End aggregate of ${playedGames.length} games, ${Object.keys(players).length} players`)
        return Object.values(players)
    }

    private static getAllPlayers(p: PlayersOnTeam): (Player)[] {
        const ps: Player[] = p.players || []
        const gks: Player[] = p.GK || []
        return [...ps, ...gks]
    }

    private static parseToi(toi: string | undefined): number {
        const i = toi?.indexOf(':') || -1
        if (i < 0 || toi == undefined) {
            return 0
        }

        const minutes = parseInt(toi.slice(0, i))
        const seconds = parseInt(toi.slice(i + 1))
        if (isNaN(minutes) || isNaN(seconds)) {
            return 0
        }
        return (minutes * 60) + seconds
    }

    private static add(b: number | undefined, v: number | undefined): number | undefined {
        if (b == undefined && v == undefined) return undefined
        if (b == undefined) return v
        if (v == undefined) return b
        return b + v
    }

    private static getPoints(p: Player): number {
        if (p.position == 'GK') {
            return (p.tot_svs ?? 0) / (p.tot_soga ?? 1)
        }
        return (p.g ?? 0) + (p.a ?? 0)
    }
}


export {
    PlayerService
}