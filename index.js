var etcdjs = require('etcdjs')
var littleid = require('littleid')

var EventEmitter = require('events').EventEmitter
var util = require('util')

function Node(etcdhost, opts){
	EventEmitter.call(this)
	etcdhost = etcdhost || '127.0.0.1:4001'
	opts = opts || {}
	
	this._id = opts.id || littleid()
	this._etcd = typeof(etcdhost)==='string' ? etcdjs(etcdhost.split(/\s*,\s*/)) : etcdhost
	this._path = opts.path
	this._value = opts.value
	this._currentValue = null
	this._status = false
	this._ttl = opts.ttl || 10

	if(!this._path){
		throw new Error('path must be specified')
	}
	if(!this._value){
		throw new Error('value must be specified')
	}
	
}

util.inherits(Node, EventEmitter)

Node.prototype.processValue = function(field, value){
	value = value || ''
	var parts = value.split(':::')
	var id = parts.shift()
	var value = parts.join(':::')
	var obj = {
		id:id,
		value:value
	}
	return obj[field]
}

Node.prototype.id = function(){
	if(!this._currentValue){
		return null
	}
	return this.processValue('id', this._currentValue)
}

Node.prototype.value = function(done){
	if(!this._currentValue){
		return null
	}
	return this.processValue('id', this._currentValue)
}

Node.prototype.localvalue = function(){
	return [this._id, this._value].join(':::')
}

Node.prototype.tryLock = function(){
	var self = this
	if(!this._status) return
	function writeBlank(done){
		self._etcd.set(self._path, self.localvalue(), {
			prevExist:false,
			ttl:self._ttl
		}, done)
	}
	function writeNext(done){
		self._etcd.set(self._path, self.localvalue(), {
			prevValue:self.localvalue(),
			ttl:self._ttl
		}, done)
	}
	function finishWrite(err, result){
		if(err){
			return
		}
		setTimeout(function(){
			writeNext(finishWrite)
		}, (self._ttl/2)*1000)
	}
	writeBlank(finishWrite)
}

Node.prototype.start = function(){
	var self = this;
	this._status = true
	this._etcd.wait(this._path, function onChange(err, result, next) {
		if(!self._status) return
		if(err) throw new Error(err)
		if(!result) return next(onChange)
		if(result.action=='expire'){
			self.tryLock()
		}
		else{
			var nextValue = result.node.value
			var currentValue = self._currentValue
			var nodeValue = self.localvalue()
			var id = self.processValue('id', nextValue)
			var v = self.processValue('value', nextValue)
			if(nextValue!=currentValue){
				self.emit('change', v, id)
				self._currentValue = nextValue

				if(nextValue==nodeValue){
					self.emit('select', v, id)
				}
			}
			else if(nextValue==nodeValue){
				self.emit('refresh', v, id)
			}			
		}
    next(onChange)
	})
	this.tryLock({
		prevExist:false
	})
}

Node.prototype.stop = function(){
	this._status = false
}

module.exports = function(etcdhost){
	return function(opts){
		return new Node(etcdhost, opts)
	}
}