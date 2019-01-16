const async = require('async')
const level = require('level-mem')
const WriteStream = require('level-ws')
const BaseTrie = require('./baseTrie')
const proof = require('./proof.js')
const ScratchReadStream = require('./scratchReadStream')
const DB = require('./db')
const ScratchDB = require('./scratch')
const { callTogether } = require('./util/async')

module.exports = class CheckpointTrie extends BaseTrie {
  constructor (...args) {
    super(...args)
    // Reference to main DB instance
    this._mainDB = this.db
    // DB instance used for checkpoints
    this._scratch = null
    // Roots of trie at the moment of checkpoint
    this._checkpoints = []
  }

  static prove (...args) {
    return proof.prove(...args)
  }

  static verifyProof (...args) {
    return proof.verifyProof(...args)
  }

  /**
   * Is the trie during a checkpoint phase?
   */
  get isCheckpoint () {
    return this._checkpoints.length > 0
  }

  /**
   * Creates a checkpoint that can later be reverted to or committed.
   * After this is called, no changes to the trie will be permanently saved
   * until `commit` is called. Calling `putRaw` overrides the checkpointing
   * mechanism and would directly write to db.
   * @method checkpoint
   */
  checkpoint () {
    const wasCheckpoint = this.isCheckpoint
    this._checkpoints.push(this.root)

    // Entering checkpoint mode is not necessary for nested checkpoints
    if (!wasCheckpoint && this.isCheckpoint) {
      this._enterCpMode()
    }
  }

  /**
   * Commits a checkpoint to disk, if current checkpoint is not nested. If
   * nested, only sets the parent checkpoint as current checkpoint.
   * @method commit
   * @param {Function} cb the callback
   * @throws If not during a checkpoint phase
   */
  commit (cb) {
    cb = callTogether(cb, this.sem.leave)

    this.sem.take(() => {
      if (this.isCheckpoint) {
        this._checkpoints.pop()
        if (!this.isCheckpoint) {
          this._exitCpMode(true, cb)
        } else {
          cb()
        }
      } else {
        throw new Error('trying to commit when not checkpointed')
      }
    })
  }

  /**
   * Reverts the trie to the state it was at when `checkpoint` was first called.
   * If during a nested checkpoint, sets root to most recent checkpoint, and sets
   * parent checkpoint as current.
   * @method revert
   * @param {Function} cb the callback
   */
  revert (cb) {
    cb = callTogether(cb, this.sem.leave)

    this.sem.take(() => {
      if (this.isCheckpoint) {
        this.root = this._checkpoints.pop()
        if (!this.isCheckpoint) {
          this._exitCpMode(false, cb)
          return
        }
      }

      cb()
    })
  }

  /**
   * Returns a copy of the underlying trie with the interface
   * of CheckpointTrie.
   * @method copy
   */
  copy () {
    const db = this._mainDB.copy()
    const trie = new CheckpointTrie(db, this.root)
    trie._scratch = this._scratch
    trie._checkpoints = this._checkpoints.slice()
    return trie
  }

  /**
   * Returns a `ScratchReadStream` based on the state updates
   * since checkpoint.
   * @method createScratchReadStream
   */
  createScratchReadStream (scratch) {
    const trie = this.copy()
    scratch = scratch || this._scratch
    scratch = new DB(scratch._db)
    // Only read from the scratch
    trie.db = scratch
    trie._scratch = scratch
    return new ScratchReadStream(trie)
  }

  putRaw (key, val, cb) {
    if (this.isCheckpoint) return this._overridePutRaw(key, val, cb)
    this.db.put(key, val, cb)
  }

  /**
   * Puts kv-pair directly to db, ignoring checkpoints.
   * @private
   */
  _overridePutRaw (key, val, cb) {
    this._mainDB.put(key, val, cb)
  }

  /**
   * Enter into checkpoint mode.
   * @private
   */
  _enterCpMode () {
    this._scratch = new ScratchDB(this._mainDB)
    this.db = this._scratch
  }

  /**
   * Exit from checkpoint mode.
   * @private
   */
  _exitCpMode (commitState, cb) {
    const scratch = this._scratch
    this._scratch = null
    this.db = this._mainDB

    if (commitState) {
      this.createScratchReadStream(scratch)
        .pipe(WriteStream(this.db))
        .on('close', cb)
    } else {
      async.nextTick(cb)
    }
  }
}
