const Service = require('./Service.js')

function createTokenGetter(service, expiresIn = 3600) {
   const s = Service.create('token', service, expiresIn)
   return () => s.update().then(t => {
      return t?.access_token
   })
}

module.exports.createTokenGetter = createTokenGetter