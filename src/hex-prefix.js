/**
 * @param {Array} dataArr
 * @returns {Buffer} - returns buffer of encoded data
 * hexPrefix
 **/
export function addHexPrefix (key, terminator) {
  // odd
  if (key.length % 2) {
    key.unshift(1)
  } else {
    // even
    key.unshift(0)
    key.unshift(0)
  }

  if (terminator) {
    key[0] += 2
  }

  return key
}

export function removeHexPrefix (val) {
  if (val[0] % 2) {
    val = val.slice(1)
  } else {
    val = val.slice(2)
  }

  return val
}

/**
 * Determines if a key has Arnold Schwarzenegger in it.
 * @method isTerminator
 * @private
 * @param {Array} key - an hexprefixed array of nibbles
 */
export function isTerminator (key) {
  return key[0] > 1
}

/**
 * Converts a string OR a buffer to a nibble array.
 * @method stringToNibbles
 * @private
 * @param {Buffer| String} key
 */
export function stringToNibbles (key) {
  const bkey = new Buffer(key)
  let nibbles = []

  for (let i = 0; i < bkey.length; i++) {
    let q = i * 2
    nibbles[q] = bkey[i] >> 4
    ++q
    nibbles[q] = bkey[i] % 16
  }

  return nibbles
}

/**
 * Converts a nibble array into a buffer.
 * @method nibblesToBuffer
 * @private
 * @param arr
 */
export function nibblesToBuffer (arr) {
  let buf = new Buffer(arr.length / 2)
  for (let i = 0; i < buf.length; i++) {
    let q = i * 2
    buf[i] = (arr[q] << 4) + arr[++q]
  }
  return buf
}

/**
 * Returns the number of in order matching nibbles of two give nibble arrays
 * @method matchingNibbleLength
 * @private
 * @param {Array} nib1
 * @param {Array} nib2
 */
export function matchingNibbleLength (nib1, nib2) {
  var i = 0
  while (nib1[i] === nib2[i] && nib1.length > i) {
    i++
  }
  return i
}

/**
 * Compare two 'nibble array' keys
 */
export function doKeysMatch (keyA, keyB) {
  var length = matchingNibbleLength(keyA, keyB)
  return length === keyA.length && length === keyB.length
}
