/**
 * Created by ashish on 20/5/17.
 */
const path = require('path');
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
  describe('ALLOWED_LINKS', () => {
    it('should return static array value', () => {
      Link.ALLOWED_LINKS.should.be.deep.eql(['MTOM', '1TOM', '1TO1']);
    });
  });

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
    let stubToMTOM;
    let stubTo1TOM;
    let stubTo1TO1;

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
      stubToMTOM = sinon.stub(link, 'toMTOM').returns(Promise.resolve());
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
      stubTo1TOM = sinon.stub(link, 'to1TOM').returns(Promise.resolve());
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
      stubTo1TO1 = sinon.stub(link, 'to1TO1').returns(Promise.resolve());
      link.toLink().then(() => {
        stubTo1TO1.should.have.callCount(1);
        done();
      });
    });

    it('should return object as is when link type is unknown', (done) => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        CANMODIFY: false,
      });
      stubTo1TO1 = sinon.stub(link, 'to1TO1').returns(Promise.resolve());
      link.toLink().then(() => {
        stubTo1TO1.should.have.callCount(0);
        done();
      });
    });
  });

  describe('fromLink', () => {
    let link;
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'test',
        links: {
          organisations: 11,
        },
      };
    });

    it('should find and assign links if available', (done) => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      link.fromLink(object).then((result) => {
        result.should.be.deep.eql({
          id: 1,
          name: 'test',
          organisation_id: 11,
          links: {
            organisations: 11,
          },
        });
        done();
      });
    });

    it('should leave object as is if the link type is not 1TO1', (done) => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TOM',
        CANMODIFY: false,
      });
      link.fromLink(object).then((result) => {
        result.should.be.deep.eql(object);
        done();
      });
    });
  });

  describe('toMTOM', () => {
    let link;
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'organisation',
        links: {},
      };
    });

    it('should pick values from relationship object if value is already assigned', (done) => {
      link = new Link(db, {
        PLURAL: 'users',
        LINK: 'user_id',
        CHILD: 'organisation_id',
        JOIN: 'permission',
        TYPE: 'MTOM',
        CANMODIFY: true,
      }, {
        permission: ['ashish', 'manish'],
      });
      link.toMTOM(object).then((result) => {
        result.should.deep.eql({
          id: 1,
          name: 'organisation',
          links: {
            users: ['ashish', 'manish'],
          },
        });
        done();
      });
    });

    it('should call findLinks with join table and query database', (done) => {
      db.FINDLINKS = sinon.stub();
      db.FINDLINKS.withArgs('permission', { organisation_id: 1 }, 'user_id').resolves([{ user_id: 'riddhi' }]);
      link = new Link(db, {
        PLURAL: 'users',
        LINK: 'user_id',
        CHILD: 'organisation_id',
        JOIN: 'permission',
        TYPE: 'MTOM',
        CANMODIFY: true,
      });
      link.toMTOM(object).then((result) => {
        result.should.deep.eql({
          id: 1,
          name: 'organisation',
          links: {
            users: ['riddhi'],
          },
        });
        done();
      });
    });
  });

  describe('to1TOM', () => {
    let link;
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'organisation',
        links: {},
      };
    });

    it('should return the value from relationship object if it is assigned', (done) => {
      link = new Link(db, {
        PLURAL: 'relatives',
        LINK: 'organisation_id',
        TYPE: '1TOM',
        CANMODIFY: false,
      }, {
        related: [100, 200],
      });
      link.to1TOM(object, path.join('../test')).then((result) => {
        result.should.be.deep.eql({
          id: 1,
          name: 'organisation',
          links: {
            relatives: [100, 200],
          },
        });
        done();
      }).catch(e => console.log(e));
    });

    it('should query join table to fetch link details', (done) => {
      link = new Link(db, {
        PLURAL: 'relatives',
        LINK: 'organisation_id',
        TYPE: '1TOM',
        CANMODIFY: false,
      });
      const Relative = require('./models/relatives');
      Relative.prototype.SELECT = sinon.stub();
      Relative.prototype.SELECT.withArgs({ organisation_id: 1 }, 'id').resolves([new Relative({ id: 100 })]);
      link.to1TOM(object, path.join('../test')).then((result) => {
        result.should.be.deep.eql({
          id: 1,
          name: 'organisation',
          links: {
            relatives: [100],
          },
        });
        done();
      });
    });
  });

  describe('to1TO1', () => {
    let link;
    let object;

    beforeEach(() => {
      object = {
        id: 1,
        name: 'test',
        address_id: 'unique-id-1022',
        organisation_id: 11,
        plan_id: '3',
        links: {},
      };
    });

    it('should move field value under links if found', (done) => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      link.to1TO1(object).then((result) => {
        result.should.be.deep.eql({
          id: 1,
          name: 'test',
          plan_id: '3',
          address_id: 'unique-id-1022',
          links: {
            organisations: 11,
          },
        });
        done();
      });
    });

    it('should not make any changes if link field is not assigned', (done) => {
      link = new Link(db, {
        PLURAL: 'connections',
        LINK: 'connection_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      link.to1TO1(object).then((result) => {
        result.should.be.deep.eql({
          id: 1,
          name: 'test',
          plan_id: '3',
          organisation_id: 11,
          address_id: 'unique-id-1022',
          links: {},
        });
        done();
      });
    });

    it('should convert the value to integer if it is a number in string format', (done) => {
      link = new Link(db, {
        PLURAL: 'plans',
        LINK: 'plan_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      link.to1TO1(object).then((result) => {
        result.should.be.deep.eql({
          id: 1,
          name: 'test',
          address_id: 'unique-id-1022',
          organisation_id: 11,
          links: {
            plans: 3,
          },
        });
        done();
      });
    });

    it('should not convert the value to integer if it is a string', (done) => {
      link = new Link(db, {
        PLURAL: 'addresses',
        LINK: 'address_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      link.to1TO1(object).then((result) => {
        result.should.be.deep.eql({
          id: 1,
          name: 'test',
          organisation_id: 11,
          plan_id: '3',
          links: {
            addresses: 'unique-id-1022',
          },
        });
        done();
      });
    });
  });

  describe('from1TO1', () => {
    let link;
    let object;

    beforeEach(() => {
      link = new Link(db, {
        PLURAL: 'organisations',
        LINK: 'organisation_id',
        TYPE: '1TO1',
        CANMODIFY: false,
      });
      object = {
        id: 1,
        name: 'test',
        links: {
          organisations: 11,
        },
      };
    });

    it('should find and assign links if available', (done) => {
      link.from1TO1(object).then((result) => {
        result.should.be.deep.eql({
          id: 1,
          name: 'test',
          organisation_id: 11,
          links: {
            organisations: 11,
          },
        });
        done();
      });
    });
  });
});
