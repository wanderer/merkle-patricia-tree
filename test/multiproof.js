const tape = require('tape')
const promisify = require('util.promisify')
const rlp = require('rlp')
const { keccak256 } = require('ethereumjs-util')
const { Trie } = require('../dist/baseTrie')
const { SecureTrie } = require('../dist/secure')
const { LeafNode } = require('../dist/trieNode')
const { stringToNibbles } = require('../dist/util/nibbles')
const {
  decodeMultiproof, rawMultiproof, encodeMultiproof,
  decodeInstructions, flatEncodeInstructions, flatDecodeInstructions,
  verifyMultiproof, makeMultiproof, Instruction, Opcode
} = require('../dist/multiproof')

tape('decode and encode instructions', (t) => {
  t.test('rlp encoding', (st) => {
    const raw = Buffer.from('d0c20201c20405c603c403030303c28006', 'hex')
    const expected = [
      { kind: Opcode.Leaf },
      { kind: Opcode.Add, value: 5 },
      { kind: Opcode.Extension, value: [3, 3, 3, 3] },
      { kind: Opcode.Branch, value: 6 }
    ]
    const res = decodeInstructions(rlp.decode(raw))
    st.deepEqual(expected, res)
    st.end()
  })

  t.test('flat encoding', (st) => {
    const raw = Buffer.from('0204050304030303030006', 'hex')
    const instructions = [
      { kind: Opcode.Leaf },
      { kind: Opcode.Add, value: 5 },
      { kind: Opcode.Extension, value: [3, 3, 3, 3] },
      { kind: Opcode.Branch, value: 6 }
    ]
    const encoded = flatEncodeInstructions(instructions)
    st.assert(raw.equals(encoded))
    const decoded = flatDecodeInstructions(raw)
    st.deepEqual(instructions, decoded)
    st.end()
  })
})

tape('decode and encode multiproof', (t) => {
  t.test('decode and encode one leaf', (st) => {
    const raw = Buffer.from('eae1a00101010101010101010101010101010101010101010101010101010101010101c483c20102c2c102', 'hex')
    const expected = {
      hashes: [Buffer.alloc(32, 1)],
      instructions: [{ kind: Opcode.Leaf }],
      keyvals: [Buffer.from('c20102', 'hex')]
    }
    const proof = decodeMultiproof(raw)
    st.deepEqual(expected, proof)

    const encoded = encodeMultiproof(expected)
    st.assert(raw.equals(encoded))

    st.end()
  })

  t.test('decode and encode two out of three leaves with extension', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key1 = Buffer.from('1'.repeat(40), 'hex')
    const key2 = Buffer.from('2'.repeat(40), 'hex')
    const key3 = Buffer.from('1'.repeat(10).concat('3'.repeat(30)), 'hex')
    await put(key1, Buffer.from('f'.repeat(64), 'hex'))
    await put(key2, Buffer.from('e'.repeat(64), 'hex'))
    await put(key3, Buffer.from('d'.repeat(64), 'hex'))

    const keys = [key3, key1]
    const proof = await makeMultiproof(t, keys)
    const encoded = encodeMultiproof(proof)
    const decoded = decodeMultiproof(encoded)
    st.deepEqual(proof, decoded)
    st.end()
  })
})

tape('multiproof tests', (t) => {
  t.skip('hash before nested nodes in branch', (st) => {
    // TODO: Replace with valid multiproof
    const raw = Buffer.from('f876e1a01bbb8445ba6497d9a4642a114cb06b3a61ea8e49ca3853991b4f07b7e1e04892f845b843f8419f02020202020202020202020202020202020202020202020202020202020202a00000000000000000000000000000000000000000000000000000000000000000ccc20180c28001c2021fc20402', 'hex')
    const expectedRoot = Buffer.from('0d76455583723bb10c56d34cfad1fb218e692299ae2edb5dd56a950f7062a6e0', 'hex')
    const expectedInstructions = [
      { kind: Opcode.Hasher },
      { kind: Opcode.Branch, value: 1 },
      { kind: Opcode.Leaf },
      { kind: Opcode.Add, value: 2 },
    ]
    const proof = decodeMultiproof(raw)
    st.deepEqual(proof.instructions, expectedInstructions)
    st.assert(verifyMultiproof(expectedRoot, proof))
    st.end()
  })

  t.skip('two values', (st) => {
    // TODO: Replace with valid multiproof
    const raw = Buffer.from('f8c1e1a09afbad9ae00ded5a066bd6f0ec67a45d51f31c258066b997e9bb8336bc13eba8f88ab843f8419f01010101010101010101010101010101010101010101010101010101010101a00101010101010101010101010101010101010101010101010101010101010101b843f8419f02020202020202020202020202020202020202020202020202020202020202a00000000000000000000000000000000000000000000000000000000000000000d2c2021fc28001c2021fc20402c20180c20408', 'hex')
    const expectedRoot = Buffer.from('32291409ceb27a3b68b6beff58cfc41c084c0bde9e6aca03a20ce9aa795bb248', 'hex')
    const expectedInstructions = [
      { kind: Opcode.Leaf },
      { kind: Opcode.Branch, value: 1 },
      { kind: Opcode.Leaf },
      { kind: Opcode.Add, value: 2 },
      { kind: Opcode.Hasher },
      { kind: Opcode.Add, value: 8 }
    ]
    const proof = decodeMultiproof(raw)
    st.deepEqual(proof.instructions, expectedInstructions)
    st.assert(verifyMultiproof(expectedRoot, proof))
    st.end()
  })

  t.end()
})

tape('make multiproof', (t) => {
  t.test('trie with one leaf', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key = Buffer.from('1'.repeat(40), 'hex')
    await put(key, Buffer.from('ffff', 'hex'))
    const leaf = await lookupNode(t.root)

    const proof = await makeMultiproof(t, [key])
    st.deepEqual(proof, {
      hashes: [],
      keyvals: [leaf.serialize()],
      instructions: [{ kind: Opcode.Leaf }]
    })
    st.assert(verifyMultiproof(t.root, proof, [key]))
    st.end()
  })

  t.test('prove one of two leaves in trie', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key1 = Buffer.from('1'.repeat(40), 'hex')
    const key2 = Buffer.from('2'.repeat(40), 'hex')
    await put(key1, Buffer.from('f'.repeat(64), 'hex'))
    await put(key2, Buffer.from('e'.repeat(64), 'hex'))

    const proof = await makeMultiproof(t, [key1])
    st.equal(proof.hashes.length, 1)
    st.equal(proof.keyvals.length, 1)
    st.equal(proof.instructions.length, 4)
    st.assert(verifyMultiproof(t.root, proof, [key1]))
    st.end()
  })

  t.test('prove two of three leaves in trie', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key1 = Buffer.from('1'.repeat(40), 'hex')
    const key2 = Buffer.from('2'.repeat(40), 'hex')
    const key3 = Buffer.from('3'.repeat(40), 'hex')
    await put(key1, Buffer.from('f'.repeat(64), 'hex'))
    await put(key2, Buffer.from('e'.repeat(64), 'hex'))
    await put(key3, Buffer.from('d'.repeat(64), 'hex'))

    const proof = await makeMultiproof(t, [key3, key1])
    st.assert(verifyMultiproof(t.root, proof, [key1, key3]))
    st.end()
  })

  t.test('prove two of three leaves (with extension) in trie', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key1 = Buffer.from('1'.repeat(40), 'hex')
    const key2 = Buffer.from('2'.repeat(40), 'hex')
    const key3 = Buffer.from('1'.repeat(10).concat('3'.repeat(30)), 'hex')
    await put(key1, Buffer.from('f'.repeat(64), 'hex'))
    await put(key2, Buffer.from('e'.repeat(64), 'hex'))
    await put(key3, Buffer.from('d'.repeat(64), 'hex'))

    const keys = [key3, key1]
    const proof = await makeMultiproof(t, keys)
    keys.sort(Buffer.compare)
    st.assert(verifyMultiproof(t.root, proof, keys))
    st.end()
  })

  t.test('two embedded leaves in branch', async (st) => {
    const t = new Trie()
    const put = promisify(t.put.bind(t))
    const lookupNode = promisify(t._lookupNode.bind(t))
    const key1 = Buffer.from('1'.repeat(40), 'hex')
    const key2 = Buffer.from('2'.repeat(40), 'hex')
    await put(key1, Buffer.from('f'.repeat(4), 'hex'))
    await put(key2, Buffer.from('e'.repeat(4), 'hex'))

    const proof = await makeMultiproof(t, [key1])
    st.assert(verifyMultiproof(t.root, proof, [key1]))
    st.end()
  })
})

tape('fuzz multiproof generation/verification with official tests', async (t) => {
  const trietest = Object.assign({}, require('./fixture/trietest.json').tests)
  const trietestSecure = Object.assign({}, require('./fixture/trietest_secureTrie.json').tests)
  const hexEncodedTests = Object.assign({}, require('./fixture/hex_encoded_securetrie_test.json').tests)
  // Inputs of hex encoded tests are objects instead of arrays
  Object.keys(hexEncodedTests).map((k) => {
    hexEncodedTests[k].in = Object.keys(hexEncodedTests[k].in).map((key) => [key, hexEncodedTests[k].in[key]])
  })
  const testCases = [
    { name: 'jeff', secure: false, input: trietest.jeff.in, root: trietest.jeff.root },
    { name: 'jeffSecure', secure: true, input: trietestSecure.jeff.in, root: trietestSecure.jeff.root },
    { name: 'emptyValuesSecure', secure: true, input: trietestSecure.emptyValues.in, root: trietestSecure.emptyValues.root },
    { name: 'test1', secure: true, input: hexEncodedTests.test1.in, root: hexEncodedTests.test1.root },
    { name: 'test2', secure: true, input: hexEncodedTests.test2.in, root: hexEncodedTests.test2.root },
    { name: 'test3', secure: true, input: hexEncodedTests.test3.in, root: hexEncodedTests.test3.root }
  ]
  for (const testCase of testCases) {
    const testName = testCase.name
    t.comment(testName)
    const expect = Buffer.from(testCase.root.slice(2), 'hex')
    const removedKeys = {}
    // Clean inputs
    let inputs = testCase.input.map((input) => {
      const res = [null, null]
      for (i = 0; i < 2; i++) {
        if (!input[i]) continue
        if (input[i].slice(0, 2) === '0x') {
          res[i] = Buffer.from(input[i].slice(2), 'hex')
        } else {
          res[i] = Buffer.from(input[i])
        }
      }
      if (res[1] === null) {
        removedKeys[res[0].toString('hex')] = true
      }
      return res
    })

    let trie
    if (testCase.secure) {
      trie = new SecureTrie()
    } else {
      trie = new Trie()
    }
    for (let input of inputs) {
      await promisify(trie.put.bind(trie))(input[0], input[1])
    }
    t.assert(trie.root.equals(expect))

    // TODO: include keys that have been removed from trie
    const keyCombinations = getCombinations(
      inputs.map((i) => i[0]).filter((i) => removedKeys[i.toString('hex')] !== true)
    )
    for (let combination of keyCombinations) {
      // If using secure make sure to hash keys
      if (testCase.secure) {
        combination = combination.map((k) => keccak256(k))
      }
      try {
        const proof = await makeMultiproof(trie, combination)
        // Verification expects a sorted array of keys
        combination.sort(Buffer.compare)
        t.assert(verifyMultiproof(trie.root, proof, combination))
      } catch (e) {
        if (e.message !== 'Key not in trie') {
          t.fail(e)
        }
        t.comment('skipped combination because key is not in trie')
      }
    }
  }
  t.end()
})

// Given array [a, b, c], produce combinations
// with all lengths [1, arr.length]:
// [[a], [b], [c], [a, b], [a, c], [b, c], [a, b, c]]
function getCombinations(arr) {
  // Make sure there are no duplicates
  for (let i = 0; i < arr.length; i++) {
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i].equals(arr[j])) {
        arr.splice(j, 1)
      }
    }
  }

  const res = []
  const numCombinations = Math.pow(2, arr.length)
  for (let i = 0; i < numCombinations; i++) {
    const tmp = []
    for (let j = 0; j < arr.length; j++) {
      if ((i & Math.pow(2, j))) {
        tmp.push(arr[j])
      }
    }
    res.push(tmp)
  }
  return res
}
