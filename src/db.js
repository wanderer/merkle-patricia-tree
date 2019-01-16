const level = require('level-mem')
const ethUtil = require('ethereumjs-util')

const ENCODING_OPTS = { keyEncoding: 'binary', valueEncoding: 'binary' }

/**
 * DB is a thin wrapper around the underlying levelup db,
 * which validates inputs and sets encoding type.
 */
module.exports = class DB {
  constructor (db) {
    this._db = db || level()
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
    this._db.get(key, ENCODING_OPTS, (err, v) => {
      if (err || !v) {
        cb(null, null)
      } else {
        cb(null, v)
      }
    })
  }

  /**
   * Writes a value directly to db.
   * @param {Buffer|String} key The key as a `Buffer` or `String`
   * @param {Buffer} value The value to be stored
   * @param {Function} cb A callback `Function`, which is given the argument
   * `err` - for errors that may have occured
   */
  put (key, val, cb) {
    this._db.put(key, val, ENCODING_OPTS, cb)
  }

  /**
   * Removes a raw value in the underlying db.
   * @param {Buffer|String} key
   * @param {Function} cb A callback `Function`, which is given the argument
   * `err` - for errors that may have occured
   */
  del (key, cb) {
    this._db.del(key, ENCODING_OPTS, cb)
  }

  /**
   * Performs a batch operation on db.
   * @param {Array} opStack A stack of levelup operations
   * @param {Function} cb A callback `Function`, which is given the argument
   * `err` - for errors that may have occured
   */
  batch (opStack, cb) {
    this._db.batch(opStack, ENCODING_OPTS, cb)
  }

  /**
   * Returns a copy of DB.
   */
  copy () {
    return new DB(this._db)
  }
}
