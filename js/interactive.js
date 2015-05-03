var MWM = window.MWM || {};

MWM.appl = function() {
	this.running = false;
	this.paused = false;
	this.three = {
		szene : null,
		renderer : null,
		camera : null,
		control : null,
		projector : null,
		clock : null
	};

	this.geometry = {
		pointClouds : {},
		objects : {},
		paths : {},
		lines : {}
	};
	this.service = null;
	//stuff for intersection detection
	this.mouse = { x: 0, y: 0 };
	this.INTERSECTED = null;

	//stuff for resource handling
	this.res = "/three/res/obj/";

	this._init();
};

MWM.appl.prototype = {

		constructor: MWM.appl,

		_init : function() {
			//setup the three szene
			this.three.scene = new THREE.Scene();

			//setup the three camera
			var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
			camera.position.y = 3;
			camera.position.z = 5;
			camera.rotation.x = -0.5;

			//setup the used three renderer
			var renderer = new THREE.WebGLRenderer();

			//TODO get the correct size
			renderer.setSize( window.innerWidth, window.innerHeight );
			renderer.shadowMapEnabled = true;
			renderer.shadowMapSoft = true;
			renderer.setClearColor(0xdddddd, 1);

			var control = new THREE.OrbitControls(camera, renderer.domElement);
			control.userPanSpeed = 0.2;
			//controls.target.set(0,0,0);

			// initialize object to perform world/screen calculations

			this.three.camera = camera;
			this.three.renderer = renderer;
			this.three.control = control;
			this.three.projector = new THREE.Projector();
			this.three.clock = new THREE.Clock();
			this.three.loadingmanager = new THREE.LoadingManager();
			this.three.loader = new THREE.JSONLoader( this.three.loadingmanager );
			this.three.objloader = new THREE.ObjectLoader( this.three.loadingmanager );

			this.three.loadingmanager.onProgress = function ( item, loaded, total ) {
				console.log( item, loaded, total );
			};
			document.body.appendChild( this.three.renderer.domElement );
			window.addEventListener( 'resize', this.onWindowResize.bind(this), false );
			window.addEventListener( 'click', this.onWindowClick.bind(this), false );
			window.addEventListener( 'keydown', this.onKeypress.bind(this), false );
		},

		onWindowResize : function() {
			this.three.camera.aspect = window.innerWidth / window.innerHeight;
			this.three.camera.updateProjectionMatrix();
			this.three.renderer.setSize( window.innerWidth, window.innerHeight );
		},

		onKeypress : function(e) {
			if (e.keyCode == 80) { //pP	
				this.paused ? this.continu() : this.pause();
			} else if (e.keyCode == 83 && !this.paused) {
				this.service.switchState();
			}
		},

		onWindowClick : function() {
			var pc = this.geometry.pointClouds["points"];
			var v = pc.activateNext();
			var values_color = pc.material.attributes.ca.value;
			var r = Math.random();
			if (r < 0.3) {
				v.type = "image/jpg";
				var color = pc.material.attributes.ca.value[pc.activIndex];
				color.setHSL( 0, 1.0, 0.7 );
				pc.material.attributes.ca.needsUpdate = true;
			} else if (r > 0.7) {
				v.type = "video/mov";
				var color = pc.material.attributes.ca.value[pc.activIndex];
				color.setHSL( 0.5, 1.0, 0.7 );
				pc.material.attributes.ca.needsUpdate = true;
			} else {
				v.type = "application/octet-stream";
			}
			URO.sequencer.set(v);
		},
		start : function() {
			this._setupGeometry();
			this._setupLights();
			this._setupPointCloud();
			this._setupSplines();
			this._setupCurves();
			this._setupServices();
			this._setupTasks();

			var thiz = this;
			document.addEventListener( 'mousemove', function(event){
				thiz.mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
				thiz.mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
			}, false );
			this.paused = false;
			this.running = true;
			this._render();
		},
		//continue is a reserved word in javascript
		continu : function() {
			this.paused = false;
			this.three.clock.start();
			this._render();
		},

		pause : function() {
			this.paused = true;
			this.three.clock.stop();
		},
		stop : function() {
			this.running = false;
			this.three.clock.stop();
		},

		_setupServices : function() {
			this._loadService("core", "core.js");
		},

		_setupTasks : function() {
			URO.three.task.init.setup(this.res, this.three.loader, this.three.scene);
			URO.three.task.vscan.setup(this.res, this.three.loader, this.three.scene);
			URO.three.task.image.setup(this.res, this.three.loader, this.three.scene);
			URO.three.task.video.setup(this.res, this.three.loader, this.three.scene);
			URO.three.task.copy.setup(this.res, this.three.loader, this.three.scene);
			URO.three.task.cleanup.setup(this.res, this.three.loader, this.three.scene);
		},

		_setupGeometry : function() {
			var geometry;
			var material;
			//the base plane of the szene
			geometry = new THREE.PlaneGeometry( 50, 50 );
			material = new THREE.MeshBasicMaterial( {color: 0xdddddd, side: THREE.DoubleSide} );
			var plane = new THREE.Mesh( geometry, material );
			plane.rotation.x = 1.57;
			plane.position.y = 0;
			plane.receiveShadow = true;
			this.geometry.objects["plane"] = plane;
			this.three.scene.add( plane );
		},

		_loadService : function(name) {
			var path = this.res + "/service/" + name + "/";
			this.three.loader.load(path  + name + ".js", function ( object, materials ) {
				
				this.service = new THREE.Service(path, name, object, materials);
				this.three.scene.add( this.service );
			}.bind(this), this.res);
		},

		_loadObject : function(file, name) {
			this.three.loader.load( this.res + file, function ( object, materials ) {
				var obj = new THREE.Mesh( object, new THREE.MeshFaceMaterial( materials ));
				this.geometry.objects[name] = obj;
				obj.castShadow = true;
				this.three.scene.add( obj );
			}.bind(this), this.res);
		},

		_setupSplines : function(){
/**
 * MEL script to get curve points inside maya
 * 
global proc getCurveInfoForThree() {
    string $sel[] = `ls -sl`;
    string $node = `createNode curveInfo`;
    string $curve = $sel[0];
    connectAttr ($curve+ ".worldSpace") ($node+".inputCurve");
    float $cps[] = `getAttr ($node+".cp[*]")`;
    int $i;
    for ($i = 0; $i < size($cps); $i+=3) {
	    print("new THREE.Vector3("+$cps[$i]+","+$cps[$i+1]+","+$cps[$i+2]+")"+ ($i<size($cps)-3?",":"")+"\n");
    }
    delete $node;
}
 */
			
			var points = [
				new THREE.Vector3(1.427764044,11.29217319,-0.006731117572),
				new THREE.Vector3(1.480028721,9.935313226,-0.1947322588),
				new THREE.Vector3(1.15155816,8.678666667,-0.2747249831),
				new THREE.Vector3(0.8141142903,7.740303142,-0.499317578),
				new THREE.Vector3(0.09794470156,6.904298449,-0.6893755102),
				new THREE.Vector3(-0.4016240367,6.350911207,-0.4517388617),
				new THREE.Vector3(-0.5174590678,5.654313127,0.150054363),
				new THREE.Vector3(-0.1942655872,5.149187593,0.466630529),
				new THREE.Vector3(0.2255644397,4.340814915,0.3299699627),
				new THREE.Vector3(0.3291349332,4.02149902,-0.1043156306),
				new THREE.Vector3(0.07175237265,3.434264685,-0.2190577419),
				new THREE.Vector3(-0.1173648915,2.928417737,-0.04850014553),
				new THREE.Vector3(-0.044736278,2.48488765,0.03443576368),
				new THREE.Vector3(0.02225844809,2.210888671,0.02535313325),
				new THREE.Vector3(0.02428919524,1.965425773,0.0008451044418),
				new THREE.Vector3(0.01877083412,1.956961535,-0.1458283579),
				new THREE.Vector3(0,2,-0.4718764705),
				new THREE.Vector3(0,2,-0.9204583166),
				new THREE.Vector3(0,2,-1.778782728),
				new THREE.Vector3(0,2,-2.579853563),
				new THREE.Vector3(0,2,-3.461964996),
				new THREE.Vector3(0,2,-3.89176487),
				new THREE.Vector3(0,2,-4.400775838),
				new THREE.Vector3(0,2,-4.830225674),
				new THREE.Vector3(0,2,-5)
			];
			var spline = new THREE.Spline(points);

			URO.three.task[URO.task.upload].config({"spline" : spline, duration : 400});
			this.geometry.paths["upload"] = spline;

			points = [
				new THREE.Vector3(0,2,-5.249995717),
				new THREE.Vector3(0,2,-5.175),
				new THREE.Vector3(0,2,-5.091666667),
				new THREE.Vector3(0.0001081941876,2,-4.992816893),
				new THREE.Vector3(-0.003462214002,2,-4.885070295),
				new THREE.Vector3(-0.06491354759,2,-4.74892532),
				new THREE.Vector3(-0.349760046,2,-4.538393706),
				new THREE.Vector3(-0.8779036403,2,-4.413529873),
				new THREE.Vector3(-1.722072124,2,-4.157454967),
				new THREE.Vector3(-2.500062466,2,-3.741611004),
				new THREE.Vector3(-2.961811265,2,-3.456446666),
				new THREE.Vector3(-3.312096488,2,-3.403898107),
				new THREE.Vector3(-3.451818177,2,-3.456714487),
				new THREE.Vector3(-3.522570282,2,-3.522570282),
				new THREE.Vector3(-3.600352028,2,-3.600352028),
				new THREE.Vector3(-3.659277593,2,-3.659277593),
				new THREE.Vector3(-3.712307024,2,-3.712309458)
			];
			spline = new THREE.Spline(points);

			URO.three.task[URO.task.init].config({"spline" : spline, duration : 400});
			this.geometry.paths["init"] = spline;

			points = [
				new THREE.Vector3(0,2,-5.25),
				new THREE.Vector3(0,2,-5.175),
				new THREE.Vector3(0,2,-5.091666667),
				new THREE.Vector3(0,2,-4.981666667),
				new THREE.Vector3(0.003462214002,2,-4.885070295),
				new THREE.Vector3(0.06491354759,2,-4.74892532),
				new THREE.Vector3(0.349760046,2,-4.538393706),
				new THREE.Vector3(0.8779073905,2,-4.413529636),
				new THREE.Vector3(1.722075723,2,-4.157453477),
				new THREE.Vector3(2.500065285,2,-3.741608519),
				new THREE.Vector3(2.961811265,2,-3.456446666),
				new THREE.Vector3(3.312096488,2,-3.403898107),
				new THREE.Vector3(3.451818177,2,-3.456714487),
				new THREE.Vector3(3.530531187,2,-3.530378178),
				new THREE.Vector3(3.600352028,2,-3.600352028),
				new THREE.Vector3(3.659277593,2,-3.659277593),
				new THREE.Vector3(3.712308884,2,-3.712306261)
			];

			spline = new THREE.Spline(points);

			URO.three.task[URO.task.vscan].config({"spline" : spline, duration : 400});
			this.geometry.paths["vscan"] = spline;

			
			points = [
				new THREE.Vector3(0,2,-5.25),
				new THREE.Vector3(-0.001291877499,1.99871,-5.055179401),
				new THREE.Vector3(-0.001667520016,2,-4.829164064),
				new THREE.Vector3(-0.001524590719,2,-4.532414269),
				new THREE.Vector3(2.346932888e-006,2,-4.243338579),
				new THREE.Vector3(2.346932888e-006,2,-3.988713459),
				new THREE.Vector3(-0.008117618068,2,-3.845051327),
				new THREE.Vector3(-0.1070643051,2,-3.637137547),
				new THREE.Vector3(-0.3037563657,2,-3.521762005),
				new THREE.Vector3(-0.6307165366,2,-3.442961525),
				new THREE.Vector3(-1.538512126,2,-3.194345229),
				new THREE.Vector3(-2.746000293,2,-2.447611541),
				new THREE.Vector3(-3.424264069,2,-1.097056275),
				new THREE.Vector3(-3.5,2,-5.828670879e-016),
				new THREE.Vector3(-3.475461685,2,0.6244537684),
				new THREE.Vector3(-3.285749558,2,1.277664338),
				new THREE.Vector3(-2.880525381,2,1.988557501),
				new THREE.Vector3(-2.705049982,2,2.27547361),
				new THREE.Vector3(-2.64755052,2,2.496138727),
				new THREE.Vector3(-2.72460189,2,2.713121845),
				new THREE.Vector3(-2.820444675,2,2.820447994),
				new THREE.Vector3(-3.000491824,2,3.000495143),
				new THREE.Vector3(-3.205978913,2,3.203822816),
				new THREE.Vector3(-3.415913772,2,3.413555542),
				new THREE.Vector3(-3.57546513,2,3.573638139),
				new THREE.Vector3(-3.712306261,2,3.712308884)
			];
			spline = new THREE.Spline(points);

			URO.three.task[URO.task.copy].config({"spline" : spline, duration : 400});
			this.geometry.paths["copy"] = spline;

			points = [
				new THREE.Vector3(0,2,-5.25),
				new THREE.Vector3(0,2,-5.025103638),
				new THREE.Vector3(0.0001488061906,2,-4.802254467),
				new THREE.Vector3(-0.00132944175,2,-4.562858831),
				new THREE.Vector3(-0.00166218201,2,-4.305188417),
				new THREE.Vector3(-0.001524590719,2,-4.019521391),
				new THREE.Vector3(2.346932888e-006,2,-3.730445701),
				new THREE.Vector3(2.346932888e-006,2,-3.475820581),
				new THREE.Vector3(-0.008117618068,2,-3.332158449),
				new THREE.Vector3(-0.09934163685,2,-3.140472086),
				new THREE.Vector3(-0.2704344166,2,-3.028415102),
				new THREE.Vector3(-0.5831448475,2,-2.942845045),
				new THREE.Vector3(-1.327447749,2,-2.732894744),
				new THREE.Vector3(-2.355770723,2,-2.093858482),
				new THREE.Vector3(-2.935083487,2,-0.9403339499),
				new THREE.Vector3(-3,2,0),
				new THREE.Vector3(-2.935083487,2,0.9403339499),
				new THREE.Vector3(-2.355770723,2,2.093858482),
				new THREE.Vector3(-1.327447749,2,2.732894744),
				new THREE.Vector3(-0.5831448475,2,2.942845045),
				new THREE.Vector3(-0.2704344166,2,3.028415102),
				new THREE.Vector3(-0.09934163685,2,3.140472086),
				new THREE.Vector3(-0.008117618068,2,3.332158449),
				new THREE.Vector3(2.346932888e-006,2,3.475820581),
				new THREE.Vector3(2.346932888e-006,2,3.730445701),
				new THREE.Vector3(-0.001524590719,2,4.019521391),
				new THREE.Vector3(-0.00166218201,2,4.305188417),
				new THREE.Vector3(-0.00132944175,2,4.562858831),
				new THREE.Vector3(0.0001488061906,2,4.802254467),
				new THREE.Vector3(0,2,5.025103638),
				new THREE.Vector3(0,2,5.25)
			];
			spline = new THREE.Spline(points);

			URO.three.task[URO.task.cleanup].config({"spline" : spline, duration : 400});
			this.geometry.paths["cleanup"] = spline;

			points = [
				new THREE.Vector3(0,2,-5.25),
				new THREE.Vector3(0,2,-5.145),
				new THREE.Vector3(0,2,-4.875),
				new THREE.Vector3(0,2,-4.509),
				new THREE.Vector3(-0.008117618068,2,-4.364893681),
				new THREE.Vector3(-0.1167176404,2,-4.136695629),
				new THREE.Vector3(-0.3474797041,2,-4.019375231),
				new THREE.Vector3(-0.5898704673,2,-3.975615756),
				new THREE.Vector3(-1.496476717,2,-3.756106815),
				new THREE.Vector3(-2.245479788,2,-3.362770714),
				new THREE.Vector3(-2.828427125,2,-2.828427125),
				new THREE.Vector3(-3.362770714,2,-2.245479788),
				new THREE.Vector3(-3.756106815,2,-1.496476717),
				new THREE.Vector3(-3.975615756,2,-0.5898704673),
				new THREE.Vector3(-4.019375231,2,-0.3525613704),
				new THREE.Vector3(-4.136695629,2,-0.1158133612),
				new THREE.Vector3(-4.364893681,2,-0.008162897488),
				new THREE.Vector3(-4.508555812,2,0),
				new THREE.Vector3(-4.875222479,2,0),
				new THREE.Vector3(-5.145,2,0),
				new THREE.Vector3(-5.25,2,0)
			];
			spline = new THREE.Spline(points);

			URO.three.task[URO.task.video].config({"spline" : spline, duration : 400});
			this.geometry.paths["video"] = spline;

			points = [
				new THREE.Vector3(0,2,-5.25),
				new THREE.Vector3(0,2,-5.145),
				new THREE.Vector3(0,2,-4.875),
				new THREE.Vector3(0,2,-4.509),
				new THREE.Vector3(0.00812,2,-4.364893681),
				new THREE.Vector3(0.1167176404,2,-4.136695629),
				new THREE.Vector3(0.3474797041,2,-4.019375231),
				new THREE.Vector3(0.5898704673,2,-3.975615756),
				new THREE.Vector3(1.496476717,2,-3.756106815),
				new THREE.Vector3(2.245479788,2,-3.362770714),
				new THREE.Vector3(2.828427125,2,-2.828427125),
				new THREE.Vector3(3.362770714,2,-2.245479788),
				new THREE.Vector3(3.756106815,2,-1.496476717),
				new THREE.Vector3(3.975615756,2,-0.5898704673),
				new THREE.Vector3(4.019375231,2,-0.3525613704),
				new THREE.Vector3(4.136695629,2,-0.1158133612),
				new THREE.Vector3(4.364893681,2,-0.008162897488),
				new THREE.Vector3(4.508555812,2,0),
				new THREE.Vector3(4.875,2,0),
				new THREE.Vector3(5.145,2,0),
				new THREE.Vector3(5.25,2,0)
			];
			spline = new THREE.Spline(points);

			URO.three.task[URO.task.image].config({"spline" : spline, duration : 400});
			this.geometry.paths["image"] = spline;
		},

		_setupCurves : function() {
			var material = new THREE.LineBasicMaterial({ color: 0x0000ff });
			var geometry = new THREE.Geometry();
			var spline = this.geometry.paths["upload"];
			var points = spline.points;
			var sub = 4;
			var index = 0;
			for (var i = 0; i < points.length * sub; i++) {
				index = i / ( points.length * sub );
				position = spline.getPoint( index );
				geometry.vertices.push(new THREE.Vector3( position.x, position.y, position.z ));
			}
			var line = new THREE.Line( geometry, material);
			this.geometry.lines["line"] = line;
			//this.three.scene.add( line );
		},

		_setupLights : function() {
			var directionalLight = new THREE.DirectionalLight(0xaaaaaa, 1.0);
			directionalLight.position.set(-5, 10, 2);
			directionalLight.target.position.set(0, 0, 0);
			directionalLight.castShadow = true;
			directionalLight.shadowDarkness = 0.2;
			 
			directionalLight.shadowCameraNear = 5;
			//directionalLight.shadowCameraFar = 0.5;
			directionalLight.shadowCameraLeft = -12;
			directionalLight.shadowCameraRight = 12;
			directionalLight.shadowCameraTop = 12;
			directionalLight.shadowCameraBottom = -12;
			directionalLight.shadowMapWidth = 1024;
			directionalLight.shadowMapHeight = 1024;
			//directionalLight.shadowCameraVisible = true;
			this.three.scene.add( directionalLight );

			var fromBelowLight = new THREE.DirectionalLight(0x333333, 1.0);
			fromBelowLight.position.set(0, 0.01, 0);
			fromBelowLight.target.position.set(0, 2, 0);
			fromBelowLight.castShadow =false;
			this.three.scene.add( fromBelowLight );

			var ambientLight = new THREE.AmbientLight( 0x333333 ); // soft white light
			this.three.scene.add( ambientLight );
		},

		_setupPointCloud : function() {
			var material = new THREE.PointCloudMaterial({
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

			var material = new THREE.ShaderMaterial( {

				uniforms:       uniforms,
				attributes:     attributes,
				vertexShader:   document.getElementById( 'vertexshader' ).textContent,
				fragmentShader: document.getElementById( 'fragmentshader' ).textContent

			});

			var geometry = new THREE.Geometry();
			for ( var i = 0; i < 500; i ++ ) {

				var vertex = new THREE.UroVector3();
				vertex.x = 0;
				vertex.z = 0;
				vertex.y = -2;

				geometry.vertices.push( vertex );

			}	
			geometry.dynamic = true;
			var points = new THREE.DynamicPointCloud( geometry, material);

			var vertices = points.geometry.vertices;
			var vc1 = vertices.length;

			var values_size = attributes.size.value;
			var values_color = attributes.ca.value;

			for ( var v = 0; v < vertices.length; v ++ ) {

				values_size[ v ] = 5;
				values_color[ v ] = new THREE.Color( 0xffffff );

				//values_color[ v ].setHSL( 0.5 + 0.2 * ( v / vc1 ), 1, 0.5 );
				values_color[ v ].setHSL( 0.0, 0, 0.7 );
			}

			this.geometry.pointClouds["points"] = points;
			this.three.scene.add( points );
		},
		
		_updateIntersection : function(){
			
		},

		_updateObjects : function(){
		},

		_updatePointClouds : function() {
			if (!this.geometry.pointClouds["points"]) return;
			var p = this.geometry.pointClouds["points"];
			var etime = this.three.clock.getElapsedTime();
			l = p.geometry.vertices.length;
			for (var i = 0; i < p.activIndex; i++){
				var v = p.geometry.vertices[i];
				URO.sequencer.update(v, etime);
			};
			
			p.geometry.verticesNeedUpdate = true;

		},

		_updateServices : function() {
			if (this.service) {
				this.service.update();
			}
		},

		_updateTasks : function() {
			for (var t in URO.three.task) {
				URO.three.task[t].update();
			}
		},

		_render : function(){
			if (this.running && !this.paused) {
				var thiz = this;
				requestAnimationFrame(function(){
					thiz._render();
				});
				this.render();
				this.update();
			}
		},

		update : function() {
			this.three.control.update();

			this._updateObjects();
			this._updatePointClouds();
			this._updateIntersection();
			this._updateServices();
			this._updateTasks();
		},

		render : function() {
			this.three.renderer.render(this.three.scene, this.three.camera);
		}
};

var interactive = new MWM.appl();
interactive.start();
