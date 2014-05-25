locked
------

use etcd to distribute a consensus on a single value

## install

```
$ npm install locked
```

## usage

locked wraps the [etcd leader election module](https://github.com/coreos/etcd/blob/master/Documentation/modules.md) to provide a single value across a cluster of etcd machines

It is useful if you want to run a single copy of some stateless code and have another server take over automatically if the process is killed.

First create a locker that is pointing to some etcd servers in your cluster:

```js
var locked = require('locked')

// create a locker pointing to an etcd cluster
var locker = locked(['127.0.0.1:4001', '127.0.0.1:4002'])

// each locker has an id - this will be used to agree on consensus for running functions
console.log(locker.id())
```

A singleton function is one that is defined by multiple hosts but only run on one of them:

```js
var buildServer = locker('build', function(remove){

	// this code will only be triggered when this
	// host has obtained the lock from the cluster

	// remove is a function that will un-register this host
	// an election for another host will trigger

})

// you can react to when the code in this singleton has been activated
buildServer.on('start', function(){

})

// also - if this singleton has been removed from the lock
buildServer.on('stop', function(){

})

// you can manually remove a singleton
buildServer.remove()
```

You can get all singletons currently registered with a locker:

```js
var singletons = locker.singletons()

singletons.build.remove()
```

## api

### `var locker = locked(etcdhosts)`

Create a new locker pointing to some of the etcd servers in your cluster - `etcdhosts` can be an array or a single address string.

### `var id = locker.id()`

Get the id that will be used to obtain a lock on a function for this host.

### `var singletons = locker.singletons()`

Get an object with the name of each singleton currently registered mapped onto the singleton

### `var singleton = locker(name, fn)`

Register a function with the cluster under 'name' - only one machine in the cluster will run fn at any one time.

### `singleton.remove()`

Un-register 

## events

### `singleton.on('start', fn)`

Triggered when the singleton on this host has been elected by the cluster

### `singleton.on('stop', fn)`

Triggered when the singleton on this host has been removed

## license

MIT