const Trie = require('../src/secure.js')
const async = require('async')
const tape = require('tape')


tape('SecureTrie', function (t) {
  const trie = new Trie()
  const k = Buffer.from('foo')
  const v = Buffer.from('bar')

  t.test('put and get value', function (st) {
    trie.put(k, v, function () {
      trie.get(k, function (err, res) {
        st.error(err)
        st.ok(v.equals(res))
        st.end()
      })
    })
  })

  t.test('copy trie', function (st) {
    const t = trie.copy()
    t.get(k, function (err, res) {
      st.error(err)
      st.ok(v.equals(res))
      st.end()
    })
  })
})

tape('secure tests', function (it) {
  let trie = new Trie()
  const jsonTests = require('./fixture/trietest_secureTrie.json').tests

  it.test('empty values', function (t) {
    async.eachSeries(jsonTests.emptyValues.in, function (row, cb) {
      trie.put(new Buffer(row[0]), row[1], cb)
    }, function (err) {
      t.equal('0x' + trie.root.toString('hex'), jsonTests.emptyValues.root)
      t.end(err)
    })
  })

  it.test('branchingTests', function (t) {
    trie = new Trie()
    async.eachSeries(jsonTests.branchingTests.in, function (row, cb) {
      trie.put(row[0], row[1], cb)
    }, function () {
      t.equal('0x' + trie.root.toString('hex'), jsonTests.branchingTests.root)
      t.end()
    })
  })

  it.test('jeff', function (t) {
    async.eachSeries(jsonTests.jeff.in, function (row, cb) {
      var val = row[1]
      if (val) {
        val = new Buffer(row[1].slice(2), 'hex')
      }

      trie.put(new Buffer(row[0].slice(2), 'hex'), val, cb)
    }, function () {
      t.equal('0x' + trie.root.toString('hex'), jsonTests.jeff.root)
      t.end()
    })
  })
})
