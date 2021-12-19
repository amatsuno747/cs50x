# Human Activity Recognition for Safety Support
#### Video Demo:  https://amatsuno747.github.io/cs50x/final_project/
#### Description:
This is CS50x final project.

Target is contributes to solving social problems, such as traffic accidents by using the latest AI technology.

So I developed the software that have the feature to detecting look away while driving, and others.  

## Features
This app detects the activity of a person from the image of the person captured by the camera and announces a warning when the movement is unsafe.  

### Detects looking away
##### Look away while driving
 Detect face keypoints (nose, eyes, ears) from captured images.  
 Check face direction (right or left),and determines that it is unsafe if the face looks to the right or left.  

##### Look away with smartphone
 Detect body keypoints (wrists, elbows, shoulders) from captured images.  
 Check if wrist is inside body and determines it is unsafe.  
 
#### Announces attention while ‘Look away’ detected
 Sounds warning text from the speaker on device.  
 Shows warning text on the display to check if the keypoints information of the person has been extracted.  

#### Display for debug (option)
 Draws point on the keypoints


## Architecture
 This app excecute following process to realize functions.
#### Capture image via camera.
 Capture a portrait image through the device's camera.
 If the device has multiple cameras (front and back), use the front(human side) camera.
#### Get keypoints data of person from captured image.
 Get keypoints data from image by using Human Pose Estimation software.  
 I use Google tensorflow, and It's Human Pose Estimation model to do this process.
#### Analyze activity of person.
 Calculate or judge the value of gotten keypoints data of person,
 determine the face looks to the right or the left.
#### Output result.
 Output the warinig announce to sound interface of the device, such as "Don't look away".  


## Implementation
### Implement as Web App.
 I implemented the features as Web App. The reason is as follows.
 The prediction of deep learning requires a lot of computing power, however even smartphones have a GPU and can be used with WebGL.
 It is easy to install. No installation procedure, just open page in Browser.
 It is also easy to implement the responsive design.

### Use 3rdparty software
 To realize above feature,
 I use the AI technology such as Deep learning framework Tensorflow and Human pose estimation models.  


## Test and evaluation
 I tested this software on iPone, iPad, Mac Book and Windows PC.

#### PC Intel(R) Core(TM) i3-3120M CPU @ 2.50GHz 2.50 Chrome web browser
#### iPhone SE 1G, Safari web browser
#### iPhone 7, Safari web browser
#### iPad Mini 2G, Safari web browser
#### MacBook Pro 2020 M1, Google Chrome browser


## Resources
### Codes
 https://github.com/amatsuno747/cs50x/tree/main/final_project

#### README.md
 This file.
#### index.html, poster.png, styles.css
 Web page HTML/image/CSS files of this App.
#### pose_detection.js
 Capture image, get person keypoints data, draw keypoints while debug On, call analyze function.
#### analyze_look_away.js
 Analyze person keypoints data and determin the person look away while driving.
#### analyze_walk_smartphone.js
 Analyze person keypoints data and determin the person look away at smartphone.


### Demo
 https://amatsuno747.github.io/cs50x/final_project/  

 Open above URL.
 Select function from menu.
#### Look away 
 Start 'Look Away' function execution.

#### Look Away at Phone
 Start 'Look Away at Phone' function execution.

#### Stop
 Stop above function execution.

#### Debug On / Off
 Toggles whether to display keypoints information for software debugging.

## 3rtpaty resouces.
icon:
 https://www.silhouette-illust.com/policy
 https://www.silhouette-illust.com/illust/46478

EOT
