import SockJS from 'sockjs-client'
import { FileAppend } from './services/FileAppend'

class ShlSocket {
    private url: string
    private fileAppender: FileAppend
    private ws?: any
    private openedTimestamp?: Date
    private _onEvent: (arg0: WsEvent) => Promise<any> = e => Promise.resolve()
    private _onGameReport: (arg0: WsGame) => Promise<any> = e => Promise.resolve()
    private _onClose: VoidFunction = () => {}

    constructor(url: string) {
        this.url = url
        this.fileAppender = new FileAppend('./log')

        this.onEvent = this.onEvent.bind(this)
        this.onGameReport = this.onGameReport.bind(this)
        this.onMessage = this.onMessage.bind(this)
        this.close = this.close.bind(this)
        this.open = this.open.bind(this)
        this.join = this.join.bind(this)
        this.send = this.send.bind(this)
    }
    
    onEvent(onEvent: (arg0: WsEvent) => Promise<any>) {
        this._onEvent = onEvent
    }
    onGameReport(onGameReport: (arg0: WsGame) => Promise<any>) {
        this._onGameReport = onGameReport
    }
    onClose(onClose: VoidFunction) {
        this._onClose = onClose
    }

    join(gameId: number) {
        this.send({ action: 'join', channel: gameId })
    }

    send(obj: any) {
        const str = JSON.stringify(obj)
        this.ws?.send(str)
        console.log('[SOCKET] Sent' + str)
    }

    close() {
        if (this.ws == undefined) return
        console.log('[SOCKET] Closing')
        this.ws?.close()
    }

    async reopen() {
        console.log('[SOCKET] Reopening')
        this.close()

        await new Promise((res) => setTimeout(res, 1000))

        await this.open()
        console.log('[SOCKET] Reopened')
    }
 
    open(): Promise<any> {
        if (this.ws) return Promise.resolve()
        
        console.log('[SOCKET] Opening')
        return new Promise((res, rej) => {
            this.ws = new SockJS(this.url)
            this.ws.onopen = () => {
                this.openedTimestamp = new Date()
                console.log('[SOCKET] Opened', this.openedTimestamp)
            }
            this.ws.onclose = (reason: any) => {
                this._onClose()
                this.ws = undefined
                console.log('[SOCKET] Closed', JSON.stringify(reason))
            }
            this.ws.onmessage = (msg: any) => {
                try {
                    // store all events in a full-day file
                    this.fileAppender.store('_date', msg)
                    this.onMessage(msg.data)
                } catch (e) {
                    console.error('[SOCKET] Failed to parse', msg, e)
                }
            }
            this.ws.onerror = (e: any) => {
                console.error('[SOCKET]', e)
                this.close()
            }
            setTimeout(res, 1000)
        })
    }

    async onMessage(str: string) {
        const m = JSON.parse(str)
        switch (m.class) {
            case 'GameReport':
                for (const g of m.games) {
                    await this._onGameReport(g)
                }
                break
            case 'Livefeed_SHL': 
                break
            default:
                await this._onEvent(m as WsEvent)
                break
        }
    }
}

interface WsGame {
    gameId: number

    homeTeamCode: string
    awayTeamCode: string
    homeScore: string
    awayScore: string
    gametime: string
    timePeriod: number
    statusString: string
    gameState: string
    period: number
    arena: string

    attendance?: string
}

interface WsEvent {
    // new
    eventId: string,
    gameId: number,
    revision: number,
    period: number,
    timePeriod: number,
    gametime: string,
    description: string,
    /**
     *  Goal
     *  Penalty
     *  Period
     *  Shot
     *  ShotBlocked
     *  ShotIron
     *  ShotWide
     *  Timeout
     *  GoolkeeperEvent
     */
    class: string,
}

export {
    ShlSocket,
    WsEvent,
    WsGame,
}