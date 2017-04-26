'use strict';

/* Module imports */
const readline = require('readline'); // Readline module for node console input
/**********************************************************************/

class ChallengeUI {
/* 
* UI handler class for a Node.js Socket Client Coding Challenge. Provides all user interface functions
* for the main app. The ui requirements for the challenge are very simple and separating
* the whole ui into a separate class is unneccesary to meet the requirements, but by separating all of the
* ui functions into a separate class it will be much easier to enhance or even completely change
* the type of the ui with minimal changes to the rest of the app.
*/

  constructor(cmdCallback, closeCallBack) {
  /// <summary>ChallengeUI class constructor</summary>  
  /// <param name="cmdCallback" type="Function">Callback for user entered command</param>  
  /// <param name="closeCallBack" type="Function">Callback for user terminated app (e.g. ctl-c)</param>  
  /// <returns type="Object">ChallengeUI instance</returns>  

    /* UI Message Strings
    * The following group of properties define the message strings for the app's UI. For simplification they
    * are separated out here just as properties of the class to make them easier to deal with for localization
    * purposes if that was necessary. It is assumed that in most general release scenarios which included
    * localization, these strings and ids would be refactored into some generalized localization mechanism for
    * final release.
    */
    this._CMDPROMPT = 'Cmd?'; // Generic console command prompt for the app
    
    this._CMD = [ // App command strings
      'count',
      'time',
      'quit'
    ];
    // App command ids
    this.CMD_COUNT = 0;
    this.CMD_TIME = 1;
    this.CMD_QUIT = 2;

    this._MSG = [ // App message string templates
      'Node.js Socket I/O Coding Challenge Client',
      'Logged in to server at %0',
      'Could not log in to server at %0',
      'Command list: count, time, quit',
      'Command "%0" not recognized',
      'Error Processing Command "%0"',
      'Retry(y or n)?',
      'Coding Challenge Client closed'
    ];
    // App message ids
    this.MSG_APPHEADER = 0;
    this.MSG_CONNECTIONINFO = 1;
    this.MSG_CONNECTIONERROR = 2;
    this.MSG_COMMANDS = 3;
    this.MSG_INVALIDCMD = 4;
    this.MSG_CMDERROR = 5;
    this.MSG_RETRY = 6;
    this.MSG_CLOSEAPP = 7;

    // This is the actual instance initialization code
    // Save the callbacks to the main app for handling user command input and non-command user termination
    // of the app (e.g. ctl-c)
    this._cmdCallback = cmdCallback;
    this._closeCallBack = closeCallBack;

    // Set up to read user input from the console
    this._rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    // set the generic command prompt
    this._rl.setPrompt(this._CMDPROMPT);
    // set this class's callbacks for the readline module
    this._rl.on('line', this._rlLineCallback.bind(this)).on('close', this._rlCloseCallBack.bind(this));
    // show the app's initial output
    this.showMsg(this.MSG_APPHEADER);

  }

  _rlLineCallback(line) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Callback from the readline module for when the user has entered a line in the console.
  * If we got a valid command then we will callback the main app and wait
  * for it to ask for something else, otherwise we will inform the user of the invalid
  * command and reprompt. We return the command index for the entered command as an object
  * property because this makes it easier to handle commands with user entered options if
  * the app's functionality was extended that way.
  */

    // look for the command string in the command table
    let cmdNdx = this._CMD.indexOf(line.trim());

    // if we got a valid command then callback the app with the command ID
    if (cmdNdx != -1) {
      this._cmdCallback({type: cmdNdx});
    // otherwise notify the user of the invalid command and reprompt
    } else {
      this.showMsg(this.MSG_INVALIDCMD, line.trim());
      this.nextCmd();
    }

  }

  _rlCloseCallBack() {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Callback from the readline module for when the user has terminated the app using a system
  * sequence like ctl-c. We just transfer to the main app's close callback so that it can do
  * any app cleanup. Part of the responsibility of that cleanup will be to call us again to
  * do any ui closing cleanup.
  */

    this._closeCallBack();

  }

  nextCmd() {
  /* 
  * The ui command sequence for the app is linear, i.e. commands are entered and processed sequentially.
  * So once a valid command is entered, a new command cannot be entered until the previous command has
  * completed processing. This method is called by the main app when it is ready to process a new command.
  * The ui then enables this by displaying a new command prompt on the console.
  */
  /// <summary>Indicate the app is ready for another command from the user</summary>  

    this._rl.prompt();

  }

  showMsg(msgNdx, ...subs) {
  /* 
  * Outputs one of the standard app messages to the console. The standard messages are templates structured
  * to support localization of app strings. In this template format, %n indicates a placeholder
  * for a unique replacement string so that placeholders can be reordered to conform to different localization
  * language structures.
  */
  /// <summary>Show a standard app message</summary>  
  /// <param name="msgNdx" type="Number">Index for the standard message template</param>  
  /// <param name="...subs" type="String">substitution strings for the template</param>  

    console.log(this._formatMsg(this._MSG[msgNdx], subs));

  }

  showRetryMsg() {
  /* 
  * Outputs a retry message to the console. Unlike the standard showMsg method, this method returns
  * a promise so that the caller can wait for the user answer to the retry message before proceeding.
  */
  /// <summary>Show a retry message and wait for user input</summary>  
  /// <returns type="Boolean" value="Promise">True if user wants to retry</returns>  

    return new Promise((resolve, reject) => {
      this._rl.question(this._MSG[this.MSG_RETRY], reply => {
        if (reply.substr(0,1).toLowerCase() == 'y') {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });

  }

  showLoginError(err, connInfo) {
  /* 
  * Outputs a login error message to the console. Purely a convenience method over using the standard
  * showMsg method.
  */
  /// <summary>Show a login error message</summary>  
  /// <param name="err" type="Object">Error object or Error message string</param>  
  /// <param name="connInfo" type="String">Connection info for the login attempt</param>  

    console.log(this._formatMsg(this._MSG[this.MSG_CONNECTIONERROR], connInfo));
    console.log(err);

  }

  showCmdError(err, cmdNdx) {
  /* 
  * Outputs a command processing error message to the console. Purely a convenience method over
  * using the standard showMsg method.
  */
  /// <summary>Show a command processing error message</summary>  
  /// <param name="err" type="Object">Error object or Error message string</param>  
  /// <param name="cmdNdx" type="Number">Id of the command on which the error occurred</param>  

    console.log(this._formatMsg(this._MSG[this.MSG_CMDERROR], this._CMD[cmdNdx]));
    console.log(err);

  }

  close() {
  /* 
  * Clean up and close an instance of the ui. In the current state of the ui, this
  * really only entails closing the node readline instance used by the ui.
  */
  /// <summary>Close the UI instance</summary>  

    this._rl.close();

  }

  _formatMsg(msg, replStrings) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Prepares a ui standard message for display by substituting the provided replacer strings
  * into the designated placeholder spots in the message template.
  */
  /// <summary>Format a standard ui message for display</summary>  
  /// <param name="msg" type="String">Message template</param>  
  /// <param name="cmdNdx" type="String/String[]">Template replacer strings</param>  

    // if we just got a single replacer string instead of an array, turn it into an array
    if (replStrings != null && !Array.isArray(replStrings)) {
      replStrings = [replStrings];
    }

    // if we got any replacer strings, then insert them into the proper places in the message template
    if (Array.isArray(replStrings) && replStrings.length > 0) {
      for (var i = 0; i < replStrings.length; i++) {
        msg = msg.replace('%' + i.toString(), replStrings[i]);
      }
    }

    return msg;

  }

}

module.exports = ChallengeUI;