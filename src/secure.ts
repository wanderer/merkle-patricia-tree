import { keccak256 } from 'ethereumjs-util'
import { CheckpointTrie } from './checkpointTrie'
import { Proof } from './baseTrie'

/**
 * You can create a secure Trie where the keys are automatically hashed
 * using **keccak256** by using `require('merkle-patricia-tree').SecureTrie`.
 * It has the same methods and constructor as `Trie`.
 * @class SecureTrie
 * @extends Trie
 * @public
 */
export class SecureTrie extends CheckpointTrie {
  constructor(...args: any) {
    super(...args)
  }

  /**
   * prove has been renamed to [[SecureTrie.createProof]].
   * @deprecated
   * @param {Trie} trie
   * @param {Buffer} key
   */
  static async prove(trie: SecureTrie, key: Buffer): Promise<Proof> {
    return this.createProof(trie, key)
  }

  /**
   * Creates a proof that can be verified using [[SecureTrie.verifyProof]].
   * @param {Trie} trie
   * @param {Buffer} key
   */
  static createProof(trie: SecureTrie, key: Buffer): Promise<Proof> {
    const hash = keccak256(key)
    return super.createProof(trie, hash)
  }

  /**
   * Verifies a proof.
   * @param {Buffer} rootHash
   * @param {Buffer} key
   * @param {Proof} proof
   * @throws If proof is found to be invalid.
   * @returns The value from the key.
   */
  static async verifyProof(rootHash: Buffer, key: Buffer, proof: Proof): Promise<Buffer | null> {
    const hash = keccak256(key)
    return super.verifyProof(rootHash, hash, proof)
  }

  /**
   * Returns a copy of the underlying trie with the interface of SecureTrie.
   * @param {boolean} includeCheckpoints - If true and during a checkpoint, the copy will contain the checkpointing metadata and will use the same scratch as underlying db.
   */
  copy(includeCheckpoints = true): SecureTrie {
    const trie = super.copy(includeCheckpoints)
    const db = trie.db.copy()
    return new SecureTrie(db._leveldb, this.root)
  }

  /**
   * Gets a value given a `key`
   * @param {Buffer} key - the key to search for
   * @returns A Promise that resolves to `Buffer` if a value was found or `null` if no value was found.
   */
  async get(key: Buffer): Promise<Buffer | null> {
    const hash = keccak256(key)
    const value = await super.get(hash)
    return value
  }

  /**
   * Stores a given `value` at the given `key`.
   * For a falsey value, use the original key to avoid double hashing the key.
   * @param {Buffer} key
   * @param {Buffer} value
   */
  async put(key: Buffer, val: Buffer): Promise<void> {
    if (!val || val.toString() === '') {
      await this.del(key)
    } else {
      const hash = keccak256(key)
      await super.put(hash, val)
    }
  }

  /**
   * Deletes a value given a `key`.
   * @param {Buffer} key
   */
  async del(key: Buffer): Promise<void> {
    const hash = keccak256(key)
    await super.del(hash)
  }
}
