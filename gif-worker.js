importScripts('/wasm_exec.js');

const go = new Go();

let wasmReady = WebAssembly.instantiateStreaming(fetch('/main.wasm'), go.importObject).then((res) => {
	go.run(res.instance);
    console.log("WASM module loaded and running");
}).catch(err => {
    console.error("Failed to load WASM:", err);
});

self.onmessage = async function (e) {
    await wasmReady; // Ensure WASM is ready before proceeding

	const {array} = e.data;

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
		const result = convert(array, progressCallback);
		postMessage({ type: 'done', frames: result });
	} catch (err) {
		postMessage({ type: 'error', message: err.toString() });
	}
};