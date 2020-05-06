import { CheckpointTrie } from './checkpointTrie'
import { SecureTrie } from './secure'
import { toBuffer } from 'ethereumjs-util'

type Callback<T> = (err: any, value: T) => void

function wrapEmptyPromise(promise: Promise<void>, cb?: Callback<void>): Promise<void> {
  return promise.then(
    () => {
      cb?.(null)
    },
    (err) => {
      if (cb) {
        cb(err)
      } else {
        throw err
      }
    },
  )
}

function wrapPromise<T>(promise: Promise<T | null>, cb?: Callback<T | null>): Promise<T | null> {
  return promise.then(
    (value) => {
      cb?.(null, value)
      return value
    },
    (err) => {
      if (cb) {
        cb(err, null)
        return undefined as any
      } else {
        throw err
      }
    },
  )
}

class WrappedCheckpointTrie extends CheckpointTrie {
  async get(key: Buffer | string, cb?: Callback<Buffer | null>): Promise<Buffer | null> {
    return wrapPromise(super.get(toBuffer(key)), cb)
  }

  async put(key: Buffer | string, value: Buffer | string, cb?: Callback<void>): Promise<void> {
    return wrapEmptyPromise(super.put(toBuffer(key), toBuffer(value)), cb)
  }

  async del(key: Buffer | string, cb?: Callback<void>): Promise<void> {
    return wrapEmptyPromise(super.del(toBuffer(key)), cb)
  }

  async getRaw(key: Buffer, cb?: Callback<Buffer | null>): Promise<Buffer | null> {
    return wrapPromise(this.db.get(toBuffer(key)), cb)
  }

  async putRaw(key: Buffer | string, value: Buffer, cb?: Callback<void>): Promise<void> {
    return wrapEmptyPromise(this.db.put(toBuffer(key), toBuffer(value)), cb)
  }

  copy(includeCheckpoints: boolean = true): WrappedCheckpointTrie {
    const db = this._mainDB.copy()
    const trie = new WrappedCheckpointTrie(db._leveldb, this.root)
    if (includeCheckpoints && this.isCheckpoint) {
      trie._checkpoints = this._checkpoints.slice()
      trie._scratch = this._scratch!.copy()
      trie.db = trie._scratch
    }
    return trie
  }

  async checkRoot(root: Buffer, cb?: Callback<boolean | null>): Promise<boolean> {
    return wrapPromise(super.checkRoot(toBuffer(root)), cb).then((value) => !!value)
  }

  async commit(cb?: Callback<void>): Promise<void> {
    return wrapEmptyPromise(super.commit(), cb)
  }

  async revert(cb?: Callback<void>): Promise<void> {
    return wrapEmptyPromise(super.revert(), cb)
  }
}

class WrappedSecureTrie extends SecureTrie {
  async get(key: Buffer | string, cb?: Callback<Buffer | null>): Promise<Buffer | null> {
    return wrapPromise(super.get(toBuffer(key)), cb)
  }

  async put(key: Buffer | string, value: Buffer | string, cb?: Callback<void>): Promise<void> {
    return wrapEmptyPromise(super.put(toBuffer(key), toBuffer(value)), cb)
  }

  async del(key: Buffer | string, cb?: Callback<void>): Promise<void> {
    return wrapEmptyPromise(super.del(toBuffer(key)), cb)
  }

  async getRaw(key: Buffer, cb?: Callback<Buffer | null>): Promise<Buffer | null> {
    return wrapPromise(this.db.get(toBuffer(key)), cb)
  }

  async putRaw(key: Buffer | string, value: Buffer, cb?: Callback<void>): Promise<void> {
    return wrapEmptyPromise(this.db.put(toBuffer(key), toBuffer(value)), cb)
  }

  copy(includeCheckpoints: boolean = true): WrappedSecureTrie {
    const db = this._mainDB.copy()
    const trie = new WrappedSecureTrie(db._leveldb, this.root)
    if (includeCheckpoints && this.isCheckpoint) {
      trie._checkpoints = this._checkpoints.slice()
      trie._scratch = this._scratch!.copy()
      trie.db = trie._scratch
    }
    return trie
  }

  async checkRoot(root: Buffer, cb?: Callback<boolean | null>): Promise<boolean> {
    return wrapPromise(super.checkRoot(toBuffer(root)), cb).then((value) => !!value)
  }

  async commit(cb?: Callback<void>): Promise<void> {
    return wrapEmptyPromise(super.commit(), cb)
  }

  async revert(cb?: Callback<void>): Promise<void> {
    return wrapEmptyPromise(super.revert(), cb)
  }
}

export { WrappedCheckpointTrie as CheckpointTrie }
export { WrappedSecureTrie as SecureTrie }
