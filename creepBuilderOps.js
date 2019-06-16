'use strict'
let creepOps = require('creepOps');

function main(creep) {
    strategy(creep);
    command(creep);
}

function strategy(creep) {
    if (creep.memory.command == undefined) creepOps.harvest(creep
                                    , creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                                    , creep.pos.findClosestByPath(FIND_MY_CONSTRUCTION_SITES)
                                    );
}

function command(creep) {
    creepOps.main(creep);
}

module.exports = main;
