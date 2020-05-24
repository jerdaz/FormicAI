const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

// time we try to colonize a room before trying another
const ROOM_CLAIM_TIMEOUT = 2000
// Max time we haven't seen a room for it to be a valid colonization target
const COLONIZE_LASTSEEN_TIME = 20000
// maximum lineair distance for colonization
const MAX_LINEAIR_COL_DISTANCE = 20
const MAX_PATH_COL_DISTANCE = 15


module.exports = class ColonizingOp extends BaseChildOp {
    /**
     * @param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        /**@type {{[creepName:string]: string}} */
        this._lastRoomName = {};
        /**@type {string|null} */
        this._colRoomName = null // room to colonize
        this._colStart = 0 // colonization start time
        if (!Memory.colonizations) Memory.colonizations = {};
        let lastColRoom = Memory.colonizations.lastColRoom
        if (lastColRoom && Memory.colonizations[lastColRoom] >= Game.time - ROOM_CLAIM_TIMEOUT) this._colRoomName = lastColRoom;
    }
    
    get type() {return c.OPERATION_COLONIZING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let nCreep = 0;
        if (this._baseOp.directive == c.DIRECTIVE_COLONIZE) {
            nCreep = 1;
            if (this._colRoomName == null || this._colStart + ROOM_CLAIM_TIMEOUT < Game.time) {
                this._colRoomName = this._findColRoom();
                if (this._colRoomName) {
                    Memory.colonizations[this._colRoomName] = Game.time;
                    Memory.colonizations.lastColRoom = this._colRoomName;
                }
            }
        }
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CLAIM], maxLength: 2, minLength:2}, nCreep)
    }

    _tactics() {
        let colRoomName = this._colRoomName;
        if (!colRoomName) return;
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            creepOp.instructClaimController(colRoomName);
        }
    }

    /**@returns {string | null} */
    _findColRoom() {
        /**@type {{name: string, distance: number}[]} */
        let colRooms = [];
        let knownRooms = this._map.knownRooms;
        for (let roomName in this._map.knownRooms) {
            let roomInfo = knownRooms[roomName];
            if (   roomInfo.hostileOwner == false 
                && roomInfo.lastSeenHostile < roomInfo.lastSeen
                && roomInfo.lastSeen >= Game.time - COLONIZE_LASTSEEN_TIME
                && Game.map.getRoomStatus(roomName).status != 'closed'
                && roomInfo.hasController == true
                && roomInfo.level == 0
                && Game.map.getRoomLinearDistance(roomName,this._baseName) <= MAX_LINEAIR_COL_DISTANCE
               ) {
                    let path = Game.map.findRoute(this._baseName, roomName);
                    if (!(path instanceof Array)) continue;
                    let colRoom = {name: roomName, distance: path.length}
                    colRooms.push(colRoom);
               }
        }
        colRooms.sort((a, b) => {
            let lastColStartA = Memory.colonizations[a.name]
            let lastColStartB = Memory.colonizations[b.name]
            if (lastColStartA && lastColStartB) return lastColStartA - lastColStartB
            if (!lastColStartA && !lastColStartA) return a.distance-b.distance;
            if (lastColStartA) return 1;
            if (lastColStartB) return -1;
            return 0;
        })
        if (colRooms.length > 0) return colRooms[0].name;
        else return null;
    }

}
