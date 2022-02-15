const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

// time we try to colonize a room before trying another
const ROOM_CLAIM_TIMEOUT = 2000
// time after which we retry colonizing a room
const COLONIZE_RETRY_TIME = 1000000 //+- 6 weeks
// Max time we haven't seen a room for it to be a valid colonization target
const COLONIZE_LASTSEEN_TIME = 20000
// maximum lineair distance for colonization
const MAX_LINEAIR_COL_DISTANCE = 13
const MAX_PATH_COL_DISTANCE = 13


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
        //this._strategy();
    }

    _strategy() {
        let nCreep = 0;
        // stop colonizing when no longer necessary
        if (this.baseOp.directive != c.DIRECTIVE_COLONIZE && this.baseOp.directive != c.DIRECTIVE_COLONIZE_2SOURCE) this._colRoomName = null;


        //check for new colonization room
        if ( (this._baseOp.directive == c.DIRECTIVE_COLONIZE || this._baseOp.directive == c.DIRECTIVE_COLONIZE_2SOURCE)
            && this._shardOp.safeModeAvailable) {    // don't colonize if no safe mode available (globally). The new base needs it to defend
            // give up colonization after timeout
            if (this._colRoomName && this._colStart + ROOM_CLAIM_TIMEOUT < Game.time) {
                Memory.colonizations[this._colRoomName] = Game.time; // mark colonization attempt
                this._colRoomName = null;
            }
            //find new room if necessary
            if (this._colRoomName == null || this._colStart + ROOM_CLAIM_TIMEOUT < Game.time) {
                this._colRoomName = this._findColRoom();
                this._colStart = Game.time;
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
            // draw visual progress
            let target = new RoomPosition(25, 25, colRoomName)
            let creepPos = creepOp.creep.pos;
            Game.map.visual.line(creepPos, target, {color:'#0000ff'})
        }
    }

    _command() {
        //draw colonization debug info
        let roomName = this._colRoomName;
        if (roomName) {
            let source = this.baseOp.centerPos;
            let target = new RoomPosition(25,25, roomName)
            Game.map.visual.circle(source)
            Game.map.visual.circle(target)
            Game.map.visual.line(source, target)
            for (let creepName in this._creepOps) {
                let creepOp = this._creepOps[creepName];
                // draw visual progress
                let target = new RoomPosition(25, 25, roomName)
                let creepPos = creepOp.creep.pos;
                Game.map.visual.line(creepPos, target, {color:'#0000ff'})
            }
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
                && roomInfo.lastSeenPlayerCreeps < roomInfo.lastSeen
                && roomInfo.lastSeen >= Game.time - COLONIZE_LASTSEEN_TIME
                && Game.map.getRoomStatus(roomName).status != 'closed'
                && roomInfo.hasController == true
                && roomInfo.level == 0
                && roomInfo.sourceCount >= minSources
                && (Memory.colonizations[roomName] || 0) < Game.time - COLONIZE_RETRY_TIME
                && Game.map.getRoomLinearDistance(roomName,this._baseName) <= MAX_LINEAIR_COL_DISTANCE
               ) {
                    let path = this._map.findRoute(this._baseName, roomName);
                    if (!(path instanceof Array)) continue;
                    if (path.length > MAX_PATH_COL_DISTANCE || path.length == 0) continue;
                    let colRoom = {name: roomName, distance: path.length, sources: roomInfo.sourceCount}
                    U.l(path)
                    colRooms.push(colRoom);
               }
        }
        colRooms.sort((a, b) => {
            let lastColTimeA = Memory.colonizations[a.name];
            let lastColTimeB = Memory.colonizations[b.name];
            if (lastColTimeA && lastColTimeB ) return lastColTimeA - lastColTimeB; // sort ascending. most recent colonization attempt last
            if (lastColTimeA) return 1; // if A had a colonization attempt sort B first
            if (lastColTimeB) return -1; // if B had a colonization attempt, sort A first
            if (a.sources > b.sources) return -1; // if A has more sources sort it first
            if (b.sources > a.sources) return 1; // if B has more sources, sort it first
            else return a.distance-b.distance; // else sort distance ascending
        })
        if (colRooms.length > 0) return colRooms[0].name;
        else return null;
    }

}
