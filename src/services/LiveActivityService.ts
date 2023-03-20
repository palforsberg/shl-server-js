import { ApnsClient, Errors, Notification, NotificationOptions, Priority } from "apns2";
import { Db } from "../Db";
import { Config } from "../models/Config";
import { GameStatus } from "../models/Game";
import { EventType, GameEvent, PenaltyInfo } from "../models/GameEvent";
import { User } from "../models/User";
import { GameReport, getStatusFromGameReport } from "./GameReportService";
const fs = require('fs')

interface LiveActivityEntry {
    game_uuid: string
    token: string
    user_id: string
}

interface ContentStateEvent {
    title: string
    body?: string
    teamCode?: string
}
interface ContentState {
    report: {
        homeScore: number
        awayScore: number
        status: GameStatus
        gametime: string
    }
    event?: ContentStateEvent
}

enum UpdateType {
    Report,
    Event,
}

class LiveActivityService {
    db: Db<Record<string, LiveActivityEntry[]>>
    apns: ApnsClient
    getReport: (arg0: string) => Promise<GameReport | undefined>
    getEvents: (arg0: string) => Promise<GameEvent[]>
    getUser: (arg0: string) => User | undefined

    constructor(config: Config,
        getReport: (arg0: string) => Promise<GameReport | undefined>,
        getEvents: (arg0: string) => Promise<GameEvent[]>,
        getUser: (arg0: string) => User | undefined,
    ) {
        this.db = new Db('live_activity', {})
        var options: any = {
            team: config.apn_team_id,
            keyId: config.apn_key_id,
            signingKey: fs.readFileSync(`${config.apn_key_path}`),
            defaultTopic: config.apn_topic + '.push-type.liveactivity',
            host: !config.production ? 'api.development.push.apple.com' : undefined,
        }
        this.apns = new ApnsClient(options)

        this.apns.on(Errors.error, err => {
            console.error('[LIVE] APNS Error', err)
            this.unsubscribeWhere(e => e.token == err.notification.deviceToken)
        })

        this.getReport = getReport
        this.getEvents = getEvents
        this.getUser = getUser

        this.onReport = this.onReport.bind(this)
        this.sendNotifications = this.sendNotifications.bind(this)
        this.getNotification = this.getNotification.bind(this)
        this.onEvent = this.onEvent.bind(this)
        this.subscribe = this.subscribe.bind(this)
        this.unsubscribe = this.unsubscribe.bind(this)
        this.unsubscribeWhere = this.unsubscribeWhere.bind(this)
    }

    async subscribe(game_uuid: string, token: string, user_id: string) {
        const all = await this.db.read()
        const updated = {...all}

        const entries = (updated[game_uuid] ?? [])
            .filter(e => e.user_id != user_id) // remove user from entries if already subscribed
        entries.push({ game_uuid, token, user_id }) // add user to entries

        updated[game_uuid] = entries
        await this.db.write(updated)

        console.log(`[LIVE] Subscribed ${game_uuid} ${user_id}`)
    }

    async unsubscribe(game_uuid: string, user_id: string) {
        return this.unsubscribeWhere(e => e.game_uuid == game_uuid && e.user_id == user_id)
    }

    private async unsubscribeWhere(predicate: (arg0: LiveActivityEntry) => boolean) {
        const all = await this.db.read()
        const updated = {...all}
        Object.entries(all).forEach(([k, entries]) => {
            updated[k] = entries.filter(e => !predicate(e))
            if (updated[k].length == 0) {
                delete updated[k]
            }
        })

        await this.db.write(updated)
        console.log('[LIVE] Unsubscribed', Object.keys(all).length - Object.keys(updated).length)
    }


    async onReport(report: GameReport): Promise<string[]> {
        const entries = (await this.db.read())[report.gameUuid] ?? []
        const lastEvent = getLastEvent(await this.getEvents(report.gameUuid))
        const notifications = entries.map(e => this.getNotification(UpdateType.Report, report, lastEvent, e))

        await this.sendNotifications(notifications)
        return entries.map(e => e.user_id)
    }

    async onEvent(event: GameEvent): Promise<string[]> {
        const entries = (await this.db.read())[event.info.game_uuid] ?? []
        const report = await this.getReport(event.info.game_uuid)
        if (event.type == EventType.GameStart && report) {
            report.gametime = '00:00'
        }
        const notifications = entries.map(e => this.getNotification(UpdateType.Event, report, event, e))
        await this.sendNotifications(notifications)
        if (event.type == EventType.GameEnd) {
            await this.unsubscribeWhere(u => u.game_uuid == event.info.game_uuid)
        }
        return entries.map(e => e.user_id)
    }

    private async sendNotifications(notifications: Notification[]) {
        if (notifications.length == 0) {
            return
        }
        try {
            await this.apns.sendMany(notifications)
            console.log(`[LIVE] Sent liveactivity to ${notifications.length} devices`)
        } catch (e) {
            console.error('[LIVE] Error:', e)
        }
    }

    private getNotification(
        update_type: UpdateType, 
        report: GameReport | undefined, 
        game_event: GameEvent | undefined, 
        entry: LiveActivityEntry
        ): Notification {

        const user_teams = this.getUser(entry.user_id)?.teams ?? []
        const content_state = getContentState(report, game_event, user_teams)
        const event = game_event?.type == EventType.GameEnd ? 'end' : 'update'
        const now = Math.floor(Date.now() / 1000)
        const priority = Priority.immediate // update_type == UpdateType.Event ? Priority.immediate : Priority.throttled
        const should_alert = update_type == UpdateType.Event && (game_event?.shouldNotify() ?? false)
        
        const options: NotificationOptions = {
            // @ts-ignore, liveactivity type is not supported at the moment
            type: 'liveactivity', 
            expiration: now + 3600,
            collapseId: entry.game_uuid,
            priority,
            alert: should_alert ? {
                title: game_event!.getTitle(user_teams),
                body: game_event!.getBody() ?? '',
            } : undefined,
            sound: should_alert ? 'ping.aiff' : '',            
            aps: {
                timestamp: now,
                event,
                "relevance-score": should_alert ? 100 : 75.0,
                "stale-date": now + 600,
                "content-state": content_state,
            },
        }

        return new Notification(entry.token, options)
    }
}

function getContentState(report: GameReport | undefined, event: GameEvent | undefined, user_teams: string[]): ContentState {
    return {
        report: {
            homeScore: report?.homeScore ?? 0,
            awayScore: report?.awayScore ?? 0,
            gametime: report?.gametime ?? '00:00',
            status: report ? getStatusFromGameReport(report) : GameStatus.Coming,
        },
        event: event ? getContentStateEvent(event, user_teams) : undefined
    }
}

function getLastEvent(events: GameEvent[]): GameEvent | undefined {
    return events[events.length - 1]
}

function getContentStateEvent(e: GameEvent, user_teams: string[]): ContentStateEvent | undefined {
    const p = e.getPlayer()
    const p_string = p ? `${p.firstName.charAt(0)}. ${p.familyName} • ` : ''
    const base = { 
        title: e.getTitle(user_teams),
        teamCode: e.getTeam(),
    }
    switch (e.type) {
        case EventType.Goal: {
            return { ...base, body: p_string + e.getTimeInfo(), }
        }
        case EventType.Penalty: {
            const info = e.info as PenaltyInfo
            return { ...base, body: p_string + info?.reason ?? '', }
        }
        case EventType.GameEnd:
        case EventType.GameStart: {
            return base
        }
        default: return undefined
    }
}

export {
    LiveActivityService,
}