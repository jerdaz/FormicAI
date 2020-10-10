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
        /**@type {{[index:string] : {operationId:number, count:number, template:CreepTemplate}}} */
        this._spawnRequests = {};
    }

    get type() {return c.OPERATION_SHARDSPAWNING}

    _firstRun() {
        this._support();
    }

    _support() {
        //determin new base for shard spawning
        let baseOps = this._shardOp.baseOps;
        let baseOp = this._shardOp.getBaseOpNoNullCheck(this._spawnBase);
        /**@type {SpawningOp|null} */
        let oldSpawningOp = null;
        /**@type {SpawningOp|null} */
        let newSpawningOp = null;
        if (baseOp) oldSpawningOp = baseOp.spawningOp;
        this._spawnBase = baseOps.keys().next().value;
        baseOp = this._shardOp.getBaseOpNoNullCheck(this._spawnBase);
        if (baseOp) newSpawningOp = baseOp.spawningOp;

        // if new spawning op is not equal, move the requests to the new spawning base
        if (oldSpawningOp != newSpawningOp) {
            for (let spawnRequestId in this._spawnRequests) {
                let spawnRequest = this._spawnRequests[spawnRequestId];
                if (oldSpawningOp) oldSpawningOp.ltRequestSpawn(this._shardOp.getOp(spawnRequest.operationId), spawnRequest.template, 0)
                if (newSpawningOp) newSpawningOp.ltRequestSpawn(this._shardOp.getOp(spawnRequest.operationId), spawnRequest.template, spawnRequest.count)
            }
        }
    }

    /**
     * @param {ShardChildOp} operation
     * @param {CreepTemplate} template
     * @param {number} count */
    ltRequestSpawn(operation, template, count) {
        let baseOp = this._shardOp.getBaseOp(this._spawnBase);
        //if spawningOp is not valid, try running support to find a new spawning base, otherwise cancel
        if (!baseOp) {
            this._support();
            baseOp = this._shardOp.getBaseOp(this._spawnBase)
            if (!baseOp) return;
        }
        let spawningOp = baseOp.spawningOp;
        this._spawnRequests[operation.id] = {operationId:operation.id, count:count, template: template};
        spawningOp.ltRequestSpawn(operation, template, count);
    }
    
}

