const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

const SCOUT_INTERVAL = 1500;
const SCOUT_DISTANCE = 10;

module.exports = class ScoutOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        /**@type {{[creepName:string]: string}} */
        this._lastRoomName = {};
        this._lastSpawn = Game.time + Math.random() * SCOUT_INTERVAL;
    }

    get type() {return c.OPERATION_SCOUTING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let creepCount = 0;
        if (Game.time - this._lastSpawn > SCOUT_INTERVAL ) {
                creepCount = 1;
                this._lastSpawn = Game.time;
        } else 
        this._baseOp.spawningOp.ltRequestSpawn(this,{body: [MOVE], maxLength:1, minLength:1},creepCount);
    }

    _tactics() {
        for (let creepName in this._creepOps) {
            let lastRoomName = this._lastRoomName[creepName];
            let creepOp = this._creepOps[creepName]
            let room = creepOp.room;
            if (room.name != lastRoomName || creepOp.instruction != c.COMMAND_MOVETO) {
                /**@type {string | undefined} */
                let destRoomName
                let exits = /**@type {{[index:string]:string}} */(this._map.describeExits(room.name))
                let roomNames = [];
                for (let exit in exits) {
                    let roomName = exits[exit];
                    if (roomName == lastRoomName) continue;
                    if (Game.map.isRoomAvailable(roomName)) roomNames.push(exits[exit]);
                }
                roomNames.sort((a,b) => {
                        let scoutInfoA = this._map.getRoomInfo(a);
                        let scoutInfoB = this._map.getRoomInfo(b);
                        if (scoutInfoA && scoutInfoB) return scoutInfoB.lastSeen - scoutInfoA.lastSeen + Math.random() - 0.5;
                        return 0;
                    })
                if (roomNames.length > 0) destRoomName = roomNames.pop();
                else destRoomName = lastRoomName
                if (destRoomName) {
                    let dest = new RoomPosition(25, 25, destRoomName);
                    if (dest) creepOp.instructMoveTo(dest)
                    this._lastRoomName[creepName] = room.name;
                }
            }
        }
    }
}
