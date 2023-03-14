import { Db } from "../Db";
import { GameEvent } from "../models/GameEvent";


class WsEventService {

    db: Db<Record<string, GameEvent[]>>

    constructor() {
        this.db = new Db('events_ws', {})
        this.store = this.store.bind(this)
        this.readCached = this.readCached.bind(this)
        this.read = this.read.bind(this)
    }

    async store(event: GameEvent): Promise<boolean> {
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

    readCached(gameUuid: string): GameEvent[] {
        const allEvents = this.db.readCached()
        return (allEvents[gameUuid] || [])
        .map(e => new GameEvent(e.type, e.info, e.eventId, e.revision, e.gametime, e.timePeriod, e.description, e.timestamp))
    }

    async read(gameUuid: string): Promise<GameEvent[]> {
        const allEvents = await this.db.read()
        return (allEvents[gameUuid] || [])
            .map(e => new GameEvent(e.type, e.info, e.eventId, e.revision, e.gametime, e.timePeriod, e.description, e.timestamp))
    }
}
export {
    WsEventService,
}