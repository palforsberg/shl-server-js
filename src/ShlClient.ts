const axios = require('axios')
const Mutex = require('async-mutex').Mutex
const Token = require('./Token')
import { Config } from './models/Config'
import { Game } from './models/Game'
import { GameStats, GameStatsIf } from './models/GameStats'
import { Standing } from './models/Standing'

const times: Record<string, Date> = {}
const MIN_TIME_BETWEEN = 3 * 1000;

axios.interceptors.request.use((request: Req) => {
   times[request.url] = new Date()
   console.log('[EXTERNAL]', request.method.toUpperCase(), request.url)
   return request
})

axios.interceptors.response.use((response: RspData<any>) => {
   const url = response?.config?.url || ''
   const duration = new Date().getTime() - (times[url]?.getTime() || 0)
   console.log('[EXTERNAL] RSP', url, duration, 'ms')
   return response
})

interface Req {
   method: string,
   url: string,
}
interface RspData<T> {
   data: T,
   config: {
      url: string,
   }
}

/**
 * Class to make calls to the SHL API. 
 * Will not handle errors.
 */
class SHL {
   lastCall: Date
   timeBetween: number
   mutex: typeof Mutex
   getToken: () => Promise<string>

   basePath: string
   statsBasePath: string

   constructor(config: Config, timeBetween = MIN_TIME_BETWEEN) {
      this.makeCall = this.makeCall.bind(this)
      this.login = this.login.bind(this)
      this.getStandings = this.getStandings.bind(this)
      this.getGames = this.getGames.bind(this)
      this.getGameStats = this.getGameStats.bind(this)
      this.getWithToken = this.getWithToken.bind(this)
      this.getToken = Token.createTokenGetter(() => this.login(config.shl_client_id, config.shl_client_secret))
      this.makeCall = this.makeCall.bind(this)
      this.get = this.get.bind(this)
      this.wait = this.wait.bind(this)
      this.getAuthHeader = this.getAuthHeader.bind(this)

      this.lastCall = new Date()
      this.timeBetween = timeBetween
      this.mutex = new Mutex()

      this.basePath = config.shl_path
      this.statsBasePath = config.shl_stats_path

      axios.defaults.timeout = config.shl_client_timeout || 30_000;
   }

   login(client_id: string, client_secret: string): Promise<any> {
      let body = `client_id=${client_id}&client_secret=${client_secret}&grant_type=client_credentials`
      const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      return this.makeCall(() => axios.post(this.basePath + "/oauth2/token", body, config))
   }
   
   getGames(season: string): Promise<Game[]> {
      return this.getWithToken<Game[]>(`${this.basePath}/seasons/${season}/games.json`)
   }

   getGameInfo(season: string, game_id: string): Promise<Object> {
      return this.getWithToken<Object>(`${this.basePath}/seasons/${season}/games/${game_id}.json`)
   }

   getGameStats(game_uuid: string, game_id: string): Promise<GameStats>  {
      return this
         .get<GameStatsIf>(`${this.statsBasePath}/gamecenter/${game_uuid}/statistics/${game_id}.json`)
         .then(stats => {
            stats.game_uuid = game_uuid
            stats.timestamp = new Date()
            return new GameStats(stats)
         })
   }

   getStandings(season: number): Promise<Standing[]>  {
      return this.getWithToken(`${this.basePath}/seasons/${season}/statistics/teams/standings.json`)
   }
   
   // getTeams(): Promise<Object>  {
   //    return this.getWithToken('teams.json')
   // }

   // getTeam(team: string): Promise<Object>  {
   //    return this.getWithToken(`teams/${team}.json`)
   // }
   
   getWithToken<T>(url: string): Promise<T>  {
      return this.mutex.runExclusive(async () => {
         await this.wait(this.timeBetween)
         const config = await this.getAuthHeader()
         return this.makeCall(() => axios.get(url, config))
      })
   }
      
   get<T>(url: string): Promise<T>  {
      return this.mutex.runExclusive(async () => {
         await this.wait(this.timeBetween)
         return this.makeCall(() => axios.get(url))
      })
   }
   
   makeCall<T>(call: () => Promise<RspData<T>>): Promise<T | void>  {
      return call()
         .then(rsp => rsp.data as T)
         .finally(() => {
            this.lastCall = new Date()
         })
   }

   async wait(time: number) {
      const timeSinceLastCall = new Date().getTime() - this.lastCall.getTime()
      const timeDiff = time - timeSinceLastCall
      if (timeDiff > 0) {
         console.log('[SHL CLIENT] wait for ' + timeDiff + ' ms')
         await new Promise(r => setTimeout(r, timeDiff))
         console.log('[SHL CLIENT] waited for ' + timeDiff + ' ms')
      }
   }

   getAuthHeader(): Promise<Object> {
      return this.getToken()
         .then(t => ({ headers: { 'Authorization': `bearer ${t}` } }))
   }
}

export {
   SHL
}