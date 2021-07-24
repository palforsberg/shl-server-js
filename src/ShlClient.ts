const axios = require('axios')
const Mutex = require('async-mutex').Mutex
const Token = require('./Token.js')
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

axios.interceptors.response.use((response: RspData) => {
   const duration = new Date().getTime() - times[response.config.url].getTime()
   console.log('[EXTERNAL] RSP', normalizeUrl(response.config.url), duration, 'ms')
   return response
})

interface Req {
   method: string,
   url: string,
}
interface RspData {
   data: Object,
   config: {
      url: string,
   }
}

class SHL {
   lastCall: Date
   mutex: typeof Mutex
   getToken: () => Promise<string>

   constructor(clientId: string, clientSecret: string) {
      this.makeCall = this.makeCall.bind(this)
      this.login = this.login.bind(this)
      this.getStandings = this.getStandings.bind(this)
      this.getToken = Token.createTokenGetter(() => this.login(clientId, clientSecret))

      this.lastCall = new Date()
      this.mutex = new Mutex()
   }

   login(client_id: string, client_secret: string): Promise<Object> {
      let body = `client_id=${client_id}&client_secret=${client_secret}&grant_type=client_credentials`
      const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      return this.makeCall(() => axios.post(basePath + "oauth2/token", body, config))
   }
   
   getGames(season: string): Promise<Game[]> {
      return this.get("seasons/" + season + "/games.json")
   }

   getGame(season: string, gameUuid: string): Promise<Game> {
      return this.get(`/seasons/${season}/games/${gameUuid}.json`)
   }

   getGameStats(gameUuid: string, gameId: string): Promise<Object>  {
      return this.get(`https://www.shl.se/gamecenter/${gameUuid}/statistics/${gameId}.json`)
   }

   getStandings(season: number): Promise<Standing[]>  {
      return this.get(`/seasons/${season}/statistics/teams/standings.json`)
   }
   
   getTeams(): Promise<Object>  {
      return this.get('teams.json')
   }

   getTeam(team: string): Promise<Object>  {
      return this.get(`teams/${team}.json`)
   }
   
   get<T>(url: string): Promise<T>  {
      const needsAuth = !this.isAbsolut(url)
      const configGetter = (needsAuth ? this.getAuthHeader() : Promise.resolve())
      return configGetter
         .then(config => this.makeCall(() => axios.get(this.getUrl(url), config)))
   }
   
   makeCall<T>(call: () => Promise<RspData>): Promise<T>  {
      return this.mutex.runExclusive(async () => {
         await this.wait()
         return call()
            .then(rsp => rsp.data as T)
            .finally(() => {
               this.lastCall = new Date()
            })
            .catch(error => console.error(`Failed:`, error.toString()))
      })
   }

   async wait() {
      const timeSinceLastCall = new Date().getTime() - this.lastCall.getTime()
      const timeDiff = MIN_TIME_BETWEEN - timeSinceLastCall
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