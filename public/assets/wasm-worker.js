importScripts('wasm_exec.js');

const go = new Go();
let wasmLoaded = false;

WebAssembly.instantiateStreaming(fetch('main.wasm'), go.importObject).then((result) => {
    go.run(result.instance);
    wasmLoaded = true;
});

onmessage = async function (e) {
    if (!wasmLoaded) {
        postMessage({ type: 'error', message: 'WASM not loaded yet' });
        return;
    }

    const { array } = e.data;

    const progressCallback = (cur, max) => {
		postMessage({ type: 'progress', cur, max });
	};

	const progressCbWrapped = globalThis.FuncOf((thisVal, args) => {
		progressCallback(args[0].toNumber(), args[1].toNumber());
		return null;
	});

    try {
		const result = convert(array, progressCbWrapped);
		postMessage({ type: 'done', frames: result });
		progressCbWrapped.release(); // Clean up!
    } catch (err) {
        postMessage({ type: 'error', message: err.toString() });
    }
};
