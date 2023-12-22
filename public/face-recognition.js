// Import the required face-api.js modules
const { errorFunc } = require('express-fileupload/lib/utilities');
const { faceapi } = require('face-api.js');

// Load face-api.js models
async function loadModels() {
    try {
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
    } catch (error) {
        console.error('Error loading models:', error);
        // Handle the error (e.g., display an error message to the user)
    }
}

// Start capturing video from the user's webcam
async function startVideo() {
    try {
        const video = document.getElementById('video');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
    } catch (error) {
        console.error('Error starting video:', error);
        // Handle the error (e.g., display an error message to the user)
    }
}

// Detect and recognize faces in real-time
async function detectAndRecognize() {
    try {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const displaySize = { width: video.width, height: video.height };
        faceapi.matchDimensions(canvas, displaySize);

        setInterval(async () => {
            const detections = await faceapi.detectAllFaces(video,
                new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            canvas
                .getContext('2d')
                .clearRect(0, 0, canvas.width, canvas.height);
            faceapi.draw.drawDetections(canvas, resizedDetections);
            faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        }, 100);
    } catch (error) {
        console.error('Error detecting and recognizing faces:', error);
        // Handle the error (e.g., display an error message to the user)
    }
}

// Initialize the application
async function init() {
    await loadModels();
    startVideo();
    detectAndRecognize();
}

init();
