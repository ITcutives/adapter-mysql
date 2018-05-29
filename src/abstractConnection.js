/**
 * Created by ashish on 28/4/17.
 */
class AbstractConnection {
  constructor(config) {
    this.config = config;
  }

  openConnection() {
    // todo: throw exception
  }

  closeConnection() {
    // todo: throw exception
  }
}

module.exports = AbstractConnection;
