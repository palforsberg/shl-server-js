const fs = require('fs');


class FileAppend {
    static enabled = true
    path: string

    constructor(path: string) {
        this.path = path
    }   

    store(fileName: string, object: any) {
        if (!FileAppend.enabled) return
        let name = fileName
        if (fileName == '_date') {
            name = new Date().toISOString().split('T')[0]
        }
        fs.appendFileSync(`${this.path}/${name}.log`, JSON.stringify(object) + '\n')
    }
}

export {
    FileAppend,
}