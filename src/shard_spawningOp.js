const U = require('./util');
const c = require('./constants');
const ShardChildOp = require('./shard_childOp');

//this operation handles spawning at the shard level.
// current implementation picks the top base to do all the spawning

module.exports = class ShardSpawningOp extends ShardChildOp {
    /** @param {ShardOp} shardOp */
    constructor(shardOp) {
        super(shardOp, shardOp);
        this._spawnBase = '';
    }

    get type() {return c.OPERATION_SHARDSPAWNING}

    _firstRun() {
        this._support();
    }

    _support() {
        let baseOps = this._shardOp.baseOps;
        this._spawnBase = baseOps.keys().next().value;
    }

    /**
     * @param {ShardChildOp} operation
     * @param {CreepTemplate} template
     * @param {number} count */
    ltRequestSpawn(operation, template, count) {

        let spawningOp = this._shardOp.getBaseOp(this._spawnBase).spawningOp;
        if (!spawningOp) return;
        spawningOp.ltRequestSpawn(operation, template, count);
        U.l({spawnbase:this._spawnBase})
    }
    
}

