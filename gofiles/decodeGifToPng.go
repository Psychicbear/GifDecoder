package main

import (
	"flag"
	"fmt"
	"image/gif"
	"image/png"
	"os"
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
		fmt.Printf("Error creating output file: %v\n", err)
		os.Exit(1)
	}
	defer outFile.Close()

	// Decode the GIF
	newImg, err := gif.Decode(file)
	if err != nil {
		fmt.Printf("Error decoding GIF file: %v\n", err)
		os.Exit(1)
	}

	// Encode the image as PNG
	err = png.Encode(outFile, newImg)
	if err != nil {
		fmt.Printf("Error creating output file: %v\n", err)
		os.Exit(1)
	}


	fmt.Printf("Created png from GIF: %s\n", *outFile)
}