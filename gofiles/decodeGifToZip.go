package main

import (
	"flag"
	"fmt"
	"image/gif"
	"image/png"
	"os"
	"archive/zip"
)

func main() {
	// Define command-line flags
	inputFile := flag.String("input", "", "Path to the input GIF file")
	outputFile := flag.String("output", "", "Path to the output PNG file")
	flag.Parse()

	// Validate input
	if *inputFile == "" || *outputFile == "" {
		fmt.Println("Usage: go run main.go -input=<input_file> -output=<output_file>")
		os.Exit(1)
	}

	// Open the input file
	file, err := os.Open(*inputFile)
	if err != nil {
		fmt.Printf("Error opening input file: %v\n", err)
		os.Exit(1)
	}
	defer file.Close()

	// Create the output file
	outFile, err := os.Create(*outputFile)
	if err != nil {
		fmt.Printf("Error decoding GIF file: %v\n", err)
		os.Exit(1)
	}
	defer outFile.Close()

	// Decode the GIF
	decodedGIF, err := gif.DecodeAll(file)
	if err != nil {
		fmt.Printf("Error decoding GIF file: %v\n", err)
		os.Exit(1)
	}

	// Creates Zip file writer for compressing PNG frames
	w := zip.NewWriter(outFile)
	defer w.Close() // Never forget to defer closing, otherwise zip contents may be corrupted

	// Loops over length of decoded GIF frames array with index and image
	for i, img := range decodedGIF.Image {
		// Creates numbered frame file
		f, err := w.Create(fmt.Sprintf("frame_%d.png", i))
		if err != nil {
			fmt.Printf("Error decoding GIF file: %v\n", err)
			os.Exit(1)
		}
		// Encodes the image to PNG format and writes it to the previously created file
		err = png.Encode(f, img)
		if err != nil {
			fmt.Printf("Error decoding GIF file: %v\n", err)
			os.Exit(1)
		}
		fmt.Printf("Decoded %v\n", fmt.Sprintf("frame_%d.png", i))
	}

	fmt.Printf("Created Zip of Pngs from GIF")
}