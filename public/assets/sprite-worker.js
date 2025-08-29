importScripts('/assets/wasm_exec.js');

const go = new Go();

/**
 * Loads the WebAssembly module and initializes the Go runtime.
 * Returns a promise that resolves when the module is ready.
 */
let wasmReady = WebAssembly.instantiateStreaming(fetch('main.wasm'), go.importObject).then((res) => {
	go.run(res.instance);
    console.log("WASM module loaded and running");
}).catch(err => {
    console.error("Failed to load WASM:", err);
});


/**
 * Handles the conversion of image data to sprite frames.
 * @param {MessageEvent} e 
 */
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
		let result = null
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