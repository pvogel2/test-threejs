var URO = {};

URO.task = {
	"wait"		: "wait",
	"none"		: "none",
	"ticket"	: "ticket",
	"upload"	: "upload",
	"init"		: "init",
	"vscan"		: "vscan",
	"image"		: "image",
	"video"		: "video", 
	"copy"		: "copy",
	"cleanup"	: "cleanup"
};

URO.three = {
	task : {
		"wait"		: new Wait(),
		"none"		: new None(),
		"ticket"	: new THREE.UroTask(),
		"upload"	: new Upload(),
		"init"		: new Init({transitions:["init_parts.js"], statics:["init_center.js", "init_ring.js"],
			concurrency : 5,
			position : new THREE.Vector3(-3.712, 2, -3.712),
			offset : new THREE.Vector3(-0.2, 0, -0.2),
			rotation : new THREE.Vector3(0, -Math.PI*0.25, 0)
		}),
		"vscan"		: new Vscan({transitions:["init_parts.js"], statics:["init_center.js", "init_ring.js"],
			concurrency : 3,
			position : new THREE.Vector3(3.712, 2, -3.712),
			offset : new THREE.Vector3(0.2, 0, -0.2),
			rotation : new THREE.Vector3(0, Math.PI*0.25, 0)
		}),
		"image"		: new Image({transitions:["init_parts.js"], statics:["init_center.js", "init_ring.js"],
			concurrency : 4,
			position : new THREE.Vector3(5.250, 2, 0),
			offset : new THREE.Vector3(0.2, 0, 0),
			rotation : new THREE.Vector3(0, 0, 0)
		}),
		"video"		: new Video({transitions:["init_parts.js"], statics:["init_center.js", "init_ring.js"],
			concurrency : 2,
			position : new THREE.Vector3(-5.250, 2, 0),
			offset : new THREE.Vector3(-0.2, 0, 0),
			rotation : new THREE.Vector3(0, Math.PI, 0)
		}),
		"copy"		: new Copy({transitions:["init_parts.js"], statics:["init_center.js", "init_ring.js"],
			concurrency : 4,
			position : new THREE.Vector3(-3.712, 2, 3.712),
			offset : new THREE.Vector3(-0.2, 0, 0.2),
			rotation : new THREE.Vector3(0, Math.PI*0.25, 0)
		}),
		"cleanup"	: new Cleanup({statics:["init_center.js", "init_ring.js"],
			concurrency : 5,
			position : new THREE.Vector3(0, 2, 5.250),
			offset : new THREE.Vector3(0, 0, 0.2),
			rotation : new THREE.Vector3(0, Math.PI*0.5, 0)
		})
	}
};

URO.sequencer = function() {
};

URO.sequencer.set = function(uro) {
	uro.ticket = Math.random();
	uro.sequence = [URO.task.upload, URO.task.init, URO.task.vscan];
	if (uro.type.startsWith("image")) {
		uro.sequence.push(URO.task.image);
	} else if (uro.type.startsWith("video")) {
		uro.sequence.push(URO.task.video);
	}
	uro.sequence.push(URO.task.copy);
	uro.sequence.push(URO.task.cleanup);
	uro.task = URO.task.wait;
};

URO.sequencer.update = function(uro, time) {
	//console.log("actual %o", uro);
	if (uro.result == "done" || uro.task == URO.task.wait) {
		if (uro.sequence.length > 0) {
			if (URO.three.task[uro.sequence[0]].concurrency > URO.three.task[uro.sequence[0]].count) {
				uro.task = (uro.sequence.shift());
				URO.three.task[uro.task].start(uro, time);
		 	} else {
		 		uro.task = URO.task.wait;
		 	}
		} else {
			uro.task = URO.task.none;
		}
	}
}

URO.sequencer.__update = function(v, time) {
	if (uro.result == "done" || uro.task == URO.task.wait) {
		if (uro.sequence.length > 0) {
			if (URO.three.task[uro.sequence[0]].concurrency > URO.three.task[uro.sequence[0]].count) {
				uro.task = (uro.sequence.shift());
		 	} else {
		 		uro.task = URO.task.wait;
		 	}
		} else {
			uro.task = URO.task.none;
		}

		//for testing init uro again after sequence
		/*if (uro.task == URO.task.none) {
			URO.sequencer.set(uro);
		}*/
		uro.start = 0;
		uro.progress = 0;
		uro.result = "none";
		//console.log("set   %o", uro);
	}

	if (uro.result != "error") {
		URO.three.task[uro.task].apply(v);
	}
};

