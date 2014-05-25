var locked = require('./')
var async = require('async')
var wrench = require('wrench')
var spawn = require('child_process').spawn
var exec = require('child_process').exec
var tape     = require('tape')

var servers = {}
tape('start etcd servers', function(t){

  wrench.rmdirSyncRecursive(__dirname + '/testdata', true)
  wrench.mkdirSyncRecursive(__dirname + '/testdata')

  async.series([
    function(next){
      servers.locked1 = spawn('etcd', [
        '-name',
        'locked-1',
        '-addr',
        '127.0.0.1:4001',
        '-peer-addr',
        '127.0.0.1:7001',
        '-data-dir',
        '/tmp/locked1'
      ], {
        stdio:'inherit'
      })
      setTimeout(next, 500)
    },
    function(next){
      servers.locked2 = spawn('etcd', [
        '-name',
        'locked-2',
        '-addr',
        '127.0.0.1:4002',
        '-peer-addr',
        '127.0.0.1:7002',
        '-peers',
        '127.0.0.1:7001,127.0.0.1:7003',
        '-data-dir',
        '/tmp/locked2'
      ], {
        stdio:'inherit'
      })
      setTimeout(next, 500)
    },
    function(next){
      servers.locked3 = spawn('etcd', [
        '-name',
        'locked-3',
        '-addr',
        '127.0.0.1:4003',
        '-peer-addr',
        '127.0.0.1:7003',
        '-peers',
        '127.0.0.1:7001,127.0.0.1:7002',
        '-data-dir',
        '/tmp/locked3'
      ], {
        stdio:'inherit'
      })
      setTimeout(next, 500)
    }
  ], function(err){
    t.end()
  })

})

tape('run a function on one of 3 servers', function(t){
  
  setTimeout(function(){
    t.end()  
  }, 2000)
  

})

tape('stop etcd servers', function(t){

  async.series([
    function(next){
      servers.locked1.kill('SIGTERM')
      setTimeout(next, 500)
    },
    function(next){
      servers.locked2.kill('SIGTERM')
      setTimeout(next, 500)
    },
    function(next){
      servers.locked3.kill('SIGTERM')
      setTimeout(next, 500)
    }
  ], function(err){
    t.end()
  })
  
})