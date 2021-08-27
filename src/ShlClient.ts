const axios = require('axios')
const Mutex = require('async-mutex').Mutex
const Token = require('./Token')
import { Game } from './models/Game'
import { Standing } from './models/Standing'

const times: Record<string, Date> = {}
const basePath = "https://openapi.shl.se/"
const MIN_TIME_BETWEEN = 3 * 1000;

const normalizeUrl = (url: string) => url.replace(basePath, '')
axios.interceptors.request.use((request: Req) => {
   times[request.url] = new Date()
   console.log('[EXTERNAL]', request.method.toUpperCase(), normalizeUrl(request.url))
   return request
})

axios.interceptors.response.use((response: RspData<any>) => {
   const duration = new Date().getTime() - times[response.config.url].getTime()
   console.log('[EXTERNAL] RSP', normalizeUrl(response.config.url), duration, 'ms')
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

class SHL {
   lastCall: Date
   timeBetween: number
   mutex: typeof Mutex
   getToken: () => Promise<string>

   constructor(clientId: string, clientSecret: string, timeBetween = MIN_TIME_BETWEEN) {
      this.makeCall = this.makeCall.bind(this)
      this.login = this.login.bind(this)
      this.getStandings = this.getStandings.bind(this)
      this.getToken = Token.createTokenGetter(() => this.login(clientId, clientSecret))

      this.lastCall = new Date()
      this.timeBetween = timeBetween
      this.mutex = new Mutex()
   }

   login(client_id: string, client_secret: string): Promise<any> {
      let body = `client_id=${client_id}&client_secret=${client_secret}&grant_type=client_credentials`
      const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      return this.makeCall(() => axios.post(basePath + "oauth2/token", body, config))
   }
   
   getGames(season: string): Promise<Game[]> {
      return this.getWithToken<Game[]>("seasons/" + season + "/games.json")
   }

   getGameStats(game_uuid: string, game_id: string): Promise<GameStats>  {
      return this.get(`https://www.shl.se/gamecenter/${game_uuid}/statistics/${game_id}.json`)
   }

   getStandings(season: number): Promise<Standing[]>  {
      return this.getWithToken(`/seasons/${season}/statistics/teams/standings.json`)
   }
   
   getTeams(): Promise<Object>  {
      return this.getWithToken('teams.json')
   }

   getTeam(team: string): Promise<Object>  {
      return this.getWithToken(`teams/${team}.json`)
   }
   
   getWithToken<T>(url: string): Promise<T>  {
      return this.mutex.runExclusive(async () => {
         await this.wait(this.timeBetween)
         return this.getAuthHeader()
            .then(config => this.makeCall(() => axios.get(this.getUrl(url), config)))
      })
   }
      
   get<T>(url: string): Promise<T>  {
      return this.mutex.runExclusive(() => 
         this.wait(1).then(() => this.makeCall(() => axios.get(this.getUrl(url)))))
   }
   
   makeCall<T>(call: () => Promise<RspData<T>>): Promise<T | void>  {
      return call()
         .then(rsp => rsp.data as T)
         .finally(() => {
            this.lastCall = new Date()
         })
         .catch(error => console.error(`Failed:`, error.toString()))
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

   getUrl(url: string): string {
      if (this.isAbsolut(url)) {
         return url
      }
      return basePath + url
   }

   isAbsolut(url: string): boolean {
      return url.startsWith('http')
   }
   
   getAuthHeader(): Promise<Object> {
      return this.getToken()
         .then(t => ({ headers: { 'Authorization': `bearer ${t}` } }))
   }
}

export {
   SHL
}