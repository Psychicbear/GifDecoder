importScripts('/assets/wasm_exec.js');

// class goMessage {
// 	constructor(type, data, params=null){
// 		this.type = type
// 		this.data = data
// 		this.params = params
// 	}
// }

const go = new Go();

let wasmReady = WebAssembly.instantiateStreaming(fetch('main.wasm'), go.importObject).then((res) => {
	go.run(res.instance);
    console.log("WASM module loaded and running");
}).catch(err => {
    console.error("Failed to load WASM:", err);
});



self.onmessage = async function (e) {
    await wasmReady; // Ensure WASM is ready before proceeding
	let {type, data, params} = e.data

	const progressCallback = new Proxy({}, {
		get(_, prop) {
			if (prop === 'invoke') {
				return (cur, max) => {
					self.postMessage({ type: 'progress', cur, max });
				};
			}
		}
	});

	try {
		let result
		switch (type) {
			case 'convert':
				result = convert(data, progressCallback); break;
			case 'sheet-splitter':
				result = sheetSplitter(data, params, progressCallback); break;
		}
		
		postMessage({ type: 'done', frames: result });
	} catch (err) {
		postMessage({ type: 'error', message: err.toString() });
	}
};