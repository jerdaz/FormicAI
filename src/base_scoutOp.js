const U = require('./util');
const c = require('./constants');
const BaseChildOp = require('./base_childOp');

const SCOUT_INTERVAL = 1500;
const SCOUT_DISTANCE = 20;

module.exports = class ScoutOp extends BaseChildOp {
    /**@param {BaseOp} baseOp */
    constructor(baseOp) {
        super(baseOp);
        /**@type {{[creepName:string]: string}} */
        this._nextRoomName = {};
        /**@type {{[creepName:string]: string}} */
        this._lastRoomName = {};
        this._lastSpawn = 0; //Game.time + Math.random() * SCOUT_INTERVAL;

        this._scoutRoomX = -1 * OBSERVER_RANGE
        this._scoutRoomY = -1 * OBSERVER_RANGE
    }

    get type() {return c.OPERATION_SCOUTING}

    _firstRun() {
        this._strategy();
    }

    _support(){
        //clean up old cache of dead creeps
        for (let creepName in this._nextRoomName) {
            if (!this._creepOps[creepName]) {
                delete this._nextRoomName[creepName];
                delete this._lastRoomName[creepName];
            }
        }
    }

    _strategy() {
        let creepCount = 0;
        //if (this.baseOp.directive != c.DIRECTIVE_COLONIZE) creepCount = 0;
        if (!this._baseOp.observer && Game.time - this._lastSpawn > CREEP_LIFE_TIME) creepCount = 1;
        this._baseOp.spawningOp.ltRequestSpawn(this,{body: [MOVE], maxLength:1, minLength:1},creepCount);
    }

    _tactics() {
        for (let creepName in this._creepOps) {
            this._lastSpawn = Game.time;
            this._baseOp.spawningOp.ltRequestSpawn(this,{body: [MOVE], maxLength:1, minLength:1},0);
            let nextRoomName = this._nextRoomName[creepName];
            let lastRoomName = this._lastRoomName[creepName];
            let creepOp = this._creepOps[creepName]
            creepOp.notifyWhenAttacked = false;
            let room = creepOp.room;
            if (room.name == nextRoomName || creepOp.instruction != c.COMMAND_MOVETO) {
                /**@type {string | undefined} */
                let destRoomName
                let exits = /**@type {{[index:string]:string}} */(this._map.describeExits(room.name))
                let roomNames = [];
                for (let exit in exits) {
                    let roomName = exits[exit];
                    if (roomName == lastRoomName) continue;
                    if (Game.map.getRoomStatus(roomName).status != 'closed') roomNames.push(exits[exit]);
                }
                roomNames.sort((a,b) => {
                        let scoutInfoA = this._map.getRoomInfo(a);
                        let scoutInfoB = this._map.getRoomInfo(b);
                        if (scoutInfoA && scoutInfoB) return scoutInfoA.lastSeen - scoutInfoB.lastSeen + (Math.random() - 0.5) * 10000;
                        if (scoutInfoA) return 1
                        if (scoutInfoB) return -1
                        return Math.random() - 0.5;
                    })
                if (roomNames.length > 0) destRoomName = roomNames[0];
                else destRoomName = lastRoomName

                if (destRoomName) {
                    this._nextRoomName[creepName] = destRoomName;
                    creepOp.instructMoveTo(destRoomName, c.MOVE_ALLOW_HOSTILE_ROOM)
                    this._lastRoomName[creepName] = room.name;
                }
            }
        }
    }

    _command() {
        let observer = this._baseOp.observer;
        if (observer) {
            let scoutRoom = this._map.getNeighBour(this.baseName, this._scoutRoomX, this._scoutRoomY)
            let result = observer.observeRoom(scoutRoom);
            this._scoutRoomX++;
            if (this._scoutRoomX > OBSERVER_RANGE) {
                this._scoutRoomX = -1 * OBSERVER_RANGE;
                this._scoutRoomY++;
                if (this._scoutRoomY > OBSERVER_RANGE) {
                    this._scoutRoomY = -1 * OBSERVER_RANGE;
                }
            }
        }
    }
}
