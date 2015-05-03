THREE.UroTask = function(config) {

	THREE.Object3D.call( this );
	this.config(config);
	this.delta = 0.01;
	this.concurrency = 1;
	this.count = 0;
	this.transitions = [];
	this.statics = [];
	this.initialized = 0;
	this.slots = [{transitions : [], mode :"idle", statics: [], uro : null, runtime : 100}];
};

THREE.UroTask.prototype = Object.create( THREE.Object3D.prototype );

THREE.UroTask.prototype.config = function(config) {
	if (!config) return;
	this.spline = config && config.spline || null;

	if (config.transitions) {
		this.transitions = config.transitions;
	}
	if (config.statics) {
		this.statics = config.statics;
	}

	if (config.concurrency) {
		this.concurrency = config.concurrency;
		this.slots = [];
		for (var i = 0; i < config.concurrency; i++) {
			this.slots.push({transitions : [], mode :"idle", statics: [], uro : null, runtime : 100});
		};
	}

	if (config.position) {
		this._position = config.position;
	}

	if (config.rotation) {
		this._rotation = config.rotation;
	}

	if (config.offset) {
		this._offset = config.offset;
	}
};

THREE.UroTask.prototype.setup = function(res, loader, szene) {
	this.initialized = 0;
	for (t in this.transitions) {
		loader.load( res + this.transitions[t], function ( object, materials ) {
			for (var i=0; i < materials.length; i++) {
				materials[i].morphTargets = true;
			}
			for (var i = 0; i < this.concurrency; i++) { 
				var obj = new THREE.MorphTransitionMesh( object, new THREE.MeshFaceMaterial(materials));
				obj.parseAnimations();
				obj.castShadow = true;
				obj.rotation.set(this._rotation.x, this._rotation.y, this._rotation.z);
				obj.position.set(this._position.x + this._offset.x * i, this._position.y + this._offset.y * i, this._position.z + this._offset.z * i);
				obj.scale.set(0.5,0.5, 0.5);
				obj.mirroredLoop = true;
				obj.playAnimation("transition0", 0.2);
	
				this.add(obj);
				this.slots[i].transitions[t] = obj;
			}
			this.initialized++;
			if (this.initialized >= (this.transitions.length + this.statics.length)) {
				szene.add( this );
			};
		}.bind(this));
	}

	for (s in this.statics) {
		loader.load( res + this.statics[s], function ( object, materials ) {
			for (var i = 0; i < this.concurrency; i++) { 
				var obj = new THREE.Mesh( object, new THREE.MeshFaceMaterial(materials));
				obj.castShadow = true;
				obj.rotation.set(this._rotation.x, this._rotation.y, this._rotation.z);
				obj.position.set(this._position.x + this._offset.x * i, this._position.y + this._offset.y * i, this._position.z + this._offset.z * i);
				obj.scale.set(0.5,0.5, 0.5);
	
				this.add(obj);
				this.slots[i].statics[i] = obj;
			}
			this.initialized++;
			//this.statics[t] = obj;
			if (this.initialized >= (this.transitions.length + this.statics.length)) {
				szene.add( this );
			};
		}.bind(this));
	}
};

THREE.UroTask.prototype.start = function(uro, time) {
	this.count++;
	uro.progress = 0;
	uro.start = time;
	uro.result = "none";
	for (var i = 0; i < this.slots.length; i++) {
		if (!this.slots[i].uro) {
			this.slots[i].uro = uro;
			this.slots[i].mode = "load";
			break;
		}
	}
};

THREE.UroTask.prototype.onTransitionEnd = function(){
		if (this.mode == "start") {
			this.mode = "running";
			this.runtime = 100;
		} else if (this.mode == "end") {
			this.mode = "unload";
		}
};

THREE.UroTask.prototype.update = function() {
	//uro is traveling along the path to task
	for (var i = 0; i < this.slots.length; i++) {
		var slot = this.slots[i];
		var uro = slot.uro;
		if (!uro) continue;
		
		if (slot.mode == "load" && uro.progress >=0.45) {
			slot.mode = "start";
			for (t in slot.transitions) {
				slot.transitions[t].startTransitionStart(this.onTransitionEnd.bind(slot));
			}
		}
	
		for (t in slot.transitions) {
			var transition = slot.transitions[t];
			if (!transition.updateAnimation) continue;
	
			if (slot.mode == "start" || slot.mode == "end") {
				transition.updateAnimation(25);
			}
		}
	
		if (slot.mode == "running" && this.running(slot)) {
			continue;
		}
	
		if (slot.mode == "running" && uro.progress >= 0.55) {
			slot.mode = "end";
			if (slot.transitions.length > 0) {
				for (t in slot.transitions) {
					slot.transitions[t].startTransitionEnd(this.onTransitionEnd.bind(slot));
				}
			}else {
				slot.mode = "unload";
			}
		}
		this.apply(slot);
	}
};

THREE.UroTask.prototype.running = function(slot) {
	slot.runtime--;
	return (slot.runtime > 0);
}

THREE.UroTask.prototype.apply = function(slot) {
	var uro =slot.uro;
	uro.progress+= this.delta;

	if (uro.progress >= 1.0) {
		uro.progress == 1.0;
		slot.mode = "idle";
		uro.result = "done";

		slot.uro = null;
		this.count--;
	} else {
		this._updateScreenPosition(slot.uro);
	}
};

THREE.UroTask.prototype._updateScreenPosition = function(uro) {
	if (this.spline) {
		uro.copy(this.spline.getPoint(uro.progress));
	}
};

None = function(config) {
	THREE.UroTask.call(this);
	this.config(config);
};
None.prototype = Object.create( THREE.UroTask.prototype );
None.prototype.apply = function(slot) {
	slot.uro.set(0.0, -2.0, 0.0);
};

Wait = function(config) {
	THREE.UroTask.call(this);
	//concurrency : 100000,
	this.config(config);
};
Wait.prototype = Object.create( THREE.UroTask.prototype );
Wait.prototype.apply = function(slot) {};

Upload = function(config) {
	THREE.UroTask.call(this);
	this.config({concurrency : 100});
};
Upload.prototype = Object.create( THREE.UroTask.prototype );

Upload.prototype.update = function() {
	for (var i = 0; i < this.slots.length; i++) {
		var slot = this.slots[i];
		if (!slot.uro) continue;
		this.apply(slot);
	};
}

Cleanup = function(config) {
	Upload.call(this);
	this.config(config);
};
Cleanup.prototype = Object.create( Upload.prototype );

Copy = function(config) {
	THREE.UroTask.call(this);
	this.config(config);
	this.delta = 0.005;
};
Copy.prototype = Object.create( THREE.UroTask.prototype );

Copy.prototype._updateScreenPosition = function(uro) {
	if (this.spline) {
		if (uro.progress < 0.5) {
			uro.copy(this.spline.getPoint(2 * uro.progress));
		} else {
			uro.copy(this.spline.getPoint(Math.max(0.0, 1.0 - (uro.progress - 0.5) * 2)));
		}
	}
};

Init = function(config) {
	Copy.call(this);
	this.config(config);
};
Init.prototype = Object.create( Copy.prototype );

Vscan = function(config) {
	Copy.call(this);
	this.config(config);
};
Vscan.prototype = Object.create( Copy.prototype );

Video = function(config) {
	Copy.call(this);
	this.config(config);
};
Video.prototype = Object.create( Copy.prototype );

Image = function(config) {
	Copy.call(this);
	this.config(config);
};
Image.prototype = Object.create( Copy.prototype );
