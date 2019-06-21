let U = require('./util');
let c = require('./constants');
let Operation = require('./operation');
let BaseOp = require('./baseOp');

const CPU_MAX_BUCKET = 10000;

module.exports = class ShardOp extends Operation {
    constructor() {
        super();
        /** @type {{[key:string]: BaseOp }} */
        this._baseOps = {};
        this.initTick();
    }

    initTick(){
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

        for (let roomName in Game.rooms) {
            let room = this.getRoom(roomName);
            if (room.controller && room.controller.my) {
                if (!this._baseOps[room.name]) this._baseOps[room.name] = new BaseOp(this.getBase(room.name), creepsByBase[room.name], this);
                else this._baseOps[roomName].initTick(/**@type {Base} */ (room), creepsByBase[room.name]);

            }
        }
    }


    _strategy(){
        if (U.chance(100)) {
            let directive = c.DIRECTIVE_NONE;
            if (Game.cpu.bucket >= CPU_MAX_BUCKET) directive = c.DIRECTIVE_COLONIZE
            for (let baseOp in this._baseOps) this._baseOps[baseOp].setDirective(directive);
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
        if (!room) throw 'Error';
        return room;
    }

    /**@param {string} roomName */
    /**@returns {Base} returns base with RoomName */
    getBase(roomName) {
        let base = /**@type {Base} */ (Game.rooms[roomName]);
        if (!base) throw 'Error';
        if (base.controller === undefined) throw 'Error';
        return base;
    }
}
