let U = require('./util');
let Operation = require('./operation');
let BaseOp = require('./baseOp');

module.exports = class ShardOp extends Operation {
    constructor() {
        super();
        /** @type {{[key:string]: BaseOp }} */
        this._baseOps = {};
    }

    initTick(){
        /**@type {{[baseName:string]:string[]}} */
        let creepNamesByBase = {};
        for (let creepName in Game.creeps) {
            let roomName = creepName.split('_')[0];
            if (creepNamesByBase[roomName] == undefined) creepNamesByBase[roomName] = [];
            creepNamesByBase[roomName].push (creepName);
        }

        for (let roomName in this._baseOps) {
            let base = this.getBase(roomName);
            if (base.controller.my) {
                this._baseOps[roomName].initTick(base, creepNamesByBase[base.name]);
            }
            else delete this._baseOps.roomName;
        }
    }


    _support(){
        // clean dead creep memory
        if (U.chance(1500)) {
            for (let creepName in Memory.creeps) if (!Game.creeps[creepName]) delete Memory.creeps[creepName];
        }

        // check for new bases
        if (this._firstRun || U.chance(10)) {
            for (let roomName in Game.rooms) {
                let base = this.getBase(roomName);
                if (this._baseOps[base.name] === undefined) this._baseOps[base.name] = new BaseOp(base, this);
            }
        }
    }

    _command(){
        for (let roomName in this._baseOps) {
            this._baseOps[roomName].run();
        }
    }

    /**@param {string} creepName */
    /**@returns {Creep|undefined} returns creep with creepName */
    getCreep(creepName) {
        let creep = Game.creeps[creepName];
        return creep;
    }

    /**@param {string} roomName */
    /**@returns {Room} returns room with RoomName */
    getRoom(roomName) {
        let room = Game.rooms[roomName];
        if (!room) throw Error;
        return room;
    }

    /**@param {string} roomName */
    /**@returns {Base} returns base with RoomName */
    getBase(roomName) {
        let base = /**@type {Base} */ (Game.rooms[roomName]);
        if (!base) throw Error;
        if (base.controller === undefined) throw Error;
        return base;
    }
}
