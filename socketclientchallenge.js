'use strict';
/* 
* This is the node startup module and main app processing for a Node.js Socket Client Coding Challenge. The main app
* processing is very simple with all lower level functions provide by other app classes. Program flow is:
*   1. Create app class instances
*   2. Login to the app server
*   3. Respond to ui commands by making server requests and processing the returned data
*   4. On receiving a quit command or terminate callback from the ui, clean up and end the app
*/

/* Module imports */
const ChallengeConnection = require('./challengeconnection.js'); // app server connection class
const ChallengeUI = require('./challengeui.js'); // app ui class
const ChallengeLog = require('./challengelog.js'); // app logging class
/**********************************************************************/

// create class instances for the main app
const ui = new ChallengeUI(handleCmd, handleUIClose);
const conn = new ChallengeConnection(9432, '35.184.58.167');
const log = new ChallengeLog();

log.logMsg('*******************************Starting Node.js Socket Client Coding Challenge App*******************************');

// this function call enables all actual defined app functionality and is the only independent action taken by the 
// main app. All other app actions are taken in response to callbacks or promise resolutions from the other class
// instances of the app.
login();

function login() {
/* 
* Logs the app into the app server and if successful tells the user interface to start responding to user
* commands.
*/
/// <summary>Login to the app server</summary>  

    // login to the app server
    conn.login().then(response => {

        // if successful, tell the ui we're ready to process user commands
        if (response.err == null) {
            ui.showMsg(ui.MSG_CONNECTIONINFO, `${response.results.ip}:${response.results.port}`);
            ui.showMsg(ui.MSG_COMMANDS);
            ui.nextCmd();
        // otherwise let the user know there was a problem and let them retry if desired
        } else {
            ui.showLoginError(response.err, `${response.results.ip}:${response.results.port}`);
            ui.showRetryMsg().then(retry => {
                if (retry) {
                    login();
                } else {
                    cmdQuit();
                }
            });
        }
    }).catch(err => {
        // just note the error and give up if we got an error we couldn't handle
        ui.showLoginError(err, `${conn.connIp}:${conn.connPort}`);
    });

}

function handleCmd(cmd) {
/* 
* This is the callback routine from the ui class for when the user has entered something
* that appears to be a command. If it is a valid command, it is routed for appropriate processing,
* otherwise it is noted as an invalid command and we tell the ui to get us another command.
*/
/// <summary>Handle a user command from the user interface</summary>  
/// <param name="cmd" type="Object">JSON command info</param>  

    // commands are processed based on type
    switch (cmd.type) {

        // get cumulative request count command
        case ui.CMD_COUNT:
            cmdGetRequestCount();
            break;
    
        // get server time and random number command
        case ui.CMD_TIME:
            cmdGetTime();
            break;
    
        // quit command
        case ui.CMD_QUIT:
            cmdQuit();
            break;
    
        // handle unrecognized command types
        default:
            ui.showMsg(ui.MSG_INVALIDCMD, `cmdType=${cmd.type}`);
            ui.nextCmd();
            break;

    }

}

function handleUIClose() {
/* 
* This is the callback routine from the ui class for when the user has terminated the app through
* non-command mechanism (i.e. ctl-c).
*/
/// <summary>Handle ui terminate callback</summary>  

    // just redirect to standard quit command handling
    cmdQuit();

}

function cmdGetRequestCount() {
/* 
* Process the get cumulative request count command.
*/
/// <summary>Process a get cumulative request count command</summary>  

    // make the request to the server
    conn.getRequestCount().then(response => {
        // output the server response
        console.log(`Message Count: ${response.count}`);
        // get the next command from the ui
        ui.nextCmd();
    }).catch(err => {
        // inform the user of any error
        ui.showCmdError(err, ui.CMD_COUNT);
        // and get another command from the ui
        ui.nextCmd();
    });

}

function cmdGetTime() {
/* 
* Process the get server time and random number command.
*/
/// <summary>Process a get server time and random number command</summary>  

    // make the request to the server
    conn.getTime().then(response => {
        // output the server response
        console.log(`Server time: ${response.time}, number: ${response.number} is ${response.number <= 30 ? 'not ' : ''}greater than 30`);
        // get the next command from the ui
        ui.nextCmd();
    }).catch(err => {
        // inform the user of any error
        ui.showCmdError(err, ui.CMD_TIME);
        // and get another command from the ui
        ui.nextCmd();
    });

}

function cmdQuit() {
/* 
* Process the quit command.
*/
/// <summary>Process a quit command</summary>  

    // if we have a ui instance try to close it
    if (ui != null) {
        ui.close();
    }

    // if we have a server connection instance, logout of it and then terminate
    if (conn != null) {
        conn.logout().then(() => {
            process.exit(0);
        })
    // otherwise just terminate
    } else {
        process.exit(0);
    }

}