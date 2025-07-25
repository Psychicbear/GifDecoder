package main

import (
	"bytes"
	"fmt"
	"image"
	"image/draw"
	"image/gif"
	"image/png"
	"syscall/js"
	"honnef.co/go/js/dom/v2"
)

func convert(this js.Value, inputs []js.Value) interface{} {
	gifFrames := js.Global().Get("Array").New() // Create a new JavaScript array to hold the frames
	window := dom.GetWindow()
	document := window.Document()
	imageArr := inputs[0]
	inBuf := make([]uint8, imageArr.Get("byteLength").Int())
	js.CopyBytesToGo(inBuf, imageArr)
	gifFile, err := gif.DecodeAll(bytes.NewReader(inBuf))
	if err != nil {
		errorElement := document.GetElementByID("error").(dom.Element)
		errorElement.SetTextContent(fmt.Sprintf("Error decoding GIF: %v", err))
		println(fmt.Sprintf("Error decoding GIF: %v", err))
		return nil
	}

	outputElement := document.GetElementByID("framecount").(dom.Element)

	// EXPERIMENTAL: Create overpaint image for blending frames
	bounds := gifFile.Image[0].Bounds()
	canvas := image.NewRGBA(bounds)
	backup := image.NewRGBA(bounds)

	// Loop through each frame in the GIF and convert it to PNG
	for i, img := range gifFile.Image {
		// Dom manipulation to show progress
		progress := fmt.Sprintf("(%d/100) Processed %d of %d frames", (i+1/len(gifFile.Image)), i+1, len(gifFile.Image))
		println(progress)
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
        draw.Draw(canvas, bounds, img, img.Bounds().Min, draw.Over)

		// Allocate buffer for the PNG image
		imgBuf := new(bytes.Buffer)
		// Encode the image to PNG format
		err = png.Encode(imgBuf, canvas)
		if err != nil {
			errorElement := document.GetElementByID("error").(dom.Element)
			errorElement.SetTextContent(fmt.Sprintf("Error encoding PNG: %v", err))
			println(fmt.Sprintf("Error encoding PNG: %v", err))
			return nil
		}


		dst := js.Global().Get("Uint8Array").New(len(imgBuf.Bytes()))
		js.CopyBytesToJS(dst, imgBuf.Bytes())
		gifFrames.Call("push", dst) // Push the PNG image to the gifFrames array
		js.Global().Call("setProgress", i+1, len(gifFile.Image)) // Update the progress bar
	}
	outputElement.SetTextContent(fmt.Sprintf("Decoded GIF with %d frames", len(gifFile.Image)))
	return gifFrames

}

func main() {
	c := make(chan bool)
	js.Global().Set("convert", js.FuncOf(convert)) // Allows the Go function to be called from JavaScript
	<- c
}
