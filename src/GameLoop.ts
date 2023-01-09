import { Game } from "./models/Game";
import { SeasonService } from "./services/SeasonService";
import { StandingService } from "./services/StandingService";
import { GameStatsService } from "./services/GameStatsService";
import { ShlSocket } from "./ShlSocket";

class GameLoop {
    private seasonService: SeasonService
    private standingsService: StandingService
    private gameStatsService: GameStatsService
    private socket: ShlSocket

    private gamesToFetch: Game[]

    constructor(
        seasonService: SeasonService,
        gameStatsService: GameStatsService,
        currentStanding: StandingService,
        socket: ShlSocket
    ) {

         this.loop = this.loop.bind(this)
         this.gameJob = this.gameJob.bind(this)
         this.addGamesToFetch = this.addGamesToFetch.bind(this)
         this.removeGameToFetch = this.removeGameToFetch.bind(this)
         this.getGamesToFetch = this.getGamesToFetch.bind(this)
         this.seasonService = seasonService
         this.standingsService = currentStanding
         this.gameStatsService = gameStatsService
         this.socket = socket

         this.gamesToFetch = []
    }

    loop() {
        console.log('[LOOP] ******* Begin ********')
        this.gameJob()
           .then((liveGames: Game[]) => {
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

    private async gameJob(): Promise<Game[]> {
        await this.standingsService.getCurrentSeason().update()
        const season = await this.seasonService.update()
        const gamesWithin5Min = SeasonService.getLiveGames(season || [], 5)
        this.addGamesToFetch(gamesWithin5Min)

        /**
         * Live Games -> 
         * Socket is opened -> 
         * Fetch game stats -> 
         * ...
         * Socket gets GameEnded -> 
         * Live Games becomes Played Games -> 
         * Game Stats gets GameEnded ->
         * Stop fetching Game Stats -> 
         * Close socket
         */
        if (this.gamesToFetch.length > 0) {
            await this.socket.open()
        }

        for (const lg of this.gamesToFetch) {
            const stats = await this.gameStatsService.updateGame(lg.game_uuid, lg.game_id)

            if (stats?.isPlayed() ?? false) {
                this.removeGameToFetch(stats!.game_uuid)
            }
        }

        if (this.gamesToFetch.length == 0) {
            this.socket.close()
        }

        return this.gamesToFetch
    }

    private addGamesToFetch(games: Game[]) {
        const toAdd = games
            .filter(g => this.gamesToFetch.find(e => e.game_uuid == g.game_uuid) == undefined)
        this.gamesToFetch = [...this.gamesToFetch, ...toAdd]
    }

    private removeGameToFetch(gameUuid: string) {
        this.gamesToFetch = [...this.gamesToFetch].filter(e => e.game_uuid != gameUuid)
    }

    getGamesToFetch(): Game[] {
        return this.gamesToFetch
    }
}

export {
    GameLoop,
}