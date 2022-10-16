import { Config } from "./models/Config";
import { Game } from "./models/Game";
import * as GameComparer from './GameComparer'
import { Notifier } from "./Notifier";
import { SeasonService } from "./services/SeasonService";
import { StandingService } from "./services/StandingService";
import { UserService } from "./services/UserService";
import { GameStatsService } from "./services/GameStatsService";
import { GameStats } from "./models/GameStats";
import { EventService } from "./services/EventService";

class GameLoop {
    private seasonService: SeasonService
    private standingsService: StandingService
    private userService: UserService
    private gameStatsService: GameStatsService
    private notifier: Notifier
    private eventService: EventService

    constructor(
        config: Config,
        seasonService: SeasonService,
        userService: UserService,
        gameStatsService: GameStatsService,
        currentStanding: StandingService,
        eventService: EventService,
        notifier: Notifier) {

         this.loop = this.loop.bind(this)
         this.gameJob = this.gameJob.bind(this)
         this.seasonService = seasonService
         this.standingsService = currentStanding
         this.userService = userService
         this.gameStatsService = gameStatsService
         this.eventService = eventService
         this.notifier = notifier
    }

    loop() {
        console.log('[LOOP] ******* Begin ********')
        this.gameJob()
           .then((liveGames: [GameStats | undefined, GameStats | undefined][]) => {
              var delay = liveGames.length > 0 ? 3 : 60
              setTimeout(this.loop, delay * 1000)
              console.log(`[LOOP] ******* End ********** next in ${delay}s`)
           })
           .catch(e => {
               var delay = 60
               setTimeout(this.loop, delay * 1000)
               console.error('[LOOP] Error:', e)
               console.log(`[LOOP] ******* Ended with Error ******* next in ${delay}s`)
           })
    }

    private async gameJob(): Promise<[GameStats | undefined, GameStats | undefined][]> {
        await this.standingsService.getCurrentSeason().update()
        const season = await this.seasonService.update()
        const liveGames = SeasonService.getLiveGames(season || [])
        const users = await this.userService.db.read() || []

        const result: [GameStats | undefined, GameStats | undefined][] = []
        for (const lg of liveGames) {
            const stats = await this.updateStats(lg)
            const events = GameComparer.compare(stats)
            for (const event of events) {
                if (this.eventService.isDuplicateEvent(event)) {
                    console.log(`[LOOP] duplicate event ${event.toString(false)}`)
                    continue
                }                
                await this.eventService.store(lg.game_uuid, event, stats[0], stats[1])
                await this.notifier.notify(event, users)
            }
            result.push(stats)
        }
        return result
    }
    
    private updateStats(game: Game): Promise<[GameStats | undefined, GameStats | undefined]> {
        const old = this.gameStatsService.getFromDb(game.game_uuid)
        return this.gameStatsService
            .update(game)
            .then(newStats => {
                // update season to make sure season and stats are in-sync
                return this.seasonService
                    .updateFromStats(game.game_uuid, newStats)
                    .then(e => Promise.resolve([old, newStats]))
            })
    }
}

export {
    GameLoop,
}