package main

import (
	"bytes"
	"fmt"
	"image/gif"
	"image/png"
	"image"
	"syscall/js"
	"image/draw"
	"honnef.co/go/js/dom/v2"
)

func convert(this js.Value, inputs []js.Value) interface{} {
	
	println("convert function called")
	println("Inputs received:", inputs[1].String())
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
		// EXPERIMENTAL: Blend the current frame with the overpaint image
		draw.Draw(canvas, bounds, canvas, image.Point{}, draw.Src)
		draw.Draw(canvas, bounds, img, img.Bounds().Min, draw.Over)

		// Allocate buffer for the PNG image
		imgBuf := new(bytes.Buffer)
		// Encode the image to PNG format
		err = png.Encode(imgBuf, img)
		if err != nil {
			errorElement := document.GetElementByID("error").(dom.Element)
			errorElement.SetTextContent(fmt.Sprintf("Error encoding PNG: %v", err))
			println(fmt.Sprintf("Error encoding PNG: %v", err))
			return nil
		}

		// Handle disposal method
		println(fmt.Sprintf("Disposal method for frame: %v", inputs[1]))
		if inputs[1].String() == "Background" {
			// If the disposal method is to restore to background, we need to clear the canvas
			draw.Draw(canvas, bounds, image.Transparent, image.Point{}, draw.Src)
			println("Disposal method is to restore to background, clearing canvas")
		} else if inputs[1].String() == "Previous" {
			// If the disposal method is to restore to previous, we need to restore the backup
			draw.Draw(canvas, bounds, backup, image.Point{}, draw.Src)
			println("Disposal method is to restore to previous, restoring backup")
		}

		if inputs[1].String() == "Previous" {
			// If the disposal method is to restore to previous, we need to save the current frame as backup
			draw.Draw(backup, bounds, canvas, image.Point{}, draw.Src)
			println("Saving current frame as backup for next frame")
		}


		js.Global().Call("checkTime") // Call the JavaScript function to log the time
		dst := js.Global().Get("Uint8Array").New(len(imgBuf.Bytes()))
		js.CopyBytesToJS(dst, imgBuf.Bytes())
		js.Global().Call("setProgress", i+1, len(gifFile.Image)) // Update the progress bar
		js.Global().Call("displayImage", dst) // Call the JavaScript function to display the image on the page
	}
	js.Global().Call("createZip")
	outputElement.SetTextContent(fmt.Sprintf("Decoded GIF with %d frames", len(gifFile.Image)))
	return nil

}

func main() {
	c := make(chan bool)
	js.Global().Set("convert", js.FuncOf(convert)) // Allows the Go function to be called from JavaScript
	<- c
}
