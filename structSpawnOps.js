'use strict'
function main(spawn) {
    strategy();
    command(spawn);
}

function strategy() {

}

function command(spawn) {
    spawn.spawnCreep([WORK,MOVE,CARRY], spawn.room.name + '_'+ 'harvester' + '_' + Math.random());
}

module.exports = main;
