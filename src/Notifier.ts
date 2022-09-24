import { Config } from './models/Config'
import { GameEvent } from './models/GameEvent'
import { User } from './models/User'
var apn = require('apn')


interface ApnResponse {
    failed: [],
}
class NotifyError extends Error {
    user: User
    failed: []
    constructor(user: User, failed: []) {
        super()
        this.user = user
        this.failed = failed
    }
}

class Notifier {
    topic: string
    apnConnection: ({ send: (note: Object, token: string) => Promise<ApnResponse> })
    send: boolean

    constructor(config: Config) {
        var options = {
            token: {
                key: config.apn_key_path,
                keyId: config.apn_key_id,
                teamId: config.apn_team_id,
            },
            production: config.production,
        }
        this.topic = config.apn_topic
        this.apnConnection = new apn.Provider(options)
        this.send = config.send_notifications
    }
    /**
     * For each event, get a list of users to send notification to.
     */
    notify(event: GameEvent | undefined, users: User[]): Promise<User[]> {
        if (!event) return Promise.resolve(users)
        if (!event.shouldNotify()) {
            return Promise.resolve(users)   
        }
        if (!this.send) {
            console.log('[NOTIFIER] Muted', event.toString(false))
            return Promise.resolve(users)
        }
        return Promise.all(users
            .filter(u => this.userHasSubscribed(u, event.game.getHomeTeamId(), event.game.getAwayTeamId()))
            .map(u => this.sendNotificationMsg(u, event)))
    }

    private userHasSubscribed(user: User, team1: string, team2: string) {
        return user.teams.includes(team1) || user.teams.includes(team2)
    }

    private sendNotificationMsg(user: User, event: GameEvent): Promise<User> {
        if (user.apn_token == undefined) {
            return Promise.resolve(user)
        }

        const isUsersTeam = user.teams.includes(event.team || '')
        var notification = new apn.Notification()

        notification.expiry = Math.floor(Date.now() / 1000) + 3600
        notification.sound = "ping.aiff"
        notification.alert =  {
            title: event.getTitle(isUsersTeam),
            body: event.getBody(),
        }
        notification.collapseId = event.game.game_uuid
        notification.payload = { 
            game_uuid: event.game.game_uuid, 
            team: event.team 
        }
        notification.topic = this.topic
 
        return this.apnConnection.send(notification, user.apn_token).then((result: ApnResponse) => {
            if (result.failed.length > 0) {
                throw new NotifyError(user, result.failed)
            } else {
                console.log(`[NOTIFIER] Sent ${event.toString(isUsersTeam)} to ${user.id}`)
                return user
            }
        })   
    }
}


export {
    Notifier,
    NotifyError,
}