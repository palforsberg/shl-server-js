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
    private currentSeason: GameService
    private currentStandings: StandingService
    private userService: UserService
    private gameStatsService: GameStatsService
    private notifier: Notifier

    constructor(
        config: Config,
        liveGamesService: LiveGameService,
        currentSeason: GameService,
        userService: UserService,
        gameStatsService: GameStatsService,
        currentStanding: StandingService) {

        this.liveGamesService = liveGamesService
        this.currentSeason = currentSeason
        this.currentStandings = currentStanding
        this.userService = userService
        this.gameStatsService = gameStatsService
        this.notifier = new Notifier(config)
    }

    loop() {
        console.log('[LOOP] ******* Begin ********')
        this.gameJob()
           .then(this.liveGamesService.db.read)
           .then((liveGames: Game[]) => {
              var delay = liveGames.length > 0 ? 0 : 60
              setTimeout(this.loop, delay * 1000)
              console.log('[LOOP] ******* End **********')
           })
     }
     
    private gameJob() {
        return this.liveGamesService.db.read().then(oldLiveGames => 
           this.currentSeason.update()
              .then(this.currentStandings.update)
              .then(this.liveGamesService.update)
              .then((liveGames: Game[]) => {
                 const events = GameComparer.compare(oldLiveGames || [], liveGames)
                 return this.userService.db.read().then((us: User[]) => {
                    this.notifier.notify(events, us || [])
                    return Promise.resolve()
                 }).then(() => Promise.all(liveGames.map(e => this.gameStatsService.update(e))))
              }))
     }
}

export {
    GameLoop,
}