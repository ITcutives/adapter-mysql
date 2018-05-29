/**
 * Created by ashish on 17/5/17.
 */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');

const Abstract = require('../src/abstract');

chai.use(sinonChai);
chai.use(chaiAsPromised);

chai.should();

Abstract.FIELDS = ['id', 'a', 'b', 'jsonfield'];

describe('abstract', () => {
  describe('constructor', () => {
    it('should set properties that matches field names', () => {
      let model = new Abstract({'a': 1, 'b': 2, 'c': 3});
      model.properties.should.be.eql({'a': 1, 'b': 2});
    });

    it('should set nested properties (json-path) correctly', () => {
      let model = new Abstract({'a': 1, 'b.c': 2});
      model.properties.should.be.deep.eql({'a': 1});
    });

    it('should set nested properties (json-object) correctly', () => {
      let model = new Abstract({'a': 1, 'b': {'c': 2}});
      model.properties.should.be.deep.eql({'a': 1, 'b': {'c': 2}});
    });
  });

  describe('debug', () => {
    let spy;

    beforeEach(() => {
      spy = sinon.spy(console, 'log');
    });

    afterEach(() => {
      console.log.restore();
    });

    it('should log message when debug flag is true', () => {
      process.env.debug = 'true';
      Abstract.debug('hello');
      spy.should.have.callCount(1);
    });

    it('should not log message when debug flag is false', () => {
      process.env.debug = false;
      Abstract.debug('hello');
      spy.should.have.callCount(0);
    });

    it('should not log message when environment variable is not set', () => {
      process.env.debug = undefined;
      Abstract.debug('hello');
      spy.should.have.callCount(0);
    });
  });

  describe('query', () => {
    let a;
    beforeEach(() => {
      a = new Abstract();
    });

    it('should throw exception', () => {
      (function() {
        a.query();
      }).should.throw('[adapter] `query` method not implemented');
    });
  });

  describe('getTableName', () => {
    let a;

    beforeEach(() => {
      a = new Abstract();
    });

    it('should throw exception', () => {
      (function() {
        a.getTableName();
      }).should.throw('[adapter] `getTableName` method not implemented');
    });
  });

  describe('SELECT', () => {
    let a;

    beforeEach(() => {
      a = new Abstract();
    });

    it('should throw exception', () => {
      (function() {
        a.SELECT();
      }).should.throw('[adapter] `SELECT` method not implemented');
    });
  });

  describe('INSERT', () => {
    let a;

    beforeEach(() => {
      a = new Abstract();
    });

    it('should throw exception', () => {
      (function() {
        a.INSERT();
      }).should.throw('[adapter] `INSERT` method not implemented');
    });
  });

  describe('UPDATE', () => {
    let a;

    beforeEach(() => {
      a = new Abstract();
    });

    it('should throw exception', () => {
      (function() {
        a.UPDATE();
      }).should.throw('[adapter] `UPDATE` method not implemented');
    });
  });

  describe('DELETE', () => {
    let a;

    beforeEach(() => {
      a = new Abstract();
    });

    it('should throw exception', () => {
      (function() {
        a.DELETE();
      }).should.throw('[adapter] `DELETE` method not implemented');
    });
  });

  describe('FINDLINKS', () => {
    let a;

    beforeEach(() => {
      a = new Abstract();
    });

    it('should throw exception', () => {
      (function() {
        a.FINDLINKS();
      }).should.throw('[adapter] `FINDLINKS` method not implemented');
    });
  });

  describe('DELETELINK', () => {
    let a;

    beforeEach(() => {
      a = new Abstract();
    });

    it('should throw exception', () => {
      (function() {
        a.DELETELINK();
      }).should.throw('[adapter] `DELETELINK` method not implemented');
    });
  });

  describe('SAVELINK', () => {
    let a;

    beforeEach(() => {
      a = new Abstract();
    });

    it('should throw exception', () => {
      (function() {
        a.SAVELINK();
      }).should.throw('[adapter] `SAVELINK` method not implemented');
    });
  });
});
