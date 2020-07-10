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
        let level = this._baseOp.base.controller.level
        let room = this._roomOp.room;
        if (!room) return;
        let constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)
        let repairSites = room.find(FIND_MY_STRUCTURES, {filter: o => {
            return  o.hits < c.MAX_WALL_HEIGHT * RAMPART_HITS_MAX[level] 
                 && o.hits < Math.max(o.hitsMax - REPAIR_POWER * MAX_CREEP_SIZE / 3 * CREEP_LIFE_TIME, o.hitsMax / 2)
            }}
            )

        // update variable for repair work
        if (repairSites.length > 0 || constructionSites.length >0 ) this._buildWork = true;
        else this._buildWork = false;

        if (this.baseOp.phase >= c.BASE_PHASE_CONTROLLER_LINK || !this.isMainRoom) { //upgrading Op takes over. max 1 builder
            if (constructionSites.length > 0 ||
                repairSites.length > 0) {
                creepCount = 1;
            }
        }

        else if (this.baseOp.storage) { //spawn for upgrader & building together
            let energy = this.baseOp.storage.store.energy;
            let controller = this.baseOp.base.controller;
            creepCount = Math.floor((energy - c.ENERGY_RESERVE / 5 * (controller.level - 3)) / (MAX_CREEP_SIZE / 3 * UPGRADE_CONTROLLER_POWER * CREEP_LIFE_TIME))
        } else {
            creepCount = 20;
        }
        
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,WORK,CARRY]}, creepCount)
        this._creepRequestCount = creepCount;
    }

    _tactics() {

        let level = this._baseOp.base.controller.level
        let room = this._roomOp.room;
        if (!room) return;
        let constructionSites = room.find(FIND_MY_CONSTRUCTION_SITES)
        let repairSites = room.find(FIND_MY_STRUCTURES, {filter: o => {
            return  o.hits < c.MAX_WALL_HEIGHT * RAMPART_HITS_MAX[level] 
                 && o.hits < Math.max(o.hitsMax - REPAIR_POWER * MAX_CREEP_SIZE / 3 * CREEP_LIFE_TIME, o.hitsMax / 2)
            }}
            )

        // update variable for repair work
        if (repairSites.length > 0 || constructionSites.length >0 ) this._buildWork = true;
        else this._buildWork = false;
        U.l({buildtacticsroom: this.roomName, repairSite:repairSites.length, constructionSites: constructionSites.length, buildwork: this._buildWork})

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let creep = Game.creeps[creepName];
            if (!creep) throw Error();
            if (creepOp.pos.roomName == this._baseOp.name && !this._buildWork) creepOp.instructUpgradeController(this._baseOp.name);
            else if (creepOp.instruction != c.COMMAND_BUILD && creepOp.pos.roomName == this._roomOp.roomName && this._buildWork) {
                creepOp.instructBuild()
            }
        }
    }
}
