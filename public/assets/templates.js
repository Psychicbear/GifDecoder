export function slicerTemplate(errorDialog = '', largeFileDialog = '', form = '') {
    const innerHTML = `
        <div class="container component-container">
            <h1>Spritesheet Slicer</h1>
            <span id="error"></span>
            <div class="file-input">
                <input type="file" id="fileInput" accept="image/png" />
                <pre id="output">Waiting for file...</pre>
                ${errorDialog}
                ${largeFileDialog}
            </div>
            <div class="convert" style="display: none;">
                <div id="convertForm"">
                    ${form}
                    <div class="convert-buttons">
                        <button id="start">Start Conversion</button>
                        <button class="newconvert secondary">New Sheet</button>
                    </div>
                </div>
                <div class="canvas-container">
                </div>
            </div>
            <div class="progress" style="display: none;">
                <span id="loading" aria-busy="true"></span>
                <progress id="progress" value="0" max="100"></progress>
            </div>
            <div class="output-frames" style="display: none;">
                <p id="framecount"></p>
                <button id="download">Download zip</button>
                <button class="newconvert">Convert Again</button>
                <div class="out-image"></div>
            </div>
        </div>
        
        `; 
    return innerHTML
}

export const errorDialog = `
            <dialog id="fileErrorDialog">
                <article>
                    <h2>Incorrect File Type</h2>
                    <p>
                        The file you selected is not a PNG. Please upload a valid PNG file.
                    </p>
                    <footer id="dialog-footer">
                        <button class="close-dialog">Ok</button>
                    </footer>
                </article>
            </dialog>
        `;

export const largeFileDialog = `
        <dialog id="largeFileDialog">
            <article>
                <h2>Large File Upload</h2>
                <p>
                    You are about to upload a large file. This may take a while to process.
                    Please do not close the browser if the page freezes, as the processing is still ongoing.
                </p>
                <footer id="dialog-footer">
                <button class="secondary close-dialog">
                    Cancel
                </button>
                <button id="confirm">Confirm</button>
                </footer>
            </article>
        </dialog>
        `;

export const formTemplate = `
            <form id="spritesheetForm">
                <fieldset class="grid">
                    <div class="param-row">
                        <label class="param-label" for="x">X:</label>
                        <input class="param-slider" type="range" name="x-slider" value="0" min="0" max="100">
                        <input class="param-val" type="number" name="x" value="0" min="0" max="100">
                    </div>
                    <div class="param-row">
                        <label class="param-label" for="y">Y:</label>
                        <input class="param-slider" type="range" name="y-slider" value="0" min="0" max="100">
                        <input class="param-val" type="number" name="y" value="0" min="0" max="100">
                    </div>
                </fieldset>
                <fieldset class="grid">
                    <div class="param-row">
                        <label class="param-label" for="w">W:</label>
                        <input class="param-slider" type="range" name="w-slider" value="100" min="0" max="100">
                        <input class="param-val" type="number" name="w" value="100" min="0" max="100">
                    </div>
                    <div class="param-row">
                        <label class="param-label" for="h">H:</label>
                        <input class="param-slider" type="range" name="h-slider" value="0" min="0" max="100">
                        <input class="param-val" type="number" name="h" value="0" min="0" max="100">
                    </div>
                </fieldset>
                <span>Padding</span>
                <fieldset class="grid">
                    <div class="param-row">
                        <label class="param-label" for="ph">H:</label>
                        <input class="param-slider" type="range" name="ph-slider" value="0" min="0" max="100">
                        <input class="param-val" type="number" name="ph" value="0" min="0" max="100">
                    </div>
                    <div class="param-row">
                        <label class="param-label" for="pv">V:</label>
                        <input class="param-slider" type="range" name="pv-slider" value="0" min="0" max="100">
                        <input class="param-val" type="number" name="pv" value="0" min="0" max="100">
                    </div>
                </fieldset>
            </form>
        `