'use strict';

const express = require('express');

// Constants
const PORT = 8080;
const HOST = '0.0.0.0';

// App
const app = express();
app.get('/', (req, res) => {
  var displayName = process.env.DISPLAY_NAME;
  res.send('Hello World '+displayName);
});

app.listen(PORT, HOST);
console.log(`Running on http://${HOST}:${PORT}`);
