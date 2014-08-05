var locked = require('./')
var async = require('async')
var tape     = require('tape')
var etcdjs = require('etcdjs')
var etcd = etcdjs('127.0.0.1:4001')
var testPath = '/lockedtest'

function resetEtcd(){
  tape('clear out test key', function(t){
    etcd.del(testPath, {
      recursive:true
    }, function(err){
      t.end()
    })
  })
}

resetEtcd()

tape('write a single lock', function(t){
  var locker = locked('127.0.0.1:4001')
  var lock = locker({
    id:'node1',
    path:testPath,
    value:'apples',
    ttl:10
  })

  var values = {}

  lock.on('change', function(value, nodeid){
    console.log('change', value, nodeid)
    values.change = nodeid + ':::' + value
  })

  lock.on('select', function(value, nodeid){
    console.log('select', value, nodeid)
    values.select = nodeid + ':::' + value
  })

  lock.on('refresh', function(value, nodeid){
    console.log('refresh', value, nodeid)
    values.refresh = nodeid + ':::' + value

    t.equal(values.change, 'node1:::apples', 'change value')
    t.equal(values.change, 'node1:::apples', 'select value')
    t.equal(values.change, 'node1:::apples', 'refresh value')
    lock.stop()
    t.end()
  })

  lock.start()
})

resetEtcd()

tape('end waiting', function(t){
  t.end()
})