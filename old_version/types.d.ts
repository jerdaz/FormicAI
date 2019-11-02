// type shim for nodejs' `require()` syntax
// for stricter node.js typings, remove this and install `@types/node`
declare const require: (module: string) => any;

// add your custom typings here
//interface CreepMemory { [name: string]: any }
//interface FlagMemory { [name: string]: any }
//interface SpawnMemory { [name: string]: any }
interface RoomMemory {[name: string]: any }
interface CreepMemory { [name: string]: any }
//interface Memory {[name:string]: any}


//tijdelijk js modules aanroepbaar maken.
interface Room {[name: string]: any}
interface Spawn {[name: string]: any}
interface StructureTower {[name: string]: any}
interface Creep {[name: string]: any}
interface Structure {[name: string]: any}
interface RoomObject {[name: string]: any}
interface RoomPosition {[name: string]: any}
interface StructureLink {[name:string]: any}
interface Game {[name:string]:any}
interface myBase {[name:string]:any}

declare const SAFE_MODE_DURATION = 20000



//traveler
