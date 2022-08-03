
interface Config {
    shl_client_id: string
    shl_client_secret: string
    shl_client_timeout?: number,
    apn_key_path: string
    apn_key_id: string
    apn_team_id: string
    apn_topic: string
    admin_password: string,
    production: boolean,
    send_notifications: boolean,
    port: number,
    max_listeners?: number,

    shl_path: string,
    shl_stats_path: string,
}

export {
    Config
}