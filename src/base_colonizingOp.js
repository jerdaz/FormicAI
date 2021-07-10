const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

// time we try to colonize a room before trying another
const ROOM_CLAIM_TIMEOUT = 2000
// time after which we retry colonizing a room
const COLONIZE_RETRY_TIME = 100000
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
    }
    
    get type() {return c.OPERATION_COLONIZING}

    _firstRun() {
        this._strategy();
    }

    _strategy() {
        let nCreep = 0;
        // give up colonization after timeout
        if (this._colRoomName && this._colStart + ROOM_CLAIM_TIMEOUT < Game.time) {
            Memory.colonizations[this._colRoomName] = Game.time;
            this._colRoomName = null;
        }

        //check for new colonization room
        if (this._baseOp.directive == c.DIRECTIVE_COLONIZE || this._baseOp.directive == c.DIRECTIVE_COLONIZE_2SOURCE) {
            if (this._colRoomName == null || this._colStart + ROOM_CLAIM_TIMEOUT < Game.time) {
                this._colRoomName = this._findColRoom();
            }
            if (this._colRoomName) nCreep = 1;
        }
        this._baseOp.spawningOp.ltRequestSpawn(this, {body:[MOVE,CLAIM], maxLength: 2, minLength:2}, nCreep)
    }

    _tactics() {
        let colRoomName = this._colRoomName;
        if (!colRoomName) return;
        let room = Game.rooms[colRoomName];
        if (room && room.controller && room.controller.my) {
            this._colRoomName = null;
            this._strategy();
            colRoomName = this._colRoomName;
            if (!colRoomName) return;
        }
        
        for (let creepName in this._creepOps) {
            let creepOp = this._creepOps[creepName];
            creepOp.instructClaimController(colRoomName);
        }
    }

    /**@returns {string | null} */
    _findColRoom() {
        /**@type {{name: string, distance: number, sources: number}[]} */
        let colRooms = [];
        let knownRooms = this._map.knownRooms;
        let minSources = (this._baseOp.directive == c.DIRECTIVE_COLONIZE_2SOURCE)?2:1
        for (let roomName in this._map.knownRooms) {
            let roomInfo = knownRooms[roomName];
            if (   roomInfo.hostileOwner == false 
                && roomInfo.lastSeenHostile < roomInfo.lastSeen
                && roomInfo.lastSeen >= Game.time - COLONIZE_LASTSEEN_TIME
                && Game.map.getRoomStatus(roomName).status != 'closed'
                && roomInfo.hasController == true
                && roomInfo.level == 0
                && roomInfo.sourceCount >= minSources
                && (Memory.colonizations[roomName] || 0) < Game.time - COLONIZE_RETRY_TIME
                && Game.map.getRoomLinearDistance(roomName,this._baseName) <= MAX_LINEAIR_COL_DISTANCE
               ) {
                    let path = Game.map.findRoute(this._baseName, roomName);
                    if (!(path instanceof Array)) continue;
                    let colRoom = {name: roomName, distance: path.length, sources: roomInfo.sourceCount}
                    colRooms.push(colRoom);
               }
        }
        colRooms.sort((a, b) => {
            if (a.sources > b.sources) return -1; // if A has more sources sort it first
            if (b.sources > a.sources) return 1; // if B has more sources, sort it first
            return a.distance-b.distance; // else sort distance ascending
        })
        U.l('selecting colroom for: ' +this._baseName)
        U.l(colRooms);
        if (colRooms.length > 0) return colRooms[0].name;
        else return null;
    }

}
