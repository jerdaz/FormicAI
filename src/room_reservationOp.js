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
        if (!this.isMainRoom ) {
            let roomInfo = this._map.getRoomInfo(this._roomOp.roomName)
            if (roomInfo) {
                let creepCount = 0;
                if (roomInfo.level > 1 || roomInfo.activeTowers > 0  ) creepCount = 0
                else if (roomInfo.reservation==0) creepCount = 1;
                else if (!roomInfo.hostileOwner
                    && roomInfo.reservation < CONTROLLER_RESERVE_MAX - CREEP_CLAIM_LIFE_TIME) {
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
