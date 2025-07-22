package main

import (
	"fmt"
	"honnef.co/go/js/dom/v2"
	"syscall/js"
	"image/gif"
	"image/png"
	"bytes"
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
	outputElement.SetTextContent(fmt.Sprintf("Decoded GIF with %d frames", len(gifFile.Image)))

	// Loop through each frame in the GIF and convert it to PNG
	for _, img := range gifFile.Image {
		imgBuf := new(bytes.Buffer)
		err = png.Encode(imgBuf, img)
		if err != nil {
			errorElement := document.GetElementByID("error").(dom.Element)
			errorElement.SetTextContent(fmt.Sprintf("Error encoding PNG: %v", err))
			println(fmt.Sprintf("Error encoding PNG: %v", err))
			return nil
		}
		dst := js.Global().Get("Uint8Array").New(len(imgBuf.Bytes()))
		js.CopyBytesToJS(dst, imgBuf.Bytes())
		js.Global().Call("displayImage", dst) // Call the JavaScript function to display the image on the page
	}
	js.Global().Call("createZip")
	return nil

}

func main() {
	c := make(chan bool)
	js.Global().Set("convert", js.FuncOf(convert)) // Allows the Go function to be called from JavaScript
	<- c
}
