'use strict';

/* Module imports */
const fs = require('fs'); // add the filesystem module for file i/o
/**********************************************************************/

class ChallengeLog {
/* 
* Log manager class for a Node.js Socket Client Coding Challenge. This is an extremely lightweight logging class
* for the challenge app. It exists because there was a personal developer goal to complete the challenge app
* using only native node modules. In any real general use situation it would probably be replaced with one of
* the more functional and robust logging packages available through NPM.
*/

  constructor(logpath) {
  /// <summary>ChallengeLog class constructor</summary>  
  /// <param name="logpath" type="String">(Optional) Path to create log file at</param>  
  /// <returns type="Object">ChallengeLog instance</returns>  

    /* Connection Message Strings
    * The following group of properties define class constants used in outputting messages
    * to the defined log file. Due to Javascript's lack of support for static
    * class properties, there are different ways to achieve a similar effect. This particular
    * implementation is chosen purely because of simplicity.
    */

    // log message type indicator character
    this._logGeneral = '-'; // general messages
    this._logSent = '>'; // literal message sent to the server
    this._logReceived = '<'; // literal message received from the server
    this._logError = '!'; // a logged error

    // This is the actual instance initialization code
    // Set the log file path to either a specied path or the default path
    this.logpath = (logpath != null ? logpath : __dirname + '/socketclientchallenge.log');

    // for simplicity, logging is always on for everything in this code version
    this.loggingOn = true;

  }

  logMsg(msg) {
  /* 
  * Convenience method to log a general message to the current log file.
  */
  /// <summary>Log a general message to the current log file</summary>  

    if (this.loggingOn) {
        this._log(this._logGeneral, msg)
    }

  }

  logSent(msg) {
  /* 
  * Convenience method to log a literal server request to the current log file.
  */
  /// <summary>Log a server request message to the current log file</summary>  

    if (this.loggingOn) {
        this._log(this._logSent, msg)
    }

  }

  logReceived(msg) {
  /* 
  * Convenience method to log a literal server response to the current log file.
  */
  /// <summary>Log a server response message to the current log file</summary>  

    if (this.loggingOn) {
        this._log(this._logReceived, msg)
    }

  }

  logError(msg) {
  /* 
  * Convenience method to log an app error to the current log file.
  */
  /// <summary>Log an app error to the current log file</summary>  

    if (this.loggingOn) {
        this._log(this._logError, msg)
    }

  }

  timestamp() {
  /* 
  * Returns a timestamp to attach to a logged message
  */
  /// <summary>Get a current timestamp</summary>  

      let dt = Date.now();
      return dt.toString();

  }

  _log(type, msg) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Main class method for writing log messages to the log file.
  */
  /// <summary>Output the provided message to the current log file</summary>  
  /// <param name="type" type="String">Indicates the type of message being logged</param>  
  /// <param name="msg" type="String">Message text to be logged</param>  

    // write the formatted message to the log file
    fs.appendFile(this.logpath, this.timestamp() + ' ' + type + ' ' + msg + '\n', err => {
      if (err != null) {
        console.log(`Application logging error: ${err}`);
      }
    });

  }

}

module.exports = ChallengeLog;