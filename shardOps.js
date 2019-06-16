'use strict'
let mem = {
    bases: {}
,   creeps: {}
};

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
                room.creeps = [];
            }
        }
        for (let creepName in creeps) {
            let creep = creeps[creepName];
            let roomName = creep.name.split('_')[0];
            let base = rooms[roomName];
            if (base) base.creeps.push(creep);
        }
        return bases;
    }
}

function strategy() {

}

function command(bases) {
    let baseOps = require('baseOps');
    for (let base of bases) baseOps(base);
}

module.exports = function () {main()};
