/* eslint-disable no-unused-vars,class-methods-use-this */
/**
 * Created by ashish on 27/4/17.
 */
const Boom = require('boom');

let connection;

class AbstractAdapter {
  constructor(entity) {
    this.properties = {};
    this.original = {};
    if (entity) {
      this.constructor.FIELDS.forEach((field) => {
        if (entity[field]) {
          this.properties[field] = entity[field];
        }
      });
    }
  }

  /**
   *
   * @returns {number}
   * @constructor
   */
  static get PAGESIZE() {
    return 100;
  }

  /**
   *
   * @param sql
   * @param args
   */
  static debug(sql, args) {
    if (process.env.debug === 'true') {
      // eslint-disable-next-line no-console
      console.log(sql, args);
    }
  }

  /**
   *
   * @returns {*}
   */
  static get CONN() {
    return connection;
  }

  /**
   *
   * @param conn
   */
  static set CONN(conn) {
    connection = conn;
  }

  setOriginal(entity) {
    if (this.constructor === entity.constructor) {
      this.original = entity;
    }
    return this;
  }

  getChanges() {
    const changes = {};
    this.constructor.FIELDS.forEach((field) => {
      const currentValue = this.get(field);
      if (currentValue && currentValue !== this.original.get(field)) {
        changes[field] = currentValue;
      }
    });
    return changes;
  }

  set(key, value) {
    if (!this.properties) {
      this.properties = {};
    }
    if (this.constructor.FIELDS.indexOf(key) !== -1) {
      this.properties[key] = value;
    }
  }

  get(key) {
    if (!this.properties) {
      return undefined;
    }
    return this.properties[key];
  }

  remove(key) {
    if (!this.properties) {
      return;
    }
    delete this.properties[key];
  }

  /**
   *
   * @param table
   * @param condition
   * @param select
   * @param order
   * @param from
   * @param limit
   */
  query(table, condition, select, order, from, limit) {
    throw Boom.badImplementation('[adapter] `query` method not implemented');
  }

  /**
   *
   * @returns {string}
   */
  getTableName() {
    throw Boom.badImplementation('[adapter] `getTableName` method not implemented');
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
    throw Boom.badImplementation('[adapter] `SELECT` method not implemented');
  }

  /**
   *
   * @param values
   * @returns {*|promise}
   */
  INSERT(values) {
    throw Boom.badImplementation('[adapter] `INSERT` method not implemented');
  }

  /**
   *
   * @param changes
   * @param condition
   * @returns {*|promise}
   */
  UPDATE(changes, condition) {
    throw Boom.badImplementation('[adapter] `UPDATE` method not implemented');
  }

  /**
   *
   * @param condition
   * @returns {*|promise}
   */
  DELETE(condition) {
    throw Boom.badImplementation('[adapter] `DELETE` method not implemented');
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
    throw Boom.badImplementation('[adapter] `FINDLINKS` method not implemented');
  }

  /**
   *
   * @param entity
   * @param conditions
   * @returns {Promise.<TResult>}
   * @constructor
   */
  DELETELINK(entity, conditions) {
    throw Boom.badImplementation('[adapter] `DELETELINK` method not implemented');
  }

  /**
   *
   * @param entity
   * @param record
   * @returns {Promise.<TResult>}
   * @constructor
   */
  SAVELINK(entity, record) {
    throw Boom.badImplementation('[adapter] `SAVELINK` method not implemented');
  }
}

module.exports = AbstractAdapter;
