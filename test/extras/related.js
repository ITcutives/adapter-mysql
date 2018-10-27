/**
 * Created by ashish on 17/5/17.
 */
const Adapter = require('../../src/adapter');

class Model extends Adapter {
  /**
   * @return {string}
   */
  static get DATABASE() {
    return Model.database;
  }

  /**
   *
   * @param {string} d
   * @constructor
   */
  static set DATABASE(d) {
    Model.database = d;
  }

  /**
   * @returns {{}}
   */
  static get SERIALIZED() {
    return {
      address: 'json',
    };
  }

  /**
   * @returns {string}
   */
  static get PLURAL() {
    return 'relatives';
  }

  /**
   * @returns {string}
   */
  static get TABLE() {
    return 'related';
  }

  /**
   * @returns {Array}
   */
  static get FIELDS() {
    return ['id', 'name', 'address', 'phone'];
  }

  /**
   * @returns {Array}
   */
  static get LINKS() {
    return Model.links;
  }
}

module.exports = Model;
