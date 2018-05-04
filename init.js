'use strict';

require("require.async")(require);
const azureService = require('./azureService');


var ben, ConversationV1;
var actions, fs, say, record, request, speech;
var _speaking = false;
// var Player = require('player');
var player = require('play-sound')({});
var HashMap = require('hashmap');


var map = new HashMap();
map.set('af5c08b8-2bc3-4bce-b3d7-b8055c6dbb74','Abhinav');

ben = require('./speechModules/bennie');
ConversationV1 = require('watson-developer-cloud/conversation/v1');


fs = require('fs');

say = require('say');

record = require('node-record-lpcm16');

request = require('request');

speech = require('@google-cloud/speech');

// Creates a recognizer to communicate with Google Cloud
// for voice to text conversion
//
// Uses Credentials from keyfile.json
const recognizer = new speech.SpeechClient({
    projectId: 'streaming-speech-sample',
    keyFilename: 'keyfile.json'
});

// Hotword with Trained Model
const hotwords = [{
        file: './resources/Ben.pmdl',
        hotword: 'ben'
    }];

// Voice Language
const language = "en-US";

// Initializing ben with Options and Receognizer
const benObj = ben.init({
    hotwords,
    language,
    recordProgram: "rec"
}, recognizer);

ben.start(benObj);


console.log('Say "' + hotwords[0].hotword + '"...');

// On hotword detection
benObj.on('hotword', function (index, keyword) {


    console.log("########################");
    console.log("Hotword detected => " + keyword);
    console.log("########################");
    console.log("Starts Listening...");

    try {
      player.play('bennie.mp3', function(err) {
        if (err)
          console.log(err);
      });

    } catch (e) {}
  });



benObj.on('final-result', result => {

    console.log("###############\n Final detection => ", result, "\n###############");

    if (result.includes("stop")) {
        ben.stop(benObj);

    } else {
        // Watson Analyze
        console.log("else Part");
        process(result);
    }
});

// Analyze Watson Responces for output text
async function analyzeWatsonResponse(err, data) {
    console.log("Error => " + err);
    console.log("Watson Response => " + JSON.stringify(data));

    console.log("intents matched");

    console.log(data.intents[0].intent);

    if(data.intents[0].intent.includes("Profile_Password")){

      await sayThis("Thanks for Calling. I am recognizing your voice! Please wait for few seconds", "");


        azureService.azureServ().then((res) => {
          console.log("azureResponse:::::::"+res);
          console.log("Response ended!!");
          var response = JSON.parse(res);
          console.log("Confidence level "+response.processingResult);
          if(response.processingResult.confidence == 'High'){
              console.log("CONFIENCE:::::::"+response.processingResult.confidence);
            var profileId = response.processingResult.identifiedProfileId;
            var userName = map.get(profileId);
           sayThis("Hello "+userName+" Thanks for calling us.We will email you the steps to reset the password","");
          }else{
           sayThis("Sorry You are not registered in this service. Register to use this service","");
          }
        });

          setTimeout(() => {
            try {
                player.play('customerCare.mp3', function(err) {
                  if (err)
                    console.log(err);
                });

              } catch (e) {}
            }, 2000);


    }  else if(data.intents[0].intent.includes("Greeting")){
        await sayThis("How are you Karthik! ", "");
      } else if(data.intents[0].intent.includes("Thanks")){
          await sayThis("Happy to help!", "");
        }else if(data.intents[0].intent.includes("Fine")){
            await sayThis("Happy to hear that!", "");
          }  else if (data.intents[0].intent.includes("Pay")){
        await sayThis("Hey Abhinav ! Your Payment is successful and your current balance is 550 dollars");
      }

}
;

// Speak out the given text to user and
// calls the next function
async function sayThis(text, next) {

    console.log("Saying,.. => " + text);
    var start = new Date().getTime();
    ben.pause(benObj);
    await sayThisInternal(text, next);
    console.log("sayThis resolved");
}

function timeout() {
    return new Promise(function (resolve) {
        setTimeout(resolve, 3000);
    });
}

async function sayThisInternal(text, next) {
    // return new Promise(resolve => {
    if (text !== undefined && text.length > 0) {
        say.speak(text, 'Veena', 1.0, function (err) {
            if (err) {
                console.log(err);
            }

        });
        await timeout();
    }
    ben.start(benObj);
    console.log("after timeout..!");

}

/**
 * Process text with Watson Conversation
 * @param {*} result
 */
async function process(result) {
    console.log("Submitted for Watson Processing => " + result);
    var conversation = new ConversationV1({
      "username": "d120fcf5-a776-4522-b5f1-647307bc5820",
      "password": "4FmAOcf7qrzg",
        "path": {
            workspace_id: "3049e756-ead0-4a28-b979-537ab5cf85ad"
        },
        "version_date": '2016-07-11'
    });

    conversation.message({
        input: {
            "text": result
        }
    }, analyzeWatsonResponse);

}

/**
 * Sendinf Data to NodeRED
 * @param {*} payload
 */
async function sendHTTPRequest(payload) {
    return new Promise(resolve => {
        console.log(JSON.stringify(payload));
        request('https://sirius-ben.mybluemix.net/import?q=' + JSON.stringify(payload), (err, res, body) => {
            if (err) {
                console.log(err);
                resolve({});
            }
            resolve(JSON.parse(body));
        });
    });
}
