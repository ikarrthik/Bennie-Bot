/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */
say = require('say');
var player = require('play-sound')(opts = {});
var record = require("node-record-lpcm16");
var fs = require("fs");


var text =
        "Okay. Now, I am ready to listen."
//"There is a conflict, in your schedule for the specified time by you. We might need to push this little later. "
//"Meeting is added to your profile."
//"Can you describe its symptoms?"
//"What was the treatment you used?"
//"What were the drugs, or exercises, that you incorporated in the process?"
//"Thank you Doc! The medical details you provided are captured for future reference."
//"The treatment is, you have to admit immediately, in to the nearby hospital and, take nasal oxygen to alleviate the pain. The immediate first aid is, you can lean against a wall with knees bent and, head and shoulders supported."
//
//
//
//
//"Okay, I am Ready to Listen"
//        "Can you describe its symptoms"
//    "What was the treatment you used"
//    "What were the drugs, or exercises, that you incorporated in the process?"
//    "thank you Doc! The medical details you provided are captured for future reference"
//    "Hey, That's Cool"
//"there is a conflict, in your schedule for the specified time by you. We might need to push this little later"
//"Meeting is added to your profile"

        ;


var file = fs.createWriteStream('audios/' + text.replace(/[^A-z]+/g, '_') + '.wav', {
    encoding: 'binary'
});

// Record the conversation
// and write to file
record.start({
    // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
    silence: '2.0', // In Seconds
    sampleRate: 44100,
    verbose: true
}).pipe(file);


setTimeout(function () {
    say.speak(text, 'Alex', 1.0, function (err) {
        if (err) {
            console.log(err);
        }
    });
}, 1000);

file.on('finish', function () {
    console.log("Recording completed");
});
