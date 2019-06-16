'use strict'
function main(spawn) {
    strategy();
    command(spawn);
}

function strategy() {

}

function command(spawn) {
    switch(spawn.command) {
        case 'spawnFiller':
            spawn.spawnCreep([WORK,MOVE,CARRY], spawn.room.name + '_' + Math.random() , {memory: {role: 'filler'}});
            break;
        case 'spawnUpgrader':
                spawn.spawnCreep([WORK,MOVE,CARRY], spawn.room.name + '_' + Math.random() , {memory: {role: 'upgrader'}});
                break;
        case 'spawnBuilder':
                spawn.spawnCreep([WORK,MOVE,CARRY], spawn.room.name + '_' + Math.random() , {memory: {role: 'builder'}});
                break;
    }
}

module.exports = main;
