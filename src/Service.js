const DbWrapper = require('./DbWrapper.js')

function create(name, service, expiryDelta = 0) {

   const db = DbWrapper.create(name, fromData, fromDb)
   const cache = { db, service }

   cache.update = () => db.read().then(data => {
      if (data == undefined) {
         return service().then(db.write)
      } else if (expiryDelta >= 0 && data.hasExpired(expiryDelta * 1000)) {
         return service().then(db.write)
      }
      return data
   })
    
   return cache
}

function fromData(data) {
   return { timestamp: new Date().toString(), data }
}

function fromDb(dbObject) {
   if (!dbObject?.data) return undefined
   const object = dbObject?.data
   object.hasExpired = (delta) => new Date() - new Date(dbObject.timestamp || 0) > delta
   return object;
}

module.exports = {
   create,
}
