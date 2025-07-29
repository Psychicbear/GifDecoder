// Initialises the Go environment and runs the WebAssembly module.
const go = new Go();
WebAssembly.instantiateStreaming(fetch("/assets/main.wasm"), go.importObject).then((result) => {
go.run(result.instance);
});

class GifSplitter extends HTMLElement {
    #outputFrames = []
    constructor() {
        super();
    }

    connectedCallback() {
        this.render()
        this.#addEvents();
    }

    render() {
        this.innerHTML = `
        <h1>GIF Splitter</h1>
        <span id="error"></span>
        <div class="file-input">
            <input type="file" id="fileInput" accept="image/gif" />
            <pre id="output">Waiting for file...</pre>
            ${this.#largeFileDialog}
            ${this.#fireErrorDialog}
        </div>
        <div class="convert" style="display: none;">
            <div>
                <button id="start">Start Conversion</button>
                <button class="newconvert">Choose different GIF</button>
            </div>
        </div>
        <div class="progress" style="display: none;">
            <span id="loading" aria-busy="true">Splitting frames...</span>
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

    #largeFileDialog = `
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
    `

    #fireErrorDialog = `
            <dialog id="fileErrorDialog">
                <article>
                    <h2>Incorrect File Type</h2>
                    <p>
                        The file you selected is not a GIF. Please upload a valid GIF file.
                    </p>
                    <footer id="dialog-footer">
                        <button class="close-dialog">Ok</button>
                    </footer>
                </article>
            </dialog>
    `

    /**
     * Adds event listeners to the elements in the component.
     * This includes:
     * - Handling file input changes to upload and preview the GIF.
     * - Handling the start conversion button to initiate the GIF splitting process.
     * - Handling the new conversion button to reset the file input and clear previous outputs.
     * * It also manages dialog interactions for large file uploads and incorrect file types.
     */
    #addEvents() {;
        this.fileInput.addEventListener('change', this.fileUpload);
        this.querySelector('#start').addEventListener('click', this.startConversion);

        this.querySelectorAll('.newconvert').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('#fileInput').value = ''; // Reset file input
                document.querySelector('.out-image').innerHTML = '';//Clears previous images output
                this.showScene('.file-input');
            });
        });

        this.querySelectorAll('.close-dialog').forEach(btn => btn.addEventListener('click', () => {
            this.largeFileDialog.close();
            this.fileErrorDialog.close();
            this.fileInput.value = ''; // Reset file input
            this.blob = null; // Reset the blob
            this.errorDiv.textContent = '';
        }))

        this.querySelector('#confirm').addEventListener('click', () => {
            this.largeFileDialog.close();
            this.showScene('.convert');
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
        if (files[0].type !== "image/gif") {
            this.errorDiv.textContent = "Please upload a GIF file";
            this.fileErrorDialog.showModal();
            return;
        }
        if (files[0].size > 10 * 1024 * 1024) {
            this.largeFileDialog.showModal();
        }

        this.blob = new Blob([files[0]], { type: files[0].type });
        const filePreview = document.createElement('img');
        filePreview.src = URL.createObjectURL(this.blob);
        filePreview.id = 'preview';

        let convertDiv = this.querySelector('.convert');
        if (convertDiv.querySelector('#preview')) {
            convertDiv.removeChild(convertDiv.querySelector('#preview'));
        }
        convertDiv.insertBefore(filePreview, convertDiv.firstChild);

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
            this.#outputFrames = [];
            const arrayBuf = await this.blob.arrayBuffer();
            const array = new Uint8Array(arrayBuf);
            let frames = await convert(array);

            this.zip = new JSZip();
            frames.forEach((frame, i) => {
                let frameBlob = new Blob([frame], { type: 'image/png' });
                let newImageElement = document.createElement('img');
                newImageElement.src = URL.createObjectURL(frameBlob);
                this.#outputFrames.push(newImageElement);
                this.zip.file(`frame_${i}.png`, frameBlob);
            });

            this.displayOutputFrames();
            this.querySelector('#framecount').textContent = `Decoded GIF with ${frames.length} frames`;
            this.showScene('.output-frames');
            this.querySelector('#download').onclick = () => {
                this.zip.generateAsync({ type: "blob" }).then(blob => saveAs(blob, "frames.zip"));
            };
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
     * Displays the output frames in the outputFrames container.
     * If there are more than 10 frames, it uses a details element to show the first 10 frames
     * and hides the rest under a summary.
     * If there are 10 or fewer frames, it displays all frames directly.
     */
    displayOutputFrames() {
        if (this.#outputFrames.length > 10) {
            this.outputFrames.innerHTML = `
            <details>
                <summary></summary>
            </details>
            `;

            const details = this.outputFrames.querySelector('details');
            const summary = details.querySelector('summary');

            this.#outputFrames.slice(0, 10).forEach((frame) => {
                frame.style.width = '10%';
                summary.appendChild(frame);
            })
            this.#outputFrames.slice(10).forEach((frame) => {
                frame.style.width = '10%';
                details.appendChild(frame);
            })
            summary.appendChild(document.createTextNode(`+${this.#outputFrames.length - 10} more frames`));
        } else {
            this.#outputFrames.forEach((frame) => {
                this.outputFrames.appendChild(frame);
            });
        }

    }

    /**
     * Exposes the largeFileDialog element.
     * This dialog is shown when the user tries to upload a file that is more than 10MB in size.
     * It prompts the user to confirm if they want to proceed with the large file upload.
     * @returns {HTMLElement} - The Dialog element with #largeFileDialog tag.
     */
    get largeFileDialog() {
        return this.querySelector('#largeFileDialog');
    }

    /**
     * Exposes the fileErrorDialog element.
     * This dialog is shown when the user tries to upload a file that is not a GIF file type.
     * @returns {HTMLElement} - The Dialog element with #fileErrorDialog tag.
     */
    get fileErrorDialog() {
        return this.querySelector('#fileErrorDialog');
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

    get outputFrames() {
        return this.querySelector('.out-image');
    }
}

customElements.define('gif-splitter', GifSplitter);