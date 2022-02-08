
interface Config {
    shl_client_id: string
    shl_client_secret: string
    apn_key_path: string
    apn_key_id: string
    apn_team_id: string
    apn_topic: string
    admin_password: string,
    production: boolean,
    port: number,
    max_listeners: number,
}

export {
    Config
}