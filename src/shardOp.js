let U = require('./util');
let c = require('./constants');
let Operation = require('./operation');
let BaseOp = require('./baseOp');
let Map = require('./map');

const CPU_MAX_BUCKET = 10000;

module.exports = class ShardOp extends Operation {
    constructor() {
        super();
        /** @type {{[key:string]: BaseOp }} */
        this._baseOps = {};
        this._map = new Map(this);
        /**@type {number} */
        this._maxCPU = Game.cpu.bucket;
        this.initTick();
    }

    initTick(){
        this._maxCPU = Math.max(this._maxCPU, Game.cpu.bucket);

        /**@type {{[baseName:string]:Creep[]}} */
        let creepsByBase = {};
        for (let creepName in Game.creeps) {
            let roomName = creepName.split('_')[0];
            if (creepsByBase[roomName] == undefined) creepsByBase[roomName] = [];
            let creep = U.getCreep(creepName);
            if (creep) {
                if (creep.hits > 0) creepsByBase[roomName].push (creep);
                else if (creep.memory) delete creep.memory;
            }
        }

        let updateMap = false;
        /** @type {{[key:string]: BaseOp }} */
        let newBaseOps = {}
        for (let roomName in Game.rooms) {
            let room = this.getRoom(roomName);
            if (room.controller && room.controller.my) {
                if (!this._baseOps[room.name]) {
                    this._baseOps[room.name] = new BaseOp(this.getBase(room.name), creepsByBase[room.name], this);
                    updateMap = true;
                }
                else {
                    this._baseOps[roomName].initTick(/**@type {Base} */ (room), creepsByBase[room.name]);
                }
                newBaseOps[roomName] = this._baseOps[roomName];
                delete creepsByBase[room.name];
            }
        }
        if (_.size(this._baseOps) != _.size(newBaseOps)) updateMap = true;
        this._baseOps = newBaseOps;
        if (updateMap) this._map.updateBaseDistances(this._baseOps);
        // kill all creeps of dead bases.
        for (let baseName in creepsByBase) {
            for (let creep of creepsByBase[baseName]) {
                creep.suicide();
            }
        }
    }

    /**@param {String} roomName */
    requestBuilder(roomName){
        let donorRoom = this._map.findClosestBaseByPath(roomName, 3 , true);
        if (donorRoom) this._baseOps[donorRoom].requestBuilder(roomName);
    }


    _strategy(){
        if (U.chance(100)) {
            let directive = c.DIRECTIVE_NONE;
            if (Game.cpu.bucket >= CPU_MAX_BUCKET && Game.gcl.level > _.size(this._baseOps)) directive = c.DIRECTIVE_COLONIZE
            for (let baseName in this._baseOps) this._baseOps[baseName].setDirective(directive);
        }
    }

    _command(){
        for (let roomName in this._baseOps) {
            this._baseOps[roomName].run();
        }
    }


    /**@param {string} roomName */
    /**@returns {Room} returns room with RoomName */
    getRoom(roomName) {
        let room = Game.rooms[roomName];
        if (!room) throw ('Error');
        return room;
    }

    /**@param {string} roomName */
    /**@returns {Base} returns base with RoomName */
    getBase(roomName) {
        let base = /**@type {Base} */ (Game.rooms[roomName]);
        if (!base) throw ('Error');
        if (base.controller === undefined) throw ('Error');
        return base;
    }

    /**@param {string} roomName */
    /**@returns {BaseOp} */
    getBaseOp(roomName) {
        return this._baseOps[roomName];
    }
}
