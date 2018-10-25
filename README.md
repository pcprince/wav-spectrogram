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

    wavSpectro.drawSpectrogram({arrayBuffer: arrayBuffer, canvasElem: canvasElem, cmap: 'jet'}, function () {
    
        console.log("Done.");
    
    });

};

reader.readAsArrayBuffer(fileInput.files[0]);
```

### Functions ###

The draw function must be handed parameters in an object, named as such. Parameters with default values can be left out.

Option         | Default     | Description
---------------|-------------|------------
`arrayBuffer`  | -           | Array buffer read from WAV file
`canvasElem`   | -           | Canvas element to draw to (spectrogram will fill dimensions)
`cmap`         | -           | Colour map to draw using [colormap](https://www.npmjs.com/package/colormap) module
`nfft`         | 512         | Buffer size of Fast Fourier Transform
`frameLengthMs`| 0.1         | Length of frames signal is divided into before FFT is applied (given in milliseconds)
`frameStepMs`  | 0.005       | Size of steps forward each frame takes (if less than `frameLengthMs` then frames overlap)
`errorHandler` | -			 | An error handling function which will be called if loading the wav file fails

As well as the params object, the draw function accepts a callback function.
