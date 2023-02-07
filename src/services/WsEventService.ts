import { Db } from "../Db";
import { EventType, GameEvent, GameInfo, GoalInfo } from "../models/GameEvent";
import { WsEvent } from "../ShlSocket";

class WsGameEvent extends GameEvent {
    eventId: string
    revision: number
    gametime: string
    timePeriod: number
    description: string

    constructor(type: EventType, info: GameInfo, event: WsEvent) {
        super(type, info)
        this.eventId = event.eventId
        this.revision = event.revision
        this.gametime = event.gametime
        this.timePeriod = event.timePeriod
        this.description = event.description
        this.getInfo = this.getInfo.bind(this)
    }

    override getBody(): string | undefined {
        if (this.type == EventType.Goal) {
            let t = '';
            if ((this.info as GoalInfo)?.player) {
                const p = (this.info as GoalInfo).player!
                t += `${p.firstName.charAt(0)}. ${p.familyName} • `
            }
            t += this.getInfo()
            return this.getScoreString() + '\n' + t
        }
        return super.getBody()
    }

    private getInfo(): string {
        switch (this.info.periodNumber) {
          case 99:
            return 'Straffar'
          case 4:
            return `Övertid ${this.gametime}`
          case 3:
            return `P3 ${this.gametime}`
          case 2:
            return `P2 ${this.gametime}`
          case 1:
            return `P1 ${this.gametime}`
          default:
            return this.gametime
        }
    }
    toString(): string {
        return `${this.gametime} ${this.getScoreString()} - ${this.type} ${this.description} [${this.eventId} ${this.revision}]`
    }
}

class WsEventService {

    db: Db<Record<string, WsGameEvent[]>>

    constructor() {
        this.db = new Db('events_ws', {})
    }

    async store(event: WsGameEvent): Promise<boolean> {
        const events = await this.db.read()
        const gameEvents = events[event.info.game_uuid] ?? []
        const existingIndex = gameEvents.findIndex(e => e.eventId == event.eventId)
        let newEvent = false
        if (existingIndex > -1 && event.revision > gameEvents[existingIndex].revision) {
            newEvent = false
            console.log(`[WS_EVENT] Replace ${event.eventId} with new revision ${gameEvents[existingIndex].revision} -> ${event.revision}`)
            gameEvents[existingIndex] = event
        } else if (existingIndex == -1) {
            newEvent = true
            console.log('[WS_EVENT]', event.toString())
            gameEvents.push(event)
        }
        events[event.info.game_uuid] = gameEvents
        await this.db.write(events)
        return newEvent
    }

    readCached(gameUuid: string): WsGameEvent[] {
        const allEvents = this.db.readCached()
        return allEvents[gameUuid] || []
    }

    async read(gameUuid: string): Promise<WsGameEvent[]> {
        const allEvents = await this.db.read()
        return allEvents[gameUuid] || []
    }
}
export {
    WsEventService,
    WsGameEvent,
}