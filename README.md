locked
------

distributed consensus on a single value using [etcd](http://github.com/coreos/etcd)

## install

```
$ npm install locked
```

## usage

First create a locker that is pointing at some nodes of your etcd cluster

```js
var locked = require('locked')


// create a locker pointing with an etcd connection string
var locker = locked('127.0.0.1:4001,127.0.0.1:4002')

// create a node - this points to a single key and represents its value locked across the cluster
var node = locker({
	id:'node1',     // this is auto-completed if left blank
	path:'/master', // the etcd path we use for the lock
	value:10 ,      // the value for this node
	ttl:10          // we will check the lock every (ttl/2) seconds
})

// this is run when the values changes regardless of what node is elected
node.on('change', function(value, nodeid){
	console.log(value + ' was written by ' + nodeid)
})

// this is run when this node has been selected
node.on('selected', function(){
	console.log('this server has been elected as the master!')
})

// this starts the lock for this node
node.start()
```

you can also pass an existing etcdjs object:

```js
var etcdjs = require('etcdjs')
var locker = locked(etcdjs('127.0.0.1:4001,127.0.0.1:4002'))
```

## api

### `var locker = locked(etcdhosts)`

Create a new locker pointing to some of the etcd servers in your cluster - `etcdhosts` can be an array or a single address string.

### `var node = locker(path, opts)`

Create a node that represents a single key - other machines will have created nodes on the same path - they are all essentially competing.

Opts has the following keys:

 * id - specify the id of this node manually, this is auto-generated if left blank
 * value - the value this node will write to the registry
 * ttl - the amount of seconds that each value is valid - the value is automatically refreshed every ttl/2 seconds

### `node.id(done)`

Get the currently active id across the lock

### `node.value(done)`

Get the currently active value across the lock

### `node.start()`

Start the lock process for this node

### `node.stop()`

Stop the lock process for this node

## events

### `node.on('change', function(value, nodeid){})`

This event is triggered when the lock value has changed regardless of which node was elected.

The nodeid is of the elected machine is passed as the second argument.

### `node.on('select', function(value){})`

This event is triggered when the node has been elected and it's value distributed to the cluster.

You can run logic in this function that should only be running on one server at a time.

### `node.on('refresh', function(value){})`

Triggered when the currently selected node has refreshed its value

## license

MIT