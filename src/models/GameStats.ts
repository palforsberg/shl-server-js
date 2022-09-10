/**
 * Stats of a single game.
 */

import { AllPeriods, Period, PeriodStatus } from "./Game"

interface Player {
    player: number
    team: string
    firstName: string
    familyName: string
    jersey: number
    position: string
    line: number

    // Player stats
    toi?: string
    toiSeconds?: number
    g?: number
    a?: number
    pim?: number
    sog?: number
    // On ice when score (+)
    pop?: number
    // On ice when scored against (-)
    nep?: number

    // Goal keeper stats
    // goal against
    tot_ga?: number
    // shots on goal against
    tot_soga?: number
    // saves
    tot_svs?: number
}

interface PlayersOnTeam {
    GK: Player[],
    players: Player[],
}


class GameStatsIf {
    game_uuid: string
    recaps?: {
        0?: PeriodStats,
        1?: PeriodStats,
        2?: PeriodStats,
        3?: PeriodStats,
        4?: PeriodStats,
        gameRecap?: PeriodStats,
    };
    gameState: string;
    playersByTeam?: Record<string, PlayersOnTeam>;
  
    constructor() {
      this.gameState = ''
      this.game_uuid = ''
    }
}

class GameStats extends GameStatsIf {
    constructor(stats: GameStatsIf) {
        super()
        this.recaps = stats.recaps
        this.gameState = stats.gameState
        this.playersByTeam = stats.playersByTeam
        this.game_uuid = stats.game_uuid
    
        if (this.recaps && Array.isArray(this.recaps.gameRecap)) {
            // gameRecap is empty array if empty, convert to undefined instead
            this.recaps.gameRecap = undefined
        }
        if (this.playersByTeam && Array.isArray(this.playersByTeam)) {
            // playersByTeam is empty array if empty, convert to undefined instead
            this.playersByTeam = undefined
        }

        this.getHomeTeamId = this.getHomeTeamId.bind(this)
        this.getAwayTeamId = this.getAwayTeamId.bind(this)
        this.getHomeResult = this.getHomeResult.bind(this)
        this.getAwayResult = this.getAwayResult.bind(this)
        this.isPlayed = this.isPlayed.bind(this)
        this.isLive = this.isLive.bind(this)
        this.getHomeTeam = this.getHomeTeam.bind(this)
        this.getAwayTeam = this.getAwayTeam.bind(this)
        this.getTeam = this.getTeam.bind(this)
        this.getCurrentPeriodFormatted = this.getCurrentPeriodFormatted.bind(this)
        this.getCurrentPeriod = this.getCurrentPeriod.bind(this)
        this.getCurrentPeriodNumber = this.getCurrentPeriodNumber.bind(this)
    }

    getHomeTeamId(): string {
      return this.recaps?.gameRecap?.homeTeamId || ''
    }

    getAwayTeamId(): string {
      return this.recaps?.gameRecap?.awayTeamId || ''
    }

    getHomeResult(): number {
      return this.recaps?.gameRecap?.homeG || 0
    }

    getAwayResult(): number {
      return this.recaps?.gameRecap?.awayG || 0
    }

    isPlayed(): boolean {
      return this.gameState == 'GameEnded'
    }

    isLive(): boolean {
      return this.gameState == 'Ongoing'
    }

    getHomeTeam(): Player[] {
      return this.getTeam(this.recaps?.gameRecap?.homeTeamId)
    }

    getAwayTeam(): Player[] {
      return this.getTeam(this.recaps?.gameRecap?.awayTeamId)
    }

    getCurrentPeriodFormatted(): string {
      const p = this.getCurrentPeriodNumber()
      switch (p) {
        case 4:
        case 5:
          return 'övertid'
        case 3:
          return '3:e perioden'
        case 2:
          return '2:a perioden'
        case 1:
        default:
          return '1:a perioden'
      }
    }

    getCurrentPeriod(): PeriodStats | undefined {
      if (!this.recaps) {
        return undefined
      }
      const recap = [this.recaps[4],this.recaps[3],this.recaps[2],this.recaps[1],this.recaps[0]]
        // TODO: check status for period
        .find(e => e != undefined)
      return recap || this.recaps[0]
    }

    getCurrentPeriodNumber(): number {
      const recap = this.getCurrentPeriod()
      return recap?.periodNumber || 1
    }

    getAllPeriods(): AllPeriods {
      return {
        0: periodFrom(1, this.recaps?.[0]),
        1: periodFrom(2, this.recaps?.[1]),
        2: periodFrom(3, this.recaps?.[2]),
        3: periodFrom(4, this.recaps?.[3]),
        4: periodFrom(5, this.recaps?.[4]),
      }
    }

    private getTeam(team?: string): Player[] {
      if (!team) {
        return []
      }
      return this.playersByTeam?.[team]?.players || []
    }

    static empty(): GameStats {
        return new GameStats({
            recaps: {},
            playersByTeam: {},
            gameState: '',
            game_uuid: '',
        })
    }
}

interface PeriodStats {
    periodNumber: number,
    awayG: number,
    homeG: number,
    awayHits: number,
    homeHits: number,
    awaySOG: number,
    homeSOG: number,

    awayTeamId: string,
    homeTeamId: string,

    /**
     * PIM : Penalty Infraction Minutes
     */
    homePIM: number,
    awayPIM: number,

    /**
     * FOW : Face Offs Won
     */
    homeFOW: number,
    awayFOW: number,

    status: string,
}

function periodFrom(pn: number, period: PeriodStats | undefined): Period {
  return { 
    periodNumber: pn,
    periodStatus: periodStatus(period)
  }
}

function periodStatus(period: PeriodStats | undefined): PeriodStatus {
  switch (period?.status) {
    case 'Finished': return PeriodStatus.Finished
    case 'Ongoing': return PeriodStatus.Ongoing
    default: return PeriodStatus.Unknown
  }
}

export {
  GameStats,
  Player,
  GameStatsIf,
  PlayersOnTeam,
  PeriodStats,
}

/** example
 * SPG: Shots Past Goal
 * GA: Goals Against
 * {
  playersByTeam: {
    RBK: { GK: [Array], players: [Array] },
    VLH: { GK: [
      {"player":4200,"game":15128,"team":"FBK","jersey":38,"line":-1,"position":"GK","firstName":"Dominik","familyName":"Furch","pim":0,"actiontype":"new","teamId":"752c-752c12zB7Z","tot_ga":0,"tot_soga":17,"tot_spga":12,"tot_svs":17,"tot_svs_perc":1,"tot_nonso_svs_perc":1}
    ], 
      players: [
      {"player":3018,"game":15128,"team":"FBK","jersey":59,"line":1,"position":"CE","firstName":"Linus","familyName":"Johansson","pim":0,"actiontype":"new","teamId":"752c-752c12zB7Z","hits":0,"g":1,"a":0,"toi":"17:05","shg":0,"ppg":0,"fo_perc":50,"sw":1,"sog":1,"ppsog":0,"nep":0,"pop":1,"netPlusMinus":1,"tp":0,"fo_tot":0,"fow":7,"fol":7},] }
  },
  recaps: {
    '0': {
      periodNumber: 1,
      gameStatsId: 13558,
      status: 'Finished',
      awayTeamId: 'RBK',
      awayTeamName: 'Rögle BK',
      awayG: 1,
      awayPIM: 0,
      awayFOW: 5,
      awaySOG: 9,
      awaySPG: 6,
      awaySaves: 5,
      awayGA: 0,
      awaySavesPerShot: 1,
      awayPP_perc: 0,
      awaySH_perc: 0,
      awayPPG: 0,
      awaySHG: 0,
      awayPPGA: 0,
      awaySHGA: 0,
      awayNumPP: 1,
      awayNumSH: 0,
      awayHits: 7,
      awayPPSOG: 1,
      awayactiontype: 'api',
      awayteamId: 'ee93-ee93uy4oW',
      startDateTime: '',
      endDateTime: '',
      statusString: 'Slut',
      homeTeamId: 'VLH',
      homeTeamName: 'Växjö Lakers',
      homeG: 0,
      homePIM: 2,
      homeFOW: 7,
      homeSOG: 5,
      homeSPG: 3,
      homeSaves: 8,
      homeGA: 1,
      homeSavesPerShot: 0.8888888888888888,
      homePP_perc: 0,
      homeSH_perc: 1,
      homePPG: 0,
      homeSHG: 0,
      homePPGA: 0,
      homeSHGA: 0,
      homeNumPP: 0,
      homeNumSH: 1,
      homeHits: 1,
      homePPSOG: 0,
      homeactiontype: 'api',
      hometeamId: 'fe02-fe02mf1FN'
    },
    '1': {
      periodNumber: 2,
      gameStatsId: 13558,
      status: 'Finished',
      awayTeamId: 'RBK',
      awayTeamName: 'Rögle BK',
      awayG: 0,
      awayPIM: 16,
      awayFOW: 7,
      awaySOG: 8,
      awaySPG: 2,
      awaySaves: 10,
      awayGA: 1,
      awaySavesPerShot: 0.9090909090909091,
      awayPP_perc: 0,
      awaySH_perc: 0.5,
      awayPPG: 0,
      awaySHG: 0,
      awayPPGA: 0,
      awaySHGA: 1,
      awayNumPP: 1,
      awayNumSH: 2,
      awayHits: 7,
      awayPPSOG: 1,
      awayactiontype: 'api',
      awayteamId: 'ee93-ee93uy4oW',
      startDateTime: '',
      endDateTime: '',
      statusString: 'Slut',
      homeTeamId: 'VLH',
      homeTeamName: 'Växjö Lakers',
      homeG: 1,
      homePIM: 4,
      homeFOW: 9,
      homeSOG: 11,
      homeSPG: 3,
      homeSaves: 8,
      homeGA: 0,
      homeSavesPerShot: 1,
      homePP_perc: 0.5,
      homeSH_perc: 1,
      homePPG: 1,
      homeSHG: 0,
      homePPGA: 0,
      homeSHGA: 0,
      homeNumPP: 2,
      homeNumSH: 1,
      homeHits: 2,
      homePPSOG: 4,
      homeactiontype: 'api',
      hometeamId: 'fe02-fe02mf1FN'
    },
    '2': {
      periodNumber: 3,
      gameStatsId: 13558,
      status: 'Finished',
      awayTeamId: 'RBK',
      awayTeamName: 'Rögle BK',
      awayG: 1,
      awayPIM: 2,
      awayFOW: 12,
      awaySOG: 10,
      awaySPG: 8,
      awaySaves: 5,
      awayGA: 5,
      awaySavesPerShot: 0.625,
      awayPP_perc: 0,
      awaySH_perc: 0,
      awayPPG: 0,
      awaySHG: 0,
      awayPPGA: 0,
      awaySHGA: 1,
      awayNumPP: 1,
      awayNumSH: 1,
      awayHits: 5,
      awayPPSOG: 2,
      awayactiontype: 'api',
      awayteamId: 'ee93-ee93uy4oW',
      startDateTime: '',
      endDateTime: '',
      statusString: 'Slut',
      homeTeamId: 'VLH',
      homeTeamName: 'Växjö Lakers',
      homeG: 5,
      homePIM: 2,
      homeFOW: 8,
      homeSOG: 10,
      homeSPG: 2,
      homeSaves: 9,
      homeGA: 1,
      homeSavesPerShot: 0.9,
      homePP_perc: 1,
      homeSH_perc: 1,
      homePPG: 1,
      homeSHG: 0,
      homePPGA: 0,
      homeSHGA: 0,
      homeNumPP: 1,
      homeNumSH: 1,
      homeHits: 1,
      homePPSOG: 2,
      homeactiontype: 'api',
      hometeamId: 'fe02-fe02mf1FN'
    },
    gameRecap: {
      periodNumber: 0,
      gameStatsId: 13558,
      status: 'GameEnded',
      awayTeamId: 'RBK',
      awayTeamName: 'Rögle BK',
      awayG: 2,
      awayPIM: 18,
      awayFOW: 24,
      awaySOG: 27,
      awaySPG: 16,
      awaySaves: 20,
      awayGA: 6,
      awaySavesPerShot: 0.8333333333333334,
      awayPP_perc: 0,
      awaySH_perc: 0.3333333333333333,
      awayPPG: 0,
      awaySHG: 0,
      awayPPGA: 0,
      awaySHGA: 2,
      awayNumPP: 3,
      awayNumSH: 3,
      awayHits: 19,
      awayPPSOG: 4,
      awayactiontype: 'api',
      awayteamId: 'ee93-ee93uy4oW',
      startDateTime: '',
      endDateTime: '',
      statusString: 'Slut',
      statsId: 13558,
      round: 22,
      attendance: 8,
      homeTeamId: 'VLH',
      homeTeamName: 'Växjö Lakers',
      homeG: 6,
      homePIM: 8,
      homeFOW: 24,
      homeSOG: 26,
      homeSPG: 8,
      homeSaves: 25,
      homeGA: 2,
      homeSavesPerShot: 0.9259259259259259,
      homePP_perc: 0.6666666666666666,
      homeSH_perc: 1,
      homePPG: 2,
      homeSHG: 0,
      homePPGA: 0,
      homeSHGA: 0,
      homeNumPP: 3,
      homeNumSH: 3,
      homeHits: 4,
      homePPSOG: 6,
      homeactiontype: 'api',
      hometeamId: 'fe02-fe02mf1FN'
    }
  },
  gameState: 'GameEnded'
}
*/