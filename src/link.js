/* eslint-disable no-param-reassign */
/**
 * Created by ashish on 23/12/16.
 */

class Link {
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
   * @param relationships
   * @param context
   */
  constructor(db, link, relationships = {}, context) {
    this.db = db;

    this.type = link.TYPE;
    this.plural = link.PLURAL;
    this.link = link.LINK;
    this.canModify = link.CANMODIFY || false;
    this.child = link.CHILD;
    this.join = link.JOIN;
    this.relationships = relationships;
    this.context = context;
  }

  async toLink(object, ModelPath) {
    // eslint-disable-next-line default-case
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
    return object;
  }

  async fromLink(object) {
    // eslint-disable-next-line default-case
    switch (this.type) {
      case '1TO1':
        return this.from1TO1(object);
    }
    return object;
  }

  async toMTOM(object) {
    if (this.relationships[this.join]) {
      object.links[this.plural] = this.relationships[this.join];
      return object;
    }
    // with join table
    const condition = {
      [this.child]: object.id,
    };
    const rec = await this.db.FINDLINKS(this.join, condition, this.link);
    object.links[this.plural] = rec.map((v) => v[this.link]);
    return object;
  }

  async to1TOM(object, ModelPath) {
    // m2o
    const condition = {
      [this.link]: object.id,
    };
    const ClassConstructor = require(`${ModelPath}/models/${this.plural}`);

    if (this.relationships[ClassConstructor.TABLE]) {
      object.links[this.plural] = this.relationships[ClassConstructor.TABLE];
      return object;
    }

    const classInstance = new ClassConstructor();
    classInstance.setContext(this.context);
    const rec = await classInstance.SELECT(condition, 'id');
    object.links[this.plural] = rec.map((v) => v.get('id'));
    return object;
  }

  async to1TO1(object) {
    // this would be in record, so its okay to convert it
    let id;
    if (!object[this.link]) {
      return object;
    }
    id = object[this.link];
    // int conversion because some of them are int(11) in mysql
    // eslint-disable-next-line no-restricted-globals
    if (isNaN(parseInt(id, 10)) === false) {
      id = parseInt(id, 10);
    }
    object.links[this.plural] = id;
    delete object[this.link];
    return object;
  }

  async from1TO1(object) {
    object[this.link] = object.links[this.plural];
    return object;
  }
}

module.exports = Link;
