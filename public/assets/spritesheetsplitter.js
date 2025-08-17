let canvas = document.createElement("canvas");
canvas.id = "myCanvas";
document.body.appendChild(canvas)

const style = document.createElement('style');
style.textContent = `
  .convert {
    flex-direction: row;
    width: 100%;  
  }

  #convertForm {
    flex: 1 1;
  }

  #myCanvas {
    flex: 3 0;
  }

  .param-input {
    display: flex;
    flex-direction: column;
  }
`;
document.head.appendChild(style);

import { $ } from "./lib/TeachAndDraw.js";
import { AssetJob } from './lib/AssetManager.js';
import { Img, Stamp } from './lib/Img.js';



/**
 * @typedef {import("./lib/TeachAndDraw.js).Tad} Tad
 * @typedef {import("./lib/AssetManager.js).AssetJob} AssetJob
 * @typedef {import("./lib/Img.js).Img} Img
 * @typedef {import("./lib/Img.js).Stamp} Stamp
 * @typedef {import("./lib/Group.js).Group} Group
*/


class RetroImg extends Image {
    /**
     * Creates an instance of RetroImg.
     * @param {string} filepath
     * @param {AssetJob} job
     */
    constructor(filepath) {
        super();
        this.src = filepath;
        /**
         * @type {Stamp[]}
         */
        this.wrapper = [];
        //wrapper currently assigned in tad.loadImage will fix later

        this.onload = () => {
            for (let i = 0; i < this.wrapper.length; i++) {
                this.w = this.naturalWidth;
                this.h = this.naturalHeight;
                this.wrapper[i].w = this.naturalWidth;
                this.wrapper[i].h = this.naturalHeight;
            }
        };

        this.onerror = () => {
            const errorMessage = ErrorMsgManager.loadFileFailed(
                filepath,
                "img"
            );
            const error = new Error("Loading Image:" + errorMessage);
            job.error = error;
            console.error(error);
        };

        this.setScale = function (scale) {
            this.w = this.naturalWidth * scale;
            this.h = this.naturalHeight * scale;
            for (let i = 0; i < this.wrapper.length; i++) {
                this.wrapper[i].w = this.w;
                this.wrapper[i].h = this.h;
            }
        }
    }
}

/** @type {Tad} */
$.use(update, document.querySelector('#myCanvas'))
/** @type {Stamp | null} */
$.spriteSheetImage = null
$.spriteSheetSquares = $.make.group()
$.sParams = {
    x: 0, y: 0, w: 0, h: 0, ph: 0, pv: 0
}
$.updateScaled = true

$.setup = false
$.cScale = 1
$.setImageScale = false
$.retroImageLoad = function (blobUrl, onload = null){
    console.log('Creating new image in tad: ', blobUrl)
    const img = new RetroImg(blobUrl);
    const nuStamp = new Stamp(this, 0, 0, img);
    img.wrapper.push(nuStamp);
    // @ts-ignore
    // job.asset = img;
    console.log({w: img.width, h: img.h})
    this.spriteSheetImage = nuStamp

    img.addEventListener('load', (e) => {
        console.log('Image loaded in tad: ', img)
        this.calculateScale()
        this.rescaleImage(this.cScale)
        console.log({w: this.spriteSheetImage.w, h: this.spriteSheetImage.h})
        if(onload){
            onload(e)
        }
    })
}

$.calculateScale = function (){
    if(!this.spriteSheetImage){
        return
    }
    let canvas = document.querySelector("#myCanvas")

    this.w = canvas.clientWidth
    this.h = canvas.clientHeight
    // this.cScale = scaleToFit(this.spriteSheetImage.raw.naturalWidth, this.spriteSheetImage.raw.naturalHeight, $.w, $.h) * 100
    this.cScale = scaleToFit(this.spriteSheetImage.raw.naturalWidth, this.spriteSheetImage.raw.naturalHeight, $.w, $.h)
    console.log(`Calculated scale: ${this.cScale} for image size: ${this.spriteSheetImage.raw.naturalWidth}x${this.spriteSheetImage.raw.naturalHeight} and canvas size: ${this.w}x${this.h}`)
}

$.rescaleImage = function (scale){
    if(!this.spriteSheetImage){
        return
    }
    this.spriteSheetImage.raw.setScale(scale)
    this.spriteSheetImage.x = this.w/2
    this.spriteSheetImage.y = $.h/2
    console.log({w: this.spriteSheetImage.w, h: this.spriteSheetImage.h})
}

function highlightSprites(img, sX, sY, sW, sH, sPadLeft, sPadTop){
    if(sW <= 0 || sH <= 0){
        return
    }
    //console.log({w: img.w, h: img.h})
    let sheet = img
    let sheetLeft = sheet.x - sheet.w/2
    let sheetTop = sheet.y - sheet.h/2
    let sheetRight = sheetLeft + sheet.w
    let sheetBottom = sheetTop + sheet.h

    let startX = sheetLeft + sX
    let startY = sheetTop + sY

    $.shape.colour = 'transparent'
    $.shape.border = 'yellow'
    for(let yy = startY;yy + sH<= sheetBottom; yy += (sH + sPadTop)){
        for(let xx = startX;xx + sW <= sheetRight; xx += (sW + sPadLeft)){
            let centerX = xx + sW/2
            let centerY = yy + sH/2
            $.shape.rectangle(centerX, centerY, sW, sH)
        }
    }
}

function scaleToFit(imgW, imgH, canvasW, canvasH){
    const scaleX = canvasW / imgW
    const scaleY = canvasH / imgH
    return Math.min(scaleX, scaleY)
}

function update(){
    let stamp = $.spriteSheetImage
    if($.spriteSheetImage){
        stamp.draw()
        stamp.x = $.w/2
        stamp.y = $.h/2
        console.log(stamp.raw.complete)
        if(stamp.raw.complete){
            $.shape.colour = 'transparent'
            $.shape.border = 'red'
            $.shape.rectangle(stamp.x, stamp.y, stamp.w,stamp.h)
            let scaled = {x: 0, y: 0, w: 0, h: 0, ph: 0, pv: 0}
            Object.keys($.sParams).forEach((key) => {
                scaled[key] = Math.floor($.sParams[key] * $.cScale)
            })
            highlightSprites(stamp, scaled.x, scaled.y, scaled.w, scaled.h, scaled.ph, scaled.pv)
        }
    }

}


const worker = new Worker('/assets/sprite-worker.js');

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

        console.log(this.$.spriteSheetImage)
        this.$.retroImageLoad('/assets/guy.png', this.setInputRange)
        this.$.sParams = {
            x: 0, y: 0, w: 100, h: 100, ph: 0, pv: 0
        }
        this.showScene('.convert')
    }

    render() {
        let canvas = document.querySelector('#myCanvas')
        this.innerHTML = `
        <h1>Spritesheet Slicer</h1>
        <span id="error"></span>
        <div class="file-input">
            <input type="file" id="fileInput" accept="image/png" />
            <pre id="output">Waiting for file...</pre>
            ${this.#fireErrorDialog}
            ${this.#largeFileDialog}
        </div>
        <div class="convert" style="display: none;">
            <div id="convertForm"">
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

        this.querySelector(".convert").appendChild(canvas)
        // this.$.debug = true
    }

    #form = `
        <form id="spritesheetForm">
            <fieldset class="grid">
                <label class="param-input" for="x">X:
                    <input type="number" name="x" value="0" min="0" max="100">
                    <input type="range" name="x-slider" value="0" min="0" max="100" step="4">
                </label>
                <label class="param-input" for="y">Y:
                    <input type="number" name="y" value="0" min="0" max="100">
                    <input type="range" name="y-slider" value="0" min="0" max="100" step="4">
                </label>
            </fieldset>
            <fieldset class="grid">
                <label class="param-input" for="width">Width:
                    <input type="number" name="w" value="100" min="0" max="100">
                    <input type="range" name="w-slider" value="100" min="0" max="100" step="4">
                </label>
                <label class="param-input" for="height">Height:
                    <input type="number" name="h" value="100" min="0" max="100">
                    <input type="range" name="h-slider" value="0" min="0" max="100" step="4">
                </label>
            </fieldset>
            <fieldset class="grid">
                <label class="param-input" for="pHorizontal">Horizontal:
                    <input type="number" name="ph" value="0" min="0" max="100">
                    <input type="range" name="ph-slider" value="0" min="0" max="100" step="4">
                </label>
                <label class="param-input" for="pVertical">Vertical:
                    <input type="number" name="pv" value="0" min="0" max="100">
                    <input type="range" name="pv-slider" value="0" min="0" max="100" step="4">
                </label>
            </fieldset>
        </form>
    `

    #fireErrorDialog = `
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
    `

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

        
        this.querySelectorAll('.newconvert').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('#fileInput').value = ''; // Reset file input
                document.querySelector('.out-image').innerHTML = '';//Clears previous images output
                this.showScene('.file-input');
            });
        });

        this.querySelectorAll('.param-input').forEach(inp => {
            let inputs = inp.querySelectorAll('input');
            let baseKey = inputs[0].name;
            console.log(inp)
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
        })

        window.addEventListener('resize', () => {
            this.$.calculateScale();
            this.$.rescaleImage(this.$.cScale);
        });
    }

    setInputRange = (e) => {
        let width = e.target.naturalWidth;
        let height = e.target.naturalHeight;
        [this.x, this.y, this.width, this.height, this.pHorizontal, this.pVertical].forEach((el, i) => {
            if(i%2 === 0) {
                el.max = width;
                el.nextElementSibling.max = width;
            } else {
                el.max = height;
                el.nextElementSibling.max = height;
            }
        })
        this.width.value = width/4;
        this.height.value = height/4;
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
     * 
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
    get x() {
        return document.querySelector('#spritesheetForm input[name="x"]');
    }
    get y() {
        return document.querySelector('#spritesheetForm input[name="y"]');
    }
    get width() {
        return document.querySelector('#spritesheetForm input[name="w"]');
    }
    get height() {
        return document.querySelector('#spritesheetForm input[name="h"]');
    }
    get pHorizontal() {
        return document.querySelector('#spritesheetForm input[name="ph"]');
    }
    get pVertical() {
        return document.querySelector('#spritesheetForm input[name="pv"]');
    }

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