const U = require('./util');
const c = require('./constants');
const ShardChildOp = require('./shard_childOp');

module.exports = class ShardDefenseOp extends ShardChildOp {
    /** @param {ShardOp} shardOp */
    constructor(shardOp) {
        super(shardOp, shardOp);
        /**@type {string[]} */
        this._guardRooms = []
        this._nextRoom = ''
    }

    get type() {return c.OPERATION_SHARDDEFENSE}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let creepCount=0;
        let subRooms = this._shardOp.subRooms;
        this._guardRooms = []
        for (let subRoomName in subRooms) {
            let room = Game.rooms[subRoomName]
            if (room && room.controller && room.controller.reservation && room.controller.reservation.username == this._shardOp.userName) {
                creepCount = 1;
                this._guardRooms.push(subRoomName)
            }
        }
        this._shardOp.spawningOp.ltRequestSpawn(this,{body:[MOVE,MOVE,RANGED_ATTACK,HEAL],minLength:3}, creepCount)

        //predict next room that will be attacked
        let nextRoom = ''
        let lastInvasion = -1
        for (let guardRoom of this._guardRooms) {
            let roomInfo = this._map.getRoomInfo(guardRoom);
            if (!roomInfo) continue;
            if (roomInfo.invasionEnd > lastInvasion) {
                lastInvasion = roomInfo.invasionEnd;
                nextRoom = guardRoom;
            }
        }
        this._nextRoom = nextRoom

    }

    _tactics() {
        /**@type {string[]} */
        let defendRooms = [];
        for (let roomName of this._guardRooms) {
            let roomInfo = this._map.getRoomInfo(roomName);
            if (roomInfo && roomInfo.invasion) defendRooms.push(roomName);
        }

        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            let pos = creepOp.pos;
            if (defendRooms.length == 0 && this._nextRoom ) creepOp.instructAttack(this._nextRoom)
            else if (defendRooms.length > 0) {
                let roomName = this._map.findClosestRoomByPath(defendRooms, pos.roomName)
                if (roomName) creepOp.instructAttack(roomName)
                else throw Error ('cant find path to invaded room')
            }
        }
    }
}

