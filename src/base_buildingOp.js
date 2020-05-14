const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

const MAX_WALL_HEIGHT = 0.01;

module.exports = class BuildingOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        this._creepRequestCount = 0;
    }
    get type() {return c.OPERATION_BUILDING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let creepCount = 0;
        let level = this._baseOp.base.controller.level
        let constructionCount = this._baseOp.base.find(FIND_CONSTRUCTION_SITES).length
        if (constructionCount > 0) creepCount = 8;
        else if (level >= 2 
             && this._baseOp.base.find(FIND_MY_STRUCTURES, {filter: o => {return o.hits < MAX_WALL_HEIGHT * RAMPART_HITS_MAX[level] 
                                                                              && o.hits < Math.max(o.hitsMax - REPAIR_POWER * MAX_CREEP_SIZE / 3 * CREEP_LIFE_TIME, o.hitsMax / 2)}}
                                      ).length>0
                ) {
            creepCount = 1;
        }
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, creepCount)
        this._creepRequestCount = creepCount;
    }

    _tactics() {
        let transferedToUpgradingThisTick = false;
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            if (creepOp.instruction != c.COMMAND_TRANSFER)  
            {
                /**@type {Structure|ConstructionSite|null}  */
                let dest = creepOp.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                if (!dest) {
                    let structures = this._baseOp.base.find(FIND_STRUCTURES, {filter: o => {
                        return o.hits < o.hitsMax - REPAIR_POWER * MAX_CREEP_SIZE / 3
                    }});
                    structures.sort((a,b) => {return a.hits - b.hits});
                    dest = structures[0];
                }
                if (dest) creepOp.instructFill(dest);
                else if (this.creepCount > this._creepRequestCount && !transferedToUpgradingThisTick) {
                    creepOp.newParent(this._baseOp.upgradingOp);
                    transferedToUpgradingThisTick = true;
                }

            }
        }
    }
}
