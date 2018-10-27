/**
 * Created by ashish on 28/4/17.
 */
const mysql = require('mysql');
const AbstractConnection = require('@itcutives/adapter-memory/src/abstractConnection');

class Connection extends AbstractConnection {
  static get TYPE() {
    return 'MYSQL';
  }

  async openConnection() {
    if (!this.connection) {
      let connectionType = 'Connection';
      if (this.config.connectionLimit) {
        connectionType = 'Pool';
      }
      // eslint-disable-next-line no-console
      console.log(`creating ${connectionType}`);
      this.connection = mysql[`create${connectionType}`](this.config);
    }
    return this.connection;
  }

  async closeConnection() {
    const conn = this.connection;
    if (!conn) {
      return true;
    }
    return new Promise((resolve) => {
      conn.end(() => {
        this.connection = undefined;
        resolve(true);
      });
    });
  }
}

module.exports = Connection;
