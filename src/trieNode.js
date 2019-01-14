const rlp = require('rlp')
const ethUtil = require('ethereumjs-util')

module.exports = class TrieNode {
  constructor (type, key, value) {
    if (Array.isArray(type)) {
      // parse raw node
      this.parseNode(type)
    } else {
      this.type = type
      if (type === 'branch') {
        var values = key
        this.raw = Array.apply(null, Array(17))
        if (values) {
          values.forEach(function (keyVal) {
            this.set.apply(this, keyVal)
          })
        }
      } else {
        this.raw = Array(2)
        this.setValue(value)
        this.setKey(key)
      }
    }
  }

  /**
   * @param {Array} dataArr
   * @returns {Buffer} - returns buffer of encoded data
   * hexPrefix
   **/
  static addHexPrefix (key, terminator) {
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

  static removeHexPrefix (val) {
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
  static isTerminator (key) {
    return key[0] > 1
  }

  /**
   * Converts a string OR a buffer to a nibble array.
   * @method stringToNibbles
   * @private
   * @param {Buffer| String} key
   */
  static stringToNibbles (key) {
    var bkey = new Buffer(key)
    var nibbles = []

    for (var i = 0; i < bkey.length; i++) {
      var q = i * 2
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
  static nibblesToBuffer (arr) {
    var buf = new Buffer(arr.length / 2)
    for (var i = 0; i < buf.length; i++) {
      var q = i * 2
      buf[i] = (arr[q] << 4) + arr[++q]
    }
    return buf
  }

  /**
   * Determines the node type.
   * @private
   * @returns {String} - the node type
   *   - leaf - if the node is a leaf
   *   - branch - if the node is a branch
   *   - extention - if the node is an extention
   *   - unknown - if something else got borked
   */
  static getNodeType (node) {
    if (node.length === 17) {
      return 'branch'
    } else if (node.length === 2) {
      var key = this.stringToNibbles(node[0])
      if (this.isTerminator(key)) {
        return 'leaf'
      }

      return 'extention'
    }
  }

  static isRawNode (node) {
    return Array.isArray(node) && !Buffer.isBuffer(node)
  }

  get value () {
    return this.getValue()
  }

  set value (v) {
    this.setValue(v)
  }

  get key () {
    return this.getKey()
  }

  set key (k) {
    this.setKey(k)
  }

  parseNode (rawNode) {
    this.raw = rawNode
    this.type = TrieNode.getNodeType(rawNode)
  }

  setValue (key, value) {
    if (this.type !== 'branch') {
      this.raw[1] = key
    } else {
      if (arguments.length === 1) {
        value = key
        key = 16
      }
      this.raw[key] = value
    }
  }

  getValue (key) {
    if (this.type === 'branch') {
      if (arguments.length === 0) {
        key = 16
      }

      var val = this.raw[key]
      if (val !== null && val !== undefined && val.length !== 0) {
        return val
      }
    } else {
      return this.raw[1]
    }
  }

  setKey (key) {
    if (this.type !== 'branch') {
      if (Buffer.isBuffer(key)) {
        key = TrieNode.stringToNibbles(key)
      } else {
        key = key.slice(0) // copy the key
      }

      key = TrieNode.addHexPrefix(key, this.type === 'leaf')
      this.raw[0] = TrieNode.nibblesToBuffer(key)
    }
  }

  getKey () {
    if (this.type !== 'branch') {
      var key = this.raw[0]
      key = TrieNode.removeHexPrefix(TrieNode.stringToNibbles(key))
      return (key)
    }
  }

  serialize () {
    return rlp.encode(this.raw)
  }

  hash () {
    return ethUtil.sha3(this.serialize())
  }

  toString () {
    var out = this.type
    out += ': ['
    this.raw.forEach(function (el) {
      if (Buffer.isBuffer(el)) {
        out += el.toString('hex') + ', '
      } else if (el) {
        out += 'object, '
      } else {
        out += 'empty, '
      }
    })
    out = out.slice(0, -2)
    out += ']'
    return out
  }

  getChildren () {
    var children = []
    switch (this.type) {
      case 'leaf':
        // no children
        break
      case 'extention':
        // one child
        children.push([this.key, this.getValue()])
        break
      case 'branch':
        for (var index = 0, end = 16; index < end; index++) {
          var value = this.getValue(index)
          if (value) {
            children.push([
              [index], value
            ])
          }
        }
        break
    }
    return children
  }
}
