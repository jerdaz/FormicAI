'use strict'
let baseOps = require('baseOps');

if (Game.mem == undefined) {
    console.log ('MEM INIT');
    Game.mem = {
        bases: {}
    ,   creeps: {}
    };
}
let mem = Game.mem;

function main() {
    let bases = getBases(Game.rooms, Game.creeps);
    for (let creepName in Memory.creeps) if (!Game.creeps[creepName]) delete Memory.creeps[creepName]; 

    strategy();
    command(bases);

    function getBases(rooms, creeps) {
        let bases = [];
        for (let roomName in rooms) {
            let room = rooms[roomName];
            if (room.controller && room.controller.my) {
                bases.push(room)
                if (mem.bases[room.name] == undefined) mem.bases[room.name] = {};
                room.mem = mem.bases[room.name];
                room.creeps = [];
            }
        }
        for (let creepName in creeps) {
            let creep = creeps[creepName];
            let roomName = creep.name.split('_')[0];
            let base = rooms[roomName];
            if (base) base.creeps.push(creep);
            if (mem.creeps[creep.name] == undefined) mem.creeps[creep.name] = {};
            creep.mem = mem.creeps[creep.name];
        }
        return bases;
    }
}

function strategy() {

}

function command(bases) {
    for (let base of bases) baseOps(base);
}

module.exports = function () {
    main()
};
