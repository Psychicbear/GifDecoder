package main

import (
	"bytes"
	"fmt"
	"image/gif"
	"image/png"
	"syscall/js"

	"honnef.co/go/js/dom/v2"
)

func convert(this js.Value, inputs []js.Value) interface{} {
	println("convert function called")
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

	outputElement := document.GetElementByID("output").(dom.Element)
	

	// Loop through each frame in the GIF and convert it to PNG
	for i, img := range gifFile.Image {
		progress := fmt.Sprintf("(%d/100) Processed %d of %d frames", (i+1/len(gifFile.Image)), i+1, len(gifFile.Image))
		println(progress)
		outputElement.SetTextContent(progress)
		imgBuf := new(bytes.Buffer)
		err = png.Encode(imgBuf, img)
		if err != nil {
			errorElement := document.GetElementByID("error").(dom.Element)
			errorElement.SetTextContent(fmt.Sprintf("Error encoding PNG: %v", err))
			println(fmt.Sprintf("Error encoding PNG: %v", err))
			return nil
		}
		js.Global().Call("checkTime") // Call the JavaScript function to log the time
		dst := js.Global().Get("Uint8Array").New(len(imgBuf.Bytes()))
		js.CopyBytesToJS(dst, imgBuf.Bytes())
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
