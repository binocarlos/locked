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
    t.equal(lock.id(), 'node1', 'id()')
    t.equal(lock.value(), 'apples', 'value()')
    lock.stop()
    t.end()
  })

  lock.start()
})

resetEtcd()

tape('competing locks', function(t){
  var locker = locked('127.0.0.1:4001')
  var lock1 = locker({
    id:'node1',
    path:testPath,
    value:'apples',
    ttl:2
  })
  var lock2 = locker({
    id:'node2',
    path:testPath,
    value:'pears',
    ttl:2
  })

  lock1.on('select', function(){
    console.log('lock1 selected')
  })

  lock2.on('select', function(){
    console.log('lock2 selected')
  })

  lock1.start()
  lock2.start()

  setTimeout(function(){
    console.log('stopping lock1')
    lock1.stop()

    setTimeout(function(){
      t.equal(lock2.value(), 'pears')
      t.equal(lock2.id(), 'node2')

      lock1.stop()
      lock2.stop()
      t.end()
    }, 3000)
  }, 3000)
})

resetEtcd()