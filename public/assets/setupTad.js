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

/** 
 * Updates the Tad canvas, drawing the sprite sheet and highlighting the sprites based on the current parameters.
*/ 
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
    

    /**
     * An image loader that bypasses TAD's asset manager to allow for loading post setup
     * This is necessary to allow for dynamic loading of images after the initial setup phase
     * @param {URL} blobUrl 
     * @param {Function} onload 
     */
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

    /** 
     * Calculates the appropriate scale for the sprite sheet image to fit within the canvas dimensions.
     * It updates the width, height, and calculated scale properties of the Tad instance.
    */
    $.calculateScale = function (){
        if(!this.spriteSheetImage){
            return
        }
        let canvas = document.querySelector("#myCanvas")

        this.w = canvas.clientWidth
        this.h = window.innerHeight * 0.5
        this.cScale = $.scaleToFit(this.spriteSheetImage.raw.naturalWidth, this.spriteSheetImage.raw.naturalHeight, $.w, $.h)
    }

    /** 
     * Rescales the sprite sheet image to the specified scale and centers it within the canvas
     * Instead of scaling the stamp directly, it adjusts the scale of the underlying raw image
     * @param {number} scale - The scale factor to apply to the sprite sheet image.
    */
    $.rescaleImage = function (scale){
        if(!this.spriteSheetImage){
            return
        }
        this.spriteSheetImage.raw.setScale(scale)
        this.spriteSheetImage.x = this.w/2
        this.spriteSheetImage.y = $.h/2
    }

    /**
     * Draws rectangles over each sprite in the sprite sheet based on the provided parameters.
     * @param {RetroImg} img Sprite sheet image
     * @param {number} sX Starting X position
     * @param {number} sY Starting Y position
     * @param {number} sW Sprite width
     * @param {number} sH Sprite height
     * @param {number} sPadLeft Sprite padding left
     * @param {number} sPadTop Sprite padding top
     * @returns 
     */
    $.highlightSprites = function (img, sX, sY, sW, sH, sPadLeft, sPadTop){
        if(sW <= 0 || sH <= 0){
            return
        }
        let sheet = img
        let sheetLeft = sheet.x - sheet.w/2
        let sheetTop = sheet.y - sheet.h/2
        let sheetRight = sheetLeft + sheet.w
        let sheetBottom = sheetTop + sheet.h

        let startX = sheetLeft + sX
        let startY = sheetTop + sY

        /**
         * Draw underlying gridlines first
         */
        $.shape.colour = 'blue'
        $.shape.border = 'blue'
        $.shape.strokeWidth = 1
        for(let x = startX;x + sW<= sheetRight; x += (sW + sPadLeft)){
            $.shape.line(x, sheetTop, x, sheetBottom)
            $.shape.line(x + sW, sheetTop, x + sW, sheetBottom)
        }
        for(let y = startY;y + sH <= sheetBottom; y += (sH + sPadTop)){
            $.shape.line(sheetLeft, y, sheetRight, y)
            $.shape.line(sheetLeft, y + sH, sheetRight, y + sH)
        }

        /**
         * Then draw rectangles over each sprite to highlight them
         */
        $.shape.colour = 'transparent'
        $.shape.border = 'yellow'
        $.shape.strokeWidth = 2
        for(let yy = startY;yy + sH<= sheetBottom; yy += (sH + sPadTop)){
            for(let xx = startX;xx + sW <= sheetRight; xx += (sW + sPadLeft)){
                let centerX = xx + sW/2
                let centerY = yy + sH/2
                $.shape.rectangle(centerX, centerY, sW, sH)
            }
        }
    }

    /** 
     * Calculates the scale factor needed to fit a source img within a canvas while maintaining aspect ratio.
     * @param {number} srcWidth - The width of the source img.
     * @param {number} srcHeight - The height of the source img.
     * @param {number} maxWidth - The maximum width of the target canvas.
     * @param {number} maxHeight - The maximum height of the target canvas.
     * @returns {number} The scale factor to fit the source img within the target canvas.
    */
    $.scaleToFit = function(srcWidth, srcHeight, maxWidth, maxHeight) {
        const ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);
        return ratio;
    }



}
