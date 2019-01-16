const async = require('async')
const level = require('level-mem')
const DB = require('./db')
const { asyncFirstSeries } = require('./util/async')

const ENCODING_OPTS = { keyEncoding: 'binary', valueEncoding: 'binary' }

/**
 * An in-memory wrap over `DB` with a backend DB
 * which will be queried when a key is not found
 * in the in-memory scratch. This class is used to implement
 * checkpointing functionality in CheckpointTrie.
 */
module.exports = class ScratchDB extends DB {
  constructor (db) {
    super()
    this._backend = db._db
  }

  /**
   * Similar to `DB.get`, but first searches in-memory
   * scratch DB, if key not found, searches backend DB.
   */
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
