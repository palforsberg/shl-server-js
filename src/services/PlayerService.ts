import { Player, PlayersOnTeam } from "../models/GameStats";
import { Service } from "../Service";
import { GameStatsService } from "./GameStatsService";
import { SeasonService } from "./SeasonService";


/**
 * PlayerService
 * Best player on each team
 * Best player vs before game
 * Best at end of season
 */
class PlayerService extends Service<Record<number, Player>> {
    
    seasonService: SeasonService
    gameStatsService: GameStatsService

    teamCache: Record<string, Player[]>

    constructor(seasonService: SeasonService, gameStatsService: GameStatsService) {
        super('players_' + seasonService.season, {}, () => this.aggregatePlayers(), 0)
        this.seasonService = seasonService
        this.gameStatsService = gameStatsService
        this.teamCache = {}

        this.getPlayersForTeam = this.getPlayersForTeam.bind(this)
        this.aggregatePlayers = this.aggregatePlayers.bind(this)
    }

    getPlayersForTeam(team: string): Promise<Player[]> {
        if (this.teamCache[team] !== undefined) {
            return Promise.resolve(this.teamCache[team])
        }
        return this.read().then(players => {
            const playersForTeam = Object.values(players).filter((e: Player) => e.team == team)
            this.teamCache[team] = playersForTeam
            return playersForTeam
        })
    }

    private aggregatePlayers(): Promise<Record<number, Player>> {
        console.log('[PLAYERS] Start aggregate')
        this.teamCache = {}
        const result = this.seasonService.read().then(games => {
            const players: Record<number, Player> = {}
            games
                .filter(e => e.played)
                .map(e => this.gameStatsService.getFromCache(e.game_uuid))
                .filter(e => e != undefined)
                .flatMap(e => Object.values(e?.playersByTeam || {}))
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
                return players
            })
            
        console.log('[PLAYERS] End aggregate')
        return result
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
}


export {
    PlayerService
}