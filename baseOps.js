'use strict'
function main(room) {
    strategy();
    command(room);
}

function strategy() {

}

function command(room) {
    var spawnOps = require ('spawnOps');
    var spawns = room.find(FIND_MYSTRUCTURES, {filter: { structureType: STRUCTURE_SPAWN}});
    for (var spawn in spawns) spawnOps(spawn);
}

module.exports = main
