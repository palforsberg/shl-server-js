const Db = require('./Db.js')
const DbObject = require('./DbObject.js')

function createTokenGetter(service, expiresIn = 3600*1000) {
   const db = DbObject.extend(Db.create('token'), service)
   return () => db.readCachedDbObject(expiresIn).then(t => t.data.access_token)
}

module.exports.createTokenGetter = createTokenGetter