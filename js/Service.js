THREE.Service = function(path, name, object, materials) {
	THREE.Object3D.call( this );
	this.name = name;

	var dmap =  THREE.ImageUtils.loadTexture(path + name + "_diffuse.jpg", {}, function(){});
	var smap =  THREE.ImageUtils.loadTexture(path + name + "_specular.jpg", {}, function(){});
	var bmap =  THREE.ImageUtils.loadTexture(path + name + "_bump.jpg", {}, function(){});
	var emap =  THREE.ImageUtils.loadTexture(path + name + "_specular.jpg", {}, function(){});

	var obj = new THREE.Mesh( object, new THREE.MeshPhongMaterial( {glowMap : emap,reflectivity :0.5, map : dmap, specularMap :smap, bumpMap :bmap , bumpScale : 0.005} ));
	obj.castShadow = true;
	this.add(obj);
	this.state = THREE.Service.states.RUNNING;
};

THREE.Service.prototype = Object.create( THREE.Object3D.prototype );

THREE.Service.states = {
	"IDLE" : 0,
	"RUNNING" : 1,
	"BUSY" : 2,
	"UNKONWN" : 254,
	"ERROR" : -1,
	"STOPPED" : 255
};

THREE.Service.prototype.switchState = function() {
	if (this.state == THREE.Service.states.RUNNING) {
		this.state = THREE.Service.states.STOPPED;
	} else {
		this.state = THREE.Service.states.RUNNING;
	}
};

THREE.Service.prototype.update =  function() {
	if (this.state == THREE.Service.states.RUNNING) {
		this.rotation.y -= 0.03;
	}
};
