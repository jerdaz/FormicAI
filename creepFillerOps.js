'use strict'
let creepOps = require('creepOps');

function main(creep) {
    strategy(creep);
    command(creep);
}

function strategy(creep) {
    let dest = creep.mem.dest;
    if (creep.mem.command == undefined || (dest.energy == dest.energyCapacity)) {
        creepOps.transfer(creep
                        , creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                        , creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: (o) => {
                                return  (o.energy < o.energyCapacity)
                                        && (o.structureType == STRUCTURE_SPAWN || o.structureType == STRUCTURE_EXTENSION)
                                }})
                        );
    }
}

function command(creep) {
    creepOps.main(creep);
}

module.exports = main;
