# wav-spectrogram
A Node.js library for loading WAV files and drawing a spectrogram to a canvas.

### Usage ###

Load WAV file using a input object, read contents as an array buffer and pass to function with a canvas of the desired dimensions:
```
var wavSpectro = require('wav-spectrogram');

var fileInput = document.getElementById('file-input');
var canvasElem = document.getElementById('spectrogram-canvas');

var reader = new FileReader();

reader.onload = function() {

    var arrayBuffer = reader.result;

    wavSpectro.drawSpectrogram(arrayBuffer, canvasElem, 'jet');

};

reader.readAsArrayBuffer(fileInput.files[0]);
```