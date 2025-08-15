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
`;
document.head.appendChild(style);



function highlightSprites(img, sX, sY, sW, sH, sPadLeft, sPadTop){
    if(sW <= 0 | sH <= 0){
        return
    }
    //console.log({w: img.w, h: img.h})
    let sheet = img
    let sheetX = sheet.x - sheet.w/2
    let sheetY = sheet.y - sheet.h/2
    let x = sheetX + sX + sW/2
    let y = sheetY + sY + sH/2
    $.shape.colour = 'transparent'
    $.shape.border = 'yellow'
    for(y;y<= sheetY + sheet.h + sPadTop; y += sH + sPadTop){
        for(x;x<= sheetX + sheet.w + sPadLeft; x+= sW + sPadLeft){
            $.shape.rectangle(x, y, sW, sH)
        }
        y+= sPadTop
        x = sheetX + sX + sW/2
    }
}

function scaleToFit(imgW, imgH, canvasW, canvasH){
    const scaleX = canvasW / imgW
    const scaleY = canvasH / imgH
    return Math.min(scaleX, scaleY)
}



const worker = new Worker('/assets/sprite-worker.js');

class SpritesheetSlicer extends HTMLElement {
    #outputFrames = [];
    img = new Image()
    constructor() {
        super();
        this.worker = worker;
        // this.$ = $
    }

    connectedCallback() {
        this.render()
        this.#addEvents();

        this.img.src = '/assets/guy.png'
        this.showScene('.convert')
    }

    render() {
        console.log('rendering')
        let canvas = this.canvas
        console.log(canvas)
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
    }

    #form = `
        <form id="spritesheetForm">
            <fieldset class="grid">
                <label for="x">X:
                    <input type="number" name="x" value="0">
                </label>
                <label for="y">Y:
                    <input type="number" name="y" value="0">
                </label>
            </fieldset>
            <fieldset class="grid">
                <label for="width">Width:
                    <input type="number" name="w" value="100">
                </label>
                <label for="height">Height:
                    <input type="number" name="h" value="100">
                </label>
            </fieldset>
            <fieldset class="grid">
                <label for="pHorizontal">Horizontal:
                    <input type="number" name="ph" value="0">
                </label>
                <label for="pVertical">Vertical:
                    <input type="number" name="pv" value="0">
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

    draw() {
        if(!this.canvas){
            return
        }
        let canv = this.canvas
        print(canv)
        canv.width = canv.clientWidth
        canv.height = canv.clientHeight
        let img = this.img
        let scale = scaleToFit(img.width, img.height, canv.width, canv.height)
        let iWidth = img.width * scale
        let iHeight = img.height * scale
        let gridParams = this.splitParams

        // canv.width = iWidth
        // canv.height = iHeight

        let ctx = canv.getContext("2d")
        let scaled = {x: gridParams.x *scale, y: gridParams.y * scale, w: gridParams.w * scale, h: gridParams.h * scale, ph: gridParams.ph * scale, pv: gridParams.pv * scale}


        ctx.clearRect(0,0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, iWidth, iHeight)

        // Draw a semi-transparent overlay to dim the image
        ctx.save();
        ctx.globalAlpha = 0.6; // Adjust for desired dimness
        ctx.fillStyle = "#000";
        ctx.fillRect(0, 0, canv.width, canv.height);
        ctx.restore();

        ctx.save()
        ctx.strokeStyle = "yellow"
        for(let y = scaled.y;y<= iHeight; y += scaled.h + scaled.ph){
            for(let x = scaled.x;x<= iWidth; x+= scaled.w + scaled.pv){
                ctx.strokeRect(x,y, scaled.w, scaled.h)
                ctx.drawImage(img, x,y, scaled.w, scaled.h, x, y, scaled.w, scaled.h)
            }
        }
        ctx.restore()

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

        
        this.querySelectorAll('.newconvert').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('#fileInput').value = ''; // Reset file input
                document.querySelector('.out-image').innerHTML = '';//Clears previous images output
                this.showScene('.file-input');
            });
        });

        this.querySelectorAll('form input').forEach(inp => {
            console.log(inp)
            inp.addEventListener('input', e => {
                console.log({target: e.target.name, value: e.target.value })
                this.$.sParams[e.target.name] = parseInt(e.target.value)
            })
        })

        this.img.addEventListener('load', _ => {
            console.log('Image loaded')
            this.draw()
        })
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

    get canvas(){
        return document.querySelector('#myCanvas')
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
        return this.querySelector('#spritesheetForm input[name="x"]').value;
    }
    get y() {
        return this.querySelector('#spritesheetForm input[name="y"]').value;
    }
    get width() {
        return this.querySelector('#spritesheetForm input[name="w"]').value;
    }
    get height() {
        return this.querySelector('#spritesheetForm input[name="h"]').value;
    }
    get pHorizontal() {
        return this.querySelector('#spritesheetForm input[name="ph"]').value;
    }
    get pVertical() {
        return this.querySelector('#spritesheetForm input[name="pv"]').value;
    }

    get splitParams() {
        return {
            x: parseInt(this.x),
            y: parseInt(this.y),
            w: parseInt(this.width),
            h: parseInt(this.height),
            ph: parseInt(this.pHorizontal),
            pv: parseInt(this.pVertical)
        };
    }

}

customElements.define('spritesheet-slicer', SpritesheetSlicer);