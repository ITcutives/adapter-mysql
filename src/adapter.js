/* eslint-disable no-param-reassign,default-case */
/**
 * Created by itcutives on 1/10/2015.
 */
const Boom = require('boom');
const _ = require('lodash');
const mysql = require('mysql');
const AbstractAdapter = require('@itcutives/adapter-memory/src/abstract');

const reflect = promise => promise.then(v => ({ v, status: 'resolved' }),
  e => ({ e, status: 'rejected' }));

const Link = require('./link');


class Adapter extends AbstractAdapter {
  /**
   * @return {string}
   */
  static get DATABASE() {
    return '';
  }

  /**
   * @returns {{}}
   */
  static get SERIALIZED() {
    return {};
  }

  /**
   * @returns {string}
   */
  static get PLURAL() {
    return '';
  }

  /**
   * @returns {string}
   */
  static get TABLE() {
    return '';
  }

  /**
   * @returns {Array}
   */
  static get FIELDS() {
    return [];
  }

  /**
   * @returns {Array}
   */
  static get LINKS() {
    return [];
  }

  constructor(entity) {
    super();
    if (entity) {
      _.forEach(entity, (v, k) => {
        const cols = k.split('.');
        const field = cols[0];
        if (this.constructor.FIELDS.indexOf(field) !== -1) {
          _.set(this.properties, k, v);
        }
      });
    }
  }

  toLink(fields, ModelPath) {
    let link;
    const links = this.constructor.LINKS;
    const promises = [];
    const object = this.properties;

    object.links = {};
    links.forEach((l) => {
      if (fields && fields.indexOf(l.PLURAL) === -1) {
        return;
      }
      link = new Link(this, l);
      promises.push(link.toLink(object, ModelPath));
    });
    if (promises.length > 0) {
      return Promise.all(promises.map(reflect)).then((results) => {
        results = results.filter(x => x.status === 'resolved').map(x => x.v);
        return Object.assign.apply({}, results);
      });
    }
    return Promise.resolve(this.properties);
  }

  static fromLink(Cls, object) {
    let link;

    const links = Cls.LINKS;
    const promises = [];
    const o = new Adapter();

    links.forEach((l) => {
      link = new Link(o, l);
      promises.push(link.fromLink(object));
    });

    if (promises.length > 0) {
      return Promise.all(promises.map(reflect)).then((results) => {
        results = results.filter(x => x.status === 'resolved').map(x => x.v);
        const result = Object.assign.apply({}, results);
        return new Cls(result);
      });
    }
    return Promise.resolve(new Cls(object));
  }

  serialise() {
    _.forEach(this.constructor.SERIALIZED, (v, k) => {
      let value = this.get(k);
      if (value) {
        switch (v) {
          case 'json':
            if (typeof value !== 'string') {
              value = JSON.stringify(value);
            }
            break;
        }
        this.properties[k] = value;
      }
    });
    return Promise.resolve(this);
  }

  deserialise() {
    _.forEach(this.constructor.SERIALIZED, (v, k) => {
      let value = this.get(k);
      if (value) {
        switch (v) {
          case 'json':
            if (typeof value === 'string') {
              value = JSON.parse(value);
            }
            break;
        }
        this.properties[k] = value;
      }
    });
    return Promise.resolve(this);
  }

  /**
   * Start: MYSQL Operations
   */

  static jsonFieldNotation(col) {
    const cols = col.split('.');
    const field = cols.shift();
    if (cols.length > 0) {
      return `${mysql.escapeId(field)}->>"$.${cols.join('.')}"`;
    }
    return mysql.escapeId(field);
  }

  static fixFieldName(col) {
    const field = Adapter.jsonFieldNotation(col);
    if (field.indexOf('->>') !== -1) {
      return `${field} as \`${col}\``;
    }
    return field;
  }

  /**
   *
   * @param select [] | * | ""
   * @returns {*}
   */
  static getSelectFields(select) {
    const columnRename = (col) => {
      if (col.indexOf(' as ') !== -1) {
        const parts = _.split(col, ' as ');
        return `${mysql.escapeId(parts[0])} as ${mysql.escapeId(parts[1])}`;
      }
      return Adapter.fixFieldName(col);
    };

    // check fields
    if (_.isArray(select) && !_.isEmpty(select)) {
      const newList = _.map(select, fld => columnRename(fld));
      select = newList.join(', ');
    } else if (_.isEmpty(select) || select === '*') {
      // default value
      select = '*';
    } else {
      select = columnRename(select);
    }
    return select;
  }

  /**
   *
   * @param order
   * @returns {*}
   */
  static getOrderByFields(order) {
    if (!order || order.length <= 0) {
      return '';
    }

    // order
    if (Array.isArray(order) === true) {
      const orderBy = order.map((v) => {
        if (v.indexOf('-') === 0) {
          return `${mysql.escapeId(v.substr(1))} DESC`;
        }
        return `${mysql.escapeId(v)} ASC`;
      });
      order = orderBy.join(', ');
    } else if (typeof order === 'object') {
      const orderBy = _.map(order, (value, key) => {
        if (_.isNumber(key)) {
          return mysql.escapeId(value);
        }
        if (!_.isEmpty(value)) {
          return `${mysql.escapeId(key)} ${value}`;
        }
        return mysql.escapeId(key);
      });
      order = orderBy.join(', ');
    } else {
      order = mysql.escapeId(order);
    }
    order = ` ORDER BY ${order}`;

    return order;
  }

  /**
   *
   * @param from
   * @param limit
   * @returns {*}
   */
  static getLimit(from, limit) {
    if (from === undefined || from === null) {
      return '';
    }
    if (!limit) {
      limit = Adapter.PAGESIZE;
    }
    return ` LIMIT ${from}, ${limit}`;
  }

  /**
   *
   * @param fields
   * @param values
   * @returns {{keys: Array, values: Array}}
   */
  static filterValues(fields, values) {
    const result = {
      keys: [],
      values: [],
    };
    _.forEach(values, (v, k) => {
      if (fields.indexOf(k) !== -1) {
        if (typeof v === 'function') {
          k = `${mysql.escapeId(k)} = ${v()}`;
          result.keys.push(k);
        } else {
          result.keys.push(`${mysql.escapeId(k)} = ?`);
          result.values.push(v);
        }
      }
    });
    return result;
  }

  /**
   *
   * @param conditions
   * @returns {{where: string, args: Array}}
   */
  conditionBuilder(conditions) {
    let where;
    let args;
    let opr;
    let condition;
    let placeHolder;
    let addToArgs;
    let temp;
    let isFirst;

    where = '';
    args = [];
    isFirst = true;
    const sampleCondition = {
      field: '',
      operator: '=',
      value: '',
      condition: 'AND',
    };
    const operators = ['=', '<', '>', '<=', '>=', '<>', '!=', 'like', 'not like', 'between', 'ilike', 'regexp', 'in', 'not in'];

    _.forEach(conditions, (cond, key) => {
      addToArgs = true;

      // for key-value pairs
      if (typeof cond !== 'object' || cond === null) {
        temp = cond;
        cond = _.clone(sampleCondition);
        cond.field = key;
        cond.value = temp;
      }

      // Operator
      opr = '=';
      if (cond.operator && !_.isEmpty(cond.operator) && operators.indexOf(cond.operator) !== -1) {
        opr = cond.operator.toUpperCase();
      }
      // condition
      condition = 'AND';
      if (cond.condition && !_.isEmpty(cond.condition)) {
        // eslint-disable-next-line prefer-destructuring
        condition = cond.condition;
      }

      // special operators
      switch (opr) {
        case 'NOT IN':
        // falls through
        case 'IN':
          if (_.isArray(cond.value)) {
            addToArgs = true;
          } else if (cond.value.condition) {
            let table;
            let Cls;
            if (cond.value.class) {
              Cls = cond.value.class;
              const tmpCls = new Cls();
              table = tmpCls.getTableName();
            } else if (cond.value.table) {
              table = mysql.escapeId(cond.value.table);
            }
            temp = this.query(table, cond.value.condition, cond.value.select);
            cond.value = `(${temp.query})`;
            args = args.concat(temp.args);
            addToArgs = false;
          } else {
            cond.value = [cond.value];
          }
          break;
        case 'LIKE':
          cond.value = `'${cond.value}'`;
          addToArgs = false;
          break;
        case '=':
        // falls through
        case '!=':
          if (cond.value === null) {
            switch (opr) {
              case '=':
                cond.value = 'IS NULL';
                break;
              case '!=':
                cond.value = 'IS NOT NULL';
                break;
            }
            addToArgs = false;
            opr = '';
          }
          break;
      }

      // VALUE
      placeHolder = '?';
      if (addToArgs === false) {
        placeHolder = cond.value;
      } else if (typeof cond.value === 'function') {
        addToArgs = false;
        placeHolder = cond.value();
      } else if (_.isArray(cond.value)) {
        placeHolder = `(${_.map(cond.value, () => '?').join(', ')})`;
      }

      if (isFirst === false) {
        where += ` ${condition} `;
      }

      // query
      where += `${Adapter.jsonFieldNotation(cond.field)} ${opr} ${placeHolder}`;

      if (addToArgs) {
        if (_.isArray(cond.value)) {
          args = args.concat(cond.value);
        } else {
          args.push(cond.value);
        }
      }

      isFirst = false;
    });
    // attach WHERE
    if (where !== '') {
      where = ` WHERE ${where}`;
    }
    return { where, args };
  }

  /**
   *
   * @param table
   * @param condition
   * @param select
   * @param order
   * @param from
   * @param limit
   * @returns {{}}
   */
  query(table, condition, select, order, from, limit) {
    const sql = {};

    condition = this.conditionBuilder(condition);
    select = this.constructor.getSelectFields(select);
    order = this.constructor.getOrderByFields(order);
    limit = this.constructor.getLimit(from, limit);

    sql.query = `SELECT ${select} FROM ${table}${condition.where}${order}${limit}`;
    sql.args = condition.args;

    return sql;
  }

  /**
   *
   * @returns {string}
   */
  getTableName() {
    const list = [];
    if (!_.isEmpty(this.constructor.DATABASE)) {
      list.push(mysql.escapeId(this.constructor.DATABASE));
    }
    list.push(mysql.escapeId(this.constructor.TABLE));
    return list.join('.');
  }

  /**
   *
   * @param sql
   * @param args
   * @returns {Promise.<TResult>}
   */
  // eslint-disable-next-line class-methods-use-this
  rawQuery(sql, args) {
    return Adapter.CONN.openConnection().then(connection => new Promise((resolve, reject) => {
      Adapter.debug(sql, args);
      connection.query(sql, args, (err, result) => {
        if (err) {
          // todo: send some generic message instead of what mysql returns
          return reject(new Error(err.toString()));
        }
        return resolve(result);
      });
    }));
  }

  /**
   *
   * @param condition
   * @param select
   * @param order
   * @param from
   * @param limit
   * @returns {*|promise}
   */
  SELECT(condition, select, order, from, limit) {
    condition = condition || [];
    select = select || '*';
    order = order || [];
    limit = limit || this.constructor.PAGESIZE;

    const table = this.getTableName();
    const sql = this.query(table, condition, select, order, from, limit);
    return this.rawQuery(sql.query, sql.args).then((result) => {
      const Cls = this.constructor;
      const promises = result.map(v => new Cls(v)).map(v => v.deserialise());
      return Promise.all(promises);
    });
  }

  /**
   *
   * @returns {*|promise}
   */
  INSERT() {
    let table;
    let sql;

    if (_.isEmpty(this.properties)) {
      return Promise.reject(new Error('invalid request (empty values)'));
    }

    return this.serialise().then((o) => {
      table = this.getTableName();

      sql = `INSERT INTO ${table} SET ?`;
      Adapter.debug(sql, o.properties);
      return this.rawQuery(sql, o.properties).then(result => result.insertId);
    });
  }

  /**
   *
   * @returns {*|promise}
   */
  UPDATE() {
    let changes;
    let condition;
    let filteredValues;
    let setValues;
    let correctValues;
    let table;
    let sql;

    if (_.isEmpty(this.original) || !this.original.get('id')) {
      return Promise.reject(Boom.badRequest('bad conditions'));
    }

    return this.serialise().then((o) => {
      condition = {
        id: this.original.get('id'),
      };
      changes = o.getChanges();

      if (_.isEmpty(changes)) {
        return Promise.reject(new Error('invalid request (no changes)'));
      }

      condition = this.conditionBuilder(condition);
      filteredValues = this.constructor.filterValues(this.constructor.FIELDS, changes);

      setValues = filteredValues.keys.join(',');
      correctValues = filteredValues.values.concat(condition.args);

      table = this.getTableName();
      sql = `UPDATE ${table} SET ${setValues}${condition.where}`;

      Adapter.debug(sql, correctValues);
      return this.rawQuery(sql, correctValues).then(result => result.changedRows > 0);
    });
  }

  /**
   *
   * @returns {*|promise}
   */
  DELETE() {
    let condition;

    if (!this.get('id')) {
      return Promise.reject(new Error('invalid request (no condition)'));
    }

    condition = {
      id: this.get('id'),
    };

    condition = this.conditionBuilder(condition);
    const table = this.getTableName();

    const sql = `DELETE FROM ${table}${condition.where}`;
    Adapter.debug(sql, condition.args);
    return this.rawQuery(sql, condition.args).then(result => result.affectedRows > 0);
  }

  /**
   *
   * @param entity
   * @param conditions
   * @param fields
   * @returns {Promise.<TResult>}
   * @constructor
   */
  FINDLINKS(entity, conditions, fields) {
    conditions = this.conditionBuilder(conditions);
    fields = this.constructor.getSelectFields(fields);

    const query = `SELECT ${fields} FROM ${entity}${conditions.where}`;
    Adapter.debug(query, conditions.args);
    return this.rawQuery(query, conditions.args);
  }

  /**
   * END: MYSQL Operations
   */
}

module.exports = Adapter;
