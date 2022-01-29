
declare type DebugType = import ('./debug');
declare type MainOp = import ('./mainOp');
declare type Operation = import('./meta_operation')
declare type ChildOp = import('./meta_childOp')
declare type ShardOp = import('./shard_shardOp')
declare type ShardChildOp = import('./shard_childOp');
declare type MapOp = import('./shard_mapOp');
declare type CreepOp = import('./shard_creepOp');
declare type BaseOp = import('./base_baseOp');
declare type BaseChildOp = import('./base_childOp');
declare type SpawningOp = import('./base_spawningOp');
declare type FillingOp = import('./base_fillingOp');
declare type UpgradingOp = import('./base_upgradingOp');
declare type BuildingOp = import('./room_buildingOp');
declare type TowerOp = import('./base_defenseOp');
declare type ColonizingOp = import('./shard_colonizingOp');
declare type RoomOp = import('./room_roomOp');

declare module NodeJS  {
    interface Global {
        mainOp: MainOp
    }
}
declare interface Base extends Room {controller: StructureController, baseOp?: BaseOp};
declare interface RoomObjectEx extends RoomObject {store?: Store, id?: string};
declare interface OrderEx extends Order {transactionCost?: number, netPrice?: number}
declare var _ = import('lodash');

declare interface Instruction {command: number};
declare interface CreepOpInstruction extends Instruction {source: RoomObject, dest: RoomObject};
declare type CreepTemplate = {body: BodyPartConstant[], minLength?: number, maxLength?: number, noSort?:boolean};
declare type BaseInformation = {name: string, level: number, progress: number, sources: number, hasSpawn: boolean};
interface Memory {[name: string]: any}
interface Debug {DebugType}
interface MainOp {MainOp}
interface ShardOp {ShardOp}

interface CreepMemory {operationType: number, baseName: string, operationInstance:number}
interface RoomMemory {distanceOffset: number; unclaimTimer: number; attackStartTime?:number}
;