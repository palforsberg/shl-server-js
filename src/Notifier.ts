import { Config } from './models/Config'
import { GameEvent, GoalInfo } from './models/GameEvent'
import { User } from './models/User'
import { Notification, NotificationOptions } from 'apns2'

class Notifier {
    push: (notifications: Notification[]) => Promise<(Notification | {error: any})[]>
    enabled: boolean

    constructor(
        config: Config, 
        push: (notifications: Notification[]) => Promise<(Notification | {error: any})[]>) {

        this.enabled = config.send_notifications
        this.push = push
    }

    /**
     * For the event, get a list of users to send notification to.
     */
    async sendNotification(event: GameEvent, users: User[]): Promise<User[]> {
        if (!this.enabled) {
            console.log('[NOTIFIER] Muted', event.toString())
            return Promise.resolve(users)
        }

        const notifications = users
            .filter(u => this.userHasSubscribed(u, event.info.homeTeamId, event.info.awayTeamId))
            .filter(u => u.apn_token != undefined)
            .map(u => this.getNotification(u, event))

        try {
            await this.push(notifications)
            notifications.forEach(e => console.log('[NOTIFIER] Sent ' + JSON.stringify(e.options.alert) + ' to ' + e.deviceToken))
        } catch (e) {
            console.error('[NOTIFIER] Error:', e)
        }

        return users
    }

    private getNotification(user: User, event: GameEvent): Notification {
        var options: NotificationOptions = {
            sound: 'ping.aiff',
            expiration: Math.floor(Date.now() / 1000) + 3600,
            alert: {
                title: event.getTitle(user.teams),
                body: event.getBody() ?? '',
            },
            collapseId: event.info.game_uuid,
            data: { 
                game_uuid: event.info.game_uuid, 
                team: (event.info as GoalInfo)?.team,
                info: event.info,
                type: event.type,
                localAttachements: event.getImages(),
            },
            aps: {
                "mutable-content": 1,
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