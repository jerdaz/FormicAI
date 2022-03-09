const U = require('./util');
const c = require('./constants');
const ShardChildOp = require('./shard_childOp');

const MAX_ATTACK_LENGTH = 500000
const ATTACK_RETRY_TIME = 5000000
const GUARD_TIME = 1300

module.exports = class AttackOp extends ShardChildOp {
    /**
     * @param {string} roomName
     * @param {ShardOp}  shardOp
     * @param {Operation}  parent
     * @param {BaseOp} baseOp
     * @param {RoomOp} [roomOp]
     * */
    constructor(roomName, parent, shardOp, baseOp, roomOp) {
        super(parent, shardOp, baseOp, roomOp,0,roomName);
        this._baseOp = baseOp;
        this._roomName = roomName;
    }
    get type() {return c.OPERATION_ATTACK}
    get roomName() {return this._roomName}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        // don't attack own room
        if (this._baseOp && this.roomName == this._baseOp.name) return;

        let attackLevel = 0;
        let attackStartTime =0;
        if (Memory.rooms[this.roomName]) attackStartTime = Memory.rooms[this.roomName].attackStartTime||0
        let lastAttackTicks = Game.time - attackStartTime;
        let scoutInfo = this._map.getRoomInfo(this.roomName);
        if (!scoutInfo) {
            //this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE], maxLength:1},1)
            return;
        }

        let safeModeNow = (scoutInfo.safeMode||0 - Game.time + scoutInfo.lastSeen) <= 0;
        
        // check for attack level 1
        // no defense, but there are still structures
        if (scoutInfo.hasStructures
            && !safeModeNow
            && scoutInfo.activeTowers <=0
            && (scoutInfo.lastSeenAttacker||0) < Game.time - 1500) {
                attackLevel = 1;

        }

        // check for attack level 2
        // no defense but still owned

        if (
                (   scoutInfo.hostileOwner
                    && !safeModeNow
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
            && (scoutInfo.invasion || scoutInfo.lastSeenAttacker == scoutInfo.lastSeen || Game.time - scoutInfo.lastSeenAttacker <= GUARD_TIME)
        )
        {
            attackLevel = 2 ;
        }

        // spawn attackers
        let creepCount = 0;
        /**@type {BodyPartConstant[]} */
        let body = [];
        let minLength = 3;
        let noSort=false;
        switch (attackLevel) {
            case 1:
                creepCount = 1;
                body = [MOVE, WORK, WORK]
                break;
            case 2:
                body = [RANGED_ATTACK,MOVE,RANGED_ATTACK,MOVE,HEAL,MOVE]
                creepCount = 1;
                minLength = 2;
                noSort=false;
                break;
        }
        
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:body, minLength: minLength, noSort: noSort}, creepCount)

    }

    _tactics() {
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let creep = creepOp.creep;
            let scoutInfo = this._map.getRoomInfo(this.roomName);
            if (scoutInfo &&
                scoutInfo.lastSeen - scoutInfo.lastSeenAttacker > 1500 && 
                scoutInfo.invasion == false &&
                scoutInfo.hostileOwner == false &&
                scoutInfo.hasStructures == false
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
