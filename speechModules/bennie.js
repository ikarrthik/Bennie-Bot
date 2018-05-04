'use strict';

const record = require('node-record-lpcm16');
const stream = require('stream');
const {Detector, Models} = require('snowboy');
var  count = 0;
const ERROR = {
    NOT_STARTED: "NOT_STARTED",
    INVALID_INDEX: "INVALID_INDEX"
};

const CloudSpeechRecognizer = {};
CloudSpeechRecognizer.init = recognizer => {
    const cloudSpeechRecognizer = new stream.Writable();
    cloudSpeechRecognizer.listening = false;
    cloudSpeechRecognizer.recognizer = recognizer;
    return cloudSpeechRecognizer;
};

// Starts after hotword detection
CloudSpeechRecognizer.startStreaming = (options, audioStream, cloudSpeechRecognizer) => {

    if (cloudSpeechRecognizer.listening) {
        return;
    }

    console.log("Streaming & Recognition Started,...");

    cloudSpeechRecognizer.listening = true;

    const recognizer = cloudSpeechRecognizer.recognizer;
    const recognitionStream = recognizer.streamingRecognize({
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: options.language,
            speechContexts: options.speechContexts || null
        },
        singleUtterance: false,
        interimResults: true,
        verbose: true
    });

    recognitionStream.on('error', err => cloudSpeechRecognizer.emit('error', err));

    recognitionStream.on('data', data => {
        console.log("Data @ recognitionStream data");
        console.log(data);



        if (data) {
            // Sending Recorded data to cloudSpeechRecognizer
            cloudSpeechRecognizer.emit('data', data, audioStream, recognitionStream);

            if (data.speechEventType === 'END_OF_SINGLE_UTTERANCE') {
                cloudSpeechRecognizer.listening = false;
                audioStream.unpipe(recognitionStream);
                recognitionStream.end();
            }
        }
    });

    audioStream.pipe(recognitionStream);
};

const ben = {};

ben.init = (options, recognizer) => {

  console.log("Initialize ben ------- ");
    // don't mutate options
    const opts = Object.assign({}, options),
            models = new Models(),
            benObj = new stream.Writable(),
            cloudSpeechRecognizer = CloudSpeechRecognizer.init(recognizer);
    benObj.mic = {};
    benObj.recordProgram = opts.recordProgram;
    benObj.device = opts.device;
    benObj.started = false;

    opts.hotwords = opts.hotwords || [1];
    opts.hotwords.forEach(model => {
        models.add({
            file: model.file || 'node_modules/snowboy/resources/snowboy.umdl',
            sensitivity: model.sensitivity || '0.5',
            hotwords: model.hotword || 'default'
        });
    });

    opts.models = models;
    opts.resource = opts.resource || 'node_modules/snowboy/resources/common.res';
    opts.audioGain = opts.audioGain || 2.0;
    opts.language = opts.language || 'en-US'; //https://cloud.google.com/speech/docs/languages

    const detector = benObj.detector = new Detector(opts);

    detector.on('silence', () => {
//        console.info('Silence Detected ');
        benObj.emit('silence');
    });
    detector.on('sound', () => {
        console.info('Sound Detected ');
        benObj.emit('sound');
    });

    // When a hotword is detected pipe the audio stream to speech detection
    detector.on('hotword', (index, hotword) => {
        console.log("########################");
        console.info("Hotword Detected, triggering");
        benObj.trigger(index, hotword);
    });

    cloudSpeechRecognizer.on('error', function (error) {
        console.log("CloudSpeechRecognizer Error => " + error);
    });


    let transcriptEmpty = true;
    cloudSpeechRecognizer.on('data', ( data, audioStream, recognitionStream ) => {
        // ocnsole.log("Recorded data in cloudSpeechRecognizer => " + JSON.stringify(data));
        const result = data.results.length > 0 ? data.results[0] : "";
        if (result) {
            transcriptEmpty = false;
            if (result.isFinal) {
                benObj.emit('final-result', result.alternatives[0].transcript);


                console.log("Streaming & Recognition Stopped");
                // Code to STOP the streamingRecognize
                cloudSpeechRecognizer.listening = false;
                audioStream.unpipe(recognitionStream);
                recognitionStream.end();



                transcriptEmpty = true; //reset transcript
            } else {
                benObj.emit('partial-result', result.alternatives[0].transcript);
            }
        } else if (data.speechEventType === 'END_OF_SINGLE_UTTERANCE' && transcriptEmpty) {
            benObj.emit('final-result', "");
            cloudSpeechRecognizer.end();
        }
    });

    benObj.trigger = (index, hotword) => {
        if (benObj.started) {
            try {
                 let triggerHotword = (index === 0) ? hotword : models.lookup(index);
                 benObj.emit('hotword', index, triggerHotword);
                // Starts Listening...
                console.log("Initializing CloudSpeechRecognizer Streaming....");

                CloudSpeechRecognizer.startStreaming(opts, benObj.mic, cloudSpeechRecognizer);
            } catch (e) {
                throw ERROR.INVALID_INDEX;
            }
        } else {
            throw ERROR.NOT_STARTED;
        }
    };


    return benObj;
};

ben.start = benObj => {
    console.log("ben Init,...");
    benObj.mic = record.start({
        // Other options, see https://www.npmjs.com/package/node-record-lpcm16#options
//        silence: '3.0', // In Seconds
        threshold: 0,
        device: benObj.device || null,
        recordProgram: benObj.recordProgram || "rec",
        verbose: false
    });


    if(count==0){
    console.log("counter varaible"+count)
    var fs = require('fs')
    //Write the stream into pipe
    console.log("Writing into the stream - ben");
    var file = fs.createWriteStream('test'+count+'.wav', { encoding: 'binary' })
    benObj.mic.pipe(file)
    count = count+1;
  }

    benObj.mic.pipe(benObj.detector);
    benObj.started = true;
    console.log("ben Started");
};

ben.trigger = (benObj, index, hotword) => benObj.trigger(index, hotword);

//ben.pause = (benObj) => benObj.mic.pause();
ben.pause = function (benObj) {
    console.log("Mic Paused");
    benObj.mic.pause();
//    record.pause();
};

//ben.resume = (benObj) => benObj.mic.resume();
ben.resume = function (benObj) {
    console.log("Mic Resumed");
    benObj.mic.resume();
//    record.resume();
};

ben.stop = () => record.stop();

module.exports = ben;
