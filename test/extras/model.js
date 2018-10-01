/**
 * Created by ashish on 17/5/17.
 */
const Adapter = require('../../src/adapter');

let table = '';
let database = '';
let links = [];

module.exports = class Model extends Adapter {
  /**
   * @return {string}
   */
  static get DATABASE() {
    return database;
  }

  /**
   *
   * @param {string} d
   * @constructor
   */
  static set DATABASE(d) {
    database = d;
  }

  /**
   * @returns {{}}
   */
  static get SERIALIZED() {
    return {
      jsonfield: 'json',
    };
  }

  /**
   * @returns {string}
   */
  static get PLURAL() {
    return '';
  }

  /**
   *
   * @param {string} t
   * @constructor
   */
  static set TABLE(t) {
    table = t;
  }

  /**
   * @returns {string}
   */
  static get TABLE() {
    return table;
  }

  /**
   * @returns {Array}
   */
  static get FIELDS() {
    return ['id', 'a', 'b', 'jsonfield'];
  }

  /**
   *
   * @param {Array} l
   * @constructor
   */
  static set LINKS(l) {
    links = l;
  }

  /**
   * @returns {Array}
   */
  static get LINKS() {
    return links;
  }
};
