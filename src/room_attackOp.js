const U = require('./util');
const c = require('./constants');
const RoomChildOp = require('./room_childOp');

const MAX_ATTACK_LENGTH = 50000
const ATTACK_RETRY_TIME = 1000000

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

        let attackLevel = 0;
        let lastAttackTicks = Game.time - ( Memory.rooms[this.roomName].attackStartTime||0);
        let scoutInfo = this._map.getRoomInfo(this.roomName);
        if (!scoutInfo) {
            this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE], maxLength:1},1)
            return;
        }
        
        // check for attack level 1
        if (scoutInfo.hostileOwner
            && !scoutInfo.safeMode
            && scoutInfo.activeTowers <= 0
            && (lastAttackTicks < MAX_ATTACK_LENGTH || lastAttackTicks > ATTACK_RETRY_TIME)
            ) 
        {
            attackLevel = 1 ;
            if (!Memory.rooms[this.roomName].attackStartTime || lastAttackTicks > ATTACK_RETRY_TIME) Memory.rooms[this.roomName].attackStartTime = Game.time;
        }

        // spawn attackers
        let creepCount = 0;
        let body = [MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK,ATTACK,ATTACK,HEAL]
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
