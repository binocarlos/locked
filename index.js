var etcdjs = require('etcdjs')
var littleid = require('littleid')

var EventEmitter = require('events').EventEmitter
var util = require('util')

function Node(etcdhost, key){
	etcdhost = etcdhost || '127.0.0.1:4001'
	EventEmitter.call(this)
	this._id = littleid()
	this._etcd = etcdjs(etcdhost.split(/\s*,\s*/))
	this._key = key
	this._status = false
}

util.inherits(Node, EventEmitter)

module.exports = Node

Node.prototype.id = function(){
	return this._id
}

Node.prototype.start = function(){
	this._status = true
	store.wait(this._key, function onchange(err, result, next) {
		if(!self._status) return
    console.log('change!', result);
    next(onchange);
	})
}

Node.prototype.stop = function(){

}

Node.prototype.write = function(value, done){
	var form = {}
	form.ttl = 60
	form.value = value


	console.log('-------------------------------------------');
	console.log('writing ' + value)
	this._etcd._request({
		method:'PUT',
		uri:'/mod/v2/leader/' + this._key + '?ttl=60',
		form:form,
		json:true
	}, function(err, result){
		console.log('-------------------------------------------');
		console.log('write')
		console.dir(err)
		console.dir(result)
	})
}

Node.prototype.read = function(done){
	console.log('-------------------------------------------');
	console.log('reading')
	this._etcd._request({
		method:'GET',
		uri:'/mod/v2/leader/' + this._key
	}, function(err, result){
		console.log('-------------------------------------------');
		console.log('read')
		console.dir(err)
		console.dir(result)
	})
}

module.exports = function(etcdhost){
	return function(path){
		return new Node(etcdhost, path)
	}
}