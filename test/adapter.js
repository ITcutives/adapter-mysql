/**
 * Created by ashish on 17/5/17.
 */
const chai = require('chai');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const proxyquire = require('proxyquire');
const testMySQL = {};
const Adapter = proxyquire('../src/adapter', {
  mysql: testMySQL
});

chai.use(sinonChai);
chai.use(chaiAsPromised);

chai.should();

describe('mysql', () => {
  describe('getSelectFields', () => {
    it('should place tilde around field names', (done) => {
      let fields = [
        'a',
        'b',
        'c'
      ];
      Adapter.getSelectFields(fields).should.be.eql('`a`, `b`, `c`');
      done();
    });

    it("should handle 'as' in array correctly", (done) => {
      let fields = [
        'a as aa',
        'b',
        'c'
      ];
      Adapter.getSelectFields(fields).should.be.eql('`a` as `aa`, `b`, `c`');
      done();
    });

    it('should handle empty field list correctly', (done) => {
      let fields = [];
      Adapter.getSelectFields(fields).should.be.eql('*');
      done();
    });

    it('should handle * correctly', (done) => {
      let fields = '*';
      Adapter.getSelectFields(fields).should.be.eql('*');
      done();
    });

    it("should handle 'as' in array correctly", (done) => {
      let fields = 'a as aa';
      Adapter.getSelectFields(fields).should.be.eql('`a` as `aa`');
      done();
    });

    it('should handle json fields correctly', (done) => {
      let fields = 'a.b.c';
      Adapter.getSelectFields(fields).should.be.eql('`a`->>"$.b.c" as `a.b.c`');
      done();
    });
  });

  describe('getOrderByFields', () => {
    it('should handle simple array', (done) => {
      let order = ['a', 'b', 'c'];
      Adapter.getOrderByFields(order).should.be.eql(' ORDER BY `a` ASC, `b` ASC, `c` ASC');
      done();
    });

    it('should handle object properly', (done) => {
      let order = {'a': 'asc', 'b': 'desc'};
      Adapter.getOrderByFields(order).should.be.eql(' ORDER BY `a` asc, `b` desc');
      done();
    });

    it('should handle simple value', (done) => {
      let order = 'a';
      Adapter.getOrderByFields(order).should.be.eql(' ORDER BY `a`');
      done();
    });

    it('should properly handle empty (undefined) value', (done) => {
      Adapter.getOrderByFields().should.be.eql('');
      done();
    });

    it('should properly handle empty (undefined) value', (done) => {
      let order = {'a': '', 'b': 'desc'};
      Adapter.getOrderByFields(order).should.be.eql(' ORDER BY `a`, `b` desc');
      done();
    });

    it('should properly handle empty (empty array) value', (done) => {
      let order = [];
      Adapter.getOrderByFields(order).should.be.eql('');
      done();
    });

    it('should properly handle negative/positive notation for ascending/descending', (done) => {
      let order = ['a', '-b'];
      Adapter.getOrderByFields(order).should.be.eql(' ORDER BY `a` ASC, `b` DESC');
      done();
    });
  });

  describe('getLimit', () => {
    it('should handle empty value (from: null) properly', (done) => {
      let from, limit;
      from = null;
      limit = 100;
      Adapter.getLimit(from, limit).should.be.eql('');
      done();
    });

    it('should handle empty value (from: undefined) properly', (done) => {
      let from, limit;
      limit = 100;
      Adapter.getLimit(from, limit).should.be.eql('');
      done();
    });

    it('should use default limit value', (done) => {
      let from = 100;
      Adapter.getLimit(from).should.be.eql(' LIMIT 100, ' + Adapter.PAGESIZE);
      done();
    });

    it('should use provided limit value', (done) => {
      let from, limit;
      from = 10;
      limit = 27;
      Adapter.getLimit(from, limit).should.be.eql(' LIMIT 10, 27');
      done();
    });
  });

  describe('filterValues', () => {
    it('should discard invalid field values', (done) => {
      let fields, values, result;
      fields = ['a', 'b', 'c', 'd'];
      values = {'a': 'aa', 'e': 'ee'};
      result = {keys: ['`a` = ?'], values: ['aa']};
      Adapter.filterValues(fields, values).should.be.deep.eql(result);
      done();
    });

    it('should handle basic values', (done) => {
      let fields, values, result;
      fields = ['a', 'b', 'c', 'd'];
      values = {'a': 'aa', 'b': () => "'abc'"};
      result = {keys: ['`a` = ?', "`b` = 'abc'"], values: ['aa']};
      Adapter.filterValues(fields, values).should.be.deep.eql(result);
      done();
    });
  });

  describe('conditionBuilder', () => {
    let mysql, conditions;
    mysql = null;
    conditions = [
      {
        'input': {
          'a': 1,
          'b': 2,
          'c': {
            'field': 'c',
            'operator': 'in',
            'value': [3, '4', 'x']
          }
        },
        'output': {
          'where': ' WHERE `a` = ? AND `b` = ? AND `c` IN (?, ?, ?)',
          'args': [1, 2, 3, '4', 'x']
        }
      },
      {
        'input': {
          'a': 1,
          'b.c': 2,
          'c': {
            'field': 'c.d',
            'operator': 'in',
            'value': [3, '4', 'x']
          }
        },
        'output': {
          'where': ' WHERE `a` = ? AND `b`->>"$.c" = ? AND `c`->>"$.d" IN (?, ?, ?)',
          'args': [1, 2, 3, '4', 'x']
        }
      },
      {
        'input': {
          'a': 1,
          'b': 2,
          'c': {
            'field': 'c',
            'operator': 'in',
            'value': 'a'
          }
        },
        'output': {
          'where': ' WHERE `a` = ? AND `b` = ? AND `c` IN (?)',
          'args': [1, 2, 'a']
        }
      },
      {
        'input': {
          'a': 1,
          'b': 2,
          'c': {
            'field': 'c',
            'operator': 'not in',
            'value': 'a'
          }
        },
        'output': {
          'where': ' WHERE `a` = ? AND `b` = ? AND `c` NOT IN (?)',
          'args': [1, 2, 'a']
        }
      },
      {
        'input': [
          {
            'field': 'a',
            'value': 1
          },
          {
            'field': 'b',
            'operator': '!=',
            'value': '2',
            'condition': 'OR'
          }
        ],
        'output': {
          'where': ' WHERE `a` = ? OR `b` != ?',
          'args': [1, '2']
        }
      },
      {
        'input': [
          {
            'field': 'c',
            'operator': '=',
            'value': null
          },
          {
            'field': 'd',
            'operator': '!=',
            'value': null,
            'condition': 'AND'
          }
        ],
        'output': {
          'where': ' WHERE `c`  IS NULL AND `d`  IS NOT NULL',
          'args': []
        }
      },
      {
        'input': [
          {
            'field': 'x',
            'operator': 'between',
            'value': [10, 20]
          },
          {
            'field': 'y',
            'operator': 'regexp',
            'value': '/find/',
            'condition': 'OR'
          }
        ],
        'output': {
          'where': ' WHERE `x` BETWEEN (?, ?) OR `y` REGEXP ?',
          'args': [10, 20, '/find/']
        }
      },
      {
        'input': [
          {
            'field': 'x',
            'operator': 'like',
            'value': '%abc%'
          }
        ],
        'output': {
          'where': " WHERE `x` LIKE '%abc%'",
          'args': []
        }
      },
      {
        'input': null,
        'output': {
          'where': '',
          'args': []
        }
      },
      {
        'input': [{
          'field': 'id',
          'operator': 'in',
          'value': {
            'table': 'joinTable',
            'select': 'a_id',
            'condition': {'a_id': 'abc'}
          }
        }],
        'output': {
          'where': ' WHERE `id` IN (SELECT `a_id` FROM `joinTable` WHERE `a_id` = ?)',
          'args': ['abc']
        }
      }
    ];

    beforeEach(() => {
      mysql = new Adapter({});
    });

    conditions.forEach(condition => {
      it('should build - ' + condition.output.where, (done) => {
        mysql.conditionBuilder(condition.input).should.be.deep.equal(condition.output);
        done();
      });
    });
  });

  describe('DATABASE', () => {
    it('should be empty string', () => {
      Adapter.DATABASE.should.be.eql('');
    });
  });

  describe('SERIALIZED', () => {
    it('should be equal to empty object', () => {
      Adapter.SERIALIZED.should.be.eql({});
    });
  });

  describe('PLURAL', () => {
    it('should be empty string', () => {
      Adapter.PLURAL.should.be.eql('');
    });
  });

  describe('TABLE', () => {
    it('should be empty string', () => {
      Adapter.TABLE.should.be.eql('');
    });
  });

  describe('FIELDS', () => {
    it('should be empty array', () => {
      Adapter.FIELDS.should.be.eql([]);
    });
  });

  describe('LINKS', () => {
    it('should be empty array', () => {
      Adapter.LINKS.should.be.eql([]);
    });
  });
});
