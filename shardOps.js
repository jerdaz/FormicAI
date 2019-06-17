let baseOps = require('./baseOps');

module.exports = class ShardOps {
    run() {
        let bases = this._getBases();
    
        this._strategy();
        this._command(bases);
        this._cleanup();
    }

    _strategy(){

    }

    _command(bases){
        for (let base of bases) baseOps(base);
    }

    _cleanup(){
        for (let creepName in Memory.creeps) if (!Game.creeps[creepName]) delete Memory.creeps[creepName]; 
    }

    _getBases() {
        let bases = [];
        for (let roomName in Game.rooms) {
            let room = Game.rooms[roomName];
            if (room.controller && room.controller.my) {
                bases.push(room)
                if (mem.bases[room.name] == undefined) mem.bases[room.name] = {};
                room.mem = mem.bases[room.name];
                room.creeps = [];
            }
        }
        for (let creepName in Game.creeps) {
            let creep = Game.creeps[creepName];
            let roomName = creep.name.split('_')[0];
            let base = Game.rooms[roomName];
            if (base) base.creeps.push(creep);
            if (mem.creeps[creep.name] == undefined) mem.creeps[creep.name] = {};
            creep.mem = mem.creeps[creep.name];
        }
        return bases;
    }    
}

console.log ('MEM INIT');
let mem = {
    bases: {}
,   creeps: {}
};


function command(bases) {
    
}
