'use strict'
var legacy = require('legacy.main');

function main() {
    legacy.loop();
    var rooms = Game.rooms;

    var bases = getBases(rooms);
    strategy();
    command();

    function getBases(rooms){
        var bases = []
        for(room in rooms) {
            if (room.controller && room.controller.my) bases.concat(room);
        }
    }
}

function strategy() {

}

function command() {

}

export default function () {main()};
