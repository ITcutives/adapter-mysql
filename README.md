# adapter-mysql
This repo contains MySQL adapter for ITcutives Serverless Framework

## Usage

### Install

```bash
npm install @itcutives/adapter-mysql
```

### Connection

**connection-provider.js**

```javascript
const Adapter = require('../src/adapter');
const Connect = require('../src/connection');

class MySQL extends Adapter {
  static CONNECT(config) {
    if (!MySQL.CONN) {
      MySQL.CONN = new Connect(config);
    }
    return Promise.resolve(MySQL.CONN);
  }
}

module.exports = MySQL;
```

### Model

**user.js**

```javascript
const Abstract = require('./connection-provider');

class User extends Abstract {
  /**
   * @returns {string}
   */
  static get PLURAL() {
    return 'users';
  }

  /**
   * @returns {string}
   */
  static get TABLE() {
    return 'user';
  }

  /**
   * @returns {Array}
   */
  static get FIELDS() {
    return ['id', 'name', 'type', 'attributes'];
  }
  
  /**
   * @returns {{}}
   */
  static get SERIALIZED() {
    return {
      "attributes": "json",
    };
  }
}

module.exports = User;
```

### CRUD

```javascript
/* eslint-disable no-console */
const User = require('./user');

async function init() {
  let records;
  let found;
  let changes;

  await User.CONNECT({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'serverless',
    connectionLimit: 2,
  });

  const user = new User({ type: 'ADMIN', name: 'itcutives', attributes: { phone: '1234-5678' } });
  const insertId = await user.INSERT();

  console.log(`Inserted record with id ${insertId}.`);

  const conditions = [{
    field: 'id',
    operator: '=',
    value: insertId,
    condition: 'AND',
  }];
  records = await user.SELECT(conditions);

  [found] = records;
  console.log(`Found record with name '${found.get('name')}'.`);

  found.set('name', 'new name');
  changes = await found.UPDATE();
  console.log(`Updated ${changes} records.`);

  records = await user.SELECT();
  [found] = records;
  console.log(`Found record with name '${found.get('name')}'.`);

  changes = await found.DELETE();
  console.log(`Deleted ${changes} records.`);

  records = await user.SELECT();
  console.log(`Found ${records.length} records.`);
}

init();
```

## API

### Conditions Engine

**Example 1:**

```js
let condition = {
  "name": "ashish",
  "type": {
    "field": "type",
    "operator": "in",
    "value": ["ADMIN", "SUPER", "USER"]
  }
};
```

builds

```sql
  WHERE `name` = ? AND `type` IN (?, ?, ?)
  -- arguments: ["ashish", "ADMIN", "SUPER", "USER"]
```

**Example 2:**

```js
let condition = [
  {
    "field": "id",
    "value": 1
  },
  {
    "field": "type",
    "operator": "!=",
    "value": "ADMIN",
    "condition": "OR"
  }
] 
```

builds

```sql
  WHERE `id` = ? OR `type` != ?
  -- arguments: [1, "ADMIN"]
```

**Example 3:**

```js
let condition = {
  "attributes": {
    "field": "attributes.email",
    "operator": "in",
    "value": ["ashish@test.com", "manish@test.com"],
  },
}
```

builds

```sql
  WHERE `attributes`->>"$.email" IN (?, ?)
  -- arguments: ["ashish@test.com", "manish@test.com"]
```

**Example 4:**

```js
let condition = [
  {
    "field": "id",
    "operator": "between",
    "value": [10, 20]
  },
  {
    "field": "y",
    "operator": "regexp",
    "value": "/find/",
    "condition": "OR"
  },
  {
    "field": "name",
    "operator": "like",
    "value": "%abc%"
  }
]
```

builds

```sql
  WHERE `id` BETWEEN (?, ?) OR `y` REGEXP ? AND `name` LIKE '%abc%'
  -- arguments: [10, 20, "/find/"]
```

### Values/Changes

The adapter takes care of serialisation/deserialisation defined under

```js
  /**
   * @returns {{}}
   */
  static get SERIALIZED() {
    return {
      "attributes": "json",
    };
  }
```

takes

```js
let object = {
  "name": "ashish",
  "attributes": {
    "email": "ashish@test.com",
    "phone": "0412123456"
  }
};
```

and converts to

```js
let object = {
  "a": "1",
  "b": "2",
  "c": "{\"email\":\"ashish@test.com\",\"phone\":\"0412123456\"}"
};
```
