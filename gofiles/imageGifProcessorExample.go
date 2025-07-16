package main

import (
	"flag"
	"fmt"
	"image"
	"image/gif"
	"os"
)

func main() {
	// Define command-line flags
	inputFile := flag.String("input", "", "Path to the input image file")
	outputFile := flag.String("output", "", "Path to the output GIF file")
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

	// Decode the image
	img, _, err := image.Decode(file)
	if err != nil {
		fmt.Printf("Error decoding image: %v\n", err)
		os.Exit(1)
	}

	// Create the output file
	outFile, err := os.Create(*outputFile)
	if err != nil {
		fmt.Printf("Error creating output file: %v\n", err)
		os.Exit(1)
	}
	defer outFile.Close()

	// Encode the image as a GIF
	err = gif.Encode(outFile, img, nil)
	if err != nil {
		fmt.Printf("Error encoding GIF: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("GIF created successfully!")
}