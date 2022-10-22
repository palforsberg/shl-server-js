import WebSocket from 'ws'
import { FileAppend } from './services/FileAppend'

class ShlSocket {
    private url: string
    private fileAppender: FileAppend
    private ws?: WebSocket
    private _onEvent: (arg0: WsEvent) => Promise<any> = e => Promise.resolve()
    private _onGameReport: (arg0: WsGame) => Promise<any> = e => Promise.resolve()

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

    join(gameId: number) {
        this.send({ action: 'join', channel: gameId })
    }

    send(obj: any) {
        const str = JSON.stringify([obj])
        this.ws?.send(str)
        console.log('[SOCKET] Sent' + str)
    }

    close() {
        if (this.ws == undefined) return
        console.log('[SOCKET] Closing')
        this.ws?.close()
        this.ws = undefined
    }

    reopen(games: WsGame[]) {
        console.log('[SOCKET] Reopening')
        this.close()
        this.open().then(_ => {
            games.forEach(e => this.join(e.gameId))
        })
    }
 
    open(): Promise<any> {
        if (this.ws) return Promise.resolve()
        
        console.log('[SOCKET] Opening')
        return new Promise((res, rej) => {
            this.ws = new WebSocket(this.url)
            this.ws.on('open', () => {
                console.log('[SOCKET] Opened')
                res('')
            })
            this.ws.on('close', (code, reason) => {
                this.close()
                console.log('[SOCKET] Closed', code, reason.toString())
            })
            this.ws.on('message', (data: any) => {
                const str = data.toString()
                try {
                    // store all events in a full-day file
                    this.fileAppender.store('_date', str)
                    this.onMessage(str)
                } catch (e) {
                    console.error('[SOCKET] Failed to parse', str, e)
                }
            })
            this.ws.on('error', (e: any) => {
                console.error('[SOCKET]', e)
                this.close()
            })
        })
    }

    async onMessage(str: string) {
        if (str == 'o') return

        const m = ShlSocket.parse(str)
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

    static parse(str: string): any {
        return JSON.parse(JSON.parse(str.substring(1))[0])
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