/**
 * Prepends hex prefix to an array of nibbles.
 * @method addHexPrefix
 * @param {Array} Array of nibbles
 * @returns {Array} - returns buffer of encoded data
 **/
export function addHexPrefix(key: number[], terminator: boolean): number[] {
  const res = key.slice()
  // odd
  if (res.length % 2) {
    res.unshift(1)
  } else {
    // even
    res.unshift(0)
    res.unshift(0)
  }

  if (terminator) {
    res[0] += 2
  }

  return res
}

/**
 * Removes hex prefix of an array of nibbles.
 * @method removeHexPrefix
 * @param {Array} Array of nibbles
 * @private
 */
export function removeHexPrefix(val: number[]): number[] {
  let res = val.slice()

  if (res[0] % 2) {
    res = val.slice(1)
  } else {
    res = val.slice(2)
  }

  return res
}

/**
 * Returns true if hexprefixed path is for a terminating (leaf) node.
 * @method isTerminator
 * @param {Array} key - an hexprefixed array of nibbles
 * @private
 */
export function isTerminator(key: number[]): boolean {
  return key[0] > 1
}
