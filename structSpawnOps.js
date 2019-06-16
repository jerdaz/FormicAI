'use strict'
function main(spawn) {
    strategy();
    command(spawn);
}

function strategy() {

}

function command(spawn) {
    if (spawn.command) {
        let capacity = spawn.room.energyCapacityAvailable;
        let bodySize = Math.floor(capacity / 200);
        let body = [];
        for (let i = 0; i< bodySize;i++) body.concat([WORK,MOVE,CARRY]);
        switch(spawn.command) {
            case 'spawnFirstFiller':
                spawn.spawnCreep([WORK,MOVE,CARRY], spawn.room.name + '_' + Math.random() , {memory: {role: 'filler'}});
                break;
            case 'spawnFiller':
                spawn.spawnCreep(body, spawn.room.name + '_' + Math.random() , {memory: {role: 'filler'}});
                break;
            case 'spawnUpgrader':
                spawn.spawnCreep(body, spawn.room.name + '_' + Math.random() , {memory: {role: 'upgrader'}});
                break;
            case 'spawnBuilder':
                spawn.spawnCreep(body, spawn.room.name + '_' + Math.random() , {memory: {role: 'builder'}});
                break;
        }
    }
}

module.exports = main;
