const U = require('./util');
const c = require('./constants');
const RoomChildOp = require('./room_childOp');

module.exports = class ReservationOp extends RoomChildOp {
    /**@param {RoomOp} roomOp
     */
    constructor(roomOp) {
        super(roomOp);
    }
    get type() {return c.OPERATION_RESERVATION}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        if (!this.isMainRoom && this._roomOp.room) {
            let controller = this._roomOp.room.controller;
            if (controller) {
                let creepCount = 0;
                if (controller.level > 1 || this._roomOp.room.find(FIND_HOSTILE_STRUCTURES).length > 0) creepCount = 0
                else if (!controller.reservation) creepCount = 1;
                else if (controller.reservation.username == this._shardOp.userName 
                    && controller.reservation.ticksToEnd < CONTROLLER_RESERVE_MAX - CREEP_CLAIM_LIFE_TIME) {
                        creepCount = 1;
                }
                this._baseOp.spawningOp.ltRequestSpawn(this,{body:[MOVE,MOVE,CLAIM,CLAIM], maxLength:4, minLength:4}, creepCount)
            }
        } 
    }

    _tactics() {
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            if (creepOp.instruction != c.COMMAND_RESERVE) {
                creepOp.instructReserve(this.roomName)
            }
        }
    }
}
