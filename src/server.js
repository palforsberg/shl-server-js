const Db = require('./Db.js')
const { SHL } = require('./ShlClient.js')
const Service = require('./Service.js')
const GameComparer = require('./GameComparer.js')
const Notifier = require('./Notifier.js')

const clientId = process.argv[2]
const clientSecret = process.argv[3]
const shl = new SHL(clientId, clientSecret)

const currentSeason = 2021

const standingsService = Service.create(
   'standings',
   () => shl.getStandings(),
   10 * 60)

const liveGamesService = Service.create(
   'live_games',
   () => gamesService.db.read().then(getLiveGames))

const serviceForSeason = (s, expiry = 0) => Service.create(
      'games_' + s,
      () => shl.getGames(s),
      expiry)

const users = Db.create('users')

const gamesService = serviceForSeason(currentSeason)

const oldSeasons = []
for (let i = currentSeason - 4; i < currentSeason; i++) {
   oldSeasons.push(serviceForSeason(i, -1))
}

/**
 * Get games for 4 old seasons if isn't stored already
 * 
 * Live loop:
 * Get current season
 * Find all live games
 * Compare live games to previous cycle, find started games, finished games, new goals
 */
function main() {
   oldSeasons.forEach(e => e.update())
   gameLoop()
}

function gameLoop() {
   liveGamesService.db.read().then(oldLiveGames => {
      gamesService.update()
         .then(standingsService.update)
         .then(liveGamesService.update)
         .then(liveGames => {
            const events = GameComparer.compare(oldLiveGames, liveGames)
            users.read().then(us => Notifier.notify(events, us))

            var delay = liveGames.size > 0 ? 3 : 30
            setTimeout(gameLoop, delay * 1000)
         })
   })
}

function getLiveGames(games) {
   const now = new Date()
   const hasHappened = date => new Date(date) < now
   const isLive = g => !g.played && hasHappened(g.start_date_time)
   return games?.filter(isLive) || []
}

main()