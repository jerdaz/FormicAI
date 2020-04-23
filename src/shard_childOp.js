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
                delete this._creepOps[creepName];
            }
        }
    }

    /**@param {Creep} creep */
    initCreep(creep) {
        if (this._creepOps[creep.name] == undefined) {
            this._creepOps[creep.name] = new CreepOp(this, this._shardOp, this._baseOp, this._map, creep)
            this.addChildOp(this._creepOps[creep.name])
            this._runTactics = true;
        }
        this._creepOps[creep.name].initTickCreep(creep);
    }

}

