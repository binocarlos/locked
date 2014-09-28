var etcdjs = require('etcdjs')
var littleid = require('littleid')

var EventEmitter = require('events').EventEmitter
var util = require('util')

function Node(etcdhost, opts){
	EventEmitter.call(this)
	etcdhost = etcdhost || '127.0.0.1:4001'
	opts = opts || {}

	this._opts = opts
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
	var v = parts.join(':::')
	var obj = {
		id:id,
		value:v
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
	return this.processValue('value', this._currentValue)
}

Node.prototype.localid = function(){
	return this._id
}

Node.prototype.localvalue = function(){
	return this._opts.value
}

Node.prototype.localdata = function(){
	return [this._id, this._value].join(':::')
}

Node.prototype.isSelected = function(){
	return this.id()==this.localid()
}

Node.prototype.write = function(prevValue, done){
	var self = this;
	var opts = {
		ttl:this._ttl
	}

	if(prevValue){
		opts.prevValue = prevValue
	}
	else{
		opts.prevExist = false
	}

	var isLeader = this.isSelected()

	// if the timeout triggers it means we were unable to complete
	// the attempt and must relinquish leadership if we have it
	var leaderTimeout = setTimeout(function(){
		if(!isLeader) return
		self._currentValue = null
		self.emit('deselect')
		self.tryLock()
	}, this._ttl * 1000)

	this._etcd.set(this._path, this.localdata(), {
		prevExist:false,
		ttl:this._ttl
	}, function(err, result){
		clearTimeout(leaderTimeout)
		done(err, result)
	})
}

Node.prototype.writeBlank = function(done){
	this.write(null, done)
}

Node.prototype.writeNext = function(done){
	this.write(this.localdata(), done)
}

Node.prototype.finishWriteTimed = function(){
	if(!this._status) return
	this.writeNext(this.finishWrite.bind(this))
}

Node.prototype.finishWrite = function(err, result){
	var self = this;
	if(err){
		return
	}
	setTimeout(this.finishWriteTimed.bind(this), (this._ttl/2)*1000)
}

Node.prototype.tryLock = function(){
	var self = this
	if(!this._status) return
	this.writeBlank(this.finishWrite.bind(this))
}

Node.prototype.start = function(done){
	var self = this;

	var _runDone = false

	function runDone(){
		if(_runDone) return
		_runDone = true
		done && done()
	}

	function onChange(err, result, next) {
		if(!self._status) return	
		if(err) return next(onChange)
		if(!result) return next(onChange)
		if(result.action=='expire'){
			self.tryLock()
		}
		else{
			var nextValue = result.node.value
			var currentValue = self._currentValue
			var nodeValue = self.localdata()
			var wasLeader = self.isSelected()
			var id = self.processValue('id', nextValue)
			var v = self.processValue('value', nextValue)
			if(nextValue!=currentValue){
				self.emit('change', v, id)
				self._currentValue = nextValue

				if(nextValue==nodeValue){
					self.emit('select', v, id)
				}
				else if(wasLeader){
					self.emit('deselect')
				}
			}
			else if(nextValue==nodeValue){
				self.emit('refresh', v, id)
			}
			runDone()
			self.emit('ping', v, id)	
		}
	  next(onChange)
	}

	this._status = true
	this._etcd.wait(this._path, onChange)
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
