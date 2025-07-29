## To build wasm file
In the gofiles folder, run the command `GOOS=js GOARCH=wasm go build -o ../public/assets/main.wasm main.go`

## To use the gif splitter
Copy the assets folder to the root of your server's public files, then link the scripts in the asset folder to your page eg.
```html
    <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
        <title>Gif Splitter</title>
        <script src="/assets/wasm_exec.js"></script>
        <script src="/assets/jszip.min.js"></script>
        <script src="/assets/FileSaver.min.js"></script>
        <script src="/assets/gifsplitter.js"></script>
    </head>
```

Then simply add the gif-splitter html tag to your page wherever you want the webapp to display
```html
<gif-splitter></gif-splitter>
```