THREE.DynamicPointCloud = function ( geometry, material ) {
	THREE.PointCloud.call(this);

	this.geometry = geometry !== undefined ? geometry : new THREE.Geometry();
	this.material = material !== undefined ? material : new THREE.PointCloudMaterial( { color: Math.random() * 0xffffff } );

	this.activIndex = -1;
}

THREE.DynamicPointCloud.prototype = Object.create( THREE.PointCloud.prototype );

THREE.DynamicPointCloud.prototype.activateNext = function () {
	this.activIndex = (this.activIndex < this.geometry.vertices.length - 1 ? this.activIndex + 1 : this.activIndex);
	return this.geometry.vertices[this.activIndex];

}

THREE.DynamicPointCloud.prototype.activateAll = function () {
	this.activIndex = this.geometry.vertices.length - 1;
	return this.geometry.vertices;
}