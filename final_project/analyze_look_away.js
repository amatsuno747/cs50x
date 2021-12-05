/*
 * Class for check drive safety
 *  Copyright © 2021 Matsuno. All rights reserved.
 */

class LookAway {
    constructor(type) {
        this._threshold_conf = 0.1;
        this._ratio_eye_ear = 3.0;
        this._threshold_AwayTime = 1000; // ms
        this._threshold_AwayNum = 0.5; // 50%
        this._listState = [];
        this._speechOnce = false;
        this.start_message = "Detection of looking away while driving started.";
    }
    checkState(state = "Unknown") {
        /* first guidance */
        if (this._listState.length == 0) {
            text2speech("Please drive safely today as well.");
        }

        let now = performance.now();
        /* Clean up list */
        while (this._listState.length) {
            if (this._listState[0].timestamp < (now - this._threshold_AwayTime)) {
                this._listState.shift();
            } else {
                break;
            }
        }
        /* Push latest data */
        this._listState.push({timestamp: now, state: state});
        /* Check state */
        let list_count = this._listState.filter(data => data.state.substr(0,9) == "Look Away").length;
        if ((list_count / this._listState.length) > this._threshold_AwayNum) {
            if (!this._speechOnce) {
                text2speech("Please do not look away!");
                this._speechOnce = true;
            }
        } else {
            this._speechOnce = false;
            printStatus('Detecting... ^_^');
        }
        console.log("checkState: " + state + ", list_count: " + this._listState.length);
        if (guiState.output.showPoints) {
            printStatus("checkState: " + state + ", list_count: " + this._listState.length);
        }
    }
    analyzePose(keypoints) {
        /* convert data structure */
        let obj = array2obj_keypoints(keypoints);

        /* check confidence for all parts needed to analyze */
        let conf = {};
        for (let key of ["nose", "leftEye", "rightEye", "leftEar", "rightEar"]){
           conf[key] = (obj[key].score >= this._threshold_conf);
        }

        /* check */
        if (conf.rightEar && conf.rightEye && conf.nose && conf.leftEye && conf.leftEar) {
            this.checkState("Good"); /* All OK */
        } else if ((!conf.rightEar && conf.nose && conf.leftEye && conf.leftEar) /* Simple detection */
                   /* (!conf.rightEar && !conf.rightEye && conf.nose && conf.leftEye && conf.leftEar) ||
                   (conf.rightEye && conf.nose && conf.leftEye && conf.leftEar &&
                   (((obj.leftEar.position.x - obj.rightEye.position.x) /
                     (obj.leftEye.position.x - obj.rightEye.position.x)) > this._ratio_eye_ear))*/ ) {
            this.checkState("Look Away Right");
        } else if ((conf.rightEar && conf.rightEye && conf.nose && !conf.leftEar) /* Simple detection */
                   /*(conf.rightEar && conf.rightEye && conf.nose && !conf.leftEye && !conf.leftEar) ||
                   (conf.rightEar && conf.rightEye && conf.nose && conf.leftEye &&
                   (((obj.leftEye.position.x - obj.rightEar.position.x) /
                     (obj.leftEye.position.x - obj.rightEye.position.x)) > this._ratio_eye_ear))*/ ) {
            /* Look Away Left */
            this.checkState("Look Away Left");
        } else if (!conf.nose) {
            // this.checkState(); /* reset state */
        }
    }
}

/* class instance */
var analyze_look_away = new LookAway();
