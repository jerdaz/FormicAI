const U = require('./util');
const c = require('./constants');
const RoomChildOp = require('./room_childOp');

const MAX_ATTACK_LENGTH = 500000
const ATTACK_RETRY_TIME = 5000000
const GUARD_TIME = 1300

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
            //this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE], maxLength:1},1)
            return;
        }
        
        // check for attack level 1
        // no defense, but there are still ramparts
        if (scoutInfo.hasRamparts
            && !scoutInfo.safeMode
            && scoutInfo.activeTowers <=0
            && scoutInfo.lastSeenHostile < Game.time - 1500) {
                attackLevel = 1;

        }

        // check for attack level 2
        // no defense but still owned

        if (
                (   scoutInfo.hostileOwner
                    && !scoutInfo.safeMode
                    && scoutInfo.level >= 1
                    && scoutInfo.activeTowers <= 0
                    && (lastAttackTicks < MAX_ATTACK_LENGTH || lastAttackTicks > ATTACK_RETRY_TIME)
                )
            ) 
        {
            attackLevel = 2 ;
            if (!Memory.rooms[this.roomName].attackStartTime || lastAttackTicks > ATTACK_RETRY_TIME) Memory.rooms[this.roomName].attackStartTime = Game.time;
        }

        //defend own rooms
        if             
        (
            scoutInfo.my
            && (scoutInfo.invasion || scoutInfo.lastSeenHostile == scoutInfo.lastSeen || Game.time - scoutInfo.lastSeenHostile <= GUARD_TIME)
        )
        {
            attackLevel = 2 ;
        }

        // spawn attackers
        let creepCount = 0;
        /**@type {BodyPartConstant[]} */
        let body = [];
        let minLength = 3;
        switch (attackLevel) {
            case 1:
                creepCount = 1;
                body = [MOVE, WORK, WORK]
                break;
            case 2:
                body = [MOVE,MOVE,MOVE,RANGED_ATTACK,RANGED_ATTACK,HEAL]
                creepCount = 1;
                minLength = 6
                break;
        }
        
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:body, minLength: minLength}, creepCount)

    }

    _tactics() {
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let creep = creepOp.creep;
            let scoutInfo = this._map.getRoomInfo(this.roomName);
            if (scoutInfo &&
                scoutInfo.lastSeen - scoutInfo.lastSeenHostile > 1500 && 
                scoutInfo.invasion == false &&
                scoutInfo.hostileOwner == false
                )
                {
                    creepOp.instructRecycle();
                }
            else if (creepOp.instruction == c.COMMAND_NONE || creepOp.instruction == c.COMMAND_RECYCLE) {
                creepOp.instructAttack(this.roomName);
            }
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
