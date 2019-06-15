'use strict'
let creepOps = require('creepOps');

function main(creep) {
    strategy();
    command(creep);
}

function strategy() {
    if (!creep.command) creepOps.harvest(creep
                                    , creep.pos.findClosestByPath(FIND_ACTIVE_SOURCE)
                                    , creep.pos.findClosestByPath(FIND_MY_STRUCTURES, {filter: {structureType: STRUCTURE_SPAWN}} )
                                    );
}

function command(creep) {
    creepOps(creep);
}

module.exports = main;
