'use strict'
function main(spawn) {
    strategy();
    command(spawn);
}

function strategy() {

}

function command(spawn) {
    spawn.spawnCreep([WORK,MOVE,CARRY], Math.random());
}

module.exports = main;
