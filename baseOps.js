'use strict'
function main(base) {
    strategy(base);
    command(base);
}

function strategy(base) {
//    if (base.creeps.length < 15) {
//        for (spawn.command = 'spawnHarvester';
//    else 
}

function command(base) {
    let creeps = base.creeps;
    for (let creep of creeps) {
        switch (creep.memory.role) {
            case 'harvester':
            let creepHarvesterOps = require('creepHarvesterOps');
            creepHarvesterOps(creep);
            break;
        }
    }

    let spawnOps = require ('structSpawnOps');
    let spawns = base.find(FIND_MY_STRUCTURES, {filter: { structureType: STRUCTURE_SPAWN}});
    for (let spawn of spawns) spawnOps(spawn);

}

module.exports = main
