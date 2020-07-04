const U = require('./util');
const c = require('./constants');
const ShardChildOp = require('./shard_childOp');

module.exports = class ShardSpawningOp extends ShardChildOp {
    /** @param {ShardOp} shardOp */
    constructor(shardOp) {
        super(shardOp, shardOp);
    }

    get type() {return c.OPERATION_SHARDDEFENSE}

    _firstRun() {
        
    }    
}

