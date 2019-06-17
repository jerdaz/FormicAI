let BaseOp = require('./baseOp');

module.exports = class ShardOp {
    constructor() {
        /** @type {{[key:string]: BaseOp }} */
        this._baseOps = {};
    }
    run() {
        this._baseOps = this._findBaseOps();
    
        this._strategy();
        this._command();
        this._cleanup();
    }

    _strategy(){

    }

    _command(){
        this._baseOps['x'];
        for (let roomName in this._baseOps) this._baseOps[roomName].run();
    }

    _cleanup(){
        for (let creepName in Memory.creeps) if (!Game.creeps[creepName]) delete Memory.creeps[creepName]; 
    }


    _findBaseOps() {
        /** @type {{[key:string]: BaseOp }} */
        let baseOps = {};
        for (let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            if (room.controller && room.controller.my) {
                baseOps[roomName] = new BaseOp(roomName);
            }
        }
        for (let creepName in Game.creeps) {
            let creep = Game.creeps[creepName];
            let roomName = creep.name.split('_')[0];
            let room = Game.rooms[roomName];
            if (room) baseOps[roomName].addCreep(creep);
        }
        return baseOps;
    }    
}
