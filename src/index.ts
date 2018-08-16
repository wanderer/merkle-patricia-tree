import {rejects} from 'assert';
import {resolve} from 'url';

const original = require('./index_original');

interface OriginalTree {
  root: Buffer;
  put: (key: string, val: Buffer, callback: (err: string) => void) => void;
  get: (key: string, callback: (err: string, val: Buffer|null) => void) => void;
  del: (key: string, callback: (err: string) => void) => void;
}

/** A Merkle Patricia Tree, as defined in the Ethereum Yellow Paper. */
export class MerklePatriciaTree {
  /** The original tree. */
  private originalTree: OriginalTree;

  /**
   * A buffer representing the root hash of the tree. Always 256-bits (32
   * bytes).
   */
  get root(): Buffer {
    return this.originalTree.root;
  }

  /** Construct a new Merkle Patricia Tree. */
  constructor() {
    this.originalTree = new original();
  }

  /**
   * Insert a new mapping into the tree. If the key is already mapped in the
   * tree, it is updated with the new value.
   *
   * @param key   The key to insert.
   * @param val   A buffer representing the value.
   *
   * @returns     A promise, resolved when the put is completed.
   */
  put(key: string, val: Buffer): Promise<void> {
    return new Promise((resolve, reject) => {
      this.originalTree.put(key, val, (err: string) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Given a key, retrieve the previously mapped value, or null, if no mappping
   * exists.
   *
   * @param key   The key to retrieve the value for.
   *
   * @returns     A promise, containing the value if it exists, or null, if no
   * value was previously mapped to key.
   */
  get(key: string): Promise<Buffer|null> {
    return new Promise((resolve, reject) => {
      this.originalTree.get(key, (err: string, val: Buffer|null) => {
        if (err) {
          reject(err);
        } else {
          resolve(val);
        }
      });
    });
  }

  /**
   * Given a key, delete any mapping that exists for that key.
   *
   * @param key   The key to unmap.
   *
   * @returns     A promise, resolved when the key is unmapped.
   */
  del(key: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.originalTree.del(key, (err: string) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}