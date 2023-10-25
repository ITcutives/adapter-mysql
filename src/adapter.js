/* eslint-disable no-param-reassign,default-case */
/**
 * Created by itcutives on 1/10/2015.
 */
const Boom = require('boom');
const loForEach = require('lodash/forEach');
const loClone = require('lodash/clone');
const loIsEmpty = require('lodash/isEmpty');
const loGet = require('lodash/get');
const loSplit = require('lodash/split');
const loMap = require('lodash/map');
const mysql = require('mysql');
const AbstractAdapter = require('@itcutives/adapter-memory/src/abstract');

const reflect = (promise) => promise.then((v) => ({ v, status: 'resolved' }),
  (e) => ({ e, status: 'rejected' }));

const Link = require('./link');


class Adapter extends AbstractAdapter {
  /**
   * @return {{}}
   */
  static get SERIALIZED() {
    return {};
  }

  /**
   * @return {string}
   */
  static get PLURAL() {
    return '';
  }

  /**
   * @return {string}
   */
  static get TABLE() {
    return '';
  }

  /**
   * @return {Array}
   */
  static get FIELDS() {
    return [];
  }

  /**
   * @return {Array}
   */
  static get LINKS() {
    return [];
  }

  constructor(entity, context) {
    super();
    // set everything to blank
    this.setDatabase('');
    this.setContext(context);

    // if entity object is provided
    if (entity) {
      this.constructor.FIELDS.forEach((field) => {
        const value = loGet(entity, field);
        if (value !== undefined) {
          this.set(field, value);
        }
      });
      this.relationships = entity[Adapter.LINKELEMENT] || {};
    }
  }

  setContext(context) {
    this.context = context;
  }

  getContext() {
    return this.context;
  }

  /**
   * @return {string}
   */
  getDatabase() {
    return this.database;
  }

  /**
   * @return {string}
   */
  setDatabase(db) {
    this.database = db;
  }

  async serialise() {
    loForEach(this.constructor.SERIALIZED, (v, k) => {
      let value = this.get(k);
      if (value) {
        // eslint-disable-next-line default-case
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
    return this;
  }

  async deserialise() {
    loForEach(this.constructor.SERIALIZED, (v, k) => {
      let value = this.get(k);
      if (value) {
        // eslint-disable-next-line default-case
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
    return this;
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
        const parts = loSplit(col, ' as ');
        return `${mysql.escapeId(parts[0])} as ${mysql.escapeId(parts[1])}`;
      }
      return Adapter.fixFieldName(col);
    };

    // check fields
    if (Array.isArray(select) && !loIsEmpty(select)) {
      const newList = loMap(select, (fld) => columnRename(fld));
      select = newList.join(', ');
    } else if (loIsEmpty(select) || select === '*') {
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
      const orderBy = loMap(order, (value, key) => {
        if (!loIsEmpty(value)) {
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
    loForEach(values, (v, k) => {
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

    loForEach(conditions, (cond, key) => {
      addToArgs = true;

      // for key-value pairs
      if (typeof cond !== 'object' || cond === null) {
        temp = cond;
        cond = loClone(sampleCondition);
        cond.field = key;
        cond.value = temp;
      }

      // Operator
      opr = '=';
      if (cond.operator && !loIsEmpty(cond.operator) && operators.indexOf(cond.operator) !== -1) {
        opr = cond.operator.toUpperCase();
      }
      // condition
      condition = 'AND';
      if (cond.condition && !loIsEmpty(cond.condition)) {
        // eslint-disable-next-line prefer-destructuring
        condition = cond.condition;
      }

      // special operators
      switch (opr) {
        case 'NOT IN':
        // falls through
        case 'IN':
          if (Array.isArray(cond.value)) {
            addToArgs = true;
          } else if (cond.value.condition) {
            let table = this.getTableName();
            let ClassConstructor;
            if (cond.value.class) {
              ClassConstructor = cond.value.class;
              const tmpCls = new ClassConstructor();
              tmpCls.setContext(this.getContext());
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
      } else if (Array.isArray(cond.value)) {
        placeHolder = `(${loMap(cond.value, () => '?').join(', ')})`;
      }

      if (isFirst === false) {
        where += ` ${condition} `;
      }

      // query
      where += `${Adapter.jsonFieldNotation(cond.field)} ${opr} ${placeHolder}`;

      if (addToArgs) {
        if (Array.isArray(cond.value)) {
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

  async toLink(fields, ModelPath) {
    let link;
    const links = this.constructor.LINKS;
    const promises = [];
    const object = this.properties;

    object.links = {};
    links.forEach((l) => {
      if ((fields && fields.indexOf(l.PLURAL) === -1) || (!fields && l.TYPE !== '1TO1')) {
        return;
      }
      link = new Link(this, l, this.relationships, this.getContext());
      promises.push(link.toLink(object, ModelPath));
    });
    if (promises.length > 0) {
      let results = await Promise.all(promises.map(reflect));
      results = results.filter((x) => x.status === 'resolved').map((x) => x.v);
      return Object.assign.apply({}, results);
    }
    return this.properties;
  }

  static async fromLink(ClassConstructor, context, object) {
    let link;

    const links = ClassConstructor.LINKS;
    const promises = [];
    const o = new Adapter();

    links.forEach((l) => {
      link = new Link(o, l);
      promises.push(link.fromLink(object));
    });

    if (promises.length > 0) {
      let results = await Promise.all(promises.map(reflect));
      results = results.filter((x) => x.status === 'resolved').map((x) => x.v);
      const result = Object.assign.apply({}, results);
      return new ClassConstructor(result, context);
    }
    return new ClassConstructor(object, context);
  }

  /**
   * @returns {string}
   */
  getDatabaseString() {
    const database = this.getDatabase();
    return database ? `${mysql.escapeId(database)}.` : '';
  }

  /**
   * @returns {string}
   */
  getTableName() {
    return mysql.escapeId(this.constructor.TABLE);
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
    const database = this.getDatabaseString();

    condition = this.conditionBuilder(condition);
    select = this.constructor.getSelectFields(select);
    order = this.constructor.getOrderByFields(order);
    limit = this.constructor.getLimit(from, limit);

    sql.query = `SELECT ${select} FROM ${database}${table}${condition.where}${order}${limit}`;
    sql.args = condition.args;

    return sql;
  }

  /**
   *
   * @param sql
   * @param args
   * @returns {Promise.<TResult>}
   */
  // eslint-disable-next-line class-methods-use-this
  async rawQuery(sql, args) {
    const connection = await Adapter.CONN.openConnection();
    return new Promise((resolve, reject) => {
      Adapter.debug(sql, args);
      connection.query(sql, args, (err, result) => {
        if (err) {
          // todo: send some generic message instead of what mysql returns
          return reject(new Error(err.toString()));
        }
        return resolve(result);
      });
    });
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
  async SELECT(condition, select, order, from, limit) {
    condition = condition || [];
    select = select || '*';
    order = order || [];
    limit = limit || this.constructor.PAGESIZE;

    const table = this.getTableName();
    const sql = this.query(table, condition, select, order, from, limit);
    const result = await this.rawQuery(sql.query, sql.args);
    const ClassConstructor = this.constructor;
    const deserialised = await Promise.all(result.map((v) => new ClassConstructor(v)).map((v) => v.deserialise()));
    return deserialised.map((v) => {
      v.setOriginal(new ClassConstructor(loClone(v.properties)));
      return v;
    });
  }

  /**
   *
   * @returns {*|promise}
   */
  async INSERT() {
    if (loIsEmpty(this.properties)) {
      return Promise.reject(new Error('invalid request (empty values)'));
    }

    await this.serialise();

    const table = this.getTableName();
    const database = this.getDatabaseString();
    const sql = `INSERT INTO ${database}${table} SET ?`;

    Adapter.debug(sql, this.properties);
    return this.rawQuery(sql, this.properties).then((result) => result.insertId);
  }

  /**
   *
   * @returns {*|promise}
   */
  async UPDATE() {
    let condition;

    if (loIsEmpty(this.original) || !this.original.get('id')) {
      return Promise.reject(Boom.badRequest('bad conditions'));
    }

    await this.serialise();


    condition = {
      id: this.original.get('id'),
    };
    const changes = this.getChanges();

    if (loIsEmpty(changes)) {
      return Promise.reject(new Error('invalid request (no changes)'));
    }

    condition = this.conditionBuilder(condition);
    const filteredValues = this.constructor.filterValues(this.constructor.FIELDS, changes);

    const setValues = filteredValues.keys.join(',');
    const correctValues = filteredValues.values.concat(condition.args);

    const table = this.getTableName();
    const database = this.getDatabaseString();
    const sql = `UPDATE ${database}${table} SET ${setValues}${condition.where}`;

    Adapter.debug(sql, correctValues);
    return this.rawQuery(sql, correctValues).then((result) => result.changedRows > 0);
  }

  /**
   *
   * @returns {*|promise}
   */
  async DELETE() {
    let condition;

    if (!this.get('id')) {
      return Promise.reject(new Error('invalid request (no condition)'));
    }

    condition = {
      id: this.get('id'),
    };

    condition = this.conditionBuilder(condition);
    const table = this.getTableName();
    const database = this.getDatabaseString();
    const sql = `DELETE FROM ${database}${table}${condition.where}`;

    Adapter.debug(sql, condition.args);
    return this.rawQuery(sql, condition.args).then((result) => result.affectedRows > 0);
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

    const query = `SELECT ${fields} FROM ${this.getDatabaseString()}${entity}${conditions.where}`;
    Adapter.debug(query, conditions.args);
    return this.rawQuery(query, conditions.args);
  }

  /**
   * END: MYSQL Operations
   */
}

module.exports = Adapter;
