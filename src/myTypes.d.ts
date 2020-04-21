
declare type Debug = import ('./debug');
declare type MainOp = import ('./mainOp').MainOp;
declare type Operation = import('./meta_operation')
declare type ChildOp = import('./meta_childOp')
declare type ShardOp = import('./shard_shardOp')
declare type ShardChildOp = import('./shard_childOp');
declare type MapOp = import('./shard_mapOp');
declare type CreepOp = import('.creepOp');
declare type BaseOp = import('./base_baseOp');
declare type BaseChildOp = import('./base_childOp');
declare type SpawningOp = import('./base_spawningOp');
declare type FillingOp = import('./base_fillingOp');
declare type UpgradingOp = import('./base_upgradingOp');
declare type BuildingOp = import('./base_buildingOp');
declare type TowerOp = import('./base_defenseOp');
declare type ColonizingOp = import('./shard_colonizingOp');

declare interface Base extends Room {controller: StructureController};
declare interface RoomObjectEx extends RoomObject {store?: Store, id?: string};
declare interface OrderEx extends Order {transactionCost?: number, netPrice?: number}
declare var _ = import('lodash');

declare interface Instruction {command: number};
declare interface CreepOpInstruction extends Instruction {source: RoomObject, dest: RoomObject};
declare type CreepTemplate = {body: BodyPartConstant[], minLength?: number, maxLength?: number}
interface Memory {[name: string]: any}

interface CreepMemory {operationType: number, baseName: string}
;