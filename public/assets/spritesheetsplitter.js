
import { slicerTemplate, errorDialog, largeFileDialog, formTemplate } from './templates.js';
import { setupTad } from './setupTad.js';

const style = document.createElement('link');
style.rel = 'stylesheet';
style.href = '/assets/spritesheet.css';
style.type = 'text/css';
style.media = 'all';
document.head.appendChild(style);

setupTad();
const worker = new Worker('/assets/sprite-worker.js');

/**
 * @class SpritesheetSlicer
 * @extends {HTMLElement}
 */
class SpritesheetSlicer extends HTMLElement {
    #outputFrames = [];
    constructor() {
        super();
        this.worker = worker;
        this.$ = $
    }

    connectedCallback() {
        this.render()
        this.#addEvents();

        // /**
        //     // Load a default image for demonstration purposes
        //     this.$.retroImageLoad('/assets/guy.png', this.setInputRange)
        //     this.$.sParams = {
        //         x: 0, y: 0, w: 100, h: 100, ph: 0, pv: 0
        //     }
        //     this.showScene('.convert')
        // */

    }

    render() {
        let canvas = document.querySelector('#myCanvas')
        this.innerHTML = slicerTemplate(errorDialog, largeFileDialog, formTemplate)
        this.querySelector(".canvas-container").appendChild(canvas)
    }

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
        this.querySelector('#start').addEventListener('click', this.startConversion);
        this.querySelectorAll('.newconvert').forEach(this.resetToFileUpload);
        this.querySelectorAll('.param-row').forEach(this.bindInputs)
        
        window.addEventListener('resize', () => {
            this.$.calculateScale();
            this.$.rescaleImage(this.$.cScale);
        });

    }

    /** 
     * Binds the range and number inputs together so that they update each other.
     * @param {HTMLElement} inp - The container element that holds the input pair.
    */
    bindInputs = (inp) => {
        let inputs = inp.querySelectorAll('input');
        let baseKey = inputs[1].name;
        inputs[0].addEventListener('input', e => {
            console.log({target: e.target.name, value: e.target.value })
            this.$.sParams[baseKey] = parseInt(e.target.value)
            inputs[1].value = e.target.value
        })

        inputs[1].addEventListener('input', e => {
            console.log({target: e.target.name, value: e.target.value })
            this.$.sParams[baseKey] = parseInt(e.target.value)
            inputs[0].value = e.target.value
        })
    }
    
    /**
     * Sets the max value for the input sliders based on the natural 
     * width and height of the loaded image.
     * @param {Event} e 
     */
    setInputRange = (e) => {
        let width = e.target.naturalWidth;
        let height = e.target.naturalHeight;
        [this.x, this.y, this.width, this.height, this.pHorizontal, this.pVertical].forEach((el, i) => {
            if(i%2 === 0) {
                el.max = width;
                el.previousElementSibling.max = width;
            } else {
                el.max = height;
                el.previousElementSibling.max = height;
            }
        })
        this.width.value = width/4;
        this.height.value = height/4;
    }

    /** Applies an onClick event to the button to reset the file input and clear previous outputs.
     * This event also takes the user back to the file input scene.
     * @param {HTMLElement} btn - The button element to attach the event listener to.
    */
    resetToFileUpload = (btn) => {
        btn.addEventListener('click', () => {
            document.querySelector('#fileInput').value = ''; // Reset file input
            document.querySelector('.out-image').innerHTML = '';//Clears previous images output
            this.showScene('.file-input');
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

        this.blob = new Blob([files[0]], { type: files[0].type });
        this.#outputFrames = []; // Reset output frames

        console.log(this.$.spriteSheetImage)
        this.$.retroImageLoad(URL.createObjectURL(this.blob))
        console.log(this.$.spriteSheetImage)

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
            console.log("array: ", array)
            this.setProgress(0, 100);
            document.querySelector('#loading').textContent = 'Initializing conversion...';
            this.worker.postMessage({ type: 'sheet-splitter', data: array, params: this.splitParams });
    }

    /**
     * Collects frames from Go WASM worker and prepares them for display and download.
     * @param {Uint16Array[]} frames 
     */
    processResult(frames) {
        this.zip = new JSZip();
        frames.forEach((frame, i) => {
            let frameBlob = new Blob([frame], { type: 'image/png' });
            let newImageElement = document.createElement('img');
            newImageElement.src = URL.createObjectURL(frameBlob);
            this.#outputFrames.push(newImageElement);
            this.zip.file(`frame_${i}.png`, frameBlob);
        });

        this.displayOutputFrames();
        this.querySelector('#framecount').textContent = `Sliced spritesheet into ${frames.length} frames`;
        this.showScene('.output-frames');
        this.querySelector('#download').onclick = () => {
            this.zip.generateAsync({ type: "blob" }).then(blob => saveAs(blob, "frames.zip"));
        };
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
     * Updates the progress bar and loading text based on the current and maximum values.
     * Value returns from the Go WASM worker.
     * @param {number} cur - Current progress value.
     * @param {number} max - Maximum progress value.
    */
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
                if(selector == ".convert"){
                    document.querySelector(".convert").style.display = "flex"
                } else {
                    document.querySelector(selector).style.display = 'inline-block';
                }
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

    get fileErrorDialog() {
        return this.querySelector('#fileErrorDialog');
    }

    get largeFileDialog() {
        return this.querySelector('#largeFileDialog');
    }

    get outputFrames() {
        return this.querySelector('.out-image');
    }

    /**
     * Exposes the form input element.
     * This is used to control the slicing parameters of the spritesheet.
     * @returns {HTMLInputElement} - The Input element with #spritesheetform tag.
     */
    get spriteForm() {
        return this.querySelector('#spritesheetForm');
    }

    /** 
     * Getters for each input field in the form
     */

    /** @returns {HTMLInputElement} - The forms X value */
    get x() {
        return document.querySelector('#spritesheetForm input[name="x"]');
    }
    /** @returns {HTMLInputElement} - The forms Y value */
    get y() {
        return document.querySelector('#spritesheetForm input[name="y"]');
    }
    /** @returns {HTMLInputElement} - The forms W value */
    get width() {
        return document.querySelector('#spritesheetForm input[name="w"]');
    }
    /** @returns {HTMLInputElement} - The forms H value */
    get height() {
        return document.querySelector('#spritesheetForm input[name="h"]');
    }
    /** @returns {HTMLInputElement} - The forms pH value */
    get pHorizontal() {
        return document.querySelector('#spritesheetForm input[name="ph"]');
    }
    /** @returns {HTMLInputElement} - The forms Pv value */
    get pVertical() {
        return document.querySelector('#spritesheetForm input[name="pv"]');
    }

    /**
     * Gathers all slicing parameters from the form inputs.
     * @returns {Object} - An object containing all slicing parameters.
     */
    get splitParams() {
        return {
            x: parseInt(this.x.value),
            y: parseInt(this.y.value),
            width: parseInt(this.width.value),
            height: parseInt(this.height.value),
            pHorizontal: parseInt(this.pHorizontal.value),
            pVertical: parseInt(this.pVertical.value)
        };
    }

}

customElements.define('spritesheet-slicer', SpritesheetSlicer);