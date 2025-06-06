# FormicAI Design

This document gives a high level overview of the code and describes the most important classes. It is not an exhaustive API reference but should help you understand the structure of the bot.

## Architecture

The bot is built around **operations**. Every action in the game is represented by an operation instance. Operations form a hierarchy:

```
MainOp
  └─ ShardOp
       ├─ BaseOp
       │    ├─ SpawningOp
       │    ├─ FillingOp
       │    ├─ UpgradingOp
       │    ├─ TransportOp
       │    ├─ MarketOp
       │    ├─ ScoutOp
       │    └─ RoomOp (one per room)
       └─ ... other shard level operations
```

Each operation derives from `Operation` (`meta_operation.js`). Child operations extend the base class to specialise behaviour. The update cycle is split into several phases: `initTick`, `command`, `tactics`, `strategy` and `support`. These phases run at different intervals to spread CPU usage evenly.

The bot avoids using the Screeps `Memory` object for persistent state. Instead it reconstructs state from the current world each tick and serialises only minimal data.

## Class Overview

### Core

- **Operation (`meta_operation.js`)**  
  Base class providing the tick lifecycle and child management.
- **ChildOp (`meta_childOp.js`)**  
  Subclass of `Operation` used for operations that have a parent operation.
- **ShardChildOp (`shard_childOp.js`)**  
  Adds references to the owning shard and helper methods for creep management.
- **BaseChildOp (`base_childOp.js`)**  
  Operation that belongs to a specific base.
- **RoomChildOp (`room_childOp.js`)**  
  Used for room level tasks.
- **CreepOp (`shard_creepOp.js`)**  
  Wraps a single creep and executes high level commands.

### High level operations

- **MainOp (`mainOp.js`)**  
  Entry point created in `main.js`. It creates a `ShardOp` instance and distributes CPU budget among shards.
- **ShardOp (`shard_shardOp.js`)**  
  Manages all bases on one shard, keeps a map of operations and handles global tasks such as banking and colonisation.
- **BaseOp (`base_baseOp.js`)**  
  Controls a room that belongs to the player. It spawns creeps, defends the base and coordinates sub rooms.
- **RoomOp (`room_roomOp.js`)**  
  Handles tasks inside a room such as building or harvesting.

### Supporting operations

These extend `BaseChildOp` or `RoomChildOp` and provide a focused task. Examples include:

- `SpawningOp` – spawns creeps for the base.
- `FillingOp` – keeps extensions and towers full.
- `UpgradingOp` – upgrades the controller.
- `TransportOp` – moves resources around the base and manages links.
- `MarketOp` – trades resources on the market.
- `ScoutOp` – explores neighbouring rooms.
- `HarvestingOp`, `BuildingOp`, `ReservationOp`, `RoadOp` – room specific tasks handled by `RoomOp`.

## Operation Reference

Below is a brief description of every operation class. The file names match the
source found in `src/`.

### Core

- **meta_operation.js** – `Operation` base class implementing the tick cycle.
- **meta_childOp.js** – `ChildOp` base class for operations that have a parent.

### Shard level

- **mainOp.js** – Creates the initial `ShardOp` and distributes CPU.
- **shard_shardOp.js** – Root for all shard tasks.
- **shard_childOp.js** – Base class for shard specific operations.
- **shard_bankOp.js** – Handles credits and market orders across the shard.
- **shard_colonizingOp.js** – Manages colonising new rooms from any base.
- **shard_spawningOp.js** – Decides which base performs global creep spawning.
- **shard_defenseOp.js** – Cross-shard defence and guard management.
- **shard_mapOp.js** – Maintains world exploration data.
- **shard_creepOp.js** – Wrapper around a creep used by higher level ops.

### Base level

- **base_baseOp.js** – Controls a single owned room.
- **base_childOp.js** – Generic base operation that knows its `BaseOp` parent.
- **base_basePlanOp.js** – Plans building placement for a base.
- **base_colonizingOp.js** – Sends out colonisers from a base.
- **base_defenseOp.js** – Operates towers and defensive logic.
- **base_fillingOp.js** – Keeps extensions and towers supplied with energy.
- **base_marketOp.js** – Trades and transfers resources via the market.
- **base_miningOp.js** – Mines the room's minerals.
- **base_scoutOp.js** – Regularly scouts nearby rooms.
- **base_spawningOp.js** – Spawns creeps locally for the base.
- **base_transportOp.js** – Handles logistics between structures.
- **base_upgradingOp.js** – Upgrades the controller.

### Room level

- **room_roomOp.js** – Manages tasks for a specific room.
- **room_childOp.js** – Base class used by room operations.
- **room_attackOp.js** – Attacks or guards a hostile room.
- **room_buildingOp.js** – Builds structures and maintains construction sites.
- **room_harvestingOp.js** – Harvests energy sources.
- **room_reservationOp.js** – Reserves controllers in remote rooms.
- **room_roadOp.js** – Plans and repairs roads.


## Adding New Functionality

When extending the bot try to add a new operation rather than modifying existing ones. This keeps responsibilities small and makes the code easier to maintain. Each operation can spawn creep operations as required and manage its own state.

