"use strict"

export default class Atlas {
    constructor () {
    }

    roomCache:{[key:string]: {version:number,
                              sourceCount:number,
                              towerCount:number,
                              sources: {pos_x: number, pos_y:number}[]
                              lastSeen:number
                              level:number
                              hasEnemyCreeps:boolean
                              ownerUserName:string
                            }} = {};

    getScoutInfo(roomName:string) {
        if (Memory.rooms[roomName] == undefined) Memory.rooms[roomName] = {};
        //if (Memory.rooms[roomName].scoutInfo == undefined) Memory.rooms[roomName] = {}
        this.roomCache[roomName] = Memory.rooms[roomName].scoutInfo;
        return this.roomCache[roomName];
    }

    getScoutInfo_new(roomName:string) {
        if (this.roomCache[roomName]) return this.roomCache[roomName];

        let index = this.getRoomIndex(roomName);
        if (RawMemory.segments[index.segment].charCodeAt(index.offset) >= 2) {
            let s = RawMemory.segments[index.segment];
            let version = s.charCodeAt(index.offset + 0);
            let towerCount = s.charCodeAt(index.offset + 1);
            let level = s.charCodeAt(index.offset + 2);
            let lastSeen = (s.charCodeAt(index.offset + 3) << 16) + s.charCodeAt(index.offset + 5);
            let hasEnemyCreeps = s.charCodeAt(index.offset + 7) != 0;
            let source1_x = s.charCodeAt(index.offset + 8);
            let source1_y = s.charCodeAt(index.offset + 9);
            let source2_x = s.charCodeAt(index.offset + 10) ;
            let source2_y = s.charCodeAt(index.offset + 11);
            let source3_x = s.charCodeAt(index.offset + 12);
            let source3_y = s.charCodeAt(index.offset + 13) ;
            let sourceCount = source1_x>0?1:0 + source2_x>0?1:0 + source3_x>0?1:0;
            let owner = s.slice(index.offset+14,10).trim();
            this.roomCache[roomName] = {
                version: version,
                sourceCount: sourceCount,
                towerCount: towerCount,
                level: level,
                lastSeen: lastSeen,
                hasEnemyCreeps: hasEnemyCreeps,
                ownerUserName: owner,
                sources: []
                }

            let scoutInfo = this.roomCache[roomName]
            if (source1_x>0) scoutInfo.sources[0] = {pos_x: source1_x, pos_y: source1_y}
            if (source2_x>0) scoutInfo.sources[1] = {pos_x: source2_x, pos_y: source2_y}
            if (source3_x>0) scoutInfo.sources[2] = {pos_x: source3_x, pos_y: source3_y}
            return scoutInfo;
        }
        this.roomCache[roomName] = {
            version: 2,
            sourceCount: 0,
            towerCount: 0,
            level: 0,
            lastSeen: 0,
            hasEnemyCreeps: false,
            ownerUserName: '',
            sources: []
        };
        return this.roomCache[roomName]


    }

    private getRoomIndex(roomName:string) {
        let roomIndex = 100 + roomName.slice(0,1)=='W'?-1:1 * Number(roomName.slice(1,2));
        roomIndex += 200 * (100 + roomName.slice(3,1)=='N'?-1:1 * Number(roomName.slice(4,2)));
        let segment = Math.floor(roomIndex*25 / 100000);
        let segmentOffset = roomIndex*25 % 100000;
        return {roomIndex: roomIndex, segment: segment, offset:segmentOffset}
    }

    lastSave:number = 0;
    saveRoomCache() {
        let startCpu = Game.cpu.getUsed();
        let strArray = [];
        for (let i=0;i<10;i++) strArray[i] = RawMemory.segments[i].split('');
        console.log (_.size(this.roomCache));
        for (let roomName in this.roomCache) {
            let scoutInfo = this.roomCache[roomName];

            // if room hasn't been changed since last save, don't update it
            if (scoutInfo.lastSeen <= this.lastSave) continue;

            let buffer = new ArrayBuffer(14);
            let view = new DataView(buffer);
            let offset = 0;
            view.setUint8(offset++, scoutInfo.version);
            view.setUint8(offset++, scoutInfo.towerCount);
            view.setUint8(offset++, scoutInfo.level);
            view.setUint32(offset, scoutInfo.lastSeen); offset+=4;
            view.setUint8(offset++, scoutInfo.hasEnemyCreeps?1:0);
            let sourceCount = 0;
            for (let sourceId in scoutInfo.sources) {
                sourceCount++;
                view.setUint8(offset++, scoutInfo.sources[sourceId].pos_x);
                view.setUint8(offset++, scoutInfo.sources[sourceId].pos_y);
            }

            let index = this.getRoomIndex(roomName);

            for(let i=0;i<14;i++) {
                //console.log (view.getUint8(i));
                strArray[index.segment][index.offset + i] = String.fromCharCode(view.getUint8(i));
            }
            let username = scoutInfo.ownerUserName;
            if (username == undefined) username = '';
            username = username.slice(10).padEnd(10, ' ');
            for (let i=0; i<10; i++) {
                strArray[index.segment][index.offset + i + 14] = username.slice(i,1)
            }
        }
        for (let i=0;i<10;i++) RawMemory.segments[i] = strArray[i].join('');
        this.lastSave = Game.time;
        return Game.cpu.getUsed() - startCpu;
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
