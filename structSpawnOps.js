'use strict'
function main(spawn) {
    strategy();
    command(spawn);
}

function strategy() {

}

function command(spawn) {
    switch(spawn.command) {
        case 'spawnHarvester':
            spawn.spawnCreep([WORK,MOVE,CARRY], spawn.room.name + '_' + Math.random() , {memory: {role: 'harvester'}});
            break;
    }
}

module.exports = main;
