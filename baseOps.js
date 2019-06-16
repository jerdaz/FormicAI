'use strict'
function main(base) {
    strategy();
    command(base);
}

function strategy() {

}

function command(base) {
    let creeps = base.creeps;
    for (let creep of creeps) {
        creep.memory.role=creep.name.split('_')[1];
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
