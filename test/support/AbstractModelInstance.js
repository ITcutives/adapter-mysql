/**
 * Created by ashish on 17/5/17.
 */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const proxyquire = require('proxyquire');
const _clone = require('lodash/clone');
const testMySQL = {};
proxyquire('../../src/adapter', {
  mysql: testMySQL
});
const Model = require('../extras/model');

chai.use(sinonChai);
chai.use(chaiAsPromised);

let should = chai.should();

describe('AbstractModelInstance - MySQL', () => {
  describe('constructor', () => {
    it('should leave properties as empty object if nothing is provided', () => {
      let model = new Model();
      model.properties.should.be.eql({});
    });

    it('should set properties that matches field names', () => {
      let model = new Model({'a': 1, 'b': 2, 'c': 3});
      model.properties.should.be.eql({'a': 1, 'b': 2});
    });

    it('should set nested properties (json-path) correctly', () => {
      let model = new Model({'a': 1, 'b.c': 2});
      model.properties.should.be.deep.eql({'a': 1, 'b': {'c': 2}});
    });

    it('should set nested properties (json-object) correctly', () => {
      let model = new Model({'a': 1, 'b': {'c': 2}});
      model.properties.should.be.deep.eql({'a': 1, 'b': {'c': 2}});
    });
  });

  describe('getTableName', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({});
    });

    it('should have database + table if database is set in model', () => {
      Model.DATABASE = 'database1';
      Model.TABLE = 'table1';
      model.getTableName().should.be.eql('`database1`.`table1`');
    });

    it('should only return table is database is empty', () => {
      Model.DATABASE = '';
      Model.TABLE = 'table1';
      model.getTableName().should.be.eql('`table1`');
    });
  });

  describe('setOriginal', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({});
    });

    it("should not set original if object type doesn't match", () => {
      model.setOriginal({'a': 1});
      model.original.should.be.eql({});
    });

    it("should not set original if object type doesn't match", () => {
      let obj = new Model({'a': 1});
      model.setOriginal(obj);
      model.original.should.be.eql(obj);
    });
  });

  describe('set', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({});
    });

    it('should not set value if field is invalid', () => {
      model.set('c', 10);
      model.properties.should.be.eql({});
    });

    it('should set value if field is valid', () => {
      model.set('a', 10);
      model.properties.a.should.be.eql(10);
    });

    it('should set `properties` as empty object and set property', () => {
      model.properties = undefined;
      model.set('a', 10);
      model.properties.a.should.be.eql(10);
    });
  });

  describe('get', () => {
    let model = null;

    beforeEach(() => {
      model = new Model({'a': 10});
    });

    it('should return undefined for invalid field name', () => {
      should.not.exist(model.get('c'));
    });

    it('should return field value for valid', () => {
      model.get('a').should.be.eql(10);
    });
  });

  describe('remove', () => {
    let model = null;

    beforeEach(() => {

    });

    it('should remove valid field', () => {
      model = new Model({'a': 10, 'b': 20});
      model.remove('a');
      model.properties.should.be.eql({'b': 20});
    });

    it('should return undefined for invalid field name', () => {
      model = new Model({'a': 10});
      model.remove('c');
      model.properties.should.be.eql({'a': 10});
    });

    it('should return undefined if property is not set', () => {
      model = new Model();
      delete model.properties;
      model.remove('c');
      (model.properties === undefined).should.be.eql(true);
    });
  });

  describe('rawQuery', () => {
    let mysql, stub;
    mysql = null;

    beforeEach(() => {
      mysql = new Model({});
      stub = sinon.stub();
      stub.withArgs('SELECT * from `table1`', []).yields(null, [1, 2]);
      stub.withArgs('SELECT * from `table2`', []).yields(new Error('invalid query'));

      Model.CONN = {
        'openConnection': () => {
          return Promise.resolve({'query': stub});
        }
      };
    });

    it('rawQuery responds success', (done) => {
      mysql.rawQuery('SELECT * from `table1`', []).should.eventually.deep.equal([1, 2]).notify(done);
    });

    it('rawQuery throws error', (done) => {
      mysql.rawQuery('SELECT * from `table2`', []).should.be.rejectedWith(Error, 'invalid query').notify(done);
    });
  });

  describe('DELETE', () => {
    let mysql, stub, sampleCondition;
    mysql = null;
    sampleCondition = {'id': 123, 'a': 1, 'b': '2'};

    beforeEach(() => {
      mysql = new Model(sampleCondition);
      stub = sinon.stub(mysql, 'rawQuery');
      stub.withArgs('DELETE FROM `table1` WHERE `id` = ?', [123]).returns(Promise.resolve({affectedRows: 1}));
      stub.withArgs('DELETE FROM `table2` WHERE `id` = ?', [123]).rejects(new Error('mysql delete error'));
    });

    it('rawQuery responds success', (done) => {
      Model.TABLE = 'table1';
      mysql.DELETE().should.eventually.equal(true).notify(done);
      stub.should.have.callCount(1);
    });

    it('rawQuery throws exception', (done) => {
      Model.TABLE = 'table2';
      mysql.DELETE().should.be.rejectedWith(Error, 'mysql delete error').notify(done);
      stub.should.have.callCount(1);
    });

    it('delete throws exception (no condition)', (done) => {
      Model.TABLE = 'table2';
      delete mysql.properties;
      mysql.DELETE().should.be.rejectedWith(Error, 'invalid request (no condition)').notify(done);
      stub.should.have.callCount(0);
    });
  });

  describe('SELECT', () => {
    let mysql, stub, sampleCondition, sampleSelect1, sampleSelect2, sampleOrderby1, sampleOrderby2, output, expectation;
    mysql = null;
    sampleCondition = {'a': 1, 'b': '2'};
    sampleSelect1 = ['a', 'b'];
    sampleSelect2 = 'a';
    sampleOrderby1 = ['a', 'b'];
    sampleOrderby2 = 'a';
    output = [{'a': 1, 'b': '1'}, {'a': 1, 'b': '2'}];
    expectation = [new Model(output[0]), new Model(output[1])];

    beforeEach(() => {
      mysql = new Model({});
      stub = sinon.stub(mysql, 'rawQuery');
      stub.withArgs('SELECT * FROM `table1`', []).returns(Promise.resolve(output));
      stub.withArgs('SELECT * FROM `table2` WHERE `a` = ? AND `b` = ?', [1, '2']).returns(Promise.resolve([output[1]]));
      stub.withArgs('SELECT `a`, `b` FROM `table3` WHERE `a` = ? AND `b` = ?', [1, '2']).returns(Promise.resolve([output[1]]));
      stub.withArgs('SELECT `a` FROM `table4` WHERE `a` = ? AND `b` = ? ORDER BY `a` ASC, `b` ASC', [1, '2']).returns(Promise.resolve([output[1]]));
      stub.withArgs('SELECT `a` FROM `table5` WHERE `a` = ? AND `b` = ? ORDER BY `a`', [1, '2']).returns(Promise.resolve([output[1]]));
      stub.withArgs('SELECT * FROM `table6` WHERE `a` = ? AND `b` = ?', [1, '2']).rejects(new Error('mysql select error'));
    });

    it('should select all rows of table', (done) => {
      Model.TABLE = 'table1';
      mysql.SELECT()
        .should.eventually.deep.equal(expectation).notify(done);
      stub.should.have.callCount(1);
    });

    it('should select all fields where it matches condition', (done) => {
      Model.TABLE = 'table2';
      mysql.SELECT(sampleCondition)
        .should.eventually.deep.equal([expectation[1]]).notify(done);
      stub.should.have.callCount(1);
    });

    it('should select some fields where it matches condition', (done) => {
      Model.TABLE = 'table3';
      mysql.SELECT(sampleCondition, sampleSelect1)
        .should.eventually.deep.equal([expectation[1]]).notify(done);
      stub.should.have.callCount(1);
    });

    it('should select some fields where it matches condition and order by multiple fields', (done) => {
      Model.TABLE = 'table4';
      mysql.SELECT(sampleCondition, sampleSelect2, sampleOrderby1)
        .should.eventually.deep.equal([expectation[1]]).notify(done);
      stub.should.have.callCount(1);
    });

    it('should select some fields where it matches condition and order by one field', (done) => {
      Model.TABLE = 'table5';
      mysql.SELECT(sampleCondition, sampleSelect2, sampleOrderby2)
        .should.eventually.deep.equal([expectation[1]]).notify(done);
      stub.should.have.callCount(1);
    });

    it('rawQuery throws exception', (done) => {
      Model.TABLE = 'table6';
      mysql.SELECT(sampleCondition)
        .should.be.rejectedWith(Error, 'mysql select error').notify(done);
      stub.should.have.callCount(1);
    });
  });

  describe('INSERT', () => {
    let mysql, stub;
    mysql = null;

    beforeEach(() => {
      mysql = new Model({});
      stub = sinon.stub(mysql, 'rawQuery');
      stub.withArgs('INSERT INTO `table` SET ?', {a: 1, b: 2}).returns(Promise.resolve({insertId: 1}));
      stub.withArgs('INSERT INTO `table2` SET ?', {a: 1, b: 2}).throws(new Error('mysql insert error'));
    });

    it('rawQuery responds success', (done) => {
      Model.TABLE = 'table';
      mysql.set('a', 1);
      mysql.set('b', 2);
      mysql.INSERT().then(res => {
        res.should.be.eql(1);
        stub.should.have.callCount(1);
        done();
      });
    });

    it('rawQuery throws exception', (done) => {
      Model.TABLE = 'table2';
      mysql.set('a', 1);
      mysql.set('b', 2);
      mysql.INSERT().catch(err => {
        err.message.should.be.eql('mysql insert error');
        stub.should.have.callCount(1);
        done();
      });
    });

    it("rawQuery throws exception 'invalid request (empty values)'", (done) => {
      Model.TABLE = 'table2';
      mysql.INSERT().should.be.rejectedWith(Error, 'invalid request (empty values)').notify(done);
    });
  });

  describe('UPDATE', () => {
    let mysql, stub, sampleCondition;
    mysql = null;
    sampleCondition = {'a': 1, 'b': '2'};

    beforeEach(() => {
      mysql = new Model(sampleCondition);
      stub = sinon.stub(mysql, 'rawQuery');
      stub.withArgs('UPDATE `table1` SET `a` = ? WHERE `id` = ?', [2, '111']).returns(Promise.resolve({changedRows: 5}));
      stub.withArgs('UPDATE `table2` SET `a` = ? WHERE `id` = ?', [3, '222']).returns(Promise.resolve({changedRows: 0}));
      stub.withArgs('UPDATE `table3` SET `a` = ? WHERE `id` = ?', [3, '222']).rejects(new Error('mysql update error'));
    });

    it('rawQuery responds success', (done) => {
      Model.TABLE = 'table1';
      let original = new Model({'id': '111', 'a': 1, 'b': '2'});
      mysql.setOriginal(original);
      mysql.set('a', 2);
      mysql.UPDATE().then(res => {
        res.should.be.eql(true);
        stub.should.have.callCount(1);
        done();
      });
    });

    it('rawQuery responds success, with no changes to database', (done) => {
      Model.TABLE = 'table2';
      let original = new Model({'id': '222', 'a': 1, 'b': '2'});
      mysql.setOriginal(original);
      mysql.set('a', 3);
      mysql.UPDATE().then(res => {
        res.should.be.eql(false);
        stub.should.have.callCount(1);
        done();
      });
    });

    it('rawQuery throws exception', (done) => {
      Model.TABLE = 'table3';
      let original = new Model({'id': '222', 'a': 1, 'b': '2'});
      mysql.setOriginal(original);
      mysql.set('a', 3);
      mysql.UPDATE().catch(err => {
        err.message.should.be.eql('mysql update error');
        stub.should.have.callCount(1);
        done();
      });
    });

    it("update throws exception (bad conditions) - because original don't have id", (done) => {
      Model.TABLE = 'table3';
      let original = new Model({'a': 1, 'b': '2'});
      mysql.setOriginal(original);
      mysql.UPDATE().should.be.rejectedWith(Error, 'bad conditions').notify(done);
      stub.should.have.callCount(0);
    });

    it("update throws exception 'invalid request (no changes)'", (done) => {
      Model.TABLE = 'table3';
      let original = new Model({'id': 1, 'a': 1, 'b': '2'});
      mysql.setOriginal(original);
      mysql.UPDATE().should.be.rejectedWith(Error, 'invalid request (no changes)').notify(done);
      stub.should.have.callCount(0);
    });
  });

  describe('serialise', () => {
    let model = null;

    it('should not make any difference if there is no property that needs serialisation', (done) => {
      let props = {
        'a': 10,
        'b': 20
      };
      model = new Model(props);
      model.serialise().then(() => {
        model.properties.should.be.eql(props);
        done();
      });
    });

    it('should not modify serialised property', (done) => {
      let props = {
        'a': 10,
        'jsonfield': JSON.stringify({'prop': 'b'})
      };
      model = new Model(props);
      model.serialise().then(() => {
        model.properties.should.be.eql(props);
        done();
      });
    });

    it('should convert property from JSON object to string', (done) => {
      let props, expectation;
      props = {
        'a': 10,
        'jsonfield': {
          'prop': 'b'
        }
      };
      expectation = _clone(props);
      expectation.jsonfield = JSON.stringify(expectation.jsonfield);
      model = new Model(props);
      model.serialise().then(() => {
        model.properties.should.be.eql(expectation);
        done();
      });
    });
  });

  describe('deserialise', () => {
    let model = null;

    it('should not make any difference if there is no property that needs deserialisation', (done) => {
      let props = {
        'a': 10,
        'b': 20
      };
      model = new Model(props);
      model.deserialise().then(() => {
        model.properties.should.be.eql(props);
        done();
      });
    });

    it('should not modify JSON object', (done) => {
      let props = {
        'a': 10,
        'jsonfield': {'prop': 'b'}
      };
      model = new Model(props);
      model.deserialise().then(() => {
        model.properties.should.be.eql(props);
        done();
      });
    });

    it('should convert property from string to JSON object', (done) => {
      let expectation, props;
      expectation = {
        'a': 10,
        'jsonfield': {
          'prop': 'b'
        }
      };
      props = _clone(expectation);
      props.jsonfield = JSON.stringify(props.jsonfield);
      model = new Model(props);
      model.deserialise().then(() => {
        model.properties.should.be.eql(expectation);
        done();
      });
    });
  });

  describe('FINDLINKS', () => {
    let mysql, stub, output;
    mysql = null;
    output = [{'user_id': 3}, {'user_id': 4}];

    beforeEach(() => {
      mysql = new Model({});
      stub = sinon.stub(mysql, 'rawQuery');
      stub.withArgs('SELECT `user_id` FROM user_role WHERE `role_id` = ?', [1]).returns(Promise.resolve(output));
      stub.withArgs('SELECT `role_id` FROM user_role WHERE `user_id` = ?', [1]).rejects(new Error('mysql findlinks error'));
    });

    it('should return raw results', (done) => {
      mysql.FINDLINKS('user_role', {'role_id': 1}, 'user_id').should.eventually.deep.equal(output).notify(done);
      stub.should.have.callCount(1);
    });

    it('should forward error thrown by rawQuery', (done) => {
      mysql.FINDLINKS('user_role', {'user_id': 1}, 'role_id').catch(e => {
        e.message.should.be.eql('mysql findlinks error');
        stub.should.have.callCount(1);
        done();
      });
    });
  });
});
