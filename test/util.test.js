const assert = require('assert');
const Util = require('../src/util');

global.WORK = 'work';
global.CARRY = 'carry';
global.MOVE = 'move';

global.BODYPART_COST = {
  [WORK]: 100,
  [CARRY]: 50,
  [MOVE]: 50,
};

assert.strictEqual(Util.getCreepCost([WORK, CARRY, MOVE]), 200);

console.log('All tests passed');
