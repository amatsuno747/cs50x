/*
 * Class for check walking safety
 *  Copyright © 2021 Matsuno. All rights reserved.
 */

class WalkSmartphone {
    constructor(type) {
        this._threshold_conf = 0.1;
        this._threshold_AwayTime = 3000; // ms
        this._threshold_AwayNum = 0.5; // 50%
        this._listState = [];
        this._speechOnce = false;
        this.start_message = "Detection of smartphone while walking started.";
    }
    checkState(state = "Unknown") {
        /* first guidance */
        if (this._listState.length == 0) {
            text2speech("Hallo!.");
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
    }
    is_wrist_in_body_area(w, rs, ls, rh, lh) {
        console.log("is_wrist_in_body_area(x): " + w.x + "," + rs.x + "," + ls.x + "," + rh.x + "," + lh.x);
        console.log("is_wrist_in_body_area(y): " + w.y + "," + rs.y + "," + ls.y + "," + rh.y + "," + lh.y);
        return (ls.x < w.x) && (w.x < rs.x) && // (rh.x < w.x) && (w.x < lh.x) &&
               (ls.y < w.y) && (w.y < lh.y) && (rs.y < w.y) && (w.y < rh.y) ;
    }
    analyzePose(keypoints) {
        /* convert data structure */
        let obj = array2obj_keypoints(keypoints);

        /* check confidence for all parts needed to analyze */
        let conf = {};
        for (let key of ["leftShoulder", "rightShoulder", "leftWrist", "rightWrist", "leftHip", "rightHip",]){
           conf[key] = (obj[key].score >= this._threshold_conf);
        }
        /* check sholders and hips */
        if (conf.leftShoulder && conf.rightShoulder && conf.leftHip && conf.rightHip) { // All OK
            /* check right wrist */
            if (conf.rightWrist && this.is_wrist_in_body_area(obj.rightWrist.position,
              obj.rightShoulder.position, obj.leftShoulder.position,
              obj.rightHip.position, obj.leftHip.position)) {
                this.checkState("Look Away Right");
            } else
            /* check left wrist */
            if (conf.leftWrist && this.is_wrist_in_body_area(obj.leftWrist.position,
              obj.rightShoulder.position, obj.leftShoulder.position,
              obj.rightHip.position, obj.leftHip.position)) {
                this.checkState("Look Away Left");
            } else {
                /* check seems be OK */
                this.checkState();
            }
        }
    }
}

/* class instance */
var analyze_walk_smartphone = new WalkSmartphone();
