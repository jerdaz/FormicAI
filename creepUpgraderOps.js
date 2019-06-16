'use strict'
let creepOps = require('creepOps');

function main(creep) {
    strategy(creep);
    command(creep);
}

function strategy(creep) {
    if (creepOps.mem.command == undefined) creepOps.transfer(creep
                                    , creep.pos.findClosestByPath(FIND_SOURCES_ACTIVE)
                                    , creep.room.controller
                                    );
}

function command(creep) {
    creepOps.main(creep);
}

module.exports = main;
