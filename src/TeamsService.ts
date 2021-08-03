import { Team } from "./models/Team"

const teams = [
    { code: "TIK", name: "Timrå IK" },
    { code: "VLH", name: "Växjö Lakers" },
    { code: "RBK", name: "Rögle BK" },
    { code: "LIF", name: "Leksands IF" },
    { code: "SAIK", name: "Skellefteå AIK" },
    { code: "LHF", name: "Luleå HF" },
    { code: "OHK", name: "Örebro Hockey" },
    { code: "FHC", name: "Frölunda HC" },
    { code: "FBK", name: "Färjestad BK" },
    { code: "MIF", name: "IF Malmö Redhawks" },
    { code: "DIF", name: "Djurgården IF" },
    { code: "IKO", name: "IK Oskarshamn" },
    { code: "LHC", name: "Linköpings HC" },
    { code: "BIF", name: "Brynäs IF" },
    { code: "HV71", name: "HV71" }
]

interface StaticDb<T> {
    read: () => Promise<T>
}

class TeamsService {
    db: StaticDb<Team[]>
    constructor() {
        this.db = { read: () => Promise.resolve(teams) }
    }
}

export {
    TeamsService
}