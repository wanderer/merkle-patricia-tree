const async = require('async')
const level = require('level-mem')
const ethUtil = require('ethereumjs-util')
const { asyncFirstSeries } = require('./util/async')

module.exports = class DB {
  constructor (db) {
    this._db = db || level()
    this._getDBs = [this._db]
    this._putDBs = [this._db]
  }

  /**
   * Retrieves a raw value from db.
   * @param {Buffer|String} key
   * @param {Function} cb A callback `Function`, which is given the arguments
   * `err` - for errors that may have occured
   * and `value` - the found value in a `Buffer` or if no value was found `null`.
   */
  get (key, cb) {
    key = ethUtil.toBuffer(key)

    function dbGet (db, cb2) {
      db.get(key, {
        keyEncoding: 'binary',
        valueEncoding: 'binary'
      }, (err, foundNode) => {
        if (err || !foundNode) {
          cb2(null, null)
        } else {
          cb2(null, foundNode)
        }
      })
    }

    asyncFirstSeries(this._getDBs, dbGet, cb)
  }

  /**
   * Writes a value directly to db.
   * @param {Buffer|String} key The key as a `Buffer` or `String`
   * @param {Buffer} value The value to be stored
   * @param {Function} cb A callback `Function`, which is given the argument
   * `err` - for errors that may have occured
   */
  put (key, val, cb) {
    function dbPut (db, cb2) {
      db.put(key, val, {
        keyEncoding: 'binary',
        valueEncoding: 'binary'
      }, cb2)
    }

    async.each(this._putDBs, dbPut, cb)
  }

  /**
   * Removes a raw value in the underlying db.
   * @param {Buffer|String} key
   * @param {Function} cb A callback `Function`, which is given the argument
   * `err` - for errors that may have occured
   */
  del (key, cb) {
    function del (db, cb2) {
      db.del(key, {
        keyEncoding: 'binary'
      }, cb2)
    }

    async.each(this._putDBs, del, cb)
  }

  /**
   * Performs a batch operation on db.
   * @param {Array} opStack A stack of levelup operations
   * @param {Function} cb A callback `Function`, which is given the argument
   * `err` - for errors that may have occured
   */
  batch (opStack, cb) {
    function dbBatch (db, cb) {
      db.batch(opStack, {
        keyEncoding: 'binary',
        valueEncoding: 'binary'
      }, cb)
    }

    async.each(this._putDBs, dbBatch, cb)
  }
}
