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
	return this._opts.id
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

Node.prototype.writeBlank = function(done){
	this._etcd.set(this._path, this.localdata(), {
		prevExist:false,
		ttl:this._ttl
	}, done)
}

Node.prototype.writeNext = function(done){
	this._etcd.set(this._path, this.localdata(), {
		prevValue:this.localdata(),
		ttl:this._ttl
	}, done)

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

Node.prototype.onChange = function(err, result, next) {
	var self = this;
	if(!this._status) return
	if(err) throw new Error(err)
	if(!result) return next(onChange)
	if(result.action=='expire'){
		this.tryLock()
	}
	else{
		var nextValue = result.node.value
		var currentValue = this._currentValue
		var nodeValue = this.localdata()
		var id = this.processValue('id', nextValue)
		var v = this.processValue('value', nextValue)
		if(nextValue!=currentValue){
			this.emit('change', v, id)
			this._currentValue = nextValue

			if(nextValue==nodeValue){
				this.emit('select', v, id)
			}
		}
		else if(nextValue==nodeValue){
			this.emit('refresh', v, id)
		}
		this.emit('ping', v, id)	
	}
  next(this.onChange.bind(this))
}

Node.prototype.start = function(){
	var self = this;
	this._status = true
	this._etcd.wait(this._path, this.onChange.bind(this))
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