const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

const MAX_WALL_HEIGHT = 0.01;
const ROAD_IDLE_REPAIR_TIME = 100;

module.exports = class BuildingOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        this._creepRequestCount = 0;
        this._verbose = false;
    }
    get type() {return c.OPERATION_BUILDING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let creepCount = 0;
        let level = this._baseOp.base.controller.level
        let constructionCount = this._baseOp.base.find(FIND_CONSTRUCTION_SITES).length
        if (constructionCount > 0) creepCount = 2;
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
                if (!dest) { //repair normal structures
                    let structures = this._baseOp.base.find(FIND_MY_STRUCTURES, {filter: o => {
                        let needRepair = o.hits < o.hitsMax - REPAIR_POWER * MAX_CREEP_SIZE / 3 && o.hits < MAX_WALL_HEIGHT * RAMPART_HITS_MAX[this._baseOp.level] * 3;
                        if (!needRepair) return false;
                        else return true;
                    }});
                    structures.sort((a,b) => {return a.hits - b.hits});
                    dest = structures[0];
                }
                if (!dest) { // repair roads
                    let roads =this._baseOp.base.find(FIND_STRUCTURES, {filter: o => {
                        let needRepair = o.hits < o.hitsMax - REPAIR_POWER * MAX_CREEP_SIZE / 3;
                        if (!needRepair) return false;
                        if (o.structureType == STRUCTURE_ROAD) {
                            this._log({roadrepair: o.pos})
                            let roomInfo = this._map.getRoomInfo(this._baseOp.name);
                            if (!roomInfo) return false;
                            this._log({roadrepair: o.pos, terrain:roomInfo.terrainArray[o.pos.x][o.pos.y] })
                            if (roomInfo.terrainArray[o.pos.x][o.pos.y].fatigueCost <= 0) return false;
                            this._log('canrepair');
                            return true;
                        }
                        return false;
                    }});
                    dest = creepOp.pos.findClosestByPath(roads);
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
