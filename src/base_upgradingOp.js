const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

const ENERGY_RESERVE = 0.1 * STORAGE_CAPACITY
const REDUCE_UPGRADER_COUNT_LEVEL = 6
const MAX_UPGRADER_COUNT = 20
const DOWNGRADE_RESERVE = 0.75

module.exports = class UpgradingOp extends BaseChildOp {
    get type() {return c.OPERATION_UPGRADING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let controller = this.baseOp.base.controller;
        let link = controller.pos.findInRange(FIND_MY_STRUCTURES,4,{filter: {structureType: STRUCTURE_LINK}})[0];
        if (this.baseOp.phase < c.BASE_PHASE_HARVESTER /*&& this.baseOp.base.controller.level < REDUCE_UPGRADER_COUNT_LEVEL*/) this.baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CARRY,WORK]}, 15)
        else if (this.baseOp.storage) {
            let energy = this.baseOp.storage.store.energy;
            let body = [MOVE,WORK,CARRY];
            let maxSize = MAX_CREEP_SIZE;
            if (link) body = [MOVE,MOVE,CARRY,WORK,WORK,WORK,WORK];
            let workerCount = Math.floor((energy - ENERGY_RESERVE / 8 *controller.level ) / (MAX_CREEP_SIZE / 3 * UPGRADE_CONTROLLER_POWER * CREEP_LIFE_TIME))
            if (workerCount < 0) workerCount = 0;
            if (this.baseOp.phase >= c.BASE_PHASE_EOL) {
                if (workerCount > 1) workerCount = 1;
                maxSize = Math.ceil(CONTROLLER_MAX_UPGRADE_PER_TICK / 4) * 7 
            }
            if (workerCount < 1 && this.baseOp.base.controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[1]*DOWNGRADE_RESERVE) workerCount = 1;
            this.baseOp.spawningOp.ltRequestSpawn(this, {body:body, maxLength: maxSize}, workerCount)
        }

        if(this.baseOp.phase >= c.BASE_PHASE_CONTROLLER_LINK) {
            let link = controller.pos.findInRange(FIND_MY_STRUCTURES,4,{filter: {structureType: STRUCTURE_LINK}})[0];
            if (!link) {
                let result = PathFinder.search(controller.pos, this.baseOp.centerPos)
                let pos = result.path[2];
                let structures = pos.lookFor(LOOK_STRUCTURES)
                for(let structure of structures) if (structure.structureType != STRUCTURE_ROAD) structure.destroy();
                pos.createConstructionSite(STRUCTURE_LINK);
            }
        }
    }

    _tactics() {
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let creep = creepOp.creep;
            let lab = this.baseOp.labs[0];
            if (lab && !creepOp.isBoosted && creepOp.age <=100 && lab.store[RESOURCE_CATALYZED_GHODIUM_ACID] >= LAB_BOOST_MINERAL) {
                let result = lab.boostCreep(creepOp.creep)
                switch(result) {
                    case OK:
                        creepOp.isBoosted = true;
                        return;
                    case ERR_NOT_IN_RANGE:
                        creepOp.instructMoveTo(lab.pos);
                        return;
                }
                
            } else {
                let dest = creepOp.dest;
                if (!(dest instanceof StructureController)
                || (creepOp.instruction != c.COMMAND_TRANSFER) )
                {
                    let dest = this._baseOp.base.controller;
                    if (dest) creepOp.instructFill(dest);
                }
            }
        }
    }
}
