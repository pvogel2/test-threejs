THREE.MorphTransitionMesh = function ( geometry, material ) {
	THREE.MorphAnimMesh.call(this, geometry, material);
	this.inTransition = false;
	this.duration = 250;
	this.onTransitionCallback= function(){};
}

THREE.MorphTransitionMesh.prototype = Object.create( THREE.MorphAnimMesh.prototype );

THREE.MorphTransitionMesh.prototype.startTransitionStart = function(callback) {
	this.inTransition = true;
	this.time = 0;
	this.duration = 250;
	this.setDirectionForward();
	if (typeof callback == "function") {
		this.onTransitionCallback = callback;
	}
}

THREE.MorphTransitionMesh.prototype.startTransitionEnd = function(callback) {
	this.inTransition = true;
	this.time = this.duration;
	this.setDirectionBackward();
	if (typeof callback == "function") {
		this.onTransitionCallback = callback;
	}
}

THREE.MorphTransitionMesh.prototype.finished = function() {
	return !this.inTransition;
}

THREE.MorphTransitionMesh.prototype.updateAnimation = function(delta) {
	if (this.inTransition) {

		this.time += this.direction * delta;
	
		var mix = this.time / this.duration;
	
		this.morphTargetInfluences[ this.startKeyframe ] = 1 - mix;
		this.morphTargetInfluences[ this.endKeyframe ] = mix;

		if (this.time % this.duration == 0) {
			this.inTransition = false;
			this.onTransitionCallback();
			this.onTransitionCallback = function(){};
		}
	}

};

THREE.MorphTransitionMesh.prototype.parseAnimations = function () {

	var geometry = this.geometry;

	if ( ! geometry.animations ) geometry.animations = {};

	var firstAnimation, animations = geometry.animations;

	var pattern = /([a-z]+)_?(\d+)/;

	var morphTargets = geometry.morphTargets.slice();
	geometry.morphTargets = [];
	morphTargets[0].name = "base";
	for ( var i = 1, il = morphTargets.length; i < il; i++ ) {

		morphTargets[i].name = "transition" + (i-1) + "_1";

		geometry.morphTargets.push(morphTargets[0]);
		geometry.morphTargets.push(morphTargets[i]);

		var label = "transition" + (i-1);
		var end = geometry.morphTargets.length - 1;

		if ( ! animations[ label ] ) animations[ label ] = { start: Infinity, end: - Infinity };

		var animation = animations[ label ];

		animation.start = end - 1;
		animation.end = end;

		if ( ! firstAnimation ) firstAnimation = label;
	}

	geometry.firstAnimation = firstAnimation;

};


