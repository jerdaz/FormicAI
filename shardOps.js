'use strict'

function main() {
    let rooms = Game.rooms;
    let creeps = Game.creeps;

    let bases = getBases(rooms);

    strategy();
    command(bases);

    function getBases(rooms) {
        let bases = _.filter(rooms, (o) => { return o.controller && o.controller.my});
        for (let baseName in bases) {
            let base = rooms[baseName];
            base.creeps = [];
        }
        for (let creepName in creeps) {
            let creep = creeps[creepName];
            let roomName = creep.name.split('_')[0];
            let base = rooms[roomName];
            if (base) base.creeps.concat(creep);
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
