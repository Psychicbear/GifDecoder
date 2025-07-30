const worker = new Worker('/assets/spritesheet-worker.js');
class SpritesheetSlicer extends HTMLElement {
    constructor() {
        super();
        this.worker = worker;
    }

    connectedCallback() {
        this.render()
        this.#addEvents();
    }

    render() {
        this.innerHTML = `
        <h1>Spritesheet Slicer</h1>
        <span id="error"></span>
        <div class="file-input">
            <input type="file" id="fileInput" accept="image/png" />
            <pre id="output">Waiting for file...</pre>
        </div>
        <div class="convert" style="display: none;">
            <div>
                ${this.#form}
                <button id="start">Start Conversion</button>
                <button class="newconvert">Choose different sheet</button>
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
        `;
    }

    #form = `
        <form id="spritesheetForm">
            <label for="x">X:</label>
            <input type="number" name="x" value="0">
            <label for="y">Y:</label>
            <input type="number" name="y" value="0">
            <label for="width">Width:</label>
            <input type="number" name="width" value="32">
            <label for="height">Height:</label>
            <input type="number" name="height" value="32">
        </form>
    `

    /**
     * Adds event listeners to the elements in the component.
     * This includes:
     * - Handling file input changes to upload the spritesheet.
     * - Handling the start conversion button to initiate the spritesheet splitting process.
     * - Handling the new conversion button to reset the file input and clear previous outputs.
     * * It also manages dialog interactions for large file uploads and incorrect file types.
     */
    #addEvents() {
        this.worker.onmessage = (e) => {
            if (e.data.type === 'progress') {
                this.setProgress(e.data.cur, e.data.max);
            } else if (e.data.type === 'done') {
                this.processResult(e.data.frames);
            } else if (e.data.type === 'error') {
                this.displayError(e.data.message);
            }
        };

        this.fileInput.addEventListener('change', this.fileUpload);

        
        this.querySelectorAll('.newconvert').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('#fileInput').value = ''; // Reset file input
                document.querySelector('.out-image').innerHTML = '';//Clears previous images output
                this.showScene('.file-input');
            });
        });
    }

    /**
     * Function to be attached to the file input change event.
     * It checks the file type and size, and if valid, it creates a preview image
     * @param {Event} event 
     * 
     */
    fileUpload = (event) => {
        const files = event.target.files;
        if (files.length === 0) {
            this.errorDiv.textContent = "No file selected";
            return;
        }
        if (files[0].type !== "image/png") {
            this.errorDiv.textContent = "Please upload an image file";
            this.fileErrorDialog.showModal();
            return;
        }
        if (files[0].size > 10 * 1024 * 1024) {
            this.largeFileDialog.showModal();
        }

        // this.blob = new Blob([files[0]], { type: files[0].type });
        // const filePreview = document.createElement('img');
        // filePreview.src = URL.createObjectURL(this.blob);
        // filePreview.id = 'preview';

        // let convertDiv = this.querySelector('.convert');
        // if (convertDiv.querySelector('#preview')) {
        //     convertDiv.removeChild(convertDiv.querySelector('#preview'));
        // }
        // convertDiv.insertBefore(filePreview, convertDiv.firstChild);

        if (!this.fileErrorDialog.open && !this.largeFileDialog.open) {
            this.showScene('.convert');
        }
    }

    /**
     * Function to be attached to the start conversion button.
     * Starts the conversion process by sending the file to the WASM worker.
     * It reads the file as an ArrayBuffer, converts it to a Uint8Array,
     * then calls the convert function to process the GIF.
     * It updates the UI to show the progress and output frames.
     */
    startConversion = async () => {
            this.showScene('.progress');
            const arrayBuf = await this.blob.arrayBuffer();
            const array = new Uint8Array(arrayBuf);
            this.setProgress(0, 100);
            document.querySelector('#loading').textContent = 'Initializing conversion...';
            this.worker.postMessage({ img: array, params: this.splitParams });
    }

    setProgress(cur, max) {
        const progressBar = document.querySelector('#progress');
        progressBar.value = cur;
        progressBar.max = max;

        const loadingText = document.querySelector('#loading');
        loadingText.textContent = `${cur}/${max} frames processed...`;
    }

    /**
     * 
     * @param {string} message 
     */
    displayError(message) {
        this.errorDiv.textContent = message;
        this.showScene('.file-input');
        this.fileInput.value = ''; // Reset file input
        this.blob = null; // Reset the blob
    }


    /**
     * Displays the specified scene by toggling the visibility of elements.
     * @param {string} scene - The selector of the scene to display.
     */
    showScene(scene){
        [
            ".file-input",
            ".convert",
            ".progress",
            ".output-frames"
        ].forEach(selector => {
            if (scene === selector) {
                document.querySelector(selector).style.display = 'inline-block';
            } else {
                document.querySelector(selector).style.display = 'none';
            }
        });
    }

    /**
     * Exposes the div responsible for displaying error messages.
     * @returns {HTMLElement} - The Div element with #error tag.
     */
    get errorDiv() {
        return this.querySelector('#error');
    }

    /**
     * Exposes the file input element.
     * This is used to select the GIF file to be processed.
     * @returns {HTMLInputElement} - The Input element with #fileInput tag.
     */
    get fileInput() {
        return this.querySelector('#fileInput');
    }

    /**
     * Exposes the form input element.
     * This is used to control the slicing parameters of the spritesheet.
     * @returns {HTMLInputElement} - The Input element with #spritesheetform tag.
     */
    get spriteForm() {
        return this.querySelector('#spritesheetForm');
    }
    get x() {
        return this.querySelector('#spritesheetForm input[name="x"]').value;
    }
    get y() {
        return this.querySelector('#spritesheetForm input[name="y"]').value;
    }
    get width() {
        return this.querySelector('#spritesheetForm input[name="width"]').value;
    }
    get height() {
        return this.querySelector('#spritesheetForm input[name="height"]').value;
    }

    get splitParams() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }

}

customElements.define('spritesheet-slicer', SpritesheetSlicer);