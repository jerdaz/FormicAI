const U = require('./util');
const c = require('./constants');
const ChildOp = require('./meta_childOp');
const CreepOp = require('./shard_creepOp');

module.exports = class ShardChildOp extends ChildOp {
    /**
     * @param {ShardOp}  shardOp
     * @param {Operation}  parent
     * @param {BaseOp} [baseOp] 
     * @param {Number} [instance]*/
    constructor(parent, shardOp, baseOp, instance) {
        super(parent);
        this._shardOp = shardOp;
        this._map = shardOp._map;
        this._baseOp = baseOp;
        this._instance = instance || 0
        /**@type {{[creepName:string]:CreepOp}} */
        this._creepOps = {}
        let baseName = '';
        if (baseOp) baseName = baseOp.name;
        else baseName = shardOp.name;
        shardOp.addOperation(this, baseName)
    }

    get instance() {return this._instance}

    get shardOp() {return this._shardOp};

    get creepCount(){
        let res = _.size(this._creepOps)
        if (!res) res = 0;
        return res;
    }

    initTick() {
        super.initTick();
        //remove dead creeps from runtime
        for (let creepName in this._creepOps) {
            if (Game.creeps[creepName] == undefined) {
                this.removeChildOp(this._creepOps[creepName])
            }
        }
    }

    /**@param {ChildOp} childOp */
    addChildOp(childOp) {
        super.addChildOp(childOp);
        if (childOp.type == c.OPERATION_CREEP) {
            let creepOp = /**@type {CreepOp} */ (childOp);
            this._creepOps[creepOp.name] = creepOp; 
            let creep = creepOp.creep;
            creep.memory.baseName = this._baseOp?.name;
            creep.memory.operationType = this.type;
            creep.memory.operatonInstance = this.instance;
        }

    }

    /**@param {ChildOp} childOp */
    removeChildOp(childOp) {
        super.removeChildOp(childOp);
        if (childOp.type == c.OPERATION_CREEP) delete this._creepOps[childOp.name];
    }

    

    /**@param {Creep} creep */
    initCreep(creep) {
        if (this._creepOps[creep.name] == undefined) {
            this.addChildOp(new CreepOp(this, this._shardOp, this._baseOp, this._map, creep))
            this._runTactics = true;
        }
        this._creepOps[creep.name].initTickCreep(creep);
    }

}

