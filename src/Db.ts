const fs = require('fs')

interface FileError {
   code: string
}
class Db<T> {
   in_mem?: T
   hasReadFromDb: boolean
   name: string

   constructor(name: string) {
      this.name = name
      this.hasReadFromDb = false
   }

   write(data: T): Promise<T> {
      return fs.promises.writeFile(getPath(this.name), JSON.stringify(data, null, 2))
         .catch((e: FileError) => handleError(e, this.name))
         .then(() => this.storeInMemory(data))
   }
   
   read(): Promise<T> {
      if (this.hasReadFromDb) {
         return Promise.resolve(this.in_mem!)
      }
      console.log(`[DB] read ${this.name} from file`)
      this.hasReadFromDb = true
      return fs.promises.readFile(getPath(this.name))
         .then(JSON.parse)
         .then((data: T) => this.storeInMemory(data))
         .catch((e: FileError) => handleError(e, this.name))
   }

   storeInMemory(data: T): T {
      this.in_mem = data
      this.hasReadFromDb = true
      return data
   }
}

function handleError(e: FileError, db: string) {
   if (e.code == 'ENOENT') {
      console.log('[DB] could not find db-file', db)
   } else {
      console.error('[DB] ERROR reading', e)
   }
   return undefined
}

function getPath(db: string) {
   return `./db/${db}.json`
}

export {
   Db,
}