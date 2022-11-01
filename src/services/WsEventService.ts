import { Db } from "../Db";
import { EventType, GameEvent, GameInfo } from "../models/GameEvent";
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