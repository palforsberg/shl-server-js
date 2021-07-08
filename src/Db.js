const fs = require('fs')

const in_mem = {}

function write(db, data) {
   return fs.promises.writeFile(getPath(db), JSON.stringify(data, null, 2))
      .catch(e => handleError(e, db))
      .then(() => storeInMemory(db, data))
}

function read(db) {
   const cached = in_mem[db]
   if (cached !== undefined) {
      return Promise.resolve(cached)
   }
   console.log(`[DB] read ${db} from file`)
   return fs.promises.readFile(getPath(db))
      .then(JSON.parse)
      .then(data => storeInMemory(db, data))
      .catch(e => handleError(e, db))
}

const create = (db) => ({
   write: data => write(db, data),
   read: () => read(db),
   name: db,
})

function storeInMemory(db, data) {
   in_mem[db] = data
   return data
}

function handleError(e, db) {
   if (e.code == 'ENOENT') {
      console.log('[DB] could not find db-file', db)
   } else {
      console.error('[DB] ERROR reading', e)
   }
   return undefined
}

function getPath(db) {
   return `./db/${db}.json`
}

module.exports = {
   write,
   read,
   create,
}