	var scene = new THREE.Scene();
	var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
	var renderer = new THREE.WebGLRenderer();
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMapEnabled = true;
	renderer.shadowMapSoft = true;
	document.body.appendChild( renderer.domElement );
	//var geometry = new THREE.CubeGeometry(1,1,1);
	var geometry = new THREE.BoxGeometry( 0.5, 0.5, 0.5 );
	var projector, mouse = { x: 0, y: 0 }, INTERSECTED;

	var material = new THREE.MeshBasicMaterial( { color: 0x999999 } );
	var uroCore = new THREE.Mesh( geometry, material );
	var cannon;
	var workshop = new THREE.Mesh( geometry, material.clone() );
	workshop.position.x = 5;
	workshop.position.y = 2;
	workshop.position.z = 5;
	workshop.castShadow = true;
	workshop.receiveShadow = true;

	var mongodb = new THREE.Mesh( geometry, material.clone() );
	mongodb.position.x = 5;
	mongodb.position.y = 2;
	mongodb.position.z = -5;
	mongodb.castShadow = true;
	mongodb.receiveShadow = true;

	uroCore.position.y = 2;
	uroCore.castShadow = true;
	uroCore.receiveShadow = true
	//scene.add( uroCore );
	scene.add( workshop );
	scene.add( mongodb );
	//scene.add( text3d );

	var directionalLight = new THREE.DirectionalLight(0xaaaaaa, 2.0);
	directionalLight.position.set(-5, 10, 2);
	directionalLight.target.position.set(0, 0, 0);
	directionalLight.castShadow = true;
	directionalLight.shadowDarkness = 0.2;
	 
	directionalLight.shadowCameraNear = 0;
	directionalLight.shadowCameraFar = 20;
	 
	directionalLight.shadowCameraLeft = -12;
	directionalLight.shadowCameraRight = 12;
	directionalLight.shadowCameraTop = 12;
	directionalLight.shadowCameraBottom = -12;
	scene.add( directionalLight );
	var light = new THREE.AmbientLight( 0xffffff ); // soft white light
	scene.add( light );
	camera.position.y = 3;
	camera.position.z = 5;
	camera.rotation.x = -0.5;

	var geometry = new THREE.PlaneGeometry( 50, 50 );
	var material = new THREE.MeshBasicMaterial( {color: 0xffffff, side: THREE.DoubleSide} );
	var plane = new THREE.Mesh( geometry, material );
	plane.rotation.x = 1.57;
	plane.position.y = 0;
	plane.receiveShadow = true;
	scene.add( plane );

	var pMaterial = new THREE.PointCloudMaterial({
        color: 0xffffff,
        size: 1,
        sizeAttenuation : false
    });

	var attributes = {

			size: {	type: 'f', value: [] },
			ca:   {	type: 'c', value: [] }

		};

	var	uniforms = {

		amplitude: { type: "f", value: 1.0 },
		color:     { type: "c", value: new THREE.Color( 0xffffff ) },
		texture:   { type: "t", value: THREE.ImageUtils.loadTexture( "/three/res/obj/ball.png" ) },

	};
	uniforms.texture.value.wrapS = uniforms.texture.value.wrapT = THREE.RepeatWrapping;

	var shaderMaterial = new THREE.ShaderMaterial( {

		uniforms:       uniforms,
		attributes:     attributes,
		vertexShader:   document.getElementById( 'vertexshader' ).textContent,
		fragmentShader: document.getElementById( 'fragmentshader' ).textContent

	});

	var vgeometry = new THREE.Geometry();
	for ( var i = 0; i < 3; i ++ ) {

		var vertex = new THREE.Vector3();
		vertex.x = 0;//Math.random() * 2 - 1;
		vertex.z = 0;//Math.random() * 2 - 1;
		vertex.multiplyScalar( 5 );
		vertex.y = 1;

		vgeometry.vertices.push( vertex );

	}	
	vgeometry.dynamic = true;
	var points = new THREE.PointCloud( vgeometry, shaderMaterial);

	var vertices = points.geometry.vertices;
	var vc1 = vertices.length;

	var values_size = attributes.size.value;
	var values_color = attributes.ca.value;

	for ( var v = 0; v < vertices.length; v ++ ) {

		values_size[ v ] = 5;
		values_color[ v ] = new THREE.Color( 0xffffff );

		values_color[ v ].setHSL( 0.5 + 0.2 * ( v / vc1 ), 1, 0.5 );
	}

	scene.add( points );
	var manager = new THREE.LoadingManager();
	manager.onProgress = function ( item, loaded, total ) {
		console.log( item, loaded, total );
	};

	/*var loader = new THREE.JSONLoader( manager );
	loader.load( '/three/res/obj/cannon.js', function ( object, materials ) {

		cannon = new THREE.Mesh( object, new THREE.MeshFaceMaterial( materials ));
		cannon.castShadow = true;
		scene.add( cannon );
	}, "/three/res/obj/");*/
	
	var controls = new THREE.OrbitControls(camera, renderer.domElement);
	controls.userPanSpeed = 0.2;
	//controls.target.set(0,0,0);

	// initialize object to perform world/screen calculations
	projector = new THREE.Projector();

	function onDocumentMouseMove( event ) {
		// the following line would stop any other event handler from firing
		// (such as the mouse's TrackballControls)
		// event.preventDefault();
		
		// update the mouse variable
		mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
		mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
	}
	
	// when the mouse moves, call the given function
	document.addEventListener( 'mousemove', onDocumentMouseMove, false );
	
	function update() {
		var vector = new THREE.Vector3( mouse.x, mouse.y, 1 );
		projector.unprojectVector( vector, camera );
		var ray = new THREE.Raycaster( camera.position, vector.sub( camera.position ).normalize() );

		// create an array containing all objects in the scene with which the ray intersects
		var intersects = ray.intersectObjects( scene.children );

		// INTERSECTED = the object in the scene currently closest to the camera 
		//		and intersected by the Ray projected from the mouse position 	
		
		// if there is one (or more) intersections
		if ( intersects.length > 0 )
		{
			// if the closest object intersected is not the currently stored intersection object
			if ( intersects[ 0 ].object != INTERSECTED) 
			{
			    // restore previous intersection object (if it exists) to its original color
				if ( INTERSECTED && INTERSECTED.material.color) 
					INTERSECTED.material.color.setHex( INTERSECTED.currentHex );
				// store reference to closest object as current intersection object
				INTERSECTED =  (intersects[ 0 ].object != plane ? intersects[ 0 ].object : null);
				// store color of closest object (for later restoration)
				
				if ( INTERSECTED && INTERSECTED.material.color) {
					INTERSECTED.currentHex = INTERSECTED.material.color.getHex();
					// set a new color for closest object
					INTERSECTED.material.color.setHex( 0xffff00 );
				}
			}
		} 
		else // there are no intersections
		{
			// restore previous intersection object (if it exists) to its original color
			if ( INTERSECTED  && INTERSECTED.material.color) 
				INTERSECTED.material.color.setHex( INTERSECTED.currentHex );
			// remove previous intersection object reference
			//     by setting current intersection object to "nothing"
			INTERSECTED = null;
		}

		if  ( Math.random() < 0.05 ) {
			console.log("add vertex");
			//vertex.multiplyScalar( 5 );
			/*vertex.x = uroCore.position.x + Math.random() + 3;
			vertex.y = uroCore.position.y;
			vertex.z = uroCore.position.z;
			vertex.x = Math.random() + 3;
			vertex.y = 3;
			vertex.z = 3;
			vertex.multiplyScalar( 5 );*/
			for (var i = 0; i < points.geometry.vertices.length; i++){
				points.geometry.vertices[i].x = Math.random() * 2 - 1;
				points.geometry.vertices[i].y = 1;
				points.geometry.vertices[i].z = Math.random() * 2 - 1;
			};
			
			points.geometry.verticesNeedUpdate = true;
		}	

		/*if ( keyboard.pressed("z") ) 
		{ 
			// do something
		}*/
		
		//controls.update();
	}

	function render() {
		controls.update();
		update();

		//uroCore.rotation.y += 0.01;
		workshop.rotation.y += 0.02;
		mongodb.rotation.y += 0.04;
		//cannon.rotation.y += 0.01;
		for( var i = 0; i < attributes.size.value.length; i ++ ) {

			if ( i < vc1 )
				attributes.size.value[ i ] = Math.max(0, 26 + 32 * Math.sin( 0.1 * i + 0.6 ));


		}

		attributes.size.needsUpdate = true;
		renderer.render(scene, camera);
		requestAnimationFrame(render);
	}
	render();
