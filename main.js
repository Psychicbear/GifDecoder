const express = require('express');
const app = express();
const port = 3000; 
const path = require('path');
const ROOT = path.join(__dirname, "public");

// app.use((_, res, next) => {
//     res.set({
//       "Cross-Origin-Opener-Policy": "same-origin",
//       "Cross-Origin-Embedder-Policy": "require-corp",
//       "Cross-Origin-Resource-Policy": "cross-origin",
//       "Origin-Agent-Cluster": "?1",
//       "Access-Control-Allow-Origin": "*",
//       "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
//       "Access-Control-Allow-Headers":
//         "Origin, X-Requested-With, Content-Type, Accept, Range",
//     });
//     next();
//   });

app.use(express.static(ROOT));
app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});