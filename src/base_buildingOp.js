const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');


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
        let constructionSites = this._baseOp.base.find(FIND_MY_CONSTRUCTION_SITES)
        let structureSites = constructionSites.filter(o => {return o.structureType != STRUCTURE_ROAD && o.structureType != STRUCTURE_RAMPART})
        if (constructionSites.length > 0) creepCount = 1;
        if (structureSites.length > 0 ) creepCount = 2;
        else if (level >= 2 
             && this._baseOp.base.find(FIND_MY_STRUCTURES, {filter: o => {return o.hits < c.MAX_WALL_HEIGHT * RAMPART_HITS_MAX[level] 
                                                                              && o.hits < Math.max(o.hitsMax - REPAIR_POWER * MAX_CREEP_SIZE / 3 * CREEP_LIFE_TIME, o.hitsMax / 2)}}
                                      ).length>0
                ) {
            creepCount = 1;
        }
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,WORK,CARRY]}, creepCount)
        this._creepRequestCount = creepCount;
    }

    _tactics() {
        let constructionCount = this._baseOp.base.find(FIND_CONSTRUCTION_SITES).length
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            if (creepOp.instruction == c.COMMAND_NONE && creepOp.pos.roomName != this._baseOp.name) creepOp.instructMoveTo(this._baseOp.centerPos);
            else if (creepOp.instruction == c.COMMAND_NONE && constructionCount == 0) creepOp.instructUpgradeController(this._baseOp.name);
            else if (creepOp.instruction != c.COMMAND_BUILD) creepOp.instructBuild()
        }
    }
}
