/**
 * This software is used folowing software and model under the Apache License, Version 2.0 below.
 *   TensorFlow (https://www.tensorflow.org/)
 *   Pose estimation model(https://www.tensorflow.org/lite/examples/pose_estimation/overview)
 */
/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

/**
 * Variables and parameters
 */

var videoWidth = 640;
var videoHeight = 480;

const defaultQuantBytes = 2;

const defaultMobileNetMultiplier = isMobile() ? 0.50 : 0.75;
const defaultMobileNetStride = 16;
const defaultMobileNetInputResolution = 500;

const defaultResNetMultiplier = 1.0;
const defaultResNetStride = 32;
const defaultResNetInputResolution = 250;

const guiState = {
    algorithm: 'single-pose', // 'single-pose', or 'multi-pose',
    input: {
        architecture: 'MobileNetV1',
        outputStride: defaultMobileNetStride,
        inputResolution: defaultMobileNetInputResolution,
        multiplier: defaultMobileNetMultiplier,
        quantBytes: defaultQuantBytes
    },
    singlePoseDetection: {
        minPoseConfidence: 0.1,
        minPartConfidence: 0.5,
    },
    multiPoseDetection: {
        maxPoseDetections: 5,
        minPoseConfidence: 0.15,
        minPartConfidence: 0.1,
        nmsRadius: 30.0,
    },
    output: {
        showVideo: true,
        showSkeleton: false,
        showPoints: false,
        showBoundingBox: false,
    },
    net: null,
};

/*
 * Text-to-speech
 */
function text2speech(text) {
    printStatus(text);
    var msg = new SpeechSynthesisUtterance();
    msg.text = text; 
    msg.lang = 'en-US';
    window.speechSynthesis.speak(msg);
}

/**
 * analyze pose data
 */
function array2obj_keypoints(keypoints) {
    /* parts name
      "nose",
      "leftEye",     "rightEye",
      "leftEar",     "rightEar",
      "leftShoulder","rightShoulder",
      "leftElbow",   "rightElbow",
      "leftWrist",   "rightWrist",
      "leftHip",     "rightHip",
      "leftKnee",    "rightKnee",
      "leftAnkle",   "rightAnkle"
    */
    var obj = {};
    for(let keypoint of keypoints) {
        obj[keypoint["part"]] = keypoint;
    }
    return obj;
}

/**
 * Code for misc function 
 */
function isAndroid() {
    return /Android/i.test(navigator.userAgent);
}

function isiOS() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isMobile() {
    return isAndroid() || isiOS();
}

/**
 * Draw pose keypoints onto a canvas
 */
const color = 'lime';
const boundingBoxColor = 'red';
const lineWidth = 2;

function drawPoint(ctx, y, x, r, color) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
}

function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
    ctx.beginPath();
    ctx.moveTo(ax * scale, ay * scale);
    ctx.lineTo(bx * scale, by * scale);
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
}

function toTuple({y, x}) {
    return [y, x];
}

function drawSkeleton(keypoints, minConfidence, ctx, scale = 1) {
    const adjacentKeyPoints = posenet.getAdjacentKeyPoints(keypoints, minConfidence);
    adjacentKeyPoints.forEach((keypoints) => {
        drawSegment(toTuple(keypoints[0].position), toTuple(keypoints[1].position), color, scale, ctx);
    });
}

function drawKeypoints(keypoints, minConfidence, ctx, scale = 1) {
    for (let i = 0; i < keypoints.length; i++) {
        const keypoint = keypoints[i];
        if (keypoint.score < minConfidence) {
            continue;
        }
        const {y, x} = keypoint.position;
        drawPoint(ctx, y * scale, x * scale, 3, color);
    }
}

function printStatus(text, devId = 'status') {
    document.getElementById(devId).innerHTML = text;
}

/**
 * Loads a the camera to be used in the demo
 */
async function setupCamera() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser API navigator.mediaDevices.getUserMedia not available');
    }
    const video = document.getElementById('video');
    video.width = videoWidth;
    video.height = videoHeight;

    const mobile = isMobile();
    const stream = await navigator.mediaDevices.getUserMedia({
        'audio': false,
        'video': {
            facingMode: 'user',
            width: mobile ? undefined : videoWidth,
            height: mobile ? undefined : videoHeight,
        },
    });
    video.srcObject = stream;
    video.style.display = "none"; // hide poster

    return new Promise((resolve) => {
        video.onloadedmetadata = () => {
            resolve(video);
        };
    });
}

/**
 * Sets up dat.gui controller on the top-right of the window
 */
function setupGui(cameras, net) {
    guiState.net = net;

    if (cameras.length > 0) {
        guiState.camera = cameras[0].deviceId;
    }
}

/**
 * Feeds an image to posenet to estimate poses - this is where the magic happens.
 * This function loops with a requestAnimationFrame method.
 */
function detectPoseInRealTime(video, net, analyzer) {
    const canvas = document.getElementById('output');
    const ctx = canvas.getContext('2d');

    // since images are being fed from a webcam,
    // we want to feed in the original image and
    // then just flip the keypoints' x coordinates.
    // If instead we flip the image,
    // then correcting left-right keypoint pairs requires a permutation on all the keypoints.
    const flipPoseHorizontal = true;

    canvas.width = videoWidth;
    canvas.height = videoHeight;

    async function poseDetectionFrame() {
        if (guiState.changeToArchitecture) {
            // Important to purge variables and free up GPU memory
            guiState.net.dispose();
            guiState.net = await posenet.load({
                architecture: guiState.changeToArchitecture,
                outputStride: guiState.outputStride,
                inputResolution: guiState.inputResolution,
                multiplier: guiState.multiplier,
            });
            guiState.architecture = guiState.changeToArchitecture;
            guiState.changeToArchitecture = null;
        }

        if (guiState.changeToMultiplier) {
            guiState.net.dispose();
            guiState.net = await posenet.load({
                architecture: guiState.architecture,
                outputStride: guiState.outputStride,
                inputResolution: guiState.inputResolution,
                multiplier: +guiState.changeToMultiplier,
                quantBytes: guiState.quantBytes
            });
            guiState.multiplier = +guiState.changeToMultiplier;
            guiState.changeToMultiplier = null;
        }

        if (guiState.changeToOutputStride) {
            // Important to purge variables and free up GPU memory
            guiState.net.dispose();
            guiState.net = await posenet.load({
                architecture: guiState.architecture,
                outputStride: +guiState.changeToOutputStride,
                inputResolution: guiState.inputResolution,
                multiplier: guiState.multiplier,
                quantBytes: guiState.quantBytes
            });
            guiState.outputStride = +guiState.changeToOutputStride;
            guiState.changeToOutputStride = null;
        }

        if (guiState.changeToInputResolution) {
            // Important to purge variables and free up GPU memory
            guiState.net.dispose();
            guiState.net = await posenet.load({
                architecture: guiState.architecture,
                outputStride: guiState.outputStride,
                inputResolution: +guiState.changeToInputResolution,
                multiplier: guiState.multiplier,
                quantBytes: guiState.quantBytes
            });
            guiState.inputResolution = +guiState.changeToInputResolution;
            guiState.changeToInputResolution = null;
        }

        if (guiState.changeToQuantBytes) {
            // Important to purge variables and free up GPU memory
            guiState.net.dispose();
            guiState.net = await posenet.load({
                architecture: guiState.architecture,
                outputStride: guiState.outputStride,
                inputResolution: guiState.inputResolution,
                multiplier: guiState.multiplier,
                quantBytes: guiState.changeToQuantBytes
            });
            guiState.quantBytes = guiState.changeToQuantBytes;
            guiState.changeToQuantBytes = null;
        }

        let poses = [];
        let minPoseConfidence;
        let minPartConfidence;
        switch (guiState.algorithm) {
          case 'single-pose':
            const pose = await guiState.net.estimatePoses(video, {
              flipHorizontal: flipPoseHorizontal,
              decodingMethod: 'single-person'
            });
            poses = poses.concat(pose);
            minPoseConfidence = +guiState.singlePoseDetection.minPoseConfidence;
            minPartConfidence = +guiState.singlePoseDetection.minPartConfidence;
            break;
          case 'multi-pose':
            let all_poses = await guiState.net.estimatePoses(video, {
              flipHorizontal: flipPoseHorizontal,
              decodingMethod: 'multi-person',
              maxDetections: guiState.multiPoseDetection.maxPoseDetections,
              scoreThreshold: guiState.multiPoseDetection.minPartConfidence,
              nmsRadius: guiState.multiPoseDetection.nmsRadius
            });

            poses = poses.concat(all_poses);
            minPoseConfidence = +guiState.multiPoseDetection.minPoseConfidence;
            minPartConfidence = +guiState.multiPoseDetection.minPartConfidence;
            break;
        }

        ctx.clearRect(0, 0, videoWidth, videoHeight);

        if (guiState.output.showVideo) {
            ctx.save();
            ctx.scale(-1, 1);
            ctx.translate(-videoWidth, 0);
            ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
            ctx.restore();
        }

        // For each pose (i.e. person) detected in an image, loop through the poses
        // and draw the resulting skeleton and keypoints if over certain confidence scores
        poses.forEach(({score, keypoints}) => {
            analyzer.analyzePose(keypoints);
            if (score >= minPoseConfidence) {
                if (guiState.output.showPoints) {
                    drawKeypoints(keypoints, minPartConfidence, ctx);
                }
                if (guiState.output.showSkeleton) {
                    drawSkeleton(keypoints, minPartConfidence, ctx);
                }
                if (guiState.output.showBoundingBox) {
                    drawBoundingBox(keypoints, ctx);
                }
            }
        });

        requestAnimationFrame(poseDetectionFrame);
    }

    poseDetectionFrame();
}

/**
 * Kicks off the demo by loading the posenet model,
 *  finding and loading available camera devices,
 *  and setting off the detectPoseInRealTime function.
 */
async function bindPage(analyzer) {
    // get windows size
    const obj = document.getElementById("video");
    videoWidth = obj.getBoundingClientRect().width;
    videoHeight = obj.getBoundingClientRect().height;
    // main process
    text2speech(analyzer.start_message + " Please allow camera and wait while until camera is ready.");
    const net = await posenet.load({
        architecture: guiState.input.architecture,
        outputStride: guiState.input.outputStride,
        inputResolution: guiState.input.inputResolution,
        multiplier: guiState.input.multiplier,
        quantBytes: guiState.input.quantBytes
    });

    let video;

    try {
        video = await setupCamera();
        video.play();
    } catch (e) {
        text2speech('This browser does not support video capture, or this device does not have a camera');
        throw e;
    }

    setupGui([], net);
    text2speech("Camera started");
    detectPoseInRealTime(video, net, analyzer);
}
function toggleDebug() {
    guiState.output.showPoints = ! guiState.output.showPoints ;
    // do not draw guiState.output.showSkeleton = true;
}

navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
