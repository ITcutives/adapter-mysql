/**
 * Created by ashish on 28/4/17.
 */
const mysql = require('mysql');
const AbstractConnection = require('./abstractConnection');

class Connection extends AbstractConnection {
  static get TYPE() {
    return 'MYSQL';
  }

  openConnection() {
    if (!this.connection) {
      let connectionType = 'Connection';
      if (this.config.connectionLimit) {
        connectionType = 'Pool';
      }
      // eslint-disable-next-line no-console
      console.log(`creating ${connectionType}`);
      this.connection = mysql[`create${connectionType}`](this.config);
    }
    return Promise.resolve(this.connection);
  }

  closeConnection() {
    const conn = this.connection;
    if (!conn) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      conn.end(() => {
        this.connection = undefined;
        resolve();
      });
    });
  }
}

module.exports = Connection;
