'use strict'
function main(room) {
    strategy();
    command(room);
}

function strategy() {

}

function command(room) {
    let spawnOps = require ('spawnOps');
    let spawns = room.find(FIND_MY_STRUCTURES, {filter: { structureType: STRUCTURE_SPAWN}});
    for (let spawn of spawns) spawnOps(spawn);
}

module.exports = main
