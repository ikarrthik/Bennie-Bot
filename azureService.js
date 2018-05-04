const msRestAzure = require('ms-rest-azure');
const cognitiveServicesManagementClient = require('azure-arm-cognitiveservices');
const fs = require('fs');
const request = require('request');
const Promise = require('promise');
const requestPromise = require("request-promise")
const https = require('https');

const subscriptionId = '105a215562904fcfbc2e53687805b52c';

var audioLocation = 'file.wav';

var enrollProfile = function(audioBlob) {

  console.log("Entering enrollProfile function");
  console.log("audioBlob:" + audioBlob);
  return new Promise(function(resolve, reject) {
    var stream = fs.createReadStream(audioBlob);
    var enroll = {
      method: 'POST',
      url: 'https://westus.api.cognitive.microsoft.com/spid/v1.0/identificationProfiles/af5c08b8-2bc3-4bce-b3d7-b8055c6dbb74/enroll',
      qs: {
        shortAudio: 'true'
      },
      headers: {
        'Ocp-Apim-Subscription-Key': '105a215562904fcfbc2e53687805b52c',
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
      },
      formData: {
        BinaryData: {
          value: stream,
          options: {
            filename: 'dummy.wav',
            contentType: null
          }
        }
      }
    };

    //  console.log(typeof options.formData.BinaryData.value);
    request(enroll, function(error, response, body) {
      console.log("success" + response);
      if (error) throw new Error(error);
      console.log(response.headers['operation-location']);
      //console.log("id:" + id);
    });
    console.log("Exiting enrollProfile function");
  });
}

var authenticateProfile = function(audio) {

  return new Promise((resolve, reject) => {
    console.log("audio:" + audio);
    var id = null;
    var authenticate = {
      method: 'POST',
      url: 'https://westus.api.cognitive.microsoft.com/spid/v1.0/identify',
      qs: {
        identificationProfileIds: 'af5c08b8-2bc3-4bce-b3d7-b8055c6dbb74',
        shortAudio: 'true'
      },
      headers: {
        'Ocp-Apim-Subscription-Key': '105a215562904fcfbc2e53687805b52c',
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
      },
      formData: {
        BinaryData: {
          value: fs.createReadStream(audio),
          options: {
            filename: 'file.wav'

          }
        }
      }
    };

    request(authenticate, function(error, response, body) {

      //  console.log("res:"+JSON.stringify(response));
      if (error) throw new Error(error);

      var operationStatus = response.headers['operation-location'];
      console.log("operationStatus:" + response.headers['operation-location'])
      var slash = operationStatus.lastIndexOf("/");
      id = operationStatus.substring(slash + 1, operationStatus.length);
      console.log('Response got ...');
      console.log("id:" + id);
      resolve(id);

    });
  });
}

var operationStatus = function(id) {

  return new Promise((resolve , reject) => {
    console.log("operationnnn");
    var options = {
      method: 'GET',
      url: 'https://westus.api.cognitive.microsoft.com/spid/v1.0/operations/' + id,
      //qs: id,
      headers: {
        'Ocp-Apim-Subscription-Key': '105a215562904fcfbc2e53687805b52c'
      }
    };
    //console.log("options:" + options);
    request(options, function(error, response, body) {
      if (error) throw new Error(error);
      console.log("response:" + body);
      resolve(body);
    });
  });
}



// working well
var convertWav = function(id) {

  return new Promise((resolve, reject) => {

    console.log("Inisde ConvertWav ...");
    console.log("iiii++" + id);
    var audioBlob = fs.createWriteStream("file.wav");

    var url = 'https://s21.aconvert.com/convert/p3r68-cdx67/' + id;
    console.log('URL : ' + url);
    var request2 = https.get(url, function(response) {
      response.pipe(audioBlob);
      console.log("convert wav");
      resolve(audioLocation);
    });
  }); // end promise

}

// 1. call authenticateProfile after convertWAV

var getFormattedAudio = function() {

  return new Promise((resolve, reject) => {
    var options = {
      method: 'POST',
      url: 'https://s21.aconvert.com/convert/convert-batch.php',
      headers: {
        'content-type': 'multipart/form-data; boundary=----WebKitFormBoundary7MA4YWxkTrZu0gW'
      },
      formData: {
        file: {
          value: fs.createReadStream('/Users/karthikil/Downloads/bennie.wav'),
          options: {
            filename: 'dummy.wav',
            contentType: null
          }
        },
        targetformat: 'wav',
        customaudiosampling: '16000',
        audiosamplingtype: '1',
        customaudiobitrate: '1'
      }
    };

    request(options, function(error, response, body) {
      if (error) throw new Error(error);

      var respBody = JSON.parse(body);
      console.log("RP:" + respBody.filename);
      var id = respBody.filename;
      console.log("resppppppppppp:"+JSON.stringify(body));
      // console.log("body"+body.filename);
      // console.log("response"+JSON.stringify(response));
      // console.log("resp:"+body)
      resolve(id);
    });
  });
}

//Promises
var resp = null;
var azureServ = function() {
  return new Promise((resolve ,reject) => {
    getFormattedAudio().then((response) => {
      convertWav(response).then((response) => {
        setTimeout(() => {
          authenticateProfile(response).then((res) => {
            console.log("id 1111111");
            console.log(res);
            setTimeout(() => {
              operationStatus(res).then((res) => {
                resolve(res);
              });
            }, 2000);
          });
        }, 7000);
      });
    });
  });
}
//azureServ();
exports.enrollProfile = enrollProfile;
exports.azureServ = azureServ;
