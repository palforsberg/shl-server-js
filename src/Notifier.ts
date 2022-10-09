import { Config } from './models/Config'
import { GameEvent, GoalInfo } from './models/GameEvent'
import { User } from './models/User'
import { ApnsClient, Notification, NotificationOptions, Errors } from 'apns2'
const fs = require('fs')

class Notifier {
    apns: ApnsClient
    enabled: boolean

    constructor(config: Config) {
        var options: any = {
            team: config.apn_team_id,
            keyId: config.apn_key_id,
            signingKey: fs.readFileSync(`${config.apn_key_path}`),
            defaultTopic: config.apn_topic,
            host: !config.production ? 'api.development.push.apple.com' : undefined,
        }
        this.apns = new ApnsClient(options)
        this.enabled = config.send_notifications
        this.setOnError = this.setOnError.bind(this)
    }

    setOnError(onError: (error: Errors, token: string) => void) {
        this.apns.on(Errors.error, (err) => {
            onError(err.reason, err.notification.deviceToken)
        })
    }
    /**
     * For the event, get a list of users to send notification to.
     */
    async notify(event: GameEvent | undefined, users: User[]): Promise<User[]> {
        if (!event || !event.shouldNotify()) return Promise.resolve(users)
        if (!this.enabled) {
            console.log('[NOTIFIER] Muted', event.toString(false))
            return Promise.resolve(users)
        }

        const notifications = users
            .filter(u => this.userHasSubscribed(u, event.info.homeTeamId, event.info.awayTeamId))
            .filter(u => u.apn_token != undefined)
            .map(u => this.getNotification(u, event))

        try {
            await this.apns.sendMany(notifications)
            notifications.forEach(e => console.log('[NOTIFIER] Sent ' + JSON.stringify(e.options.alert) + ' to ' + e.deviceToken))
        } catch (e) {
            console.error('[NOTIFIER] Error:', e)
        }

        return users
    }

    private getNotification(user: User, event: GameEvent): Notification {
        const isUsersTeam = user.teams.includes((event.info as GoalInfo)?.team ?? '')
        var options: NotificationOptions = {
            sound: 'ping.aiff',
            expiration: Math.floor(Date.now() / 1000) + 3600,
            alert: {
                title: event.getTitle(isUsersTeam),
                body: event.getBody() ?? '',
            },
            collapseId: event.info.game_uuid,
            data: { 
                game_uuid: event.info.game_uuid, 
                team: (event.info as GoalInfo)?.team,
            }
        }
        return new Notification(user.apn_token!, options)
    }

    private userHasSubscribed(user: User, team1: string, team2: string) {
        return user.teams.includes(team1) || user.teams.includes(team2)
    }
}


export {
    Notifier,
}