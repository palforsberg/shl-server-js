const fs = require('fs');


class FileAppend {
    static enabled = true
    path: string

    constructor(path: string) {
        this.path = path
    }   

    store(fileName: string, object: any) {
        if (!FileAppend.enabled) return
        let name = fileName.replaceAll('_date', new Date().toISOString().split('T')[0])
        let str = object
        if (typeof object != 'string') {
            str = JSON.stringify(object)
        }
        fs.appendFileSync(`${this.path}/${name}.log`, str + '\n')
    }
}

export {
    FileAppend,
}