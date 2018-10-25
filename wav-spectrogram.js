/****************************************************************************
 * wav-spectrogram.js
 * pcprince.co.uk
 * September 2018
 *****************************************************************************/

'use strict';

/*jslint plusplus: true */

var dsp = require('dsp.js-browser');
var decode = require('audio-decode');
var colormap = require('colormap');

function scaleAcrossRange(x, max, min) {

    return (x - min) / (max - min);

}

function median(values) {

    values.sort(function (a, b) {return a - b; });

    var half = Math.floor(values.length / 2);

    if (values.length % 2) {

        return values[half];

    }

    return (values[half - 1] + values[half]) / 2.0;

}

function medianFilter(array) {

    var i, j, values, filteredArray, filteredRow;

    filteredArray = [];

    for (i = 1; i < array.length - 1; i++) {

        filteredRow = [];

        for (j = 1; j < array[i].length - 1; j++) {

            values = [];
            values.push(array[i - 1][j], array[i][j], array[i + 1][j]);
            values.push(array[i - 1][j - 1], array[i][j - 1], array[i + 1][j - 1]);
            values.push(array[i - 1][j + 1], array[i][j + 1], array[i + 1][j + 1]);

            filteredRow.push(median(values));

        }

        filteredArray.push(filteredRow);

    }

    return filteredArray;

}

function drawSpectrogram(params, callback) {

    var arrayBuffer, canvasElem, cmap, nfft, frameLengthMs, frameStepMs, err, sampleRate, samples, sampleArray, frameLength, frameStep, numFrames, paddedArrayLength, frames, i, maxValue, minValue, spectrumFrames, spectrum, m, n, a, o, p, ctx, specWidth, specHeight, colours;

    arrayBuffer = params.arrayBuffer;
    canvasElem = params.canvasElem;
    cmap = params.cmap;
    nfft = params.nfft || 512;
    frameLengthMs = params.frameLengthMs || 0.1;
    frameStepMs = params.frameStepMs || 0.005;

    decode(arrayBuffer, (err, audioBuffer) => {

        if(err || audioBuffer.length === 0) {
            console.error("Loading file failed!");
            typeof params.errorHandler === 'function' && params.errorHandler();
            return;
        }

        // Extract samples from audio file
        sampleRate = audioBuffer.sampleRate;
        samples = audioBuffer.getChannelData(0);
        sampleArray = Array.prototype.slice.call(samples);

        frameLength = frameLengthMs * sampleRate;
        frameStep = frameStepMs * sampleRate;

        // Pad signal to make sure that all frames have equal number of samples without truncating any samples from the original signal
        numFrames = Math.ceil((samples.length - frameLength) / frameStep);
        paddedArrayLength = numFrames * frameStep + frameLength;
        sampleArray = sampleArray.concat(new Array(paddedArrayLength - samples.length).fill(0));

        frames = [];

        for (i = 0; i < numFrames; i++) {

            let frameStart, frame, j, frameIndex, filteredSample;

            frameStart = i * frameStep;
            frame = [];

            for (j = 0; j < frameLength; j++) {

                frameIndex = j + frameStart;

                // Apply Hamming filter
                filteredSample = sampleArray[frameIndex] * (0.54 - (0.46 * Math.cos(2.0 * Math.PI * j / (frameLength - 1.0))));

                frame.push(filteredSample);

            }

            frames.push(frame);

        }

        maxValue = 0;
        minValue = 0;

        spectrumFrames = [];

        for (m = 0; m < frames.length; m++) {

            // Apply FFT
            let fft = new dsp.RFFT(nfft, sampleRate);
            fft.forward(frames[m]);

            spectrum = [];

            for (n = 0; n < fft.trans.length; n++) {

                if (fft.trans[n] != 0) {

                    spectrum.push(Math.log(Math.abs(fft.trans[n])));

                } else {

                    // Prevent log(0) = -inf
                    spectrum.push(0);

                }

            }

            spectrumFrames.push(spectrum);

        }

        // Apply median filter
        spectrumFrames = medianFilter(spectrumFrames);

        // Calculate range of filtered values to scale colours between
        for (a = 0; a < spectrumFrames.length; a++) {

            maxValue = Math.max(Math.max.apply(null, spectrumFrames[a]), maxValue);
            minValue = Math.min(Math.min.apply(null, spectrumFrames[a]), minValue);

        }

        ctx = canvasElem.getContext("2d");

        // Scale drawing context to fill canvas
        specWidth = spectrumFrames.length;
        specHeight = spectrumFrames[0].length / 2;
        ctx.scale(canvasElem.width / specWidth, canvasElem.height / specHeight);

        // Create colourmap to map spectrum values to colours
        colours = colormap({colormap: cmap, nshades: 255, format: 'hex'});

        for (o = 0; o < spectrumFrames.length; o++) {

            // Ignore half of spectrogram above Nyquist frequency as it is redundant a reflects values below
            for (p = spectrumFrames[0].length / 2; p < spectrumFrames[0].length; p++) {

                // Scale values between 0 - 255 to match colour map
                let scaledValue = Math.round(255 * scaleAcrossRange(spectrumFrames[o][p], maxValue, minValue));

                ctx.fillStyle = colours[scaledValue];
                ctx.fillRect(o,p - spectrumFrames[0].length / 2,1,1);

            }

        }

        typeof callback === 'function' && callback();

    });

}

exports.drawSpectrogram = drawSpectrogram;