/**
 * Created by ashish on 20/5/17.
 */
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');

const Link = require('../src/link');

const db = {};

chai.use(sinonChai);
chai.use(chaiAsPromised);
chai.should();

describe('link', () => {
  describe('constructor', () => {
    it('should assign all the properties provided in links attribute', () => {
      const prop = {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      };
      const link = new Link(db, prop);
      link.db.should.be.eql(db);
      link.plural.should.be.eql(prop.PLURAL);
    });
  });

  describe('toLink', () => {
    let link;
    const stubToMTOM = sinon.stub(Link.prototype, 'toMTOM');
    const stubTo1TOM = sinon.stub(Link.prototype, 'to1TOM');
    const stubTo1TO1 = sinon.stub(Link.prototype, 'to1TO1');
    stubToMTOM.returns(Promise.resolve());
    stubTo1TOM.returns(Promise.resolve());
    stubTo1TO1.returns(Promise.resolve());

    beforeEach(() => {

    });

    it("should call toMTOM when link type is 'MTOM'", (done) => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        CHILD: 'gateway_id',
        JOIN: 'credit',
        TYPE: 'MTOM',
        CANMODIFY: true,
      });
      link.toLink().then(() => {
        stubToMTOM.should.have.callCount(1);
        done();
      });
    });

    it("should call to1TOM when link type is '1TOM'", (done) => {
      link = new Link(db, {
        PLURAL: 'webservices',
        LINK: 'organisation_id',
        TYPE: '1TOM',
        CANMODIFY: false,
      });
      link.toLink().then(() => {
        stubTo1TOM.should.have.callCount(1);
        done();
      });
    });

    it("should call to1TO1 when link type is '1TO1'", (done) => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      link.toLink().then(() => {
        stubTo1TO1.should.have.callCount(1);
        done();
      });
    });
  });

  describe('fromLink', () => {
    // let link;

    beforeEach(() => {
      // console.log(link);
    });

    it('', (done) => {
      done();
    });

    it('', (done) => {
      done();
    });

    it('', (done) => {
      done();
    });
  });

  describe('toMTOM', () => {
    // let link;

    beforeEach(() => {
      // console.log(link);
    });

    it('', (done) => {
      done();
    });

    it('', (done) => {
      done();
    });

    it('', (done) => {
      done();
    });
  });

  describe('to1TOM', () => {
    // let link;

    beforeEach(() => {
      // console.log(link);
    });

    it('', (done) => {
      done();
    });

    it('', (done) => {
      done();
    });

    it('', (done) => {
      done();
    });
  });

  describe('to1TO1', () => {
    // let link;

    beforeEach(() => {
      // console.log(link);
    });

    it('', (done) => {
      done();
    });

    it('', (done) => {
      done();
    });

    it('', (done) => {
      done();
    });
  });

  describe('from1TO1', () => {
    // let link;

    beforeEach(() => {
      // console.log(link);
    });

    it('', (done) => {
      done();
    });

    it('', (done) => {
      done();
    });

    it('', (done) => {
      done();
    });
  });
});
