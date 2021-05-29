const U = require('./util');
const c = require('./constants');
const RoomChildOp = require('./room_childOp');

module.exports = class AttackOp extends RoomChildOp {
    /**@param {RoomOp} roomOp
     */
    constructor(roomOp) {
        super(roomOp);
    }
    get type() {return c.OPERATION_ATTACK}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        if (this.isMainRoom) return;
        let room = this._roomOp.room;
        let controller = room.controller
        if (!controller) return;

        let attackLevel = 0;
        
        // check for attack level 1
        if (controller.owner 
            && controller.owner != this._baseOp.base.controller.owner
            && !controller.safeMode
            ) 
        {
            let towers = room.find(FIND_HOSTILE_STRUCTURES, {filter: o => {o.structureType == STRUCTURE_TOWER && o.isActive && o.store.getUsedCapacity(RESOURCE_ENERGY) >= TOWER_ENERGY_COST}})
            if (_.size(towers) == 0 ) attackLevel = 1 ;
        }

        // spawn attackers
        let creepCount = 0;
        let body = [MOVE,MOVE,MOVE,RANGED_ATTACK,ATTACK,HEAL]
        if (attackLevel == 1) creepCount = 1;
        
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:body, minLength: 6}, creepCount)

    }

    _tactics() {
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let creep = creepOp.creep;
            if (creepOp.instruction == c.COMMAND_NONE) creepOp.instructAttack(this.roomName);
            /*
            if (creep.pos.roomName != this.roomName) creepOp.instructMoveTo(this.roomName);
            else if (creep.room.controller && creep.room.controller.owner && this._baseOp.base.controller.owner && creep.room.controller.owner.username != this._baseOp.base.controller.owner.username) {
                let target = creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES,{filter: o=> {o.structureType == STRUCTURE_TOWER}})
                if (!target) creep.pos.findClosestByPath(FIND_HOSTILE_CREEPS)
                if (!target) creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES,{filter: o => {o.structureType == STRUCTURE_SPAWN}})
                if (!target) creep.pos.findClosestByPath(FIND_HOSTILE_STRUCTURES)
                if (!target) creep.pos.findClosestByPath(FIND_STRUCTURES)
                creepOp.instructAttack(target);
            }
            */
        }
    }
}
