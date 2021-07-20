const axios = require('axios')
const Token = require('./Token.js')

const times = {}
const basePath = "https://openapi.shl.se/"
const MIN_TIME_BETWEEN = 3 * 1000;

const normalizeUrl = url => url.replace(basePath, '')
axios.interceptors.request.use(request => {
   times[request.url] = new Date()
   console.log('[EXTERNAL]', request.method.toUpperCase(), normalizeUrl(request.url))
   return request
})

axios.interceptors.response.use(response => {
   const duration = new Date() - times[response.config.url]
   console.log('[EXTERNAL] RSP', normalizeUrl(response.config.url), duration, 'ms')
   return response
})

class SHL {
   constructor(clientId, clientSecret) {
      this.makeCall = this.makeCall.bind(this)
      this.login = this.login.bind(this)
      this.getStandings = this.getStandings.bind(this)
      this.getToken = Token.createTokenGetter(() => this.login(clientId, clientSecret))

      this.lastCall = new Date()
   }

   login(client_id, client_secret) {
      let body = `client_id=${client_id}&client_secret=${client_secret}&grant_type=client_credentials`
      const config = { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      return this.makeCall(axios.post(basePath + "oauth2/token", body, config))
   }
   
   getGames(season) {
      return this.get("seasons/" + season + "/games.json")
   }

   getGame(season, gameUuid) {
      return this.get(`/seasons/${season}/games/${gameUuid}.json`)
   }

   getGameStats(gameUuid, gameId) {
      return this.get(`https://www.shl.se/gamecenter/${gameUuid}/statistics/${gameId}.json`)
   }

   getStandings(season = 2020) {
      return this.get(`/seasons/${season}/statistics/teams/standings.json`)
   }
   
   getTeams() {
      return this.get('teams.json')
   }

   getTeam(team) {
      return this.get(`teams/${team}.json`)
   }
   
   get(url) {
      const needsAuth = !this.isAbsolut(url)
      return (needsAuth ? this.getAuthHeader() : Promise.resolve())
         .then(config => this.makeCall(axios.get(this.getUrl(url), config)))
   }
   
   async makeCall(call) {
      const timeSinceLastCall = new Date() - this.lastCall
      if (timeSinceLastCall < MIN_TIME_BETWEEN) {
         console.log('[SHL CLIENT] wait for ' + timeSinceLastCall + ' ms')
         await new Promise(r => setTimeout(r, MIN_TIME_BETWEEN - timeSinceLastCall))
      }
      return call
         .then(rsp => rsp.data)
         .catch(error => console.error(`Failed:`, error.toString()))
         .finally(() => {
            this.lastCall = new Date()
         })
   }

   getUrl(url) {
      if (this.isAbsolut(url)) {
         return url
      }
      return basePath + url
   }

   isAbsolut(url) {
      return url.startsWith('http')
   }
   
   getAuthHeader() {
      return this.getToken()
         .then(t => ({ headers: { 'Authorization': `bearer ${t}` } }))
   }
}

module.exports.SHL = SHL