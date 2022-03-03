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
        let constructionSites = _.filter(Game.constructionSites, (site => site.pos.roomName == this._roomName) )
        let repairSites = this._repairSites(true)

        let buildWork = false;
        if (repairSites.length > 0 || constructionSites.length >0 ) buildWork = true;
        
        let roomInfo = this._map.getRoomInfo(this._roomName)
        if (roomInfo && (
            roomInfo.lastSeenAttacker >= Game.time - 1500
            || roomInfo.activeTowers >= 1
            || roomInfo.invasion == true
            )) {
                creepCount = 0 // don't spawn builders if we've recently seen hostiles
            }
        else if (!buildWork && (this.baseOp.phase >= c.BASE_PHASE_CONTROLLER_LINK || (roomInfo && roomInfo.level == 8))) { // no need for builders if no build work . if not in controller link phase, we do need builders for upgrading. at lvl 8 we never use builders for upgrading
            creepCount = 0;
        }
        else if (this.baseOp.storage && this.baseOp.storage.isActive) { //spawn for upgrading & building together when not in controller link phase. always spawn at least 1
            let energy = this.baseOp.storage?this.baseOp.storage.store.energy:0;
            let controller = this.baseOp.base.controller;
            let energyReserve = c.ENERGY_RESERVE * Math.max(  controller.level - 3, 1)/5 
            if (this.baseOp.directive == c.DIRECTIVE_FORTIFY) energyReserve = energyReserve / 3;

            if (this.isMainRoom) {
                creepCount = Math.floor((energy - energyReserve) / (MAX_CREEP_SIZE / 3 * UPGRADE_CONTROLLER_POWER * CREEP_LIFE_TIME))
                // }
                if (creepCount <0) creepCount = 0;
            }
            else {
                if (buildWork) creepCount = 1; //only need one in subroom
                else creepCount = 0; // no need for anything else in subrooms
            }

            if (buildWork && creepCount <= 1) {
                creepCount = 1;
            }
            if (this.baseOp.phase >= c.BASE_PHASE_CONTROLLER_LINK && creepCount >=3) creepCount = 3; // preven too many creeps when not using them for controller upgrading. It can block the roads around the buildwork.
            if (repairSites.length > 0 && constructionSites.length == 0) {
                 maxLength = 6; // spawn small repair creep if only repairing.
                 if (creepCount > 1) creepCount = 1;
            };
        
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
            if (creep.pos.roomName != room.name) creepOp.instructMoveTo(room.name);
            else if (room.name == this._baseOp.name && !this._buildWork && this._baseOp.base.controller.level < 8) creepOp.instructUpgradeController(this._baseOp.name);
            else if (room.controller && room.controller.my && room.controller.level <= 1) creepOp.instructUpgradeController(room.name);
            else if (!this._buildWork && this._baseOp.name != this._roomOp.name) {
                creepOp.newParent(this._baseOp.buildingOp); //reassign to base building op if current subroom doesn't have build work
                this._strategy(); // update number of requested creeps;            }
            }
            else if (creepOp.instruction != c.COMMAND_BUILD && creepOp.pos.roomName == this._roomOp.roomName && constructionSites.length>0 && creepOp.creep.store.energy == 0) { //stop upgrading if there are construction sites
                creepOp.instructBuild()
            }
            else if (creepOp.instruction == c.COMMAND_NONE && this._buildWork) creepOp.instructBuild(); //start building / repairing if there is buildwork
            else if (creepOp.instruction == c.COMMAND_NONE) {
                this._baseOp.spawningOp.ltRequestSpawn(this, {body:[]}, 0) // disable spawning of new creeps
                creepOp.instructRecycle();
            }
        }
    }

    /**@param {boolean} [forSpawn] find repairsite for spawning a building creep */
    _repairSites  (forSpawn) {
        let room = this._roomOp.room;
        if (!room) return [];
        let level = this._baseOp.base.controller.level
        let result = room.find(FIND_STRUCTURES, {filter: o => {
            if (o.structureType == STRUCTURE_RAMPART && !o.pos.isEqualTo(this._baseOp.centerPos)) {
                let structures = o.pos.lookFor(LOOK_STRUCTURES);
                _.remove(structures,{structureType:STRUCTURE_ROAD});
                if (structures.length <=1) return false;
            }
            if (o.structureType == STRUCTURE_ROAD) {
                if (!room) throw Error()
                let terrainArray = this._map.getBreadCrumbs(room.name);
                if (!terrainArray) return false;
                if (terrainArray[o.pos.x][o.pos.y].fatigueCost <= 0) return false;
            }
            if (o.structureType == STRUCTURE_CONTAINER) {
                if (o.pos.getRangeTo(this._baseOp.centerPos) > 1) return false; // only repair container in base center
            }
            return o.hits < o.hitsMax * c.REPAIR_FACTOR*c.REPAIR_FACTOR && o.hits < this._baseOp.basePlanOp.maxWallHeight * (forSpawn?0.5:1)

        }}
        )      
        return result; 
    }
}
