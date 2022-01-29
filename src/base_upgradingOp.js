const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

const REDUCE_UPGRADER_COUNT_LEVEL = 6
const MAX_UPGRADER_COUNT = 20
const DOWNGRADE_RESERVE = 0.5

module.exports = class UpgradingOp extends BaseChildOp {
    get type() {return c.OPERATION_UPGRADING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let controller = this.baseOp.base.controller;
        let workerCount = 0;
        let body = [MOVE,CARRY,WORK,MOVE,WORK,WORK,WORK];
        let maxSize = MAX_CREEP_SIZE;

        //until controller link phase, buildingOp is responsible for upgrading
        if (this.baseOp.storage && this.baseOp.phase >= c.BASE_PHASE_CONTROLLER_LINK) {
            let energy = this.baseOp.storage.store.energy;
            workerCount = Math.floor((energy - c.ENERGY_RESERVE / 8 *controller.level ) / (MAX_CREEP_SIZE / 3 * UPGRADE_CONTROLLER_POWER * CREEP_LIFE_TIME))
            if (workerCount < 0) workerCount = 0;
            if (this.baseOp.phase >= c.BASE_PHASE_EOL) {
                if (workerCount > 1) workerCount = 1;
                maxSize = Math.ceil(CONTROLLER_MAX_UPGRADE_PER_TICK / 4 * 7 ) 
            }

            //create link construction site if necessary.
            let link = controller.pos.findInRange(FIND_MY_STRUCTURES,3,{filter: {structureType: STRUCTURE_LINK}})[0];
            if (!link) {
                let result = PathFinder.search(controller.pos, this.baseOp.centerPos)
                let pos = result.path[1];
                let structures = pos.lookFor(LOOK_STRUCTURES)
                for(let structure of structures) if (structure.structureType != STRUCTURE_ROAD) structure.destroy();
                pos.createConstructionSite(STRUCTURE_LINK);
            }
        }

        //spawn small upgrader to prevent controller downgrade
        if (workerCount < 1 && controller.ticksToDowngrade < CONTROLLER_DOWNGRADE[controller.level]*DOWNGRADE_RESERVE) {
            workerCount = 1;
            maxSize = 3;
        }
        this.baseOp.spawningOp.ltRequestSpawn(this, {body:body, maxLength: maxSize}, workerCount)

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
                if (creepOp.instruction != c.COMMAND_UPGRADE || creepOp.instruction != c.COMMAND_TRANSFER) 
                {
                    let link = this.baseOp.transportOp.controllerLink;
                    if (link) creepOp.instructUpgradeDirect(link, this.baseOp.base.controller)
                    else creepOp.instructUpgradeController(this._baseOp.name);
                }
            }
        }
    }
}
