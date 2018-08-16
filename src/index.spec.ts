import 'mocha';

import * as chai from 'chai';
import * as path from 'path';

import {MerklePatriciaTree} from './index';

// Needed for should.not.be.undefined.
/* tslint:disable:no-unused-expression */

chai.should();
const should = chai.should();

describe('Try original simple-save-retrieve', async () => {
  const tree: MerklePatriciaTree = new MerklePatriciaTree();

  const one = Buffer.from('one');
  const two = Buffer.from('two');

  it('should save a value', async () => {
    await tree.put('test', one);
  });

  it('should get a value', async () => {
    const val = await tree.get('test');
    should.exist(val);
    val!.should.deep.equal(one);
  });

  it('should update a value', async () => {
    await tree.put('test', two);
    const val = await tree.get('test');
    should.exist(val);
    val!.should.deep.equal(two);
  });

  it('should delete value', async () => {
    await tree.del('test');
    should.not.exist(await tree.get('test'));
  });

  it('should recreate value', async () => {
    await tree.put('test', one);
  });

  it('should get updated value', async () => {
    const val = await tree.get('test');
    should.exist(val);
    val!.should.deep.equal(one);
  });

  it('should create a branch', async () => {
    await tree.put('doge', Buffer.from('coin'));
    tree.root.toString('hex').should.equal(
        'de8a34a8c1d558682eae1528b47523a483dd8685d6db14b291451a66066bf0fc');
  });

  it('should get a value in a branch', async () => {
    const val = await tree.get('doge');
    should.exist(val);
    val!.should.deep.equal(Buffer.from('coin'));
  });

  it('should delete from a branch', async () => {
    await tree.del('doge');
    should.not.exist(await tree.get('doge'));
  });
});


describe('Try original storing larger values', async () => {
  const tree: MerklePatriciaTree = new MerklePatriciaTree();

  const longString = 'this will be a really really really long value';
  const longStringRoot =
      'b173e2db29e79c78963cff5196f8a983fbe0171388972106b114ef7f5c24dfa3';

  it('should store a larger string', async () => {
    await tree.put('done', Buffer.from(longString));
    await tree.put('doge', Buffer.from('coin'));
    tree.root.toString('hex').should.equal(longStringRoot);
  });

  it('should retrieve longer values', async () => {
    const val = await tree.get('done');
    should.exist(val);
    val!.should.deep.equal(Buffer.from(longString));
  });

  it('should be able to update older values', async () => {
    await tree.put('done', Buffer.from('test'));
    const val = await tree.get('done');
    val!.should.deep.equal(Buffer.from('test'));
  });
});


describe('Try original extensions and branches', async () => {
  const tree: MerklePatriciaTree = new MerklePatriciaTree();

  it('should store a value', async () => {
    await tree.put('doge', Buffer.from('coin'));
  });

  it('should create an extension', async () => {
    await tree.put('do', Buffer.from('verb'));
    tree.root.toString('hex').should.equal(
        'f803dfcb7e8f1afd45e88eedb4699a7138d6c07b71243d9ae9bff720c99925f9');
  });

  it('should store a new value in the extension', async () => {
    await tree.put('done', Buffer.from('finished'));
    tree.root.toString('hex').should.equal(
        '409cff4d820b394ed3fb1cd4497bdd19ffa68d30ae34157337a7043c94a3e8cb');
  });
});