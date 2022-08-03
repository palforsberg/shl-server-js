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
      this.read = this.read.bind(this)
      this.write = this.write.bind(this)
      this.storeInMemory = this.storeInMemory.bind(this)
   }

   write(data: T): Promise<T> {
      return fs.promises.writeFile(Db.getPath(this.name), JSON.stringify(data, null, 2))
         .catch((e: FileError) => Db.handleError(e, this.name))
         .then(() => this.storeInMemory(data))
   }
   
   read(): Promise<T> {
      if (this.hasReadFromDb) {
         return Promise.resolve(this.in_mem!)
      }
      console.log(`[DB] read ${this.name} from file`)
      return fs.promises.readFile(Db.getPath(this.name))
         .then(JSON.parse)
         .then((data: T) => this.storeInMemory(data))
         .catch((e: FileError) => Db.handleError(e, this.name))
   }

   readCached(): T | undefined {
      return this.in_mem
   }

   storeInMemory(data: T): Promise<T> {
      this.in_mem = data
      this.hasReadFromDb = true
      return Promise.resolve(data)
   }
   
   static handleError(e: FileError, db: string) {
      if (e.code == 'ENOENT') {
         console.log('[DB] could not find db-file', db)
      } else {
         console.error('[DB] ERROR reading', e)
      }
      return undefined
   }
   
   static getPath(db: string) {
      return `./db/${db}.json`
   }
}



export {
   Db,
}