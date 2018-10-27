/* eslint-disable no-trailing-spaces */
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

const testMySQL = {};
const Connection = proxyquire('../src/connection', {
  mysql: testMySQL,
});

chai.use(chaiAsPromised);
chai.should();

describe('Connection', () => {
  it('should have type MYSQL', () => {
    Connection.TYPE.should.be.eql('MYSQL');
  });

  describe('constructor', () => {
    let obj;

    beforeEach(() => {
      obj = new Connection({ db: 'serverless' });
    });

    it('should assign the config variable', () => {
      obj.config.should.be.deep.eql({ db: 'serverless' });
    });
  });

  describe('openConnection', () => {
    let obj;
    let spy;

    beforeEach(() => {
      testMySQL.createPool = sinon.stub().returns({ connected: 'Pool' });
      testMySQL.createConnection = sinon.stub().returns({ connected: 'Connection' });
      spy = sinon.spy(console, 'log');
    });

    afterEach(() => {
      console.log.restore();
    });

    it('should call Connection method if connectionType is Connection', (done) => {
      obj = new Connection({});
      obj.openConnection().then((connection) => {
        connection.should.be.deep.eql({ connected: 'Connection' });
        testMySQL.createConnection.should.have.callCount(1);
        spy.args[0][0].should.be.eql('creating Connection');
        done();
      });
    });

    it('should call Pool method if connectionType is Pool', (done) => {
      obj = new Connection({ connectionLimit: 5 });
      obj.openConnection().then((connection) => {
        connection.should.be.deep.eql({ connected: 'Pool' });
        testMySQL.createPool.should.have.callCount(1);
        spy.args[0][0].should.be.eql('creating Pool');
        done();
      });
    });

    it('should return connection if it is already connected', (done) => {
      obj = new Connection({});
      obj.connection = { connected: 'Connection' };
      obj.openConnection().then((connection) => {
        connection.should.be.deep.eql({ connected: 'Connection' });
        testMySQL.createConnection.should.have.callCount(0);
        spy.callCount.should.be.eql(0);
        done();
      });
    });
  });

  describe('closeConnection', () => {
    let obj;

    beforeEach(() => {
      obj = new Connection({});
    });

    it('should resolve with true if there is no connection', (done) => {
      obj.closeConnection().should.eventually.eql(true).notify(done);
    });

    it('should call end method on connection to close it', (done) => {
      const stub = sinon.stub();
      obj.connection = { end: stub.yields(true) };
      obj.closeConnection().then((res) => {
        res.should.be.eql(true);
        stub.should.have.callCount(1);
        done();
      });
    });
  });
});
