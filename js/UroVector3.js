THREE.UroVector3 = function() {
	
	THREE.Vector3.call( this );

	this.name = "";
	this.task = URO.task.none;
	this.ticket = "";
	this.start = 0;
	this.progress = 0;
	this.result = "none";//none, done, error
	this.type = "";
}

THREE.UroVector3.prototype = Object.create( THREE.Vector3.prototype );
