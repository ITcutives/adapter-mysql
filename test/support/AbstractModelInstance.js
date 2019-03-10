/**
 * Created by ashish on 17/5/17.
 */
const path = require('path');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const proxyquire = require('proxyquire');
const loClone = require('lodash/clone');

const testMySQL = {};
proxyquire('../../src/adapter', {
  mysql: testMySQL,
});
const Model = require('../models/model');

chai.use(sinonChai);
chai.use(chaiAsPromised);

const should = chai.should();

describe('AbstractModelInstance - MySQL', () => {
  describe('constructor', () => {
    it('should leave properties as empty object if nothing is provided', () => {
      const model = new Model();
      model.properties.should.be.eql({});
    });

    it('should set properties that matches field names', () => {
      const model = new Model({ a: 1, b: 2, c: 3 });
      model.properties.should.be.eql({ a: 1, b: 2 });
    });

    it('should set nested properties (json-path) correctly', () => {
      const model = new Model({ a: 1, 'b.c': 2 });
      model.properties.should.be.deep.eql({ a: 1, b: { c: 2 } });
    });

    it('should set nested properties (json-object) correctly', () => {
      const model = new Model({ a: 1, b: { c: 2 } });
      model.properties.should.be.deep.eql({ a: 1, b: { c: 2 } });
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

    it('should only return table if database is empty', () => {
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
      model.setOriginal({ a: 1 });
      (model.original === undefined).should.be.eql(true);
    });

    it("should not set original if object type doesn't match", () => {
      const obj = new Model({ a: 1 });
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
      model = new Model({ a: 10 });
    });

    it('should return undefined for invalid field name', () => {
      should.not.exist(model.get('c'));
    });

    it('should return field value for valid', () => {
      model.get('a').should.be.eql(10);
    });
  });

  describe('conditionBuilder', () => {
    let mysql;
    const conditions = [
      {
        input: [{
          field: 'id',
          operator: 'in',
          value: {
            class: require('../models/relatives'),
            select: 'a_id',
            condition: { a_id: 'abc' },
          },
        }],
        output: {
          where: ' WHERE `id` IN (SELECT `a_id` FROM `related` WHERE `a_id` = ?)',
          args: ['abc'],
        },
      },
      {
        input: [{
          field: 'id',
          operator: 'in',
          value: {
            select: 'a_id',
            condition: { a_id: 'abc' },
          },
        }],
        output: {
          where: ' WHERE `id` IN (SELECT `a_id` FROM `table1` WHERE `a_id` = ?)',
          args: ['abc'],
        },
      },
    ];

    beforeEach(() => {
      Model.TABLE = 'table1';
      mysql = new Model({});
    });

    afterEach(() => {
      Model.TABLE = undefined;
    });

    conditions.forEach((condition) => {
      it(`should build - ${condition.output.where}`, (done) => {
        mysql.conditionBuilder(condition.input).should.be.deep.equal(condition.output);
        done();
      });
    });
  });

  describe('remove', () => {
    let model = null;

    beforeEach(() => {

    });

    it('should remove valid field', () => {
      model = new Model({ a: 10, b: 20 });
      model.remove('a');
      model.properties.should.be.eql({ b: 20 });
    });

    it('should return undefined for invalid field name', () => {
      model = new Model({ a: 10 });
      model.remove('c');
      model.properties.should.be.eql({ a: 10 });
    });

    it('should return undefined if property is not set', () => {
      model = new Model();
      delete model.properties;
      model.remove('c');
      (model.properties === undefined).should.be.eql(true);
    });
  });

  describe('rawQuery', () => {
    let mysql;
    let
      stub;
    mysql = null;

    beforeEach(() => {
      mysql = new Model({});
      stub = sinon.stub();
      stub.withArgs('SELECT * from `table1`', []).yields(null, [1, 2]);
      stub.withArgs('SELECT * from `table2`', []).yields(new Error('invalid query'));

      Model.CONN = {
        openConnection: () => Promise.resolve({ query: stub }),
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
    let mysql;
    let stub;
    mysql = null;
    const sampleCondition = { id: 123, a: 1, b: '2' };

    beforeEach(() => {
      mysql = new Model(sampleCondition);
      stub = sinon.stub(mysql, 'rawQuery');
      stub.withArgs('DELETE FROM `table1` WHERE `id` = ?', [123]).returns(Promise.resolve({ affectedRows: 1 }));
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
    let mysql;
    let stub;
    mysql = null;
    const sampleCondition = { a: 1, b: '2' };
    const sampleSelect1 = ['a', 'b'];
    const sampleSelect2 = 'a';
    const sampleOrderby1 = ['a', 'b'];
    const sampleOrderby2 = 'a';
    const output = [{ a: 1, b: '1' }, { a: 1, b: '2' }];

    const expectation = [
      new Model(output[0]),
      new Model(output[1]),
    ];
    expectation[0].setOriginal(new Model(output[0]));
    expectation[1].setOriginal(new Model(output[1]));

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
    let mysql;
    let stub;
    mysql = null;

    beforeEach(() => {
      mysql = new Model({});
      stub = sinon.stub(mysql, 'rawQuery');
      stub.withArgs('INSERT INTO `table` SET ?', { a: 1, b: 2 }).returns(Promise.resolve({ insertId: 1 }));
      stub.withArgs('INSERT INTO `table2` SET ?', { a: 1, b: 2 }).throws(new Error('mysql insert error'));
    });

    it('rawQuery responds success', (done) => {
      Model.TABLE = 'table';
      mysql.set('a', 1);
      mysql.set('b', 2);
      mysql.INSERT().then((res) => {
        res.should.be.eql(1);
        stub.should.have.callCount(1);
        done();
      });
    });

    it('rawQuery throws exception', (done) => {
      Model.TABLE = 'table2';
      mysql.set('a', 1);
      mysql.set('b', 2);
      mysql.INSERT().catch((err) => {
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
    let mysql;
    let stub;
    mysql = null;
    const sampleCondition = { a: 1, b: '2' };

    beforeEach(() => {
      mysql = new Model(sampleCondition);
      stub = sinon.stub(mysql, 'rawQuery');
      stub.withArgs('UPDATE `table1` SET `a` = ? WHERE `id` = ?', [2, '111']).returns(Promise.resolve({ changedRows: 5 }));
      stub.withArgs('UPDATE `table2` SET `a` = ? WHERE `id` = ?', [3, '222']).returns(Promise.resolve({ changedRows: 0 }));
      stub.withArgs('UPDATE `table3` SET `a` = ? WHERE `id` = ?', [3, '222']).rejects(new Error('mysql update error'));
    });

    it('rawQuery responds success', (done) => {
      Model.TABLE = 'table1';
      const original = new Model({ id: '111', a: 1, b: '2' });
      mysql.setOriginal(original);
      mysql.set('a', 2);
      mysql.UPDATE().then((res) => {
        res.should.be.eql(true);
        stub.should.have.callCount(1);
        done();
      });
    });

    it('rawQuery responds success, with no changes to database', (done) => {
      Model.TABLE = 'table2';
      const original = new Model({ id: '222', a: 1, b: '2' });
      mysql.setOriginal(original);
      mysql.set('a', 3);
      mysql.UPDATE().then((res) => {
        res.should.be.eql(false);
        stub.should.have.callCount(1);
        done();
      });
    });

    it('rawQuery throws exception', (done) => {
      Model.TABLE = 'table3';
      const original = new Model({ id: '222', a: 1, b: '2' });
      mysql.setOriginal(original);
      mysql.set('a', 3);
      mysql.UPDATE().catch((err) => {
        err.message.should.be.eql('mysql update error');
        stub.should.have.callCount(1);
        done();
      });
    });

    it("update throws exception (bad conditions) - because original don't have id", (done) => {
      Model.TABLE = 'table3';
      const original = new Model({ a: 1, b: '2' });
      mysql.setOriginal(original);
      mysql.UPDATE().should.be.rejectedWith(Error, 'bad conditions').notify(done);
      stub.should.have.callCount(0);
    });

    it("update throws exception 'invalid request (no changes)'", (done) => {
      Model.TABLE = 'table3';
      const original = new Model({ id: 1, a: 1, b: '2' });
      mysql.setOriginal(original);
      mysql.UPDATE().should.be.rejectedWith(Error, 'invalid request (no changes)').notify(done);
      stub.should.have.callCount(0);
    });
  });

  describe('serialise', () => {
    let model = null;

    it('should not make any difference if there is no property that needs serialisation', (done) => {
      const props = {
        a: 10,
        b: 20,
      };
      model = new Model(props);
      model.serialise().then(() => {
        model.properties.should.be.eql(props);
        done();
      });
    });

    it('should not modify serialised property', (done) => {
      const props = {
        a: 10,
        jsonfield: JSON.stringify({ prop: 'b' }),
      };
      model = new Model(props);
      model.serialise().then(() => {
        model.properties.should.be.eql(props);
        done();
      });
    });

    it('should convert property from JSON object to string', (done) => {
      const props = {
        a: 10,
        jsonfield: {
          prop: 'b',
        },
      };
      const expectation = loClone(props);
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
      const props = {
        a: 10,
        b: 20,
      };
      model = new Model(props);
      model.deserialise().then(() => {
        model.properties.should.be.eql(props);
        done();
      });
    });

    it('should not modify JSON object', (done) => {
      const props = {
        a: 10,
        jsonfield: { prop: 'b' },
      };
      model = new Model(props);
      model.deserialise().then(() => {
        model.properties.should.be.eql(props);
        done();
      });
    });

    it('should convert property from string to JSON object', (done) => {
      const expectation = {
        a: 10,
        jsonfield: {
          prop: 'b',
        },
      };
      const props = loClone(expectation);
      props.jsonfield = JSON.stringify(props.jsonfield);
      model = new Model(props);
      model.deserialise().then(() => {
        model.properties.should.be.eql(expectation);
        done();
      });
    });
  });

  describe('FINDLINKS', () => {
    let mysql;
    let stub;
    mysql = null;
    const output = [{ user_id: 3 }, { user_id: 4 }];

    beforeEach(() => {
      mysql = new Model({});
      stub = sinon.stub(mysql, 'rawQuery');
      stub.withArgs('SELECT `user_id` FROM user_role WHERE `role_id` = ?', [1]).returns(Promise.resolve(output));
      stub.withArgs('SELECT `role_id` FROM user_role WHERE `user_id` = ?', [1]).rejects(new Error('mysql findlinks error'));
    });

    it('should return raw results', (done) => {
      mysql.FINDLINKS('user_role', { role_id: 1 }, 'user_id').should.eventually.deep.equal(output).notify(done);
      stub.should.have.callCount(1);
    });

    it('should forward error thrown by rawQuery', (done) => {
      mysql.FINDLINKS('user_role', { user_id: 1 }, 'role_id').catch((e) => {
        e.message.should.be.eql('mysql findlinks error');
        stub.should.have.callCount(1);
        done();
      });
    });
  });

  describe('toLink', () => {
    let mysql;
    let Related;

    beforeEach(() => {
      mysql = new Model({
        id: 1,
        name: 'test',
        plan_id: '3',
      });
      Model.LINKS = [
        {
          PLURAL: 'gateways',
          LINK: 'gateway_id',
          CHILD: 'organisation_id',
          JOIN: 'credit',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'users',
          LINK: 'user_id',
          CHILD: 'organisation_id',
          JOIN: 'permission',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'relatives',
          LINK: 'organisation_id',
          TYPE: '1TOM',
          CANMODIFY: false,
        },
        {
          PLURAL: 'plans',
          LINK: 'plan_id',
          TYPE: '1TO1',
          CANMODIFY: false,
        },
      ];
      Related = require('../models/relatives');
      Related.prototype.SELECT = sinon.stub();
      Related.prototype.SELECT.withArgs({ organisation_id: 1 }, 'id').resolves([new Related({ id: 300 })]);

      mysql.FINDLINKS = sinon.stub();
      mysql.FINDLINKS.withArgs('credit', { organisation_id: 1 }, 'gateway_id').rejects(new Error('BAD Table'));
    });

    afterEach(() => {
      Model.LINKS = [];
    });

    it('should correctly process link details and handle errors when requested', (done) => {
      mysql.toLink(['relatives', 'plans', 'gateways'], path.join(__dirname, '..')).then((result) => {
        Related.prototype.SELECT.should.have.callCount(1);
        mysql.FINDLINKS.should.have.callCount(1);
        result.should.be.deep.eql({
          id: 1,
          name: 'test',
          links: {
            plans: 3,
            relatives: [300],
          },
        });
        done();
      });
    });

    it('should not do anything if link fields argument is empty', (done) => {
      mysql.toLink([], path.join(__dirname, '..')).then((result) => {
        Related.prototype.SELECT.should.have.callCount(0);
        mysql.FINDLINKS.should.have.callCount(0);
        result.should.be.deep.eql({
          id: 1,
          name: 'test',
          plan_id: '3',
          links: {},
        });
        done();
      });
    });
  });

  describe('fromLink', () => {
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'test',
        links: {
          plans: 3,
          relatives: [300],
        },
      };
      Model.LINKS = [
        {
          PLURAL: 'gateways',
          LINK: 'gateway_id',
          CHILD: 'organisation_id',
          JOIN: 'credit',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'users',
          LINK: 'user_id',
          CHILD: 'organisation_id',
          JOIN: 'permission',
          TYPE: 'MTOM',
          CANMODIFY: true,
        },
        {
          PLURAL: 'relatives',
          LINK: 'organisation_id',
          TYPE: '1TOM',
          CANMODIFY: false,
        },
        {
          PLURAL: 'plans',
          LINK: 'plan_id',
          TYPE: '1TO1',
          CANMODIFY: false,
        },
      ];
    });

    afterEach(() => {
      Model.LINKS = [];
    });

    it('should create class instance with correct fields populated from links object', (done) => {
      Model.fromLink(Model, object).then((result) => {
        result.should.be.deep.eql(new Model({ id: 1, name: 'test', plan_id: 3 }));
        done();
      });
    });

    it('should just create class instance without links populated if there is no links field', (done) => {
      Model.LINKS = [];
      Model.fromLink(Model, object).then((result) => {
        result.should.be.deep.eql(new Model({ id: 1, name: 'test' }));
        done();
      });
    });
  });
});
