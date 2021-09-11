import { Config } from "./models/Config";
import { Game } from "./models/Game";
import * as GameComparer from './GameComparer'
import { Notifier } from "./Notifier";
import { LiveGameService } from "./services/LiveGameSerive";
import { GameService } from "./services/GameService";
import { StandingService } from "./services/StandingService";
import { UserService } from "./services/UserService";
import { GameStatsService } from "./services/GameStatsService";
import { User } from "./models/User";

class GameLoop {
    private liveGamesService: LiveGameService
    private gameService: GameService
    private standingsService: StandingService
    private userService: UserService
    private gameStatsService: GameStatsService
    private notifier: Notifier

    constructor(
        config: Config,
        liveGamesService: LiveGameService,
        gameService: GameService,
        userService: UserService,
        gameStatsService: GameStatsService,
        currentStanding: StandingService) {

         this.loop = this.loop.bind(this)
         this.gameJob = this.gameJob.bind(this)
         this.liveGamesService = liveGamesService
         this.gameService = gameService
         this.standingsService = currentStanding
         this.userService = userService
         this.gameStatsService = gameStatsService
         this.notifier = new Notifier(config)
    }

    loop() {
        console.log('[LOOP] ******* Begin ********')
        this.gameJob()
           .then(this.liveGamesService.db.read)
           .then((liveGames: Game[]) => {
              var delay = liveGames.length > 0 ? 3 : 60
              setTimeout(this.loop, delay * 1000)
              console.log(`[LOOP] ******* End ********** (next in ${delay}s`)
           })
     }
     
    private gameJob() {
        return this.liveGamesService.db.read().then(oldLiveGames => 
           this.gameService.getCurrentSeason().update()
              .then(this.standingsService.getCurrentSeason().update)
              // find all live games
              .then(this.liveGamesService.update)
              // fetch game stats for those games
              .then(liveGames => Promise.all(liveGames.map(e => this.gameStatsService.update(e))))
              // update the live games again withthe updated stats
              .then(this.liveGamesService.update)
              .then((liveGames: Game[]) => {
                 const events = GameComparer.compare(oldLiveGames || [], liveGames)

                 return this.userService.db.read().then((us: User[]) => {
                    this.notifier.notify(events, us || [])
                    return Promise.resolve()
                 })
              }))
     }
}

export {
    GameLoop,
}