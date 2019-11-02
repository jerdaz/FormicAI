"use strict"

export default class Atlas {
    constructor () {}

    roomCache:{[key:string]: {}} = {};

    getScoutInfo(roomName:string) {
        if (Memory.rooms[roomName] == undefined) Memory.rooms[roomName] = {};
        //if (Memory.rooms[roomName].scoutInfo == undefined) Memory.rooms[roomName] = {}
        this.roomCache[roomName] = Memory.rooms[roomName].scoutInfo;
        return this.roomCache[roomName];
    }

    // return room coordinate numerical value
    getRoomCoordinates(roomName:string){
        let resultN = roomName.match('N[0-9]*')
        let resultS = roomName.match('S[0-9]*')
        let resultW = roomName.match('W[0-9]*')
        let resultE = roomName.match('W[0-9]*')
        let x = 0;
        let y = 0;
        if (resultN) y = y - Number (resultN.slice(1));
        if (resultS) y = y + Number( resultS.slice(1));
        if (resultE) x = x - Number (resultE.slice(1));
        if (resultW) x = x + Number (resultW.slice(1));
        return {x: x, y: y}
    }

    getRoomCenter(roomName:string) {
        let roomCenter;
        if (Memory.rooms[roomName]) roomCenter = Memory.rooms[roomName].center;
        if (roomCenter == undefined) {
            let x_offset = 24;
            let y_offset = 24;
            let x = 0;
            let y = 0;
            let i = 0;
            loop:
            while (i<50) {
                for(x = -1 * i;x<=1*i;x++ ) {
                    for (y = -1 * i; y<= 1*i; y++) {
                        if ( Game.map.getTerrainAt(x_offset+x, y_offset+y, roomName) != 'wall')
                            break loop;
                    }
                }
                i++;
            }
            if (Memory.rooms[roomName] == undefined) Memory.rooms[roomName] = new Object;
            Memory.rooms[roomName].center = new Object;
            roomCenter = Memory.rooms[roomName].center
            roomCenter.x = x_offset + x;
            roomCenter.y = y_offset + y;
        }
        try {
            return new RoomPosition(roomCenter.x, roomCenter.y, roomName);
        }
        catch (err) {
            Game.notify('GETCENTER ERROR in ' + roomName + ':' + JSON.stringify(roomCenter)  )
            throw err;
        }
    }
}
