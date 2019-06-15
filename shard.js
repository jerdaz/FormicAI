'use strict'
import { loop } from 'legacy.main';

function main() {
    loop();
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
