const Db = require('./Db.js')
const DbObject = require('./DbObject.js')
const { SHL } = require('./ShlClient.js')

const clientId = process.argv[2]
const clientSecret = process.argv[3]
const shl = new SHL(clientId, clientSecret)

const LIVE_CHECK_DELAY = 1000 * 10

const dbGames = DbObject.extend(Db.create('games'), () => shl.getGames(2021))
const dbLiveGames = DbObject.extend(Db.create('live_games'), () => getCachedGames().then(getLiveGames))
const dbStandings = DbObject.extend(Db.create('standings'), shl.getStandings)
const dbOldGames = DbObject.extend(Db.create('games_2020'), () => shl.getGames(2020))

function gameLoop() {
   dbStandings.readCachedDbObject(60)
   dbGames.readCachedDbObject(10)
   dbOldGames.readCachedDbObject(60)
   dbLiveGames.readCachedDbObject(1).then(games => {
      getGameStats(games.data).then(stats => console.log('stats ', JSON.stringify(stats, null, 2)))
   })
}

function getGameStats(games) {
   return Promise.all(games.map(p => shl.getGameStats(p.game_uuid, p.game_id)))
      .then(games => {
         return games.map(g => g.recaps.gameRecap)
      })
}

function getCachedGames() {
   return dbGames.readDbObject().then(data => data.data)
}

function getLiveGames(games) {
   const now = new Date()
   const hasHappened = date => new Date(date) < now
   const isLive = g => !g.played && hasHappened(g.start_date_time)
   return games.filter(isLive)
}

setInterval(gameLoop, LIVE_CHECK_DELAY)