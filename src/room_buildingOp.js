const U = require('./util');
const c = require('./constants');
const RoomChildOp = require('./room_childOp');


module.exports = class BuildingOp extends RoomChildOp {
    /**@param {RoomOp} roomOp */
    constructor(roomOp) {
        super(roomOp);
        this._creepRequestCount = 0;
        this._buildWork = false;
        this._verbose = false;
    }
    get type() {return c.OPERATION_BUILDING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let creepCount = 0;
        let maxLength = 45;
        let room = this._roomOp.room;
        if (!room) return;
        let constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)
        let repairSites = this._repairSites(true)

        let buildWork = false;
        if (repairSites.length > 0 || constructionSites.length >0 ) buildWork = true;
        
        if (!this.isMainRoom) { // no need for upgraders in subrooms
            creepCount = 0;
        }
        else if (!buildWork && this.baseOp.phase >= c.BASE_PHASE_CONTROLLER_LINK) { // no need for builders if no build work 
            creepCount = 0;
        }
        else if (this.baseOp.storage && this.baseOp.storage.isActive) { //spawn for upgrading & building together when not in controller link phase. always spawn at least 1
            let energy = this.baseOp.storage?this.baseOp.storage.store.energy:0;
            let controller = this.baseOp.base.controller;
            let energyReserve = c.ENERGY_RESERVE * Math.max(  controller.level - 3, 1)/5 
            creepCount = Math.floor((energy - energyReserve) / (MAX_CREEP_SIZE / 3 * UPGRADE_CONTROLLER_POWER * CREEP_LIFE_TIME))
            // }
            if (creepCount <0) creepCount = 0;
            if (buildWork && creepCount <= 1) {
                creepCount = 1;
            }
        // always try to spawn 1 builder to continue build work if storage is not large enough
            if (creepCount == 1 ) {
                // scale down the size of the worker in case energy is low to prevent completely draining the energy reserve
                maxLength = Math.floor(energy / 4000) * 3
                creepCount = (maxLength==0)?0:1;
            }
        } else if (this._roomOp.name == this._baseOp.name) {
            creepCount = 20;
        }
        
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,WORK,CARRY],maxLength:maxLength}, creepCount)
        this._creepRequestCount = creepCount;
    }

    _tactics() {

        let level = this._baseOp.base.controller.level
        let room = this._roomOp.room;
        if (!room) return;
        let constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)
        let repairSites = this._repairSites();

        // update variable for repair work
        if (repairSites.length > 0 || constructionSites.length >0 ) this._buildWork = true;
        else this._buildWork = false;

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let creep = Game.creeps[creepName];
            if (!creep) throw Error();
            if (creepOp.instruction == c.COMMAND_NONE && room.name == this._baseOp.name && !this._buildWork) creepOp.instructUpgradeController(this._baseOp.name);
            else if (!this._buildWork) creepOp.newParent(this._baseOp.buildingOp); //reassign to base building op if current subroom doesn't have build work
            else if (creepOp.instruction != c.COMMAND_BUILD && creepOp.pos.roomName == this._roomOp.roomName && this._buildWork) {
                creepOp.instructBuild()
            }
        }
    }

    /**@param {boolean} [forSpawn] find repairsite for spawning a building creep */
    _repairSites  (forSpawn) {
        let room = this._roomOp.room;
        let level = this._baseOp.base.controller.level
        let result = room.find(FIND_MY_STRUCTURES, {filter: o => {
            if (o.structureType == STRUCTURE_RAMPART && !o.pos.isEqualTo(this._baseOp.centerPos)) {
                let structures = o.pos.lookFor(LOOK_STRUCTURES);
                _.remove(structures,{structureType:STRUCTURE_ROAD});
                if (structures.length <=1) return false;
            }
            return o.hits < o.hitsMax && o.hits < this._baseOp.basePlanOp.maxWallHeight * (forSpawn?0.5:1)
        }}
        )       
        return result; 
    }
}
