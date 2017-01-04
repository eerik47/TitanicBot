
var myAppId = process.env.MY_APP_ID || "Missing your app ID";
var myAppSecret = process.env.MY_APP_SECRET || "Missing your app secret";

var builder = require('botbuilder');
var restify = require('restify');
var http = require("http");
var https = require("https");
var querystring = require("querystring");
var fs = require("fs");

global.ScoredLabels;
global.ScoredLabels = 0;
global.ScoredProbabilities;
global.ScoredProbabilities = 0;

//var connector = new builder.ChatConnector();

// deployment to Azure
var connector = new builder.ChatConnector({
    appId: process.env.MY_APP_ID,
    appPassword: process.env.MY_APP_SECRET
});

var bot = new builder.UniversalBot(connector); 


//Root Dialog
bot.dialog('/', [
    function (session) 
    {
        session.send('Ahoj, jsem "inteligentní" bot a umím predikovat zda přežiješ na Titanicu!');
        builder.Prompts.choice(session, "Chceš si mne vyzkoušet?", ["Ano", "Ne"], {listStyle: builder.ListStyle.button});
     },
    
    function (session, results) 
    {
        session.userData.askTest = results.response.entity;
        
        if (session.userData.askTest == 'Ano' )
        {
            session.send('Super, tak pojď do toho!'); 
        }
        else
        {
            session.send('Neboj se a zkus to!'); 
        }    
        
        session.beginDialog('/askMan');  
    },
    
    function (session, results) 
    {
        session.userData.askMan = results.response.entity;
        
        if (session.userData.askMan == 'Muž' )
        {
            session.userData.askManAML = 'male';

        }
        else
        {
            session.userData.askManAML = 'female'; 
        }    

        session.beginDialog('/askAge');
    },
    
    function (session, results) 
    {
        session.userData.askAge = results.response;
        session.beginDialog('/askSpouse');
    },
    
    function (session, results) 
    {
        session.userData.askSpouse = results.response;
        session.beginDialog('/askParent');
    },
    
    function (session, results) 
    {
        session.userData.askParent = results.response;
        session.beginDialog('/askClass');
    },
    
    function (session, results) 
    {
        session.userData.askClass = results.response.entity;

        if (session.userData.askClass == '1. třída' )
        {
            session.userData.askClassAML = '1';
        }
        else if (session.userData.askClass == '2. třída' )
        {
            session.userData.askClassAML = '2';
        }
        else
        {
            session.userData.askClassAML = '3'; 
        }

        session.beginDialog('/askTicket');
    },
    
    function (session, results) 
    {
        session.userData.askTicket = results.response;
        session.beginDialog('/askPort');
    },
    
    function (session, results) 
    {
        
        session.userData.askPort = results.response.entity;

        if (session.userData.askPort == 'Cherbourg' )
        {
            session.userData.askPortAML = 'C';
        }
        else if (session.userData.askPort == 'Queenstown' )
        {
            session.userData.askPortAML = 'Q';
        }
        else
        {
            session.userData.askPortAML = 'S'; 
        }

        var mydata = buildFeatureInput(  session.userData.askClassAML, 
                            session.userData.askManAML, 
                            session.userData.askAge, 
                            session.userData.askSpouse, 
                            session.userData.askParent, 
                            session.userData.askTicket, 
                            session.userData.askPortAML);

var dataString = JSON.stringify(mydata);
var host = "asiasoutheast.services.azureml.net";
var path = "/workspaces/1dbb620c1fc34234bc51b22db6574502/services/a2db1e53ccff4666b0a8c45077d49eea/execute?api-version=2.0&details=true";
var method = "POST";
var api_key = process.env.AMLAPIKEY;

var headers = {'Content-Type':'application/json', 'Authorization':'Bearer ' + api_key};
 
var options = {
host: host,
port: 443,
path: path,
method: 'POST',
headers: headers,
async: false
};
 

var d="";
 
var reqPost = https.request(options, function (res) 
{
    //console.log('===reqPost()===');
    //console.log('StatusCode: ', res.statusCode);
    //console.log('headers: ', res.headers);
 
    res.on('data', function(dtx) 
    {
        d += dtx;
    })
    res.on('end', function() 
    {
        process.stdout.write(d);
        // AML JSON parsing
        var obj = JSON.parse(d);
        //console.log(obj.Results.output1.value.Values[0]);
        var recordAML = obj.Results.output1.value.Values[0];
        
        global.ScoredLabels = recordAML[0];
        global.ScoredProbabilities = recordAML[1];
        
        console.log("ScoredLabels: " + global.ScoredLabels);
        console.log("ScoredProbabilities: " + global.ScoredProbabilities);
        
        // if (global.ScoredLabels == 0)
        if (global.ScoredProbabilities < 0.5)
        {
            session.userData.AMLresult = "Je mi líto, bohužel nepřežiješ! (Pravděpodobnost přežití: " + global.ScoredProbabilities*100 + "%)" ;   
        }
        else
        {
            session.userData.AMLresult = "Gratuluji, na " + global.ScoredProbabilities*100 + "% přežiješ katastrofu na Titanicu!";
        }


        session.send(session.userData.AMLresult);


 /*       
        session.send(
                    "Parametry: " + 
                    " pohlaví: " + session.userData.askMan + 
                    " ,věk: " + session.userData.askAge + 
                    " ,rodina: " + session.userData.askSpouse + 
                    " ,rodiče: " + session.userData.askParent + 
                    " ,třída: " + session.userData.askClass +
                    " ,lístek: " + session.userData.askTicket +
                    " ,přístav: " + session.userData.askPort + 
                    " ,ScoredLabels: " + global.ScoredLabels +
                    " ,ScoredProbabilities: " + global.ScoredProbabilities + "."
                   );
*/
/*
        session.send(
                    "Pro AML: " +
                    " Pohlavi: " + session.userData.askManAML + 
                    " ,vek: " + session.userData.askAge + 
                    " ,rodina: " + session.userData.askSpouse + 
                    " ,rodice: " + session.userData.askParent + 
                    " ,trida: " + session.userData.askClassAML +
                    " ,listek: " + session.userData.askTicket +
                    " ,pristav: " + session.userData.askPortAML + "."
                   );
*/                   
    });
});

 
// Would need more parsing out of prediction from the result
reqPost.write(dataString);
reqPost.end();
reqPost.on('error', function(e){
console.error(e);
});

  
    }
]);
    

bot.dialog('/askMan', [
    function (session) {
        //Prompt for user input
       builder.Prompts.choice(session, "Jaké je tvoje pohlaví?", ["Muž", "Žena"], {listStyle: builder.ListStyle.button});
    }

]);

bot.dialog('/askAge', [
    function (session) {
        //Prompt for user input
        builder.Prompts.number(session, "Kolik Ti je let?");
    }
]); 

bot.dialog('/askSpouse', [
    function (session) {
        //Prompt for user input
        builder.Prompts.number(session, "Kolik dětí včetně partnera s tebou pojede?");
    }
]); 

bot.dialog('/askParent', [
    function (session) {
        //Prompt for user input
        builder.Prompts.number(session, "Kolik sourozenců včetně rodičů s tebou pojede?");
    }
]); 

bot.dialog('/askClass', [
    function (session) {
        //Prompt for user input
        builder.Prompts.choice(session, "Jakou třídou pojedeš?", ["1. třída", "2. třída", "3. třída"], {listStyle: builder.ListStyle.button});
    }
]); 

bot.dialog('/askTicket', [
    function (session) {
        //Prompt for user input
        builder.Prompts.number(session, "Kolik USD stály lístky na loď (v rozmezí $0-$512)?");
    }
]); 

bot.dialog('/askPort', [
    function (session) {
        //Prompt for user input
        builder.Prompts.choice(session, "Z jakého přístavu vyplouváš?", ["Cherbourg", "Queenstown", "Southampton"], {listStyle: builder.ListStyle.button});
    }
]); 



var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url); 
});
server.post('/api/messages', connector.listen());




//maml-server.js
function getPred(data) {
//console.log("===getPred()===");

 
};
 
//Could build feature inputs from web form or RDMS. This is the new data that needs to be passed to the web service.
function buildFeatureInput(Pclass, Sex, Age, SibSp, Parch, Fare, Embarked){
//console.log('===performRequest()===');
var data = {
"Inputs": {
"input1": {
"ColumnNames": ["Pclass", "Sex", "Age", "SibSp", "Parch", "Fare", "Embarked"],
"Values": [ [ Pclass, Sex, Age, SibSp, Parch, Fare, Embarked ], ]
},
},
"GlobalParameters": {}
}
return data;
};
  

function send404Reponse(response) {
response.writeHead(404, {"Context-Type": "text/plain"});
response.write("Error 404: Page not Found!");
response.end();
};
 
function onRequest(request, response) {
if(request.method == 'GET' && request.url == '/' ){
response.writeHead(200, {"Context-Type": "text/plain"});
fs.createReadStream("./index.html").pipe(response);
}else {
send404Reponse(response);
}
};
 

