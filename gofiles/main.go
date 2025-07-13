package main

import (
	"fmt"
	"honnef.co/go/js/dom/v2"
	"syscall/js"
)

func main() {
	//Initialise the DOM 
	window := dom.GetWindow()
	document := window.Document()

	// Link i/o elements to code
	output := document.GetElementByID("output").(dom.Element)
	input := document.GetElementByID("fileInput").(*dom.HTMLInputElement)

	// Adds an event listener to trigger when a file is uploaded
	input.AddEventListener("change", false, func(_ dom.Event) {
		files := input.Underlying().Get("files")
		if files.Length() == 0 {
			output.SetTextContent("No file selected")
			return
		}

		file := files.Index(0)
		filename := file.Get("name").String()

		var callback js.Func
		callback = js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			text := args[0].String()
			fmt.Println(args)
			preview := text
			if len(text) > 100 {
				preview = text[:100] + "..."
			}

			output.SetTextContent(fmt.Sprintf("Read file: %s\nPreview:\n%s", filename, preview))
			callback.Release() // Release the callback to avoid memory leaks
			return nil
		})

		// Use the callback here, after it's defined
		js.Global().Call("readFileAsText", file, callback)
	})

	select {}
}
