import { Team } from "../models/Team"

const teams = [
    { code: "TIK", name: "Timrå IK", shortname: "Timrå" },
    { code: "VLH", name: "Växjö Lakers", shortname: "Växjö" },
    { code: "RBK", name: "Rögle BK", shortname: "Rögle" },
    { code: "LIF", name: "Leksands IF", shortname: "Leksands" },
    { code: "SAIK", name: "Skellefteå AIK", shortname: "Skellefteå" },
    { code: "LHF", name: "Luleå HF", shortname: "Luleå" },
    { code: "OHK", name: "Örebro Hockey", shortname: "Örebro" },
    { code: "FHC", name: "Frölunda HC", shortname: "Frölunda" },
    { code: "FBK", name: "Färjestad BK", shortname: "Färjestad" },
    { code: "MIF", name: "IF Malmö Redhawks", shortname: "Malmö" },
    { code: "DIF", name: "Djurgården IF", shortname: "Djurgården" },
    { code: "IKO", name: "IK Oskarshamn", shortname: "Oskarshamn" },
    { code: "LHC", name: "Linköpings HC", shortname: "Linköpings" },
    { code: "BIF", name: "Brynäs IF", shortname: "Brynäs" },
    { code: "HV71", name: "HV71", shortname: "HV71" }
]

interface StaticDb<T> {
    read: () => Promise<T>
}

class TeamsService {
    db: StaticDb<Team[]>
    constructor() {
        this.db = { read: () => Promise.resolve(teams) }
    }

    static getName(code: string): string {
        return teams.find(e => e.code == code)?.name || code
    }

    static getShortName(code: string): string {
        return teams.find(e => e.code == code)?.shortname || code
    }
}

export {
    TeamsService
}