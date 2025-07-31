package main

import (
	"bytes"
	"fmt"
	"image"
	"image/draw"
	"image/gif"
	"image/png"
	"syscall/js"
	"time"
)

func convert(this js.Value, inputs []js.Value) interface{} {
	start := time.Now()
	gifFrames := js.Global().Get("Array").New() // Create a new JavaScript array to hold the frames
	imageArr := inputs[0]
	progressCb := inputs[1]

	inBuf := make([]uint8, imageArr.Get("byteLength").Int())
	js.CopyBytesToGo(inBuf, imageArr)

	gifFile, err := gif.DecodeAll(bytes.NewReader(inBuf))
	if err != nil {
		js.Global().Call("postMessage", map[string]interface{}{
			"type":    "error",
			"message": fmt.Sprintf("Error decoding GIF: %v", err),
		})
		return nil
	}

	// EXPERIMENTAL: Create overpaint image for blending frames
	bounds := image.Rect(0, 0, gifFile.Config.Width, gifFile.Config.Height)
	canvas := image.NewRGBA(bounds)
	backup := image.NewRGBA(bounds)

	imgBuf := new(bytes.Buffer)

	// Loop through each frame in the GIF and convert it to PNG
	for i, img := range gifFile.Image {
		progressCb.Call("invoke", js.ValueOf(i+1), js.ValueOf(len(gifFile.Image))) // Call the progress callback with current frame index and total frames
        
		// Handle disposal method for previous frame (except first frame)
        if i > 0 {
            switch gifFile.Disposal[i-1] {
            case gif.DisposalBackground:
                // Restore the area covered by the previous frame to transparent
                draw.Draw(canvas, gifFile.Image[i-1].Bounds(), image.Transparent, image.Point{}, draw.Src)
            case gif.DisposalPrevious:
                // Restore the previous canvas state
                draw.Draw(canvas, bounds, backup, image.Point{}, draw.Src)
            }
        }

        // Save current canvas if next frame needs DisposalPrevious
        if i < len(gifFile.Disposal) && gifFile.Disposal[i] == gif.DisposalPrevious {
            draw.Draw(backup, bounds, canvas, image.Point{}, draw.Src)
        }

        // Draw the current frame onto the canvas
        draw.Draw(canvas, bounds, img, image.Point{}, draw.Over)

		// Allocate buffer for the PNG image
		imgBuf.Reset()

		// Encode the image to PNG format
		err = png.Encode(imgBuf, canvas)
		if err != nil {
			js.Global().Call("postMessage", map[string]interface{}{
				"type":    "error",
				"message": fmt.Sprintf("Error encoding PNG: %v", err),
			})
			return nil
		}

		// Convert the PNG image to a JavaScript Uint8Array for use in JavaScript
		dst := js.Global().Get("Uint8Array").New(len(imgBuf.Bytes()))
		js.CopyBytesToJS(dst, imgBuf.Bytes())
		gifFrames.Call("push", dst) // Push the PNG image to the gifFrames array
	}
	elapsed := time.Since(start)
    fmt.Println("Conversion took: ", elapsed)
	return gifFrames

}

func sheetSplitter(this js.Value, inputs []js.Value) interface{} {
	start := time.Now()
	sprites := js.Global().Get("Array").New() // Create a new JavaScript array to hold the sprite frames
	spritesheetIn := inputs[0]
	params := inputs[1]
	progressCb := inputs[2]

	
	width := params.Get("width").Int()
	height := params.Get("height").Int()
	pVertical := params.Get("pVertical").Int()
	pHorizontal := params.Get("pHorizontal").Int()

	inBuf := make([]uint8, spritesheetIn.Get("byteLength").Int())
	js.CopyBytesToGo(inBuf, spritesheetIn)

	sheet, err := png.Decode(bytes.NewReader(inBuf))
	if err != nil {
		js.Global().Call("postMessage", map[string]interface{}{
			"type":    "error",
			"message": fmt.Sprintf("Error decoding GIF: %v", err),
		})
		return nil
	}
	imgBuf := new(bytes.Buffer)

	//Create a navigable canvas with the spritesheet
	sheetBounds := sheet.Bounds()
	sheetCanvas := image.NewRGBA(sheetBounds)
	draw.Draw(sheetCanvas, sheetCanvas.Bounds(), sheet, image.Point{}, draw.Src)
	
	var frameRange image.Rectangle
	maxFrames := ((sheetBounds.Dx() - (pHorizontal*2)) / width) * ((sheetBounds.Dy() - (pVertical*2)) / height)
	frameCount := 0
	println(fmt.Sprintf("Slicing an expected"), maxFrames, fmt.Sprintf("frames"))

	//Loop through the sheet canvas grid, 
	for y:= params.Get("y").Int() + pVertical; y+height <= sheet.Bounds().Max.Y; y+=(height+pVertical){
		for x := params.Get("x").Int() + pHorizontal; x+width <= sheet.Bounds().Max.X; x+=(width+pHorizontal){
			progressCb.Call("invoke", js.ValueOf(frameCount), js.ValueOf(maxFrames))
			frameRange = image.Rect(x,y,x+width,y+height) // Gets current sprite co-ordinates

			imgBuf.Reset()
			png.Encode(imgBuf, sheetCanvas.SubImage(frameRange))
			if err != nil {
				js.Global().Call("postMessage", map[string]interface{}{
					"type":    "error",
					"message": fmt.Sprintf("Error decoding GIF: %v", err),
				})
				return nil
			}

			//Converts image data to a js value and pushes it to the js sprite array
			dst := js.Global().Get("Uint8Array").New(len(imgBuf.Bytes()))
			js.CopyBytesToJS(dst, imgBuf.Bytes())
			sprites.Call("push", dst)
			frameCount++
		}
	}

	elapsed := time.Since(start)
    fmt.Println("Conversion took: ", elapsed)
	return sprites
}

func main() {
	c := make(chan bool)
	js.Global().Set("convert", js.FuncOf(convert)) // Allows the Go function to be called from JavaScript
	js.Global().Set("sheetSplitter", js.FuncOf(sheetSplitter)) // Allows the Go function to be called from JavaScript
	<- c
}
