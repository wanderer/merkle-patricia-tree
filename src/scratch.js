const async = require('async')
const level = require('level-mem')
const DB = require('./db')
const { asyncFirstSeries } = require('./util/async')

const ENCODING_OPTS = { keyEncoding: 'binary', valueEncoding: 'binary' }

module.exports = class ScratchDB extends DB {
  constructor (db) {
    super()
    this._backend = db._db
  }

  get (key, cb) {
    const getDBs = this._backend ? [this._db, this._backend] : [this._db]
    const dbGet = (db, cb2) => {
      db.get(key, ENCODING_OPTS, (err, v) => {
        if (err || !v) {
          cb2(null, null)
        } else {
          cb2(null, v)
        }
      })
    }

    asyncFirstSeries(getDBs, dbGet, cb)
  }
}
