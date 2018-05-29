/**
 * Created by ashish on 23/12/16.
 */

module.exports = class link {
  static get ALLOWED_LINKS() {
    return ['MTOM', '1TOM', '1TO1'];
  }

  /**
   * {
   *    TYPE: "",
   *    PLURAL: "",
   *    LINK: "",
   *    TYPE: "",
   *    JOIN: "",
   *    CHILD: "",
   *    CANMODIFY: ""
   * }
   * @param db
   * @param link
   */
  constructor(db, link) {
    this.db = db;

    this.type = link.TYPE;
    this.plural = link.PLURAL;
    this.link = link.LINK;
    this.canModify = link.CANMODIFY || false;
    this.child = link.CHILD;
    this.join = link.JOIN;
  }

  toLink(object, ModelPath) {
    switch (this.type) {
      case 'MTOM':
        // with join table
        return this.toMTOM(object);
      case '1TOM':
        // with m2o
        return this.to1TOM(object, ModelPath);
      case '1TO1':
        return this.to1TO1(object);
    }
    return Promise.resolve(object);
  }

  fromLink(object) {
    switch (this.type) {
      case '1TO1':
        return this.from1TO1(object);
    }
    return Promise.resolve(object);
  }

  toMTOM(object) {
    // with join table
    let condition = {};
    condition[this.child] = object.id;

    return this.db.FINDLINKS(this.join, condition, this.link).then(rec => {
      let ids = [];
      rec.forEach(function(v) {
        ids.push(v[this.link]);
      });
      object.links[this.plural] = ids;
      return object;
    });
  }

  to1TOM(object, ModelPath) {
    // m2o
    let condition, Cls, o;
    condition = {};

    condition[this.link] = object.id;
    Cls = require(ModelPath + '/models/' + this.plural);
    o = new Cls();
    return o.SELECT(condition, 'id').then((rec) => {
      let ids = [];
      rec.forEach(function(v) {
        ids.push(v.get('id'));
      });
      object.links[this.plural] = ids;
      return object;
    });
  }

  to1TO1(object) {
    // this would be in record, so its okay to convert it
    let id;
    if (object[this.link]) {
      id = object[this.link];
      // int conversion because some of them are int(11) in mysql
      if (isNaN(parseInt(id)) === false) {
        id = parseInt(id);
      }
      object.links[this.plural] = id;
      delete object[this.link];
    }
    return Promise.resolve(object);
  }

  from1TO1(object) {
    object[this.link] = object.links[this.plural];
    return Promise.resolve(object);
  }
};
