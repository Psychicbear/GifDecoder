import { $ } from "./lib/TeachAndDraw.js";
import { AssetJob } from './lib/AssetManager.js';
import { Stamp } from './lib/Img.js';

/**
 * @typedef {import("./lib/TeachAndDraw.js).Tad} Tad
 * @typedef {import("./lib/AssetManager.js).AssetJob} AssetJob
 * @typedef {import("./lib/Img.js).Img} Img
 * @typedef {import("./lib/Img.js).Stamp} Stamp
 * @typedef {import("./lib/Group.js).Group} Group
*/

/**
 * @class RetroImg
 * @extends {Image}
 * @classdesc A class representing an image with additional functionality for scaling and wrapping. 
 * It extends the native Image class and retrofits into Tad Stamps
 * for easier manipulation within the Tad framework.
 */
class RetroImg extends Image {
    /**
     * Creates an instance of RetroImg.
     * @param {string} filepath - The file path of the image to be loaded.
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
        };

        /** 
         * Sets the scale of the image and updates the dimensions of all associated wrappers.
         * @param {number} scale - The scale factor to apply to the image dimensions.
        */
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

function update(){
    let stamp = $.spriteSheetImage
    if($.spriteSheetImage){
        stamp.draw()
        stamp.x = $.w/2
        stamp.y = $.h/2
        if(stamp.raw.complete){
            $.shape.colour = 'transparent'
            $.shape.border = 'red'
            $.shape.rectangle(stamp.x, stamp.y, stamp.w,stamp.h)
            let scaled = {x: 0, y: 0, w: 0, h: 0, ph: 0, pv: 0}
            Object.keys($.sParams).forEach((key) => {
                scaled[key] = Math.floor($.sParams[key] * $.cScale)
            })
            console.log({stamp: stamp, scaled: scaled, sParams: $.sParams})
            $.highlightSprites(stamp, scaled.x, scaled.y, scaled.w, scaled.h, scaled.ph, scaled.pv)
        }
    }
}

/**
 * Sets up the Tad environment for sprite sheet manipulation.
 */
export function setupTad(){
    let canvas = document.createElement("canvas");
    canvas.id = "myCanvas";
    document.body.appendChild(canvas)

    /** @type {Tad} */
    $.use(update, document.querySelector('#myCanvas'))
    /** @type {Stamp | null} */
    $.spriteSheetImage = null
    $.sParams = {
        x: 0, y: 0, w: 0, h: 0, ph: 0, pv: 0
    }
    $.updateScaled = true
    $.setup = false
    $.cScale = 1
    $.setImageScale = false
    
    $.retroImageLoad = function (blobUrl, onload = null){
        const img = new RetroImg(blobUrl);
        const nuStamp = new Stamp(this, 0, 0, img);
        img.wrapper.push(nuStamp);
        // @ts-ignore
        // job.asset = img;
        this.spriteSheetImage = nuStamp

        img.addEventListener('load', (e) => {
            this.calculateScale()
            this.rescaleImage(this.cScale)
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
        this.h = window.innerHeight * 0.5
        // this.cScale = scaleToFit(this.spriteSheetImage.raw.naturalWidth, this.spriteSheetImage.raw.naturalHeight, $.w, $.h) * 100
        this.cScale = $.scaleToFit(this.spriteSheetImage.raw.naturalWidth, this.spriteSheetImage.raw.naturalHeight, $.w, $.h)
    }

    $.rescaleImage = function (scale){
        if(!this.spriteSheetImage){
            return
        }
        this.spriteSheetImage.raw.setScale(scale)
        this.spriteSheetImage.x = this.w/2
        this.spriteSheetImage.y = $.h/2
    }

    $.highlightSprites = function (img, sX, sY, sW, sH, sPadLeft, sPadTop){
        // console.log("Highlight sprites begins")
        if(sW <= 0 || sH <= 0){
            // console.log("Highlight sprites ends early ")
            return
        }
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
        // console.log("Highlight sprites ends")
    }

    $.scaleToFit = function(srcWidth, srcHeight, maxWidth, maxHeight) {
        const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
        return ratio;
    }



}
