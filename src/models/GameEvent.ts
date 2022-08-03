import { TeamsService } from "../services/TeamsService"
import { GameStats, Player } from "./GameStats"

class GameEvent {
    type: string
    game: GameStats
    team?: string
    scorer?: Player

    constructor(
        type: string, 
        game: GameStats, 
        team: string | undefined = undefined,
        scorer: Player | undefined = undefined, 
    ) {
        this.type = type
        this.game = game
        this.team = team
        this.scorer = scorer
    }

    getTitle(excited: boolean): string {
        switch (this.type) {
            case 'began': return 'Matchen började'
            case 'ended': return 'Matchen slutade'
            case 'scored': {
                var t = excited ? 'MÅÅÅL' : 'Mål'
                if (this.team) {
                    t += ' för ' + TeamsService.getShortName(this.team)
                }
                if (excited) {
                    return t + '!'
                }
                return t
            }
        }
        return 'Pucken'
    }

    getSubtitle(): string {
        const ht = this.game.getHomeTeamId()
        const hg = this.game.getHomeResult()
        const at = this.game.getAwayTeamId()
        const ag = this.game.getAwayResult()
        /**
         * FBK 0 - 5 LHF
         */
        return `${ht} ${hg} - ${ag} ${at}`
    }

    getBody(): string | undefined {
        if (this.type == 'began') {
            return TeamsService.getName(this.game.getHomeTeamId())
                + ' vs ' +
                TeamsService.getName(this.game.getAwayTeamId())
        }
        if (this.type == 'ended') {
            return this.getSubtitle()
        }
        let t = '';
        if (this.scorer) {
            t += this.scorer.firstName + ' ' + this.scorer.familyName + ' i '
        }
        t += this.game.getCurrentPeriodFormatted()
        if (t) {
            t = '\n' + t
        }
        return this.getSubtitle() + t
    }

    toString(): string {
        return this.getTitle(true) + ' ' + this.getSubtitle() 
    }

    static began(game: GameStats): GameEvent {
        return new GameEvent('began', game)
    }
    static ended(game: GameStats): GameEvent {
        return new GameEvent('ended', game)
    }
    static scored(game: GameStats, team: string, scorer: Player | undefined): GameEvent {
        return new GameEvent('scored', game, team, scorer)
    }
}

export {
    GameEvent
}