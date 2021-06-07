/****************************************************************************
 * wav-spectrogram.js
 * pcprince.co.uk
 * September 2018
 *****************************************************************************/

'use strict';

/* jslint plusplus: true */

const dsp = require('dsp.js-browser');
const decode = require('audio-decode');
const colormap = require('colormap');

function scaleAcrossRange (x, max, min) {

    return (x - min) / (max - min);

}

function median(values) {

    values.sort((a, b) => {

        return a - b;

    });

    const half = Math.floor(values.length / 2);

    if (values.length % 2) {

        return values[half];

    }

    return (values[half - 1] + values[half]) / 2.0;

}

function medianFilter(array) {

    const filteredArray = [];

    for (let i = 1; i < array.length - 1; i++) {

        const filteredRow = [];

        for (let j = 1; j < array[i].length - 1; j++) {

            const values = [];
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

    const arrayBuffer = params.arrayBuffer;
    const canvasElem = params.canvasElem;
    const cmap = params.cmap;
    const nfft = params.nfft || 512;
    const frameLengthMs = params.frameLengthMs || 0.1;
    const frameStepMs = params.frameStepMs || 0.005;

    decode(arrayBuffer, (err, audioBuffer) => {

        if (err || audioBuffer.length === 0) {

            console.error('Failed to load file');
            typeof params.errorHandler === 'function' && params.errorHandler();
            return;

        }

        // Extract samples from audio file
        const sampleRate = audioBuffer.sampleRate;
        const samples = audioBuffer.getChannelData(0);
        let sampleArray = Array.prototype.slice.call(samples);

        const frameLength = frameLengthMs * sampleRate;
        const frameStep = frameStepMs * sampleRate;

        // Pad signal to make sure that all frames have equal number of samples without truncating any samples from the original signal
        const numFrames = Math.ceil((samples.length - frameLength) / frameStep);
        const paddedArrayLength = numFrames * frameStep + frameLength;
        sampleArray = sampleArray.concat(new Array(paddedArrayLength - samples.length).fill(0));

        const frames = [];

        for (let i = 0; i < numFrames; i++) {

            const frameStart = i * frameStep;
            const frame = [];

            for (let j = 0; j < frameLength; j++) {

                const frameIndex = j + frameStart;

                // Apply Hamming filter
                const filteredSample = sampleArray[frameIndex] * (0.54 - (0.46 * Math.cos(2.0 * Math.PI * j / (frameLength - 1.0))));

                frame.push(filteredSample);

            }

            frames.push(frame);

        }

        let maxValue = 0;
        let minValue = 0;

        let spectrumFrames = [];

        for (let m = 0; m < frames.length; m++) {

            // Apply FFT
            const fft = new dsp.RFFT(nfft, sampleRate);
            fft.forward(frames[m]);

            const spectrum = [];

            for (let n = 0; n < fft.trans.length; n++) {

                if (fft.trans[n] !== 0) {

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
        for (let a = 0; a < spectrumFrames.length; a++) {

            maxValue = Math.max(Math.max.apply(null, spectrumFrames[a]), maxValue);
            minValue = Math.min(Math.min.apply(null, spectrumFrames[a]), minValue);

        }

        const ctx = canvasElem.getContext('2d');

        // Scale drawing context to fill canvas
        const specWidth = spectrumFrames.length;
        const specHeight = spectrumFrames[0].length / 2;
        ctx.scale(canvasElem.width / specWidth, canvasElem.height / specHeight);

        // Create colourmap to map spectrum values to colours
        const colours = colormap({colormap: cmap, nshades: 255, format: 'hex'});

        for (let o = 0; o < spectrumFrames.length; o++) {

            // Ignore half of spectrogram above Nyquist frequency as it is redundant a reflects values below
            for (let p = spectrumFrames[0].length / 2; p < spectrumFrames[0].length; p++) {

                // Scale values between 0 - 255 to match colour map
                const scaledValue = Math.round(255 * scaleAcrossRange(spectrumFrames[o][p], maxValue, minValue));

                ctx.fillStyle = colours[scaledValue];
                ctx.fillRect(o, p - spectrumFrames[0].length / 2, 1, 1);

            }

        }

        typeof callback === 'function' && callback();

    });

}

exports.drawSpectrogram = drawSpectrogram;