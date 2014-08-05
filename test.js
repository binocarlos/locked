var locked = require('./')
var async = require('async')
var tape     = require('tape')
var etcdjs = require('etcdjs')
var etcd = etcdjs('127.0.0.1:4001')
var testPath = '/lockedtest'

tape('clear out test key', function(t){
  etcd.del(testPath, {
    recursive:true
  }, function(err){
    t.end()
  })
})

tape('write a single lock', function(t){
  var locker = locked('127.0.0.1:4001')
  var lock = locker({
    id:'node1',
    path:testPath,
    value:'apples',
    ttl:10
  })

  lock.on('change', function(value, nodeid){
    console.log('-------------------------------------------');
    console.log('change')
  })

  lock.on('selected', function(value, nodeid){
    console.log('-------------------------------------------');
    console.log('selected')
  })

  lock.start()
})
