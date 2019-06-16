'use strict'
function main(base) {
    base.spawns = []
    for (let structure of base.find(FIND_MY_STRUCTURES)) {
        switch (structure.structureType) {
            case STRUCTURE_SPAWN:
                base.spawns.push(structure);
                break;
        }
    }

    strategy(base);
    command(base);
}

function strategy(base) {

}

function command(base) {

    // building commands
    if (base.creeps.length < 15) {
        for (let spawn of base.spawns) spawn.command = 'spawnHarvester';
    } else {
        for (let spawn of base.spawns) spawn.command = '';
    }

     // creep ops
     let creeps = base.creeps;
     for (let creep of creeps) {
         switch (creep.memory.role) {
             case 'harvester':
             let creepHarvesterOps = require('creepHarvesterOps');
             creepHarvesterOps(creep);
             break;
         }
     }
    
    // building ops
    let spawnOps = require ('structSpawnOps');
    let spawns = base.find(FIND_MY_STRUCTURES, {filter: { structureType: STRUCTURE_SPAWN}});
    for (let spawn of spawns) spawnOps(spawn);
}

module.exports = main
