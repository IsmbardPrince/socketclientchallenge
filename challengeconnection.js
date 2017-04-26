'use strict';

/* Module imports */
const net = require('net'); // add the node net module for socket i/o

const ChallengeLog = require('./challengelog.js'); // class for app logging
/**********************************************************************/

// create the object to handle app logging
const log = new ChallengeLog();

class ChallengeConnection {
/* 
* Server manager class for a Node.js Socket Client Coding Challenge. Manages all the app's direct communications with
* the challenge server. Maps all server interface to high-level app functions for main app processing. Intended
* to shield the main app from server specifics for easier maintenance and easier integration of server enhancements.
*/

  constructor(port, ip) {
  /// <summary>ChallengeConnection class constructor</summary>  
  /// <param name="port" type="Number">(Optional) Port to connect on</param>  
  /// <param name="ip" type="Number">(Optional) IP to connect on</param>  
  /// <returns type="Object">ChallengeConnection instance</returns>  

    /* Connection Message Strings
    * The following group of properties define class constants for handling the sending and
    * receiving of messages from the server. Due to Javascript's lack of support for static
    * class properties, there are different ways to achieve a similar effect. This particular
    * implementation is chosen purely because of simplicity.
    */

    this._msgType = [ // server msg types which the app cares about
      'welcome',
      'heartbeat',
      'msg',
      'count',
      'time'
    ]
    this._typLogin = 0;
    this._typHeartbeat = 1;
    this._typMsg = 2;
    this._typCount = 3;
    this._typTime = 4;

    // constants used in the server request tracking table
    this._reqId = 0; // id of request sent
    this._reqType = 1; // type of request sent
    this._reqCallback = 2; // callback for request response received
    this._reqTime = 3; // time request was sent

    // This is the actual instance initialization code
    // Set the server connection info to either a specied port and ip or the defaults
    this.connPort = (port != null ? port : 3001);
    this.connIp = (ip != null ? ip : '127.0.0.1');

    // intialize to indicate no active server connection
    this.loggedIn = false;
    this.reset = false;
    this.loginName = '';
    this.lastErr = null;
    this._socket = null;
    this._heartbeatTimer = null;
    this._pendingReq = [];

  }

  login() {
  /* 
  * Handles a request to login to the server. The request is blocking and only returns
  * when a valid logged in connection has been established or an error occurs
  */
  /// <summary>Login to the server specified for this connection instance</summary>  
  /// <returns type="Object" value="Promise">Login message or error object</returns>  

    return new Promise((resolve, reject) => {

      // create the socket for the server connection
      this._socket = net.connect(this.connPort, this.connIp);

      // set the callbacks on the socket
      this._socket.on('data', this._handleServerMsg.bind(this));
      this._socket.on('error', err => {
        log.logError(`socket error encountered ${err}`);
      });

      log.logMsg(`Connected to server at IP: ${this.connIp}, Port: ${this.connPort}`);

      this._pendingReq = []; // clear the pending requests table (mainly insurance for resets)

      // send the login msg to the server
      this._sendLoginReq('coder1', err => {

        // if we get any kind of login error just pass it up the chain
        if (err != null) {
          reject(err);
        }

        log.logMsg(`Logged in to server at IP: ${this.connIp}, Port: ${this.connPort}`);

        // indicate successfully logged into the server
        this.loginName = 'coder1'; // used to create msg ids
        this.loggedIn = true; // indicate successful login
        this.reset = false; // indicate connection is not in the process of being reset

        resolve({err: null, results: {ip: this.connIp, port: this.connPort, loggedIn: this.loggedIn}});

      });
    
      // start listening for heartbeats regardless of whether we have received a login response yet
      this._heartbeatTimer = setTimeout(this._resetConnection.bind(this), 2000);

    });

  }

  logout() {
  /* 
  * Handles a request to login to the server. The request is blocking and only returns
  * when the connecting socket has been successfully destroyed or an error occurs
  */
  /// <summary>Log out from this instance's connection (i.e. destroy the socket)</summary>  
  /// <returns type="Object" value="Promise">Logout message or error object</returns>  

    return new Promise((resolve, reject) => {

      // only try to destroy the socket if a socket actually exists
      if (this._socket != null) {
        this._socket.destroy();
        this._socket = null;
      }

      // reset the instance to indicate no active connection
      this.loginName = '';
      this.loggedIn = false;
      this._pendingReq = [];

      resolve({err: null, results: {ip: this.connIp, port: this.connPort, loggedIn: this.loggedIn}});

    });

  }

  getRequestCount() {
  /* 
  * Top level interface for the main app to get the cumulative request count from the server.
  * The request is blocking and only returns when the server response to the request msg is 
  * received and processed.
  */
  /// <summary>Get the cumulative request count from the logged in server</summary>  
  /// <returns type="Object" value="Promise">Object containing the request count or an error</returns>  

    return new Promise((resolve, reject) => {

      // send the request to the server and wait for the corresponding response
      this._sendServerReq({request: 'count'}, this._msgType[this._typCount], response => {

        // if the response is valid, then return the data
        if (typeof response.err === 'undefined' || response.err === null) {
          log.logMsg(`Count response received: ${JSON.stringify(response)}`);
          resolve({count: response.count});
        // otherwise, return an error
        } else {
          log.logError(response.err);
          reject({err: response.err});
        }

      });

    });

  }

  getTime() {
  /* 
  * Top level interface for the main app to request the current time and a random number from the server.
  * The request is blocking and only returns when the server response to the request msg is 
  * received and processed.
  */
  /// <summary>Get the current time and random number from the server</summary>  
  /// <returns type="Object" value="Promise">Object containing the time and number or an error</returns>  

    return new Promise((resolve, reject) => {

      // send the request to the server and wait for the corresponding response
      this._sendServerReq({request: 'time'}, this._msgType[this._typTime], response => {

        // if the response is valid, then return the data
        if (typeof response.err === 'undefined' || response.err === null) {
          log.logMsg(`Time response received: ${JSON.stringify(response)}`);
          resolve({time: response.time, number: response.random});
        // otherwise, return an error
        } else {
          log.logError(response.err);
          reject({err: response.err});
        }

      });

    });

  }

  _sendLoginReq(user, callback) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Sends a login request to the connected server. Login messages are sent by a different mechanism than other
  * server messages because other server messages require a logged in server. In addition login messages do not
  * include a message id. This method is blocking but because the wait is on a response from an ip connected socket, 
  * we must use a callback. The callback is saved in the pending request table when the request is made and then
  * retrieved and called when the corresponding server response msg is received by the _handleServerMsg
  * method of this class.
  */
  /// <summary>Send a login msg to the server and wait until the corresponding response is received</summary>  
  /// <param name="user" type="String">Name of the user to login as</param>  
  /// <param name="callback" type="Object">Callback function when the login response received</param>  

    // save the login request info in the pending requests table; the table should be empty at this point
    // no message id is associated with a login request
    this._pendingReq.push(['', this._msgType[this._typLogin], callback, Date.now()]);
    log.logMsg(`Pending login request info pushed - user: ${user}, callback provided: ${(callback != null)}`);

    // send the login request msg to the server
    this._socket.write(JSON.stringify({name: user}));
    log.logSent(JSON.stringify({name: user}));

  }

  _sendServerReq(req, type, callback) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Main class method for sending requests to the logged in server. This method is blocking
  * but because the wait is on a response from an ip connected socket, we must use a callback.
  * The callback is saved in the pending request table when the request is made and then
  * retrieved and called when the corresponding server response msg is received by the _handleServerMsg
  * method of this class.
  */
  /// <summary>Send a request msg to the logged in server and wait until the corresponding response is received</summary>  
  /// <param name="req" type="Object">JSON formatted msg to send to the server</param>  
  /// <param name="type" type="String">Indicates the type of request being sent</param>  
  /// <param name="callback" type="Object">Callback function when server response received</param>  

    this._chkServerLogin().then(response => {

      let msgId = this._nextMsgId(); // get a unique message id for this request

      // save the request info in the pending requests table
      this._pendingReq.push([msgId, type, callback, Date.now()]);
      log.logMsg(`Pending request info pushed - msgId: ${msgId}, type: ${type}, callback provided: ${(callback != null)}`);

      // send the request msg to the server
      this._socket.write(JSON.stringify(Object.assign(req, {id: msgId})));
      log.logSent(JSON.stringify(Object.assign(req, {id: msgId})));

    }).catch(err => {

      // any errors we receive sending the msg are returned immediately
      callback(err);

    });

  }

  _chkServerLogin() {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * This method makes sure we have a valid logged in server before we try to make a request
  * to it. The main complexity is that if we are in the process of resetting the server connection
  * because of a heartbeat timer dropout, we retry the login check a few times so that the reset
  * operation doesn't unneccessarily cause main app requests to be rejected. Because we are only
  * checking our own internal logged in state, it is still possible for server connection errors
  * to occur even if this check succeeds. Those errors will be trapped in other locations.
  */
  /// <summary>Check to see if we have a connection to a logged in server</summary>  
  /// <returns type="Object" value="Promise">Object containing an error or null for success</returns>  

    return new Promise((resolve, reject) => {

      // simplest and most likely case is that we return with a logged in indication
      if (this.loggedIn) {
        resolve({err: null});
      // but we need to check if we are in a reset cycle if not
      } else {
      
      // if we are in a reset cycle then retry the logged in test
        if (this.reset) {

          let retry = 5; // for simplicity, we hardcode a max 5 retries

          // wait before retrying
          let timer = setInterval(() => {
            // if we are logged after the wait then return success
            if (this.loggedIn) {
              resolve({err: null});
            // otherwise check to see if we are out of retries and if so return failure
            } else {
              if (--i <= 0) {
                clearInterval(timer);
                reject({err: `Server reset error!`});
              }
            }
          }, 1000); // wait 1 second between tries

        // otherwise if we're not being reset and we're not logged in then just return failure
        } else {
          reject({err: `Not logged into server!`});
        }
      }

    });

  }

  _handleServerMsg(buffer) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Main class method for handling messages received from the connected server. This method is not blocking in that
  * it is the callback on the node socket object when data is received from the server. It does however resolve the
  * block that was created by a call to the _sendServerReq method when a received message is a response to a
  * specific request message sent to the server. In addition to handling those types of messages, it also routes
  * heartbeat messages for proper handling and appropriately processes received messages which do not match any of
  * this class's valid message types.
  */
  /// <summary>Receive and handle messages from the connected server</summary>  
  /// <param name="buffer" type="Object">The message buffer received on the server connection socket</param>  

    log.logReceived(buffer);

    // get any valid JSON objects received in the buffer
    let msgArray = this._parseRcvBuffer(buffer);

    // and process them as server messages
    for (var i = 0; i < msgArray.length; i++) {

      let msg = msgArray[i];

      // if the msg doesn't have a valid type property, then just log it and ignore it
      if (typeof msg.type === 'undefined' || typeof msg.type !== 'string') {
        log.logError(`Message received with invalid or no message type: ${JSON.stringify(msg)}`);
      }

      // handle valid JSON server messages
      switch (msg.type) {

        // login messages
        case this._msgType[this._typLogin]:
          this._handleLoginMsg(msg);
          break;

        // heartbeat messages
        case this._msgType[this._typHeartbeat]:
          this._handleHeartbeat(Date.now());
          break;

        // standard request response messages
        case this._msgType[this._typMsg]:
          let response = msg.msg;
          // if the response has a count property, then process it as a count request response
          if (typeof response.count !== 'undefined') {
            this._handleCountMsg(response);
          // if the response has a time property, then process it as a time request response
          } else if (typeof response.time !== 'undefined') {
              this._handleTimeMsg(response);
          // log response types we don't recognize, then ignore them
          } else {
            log.logError(`Unrecognized message encountered: ${JSON.stringify(msg)}`);
          }
          break;

        // log message types we don't recognize, then ignore them
        default:
          log.logError(`Unrecognized message encountered: ${JSON.stringify(msg)}`);
          break;

      }
        
    }

  }

  _parseRcvBuffer(buffer) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Takes the provided buffer and parses it, returning an array containing message objects
  * corresponding to any valid JSON formatted text in the buffer. Text which can not be parsed
  * as a JSON object is logged, then ignored.
  */
  /// <summary>Parse any JSON formatted objects from the provided buffer</summary>  
  /// <param name="buffer" type="String">The buffer which to parse</param>  
  /// <returns type="Array">Contains any parsed message objects</returns>  

    // split the buffer into individual messages
    let tmpArray = buffer.toString().split('\n');
    let msgArray = [];

    // parse each individual message to determine if it is valid JSON
    for (var i = 0; i < tmpArray.length; i++) {

      // all valid messages will be in JSON representation
      try {
        let msg = tmpArray[i];
        // this will effectively ignore any trailing newlines
        if (msg != null && msg.trim().length > 0) {
          msg = JSON.parse(msg); // convert the message to an object
          msgArray.push(msg); // and save it if it is valid JSON
        }
      }
      catch(err) {
        // if we are just not able to parse a JSON object out of the msg, then just ignore the msg
        if (err instanceof SyntaxError) {
          log.logError(`Invalid non-JSON message format: ${buffer}`);
        // otherwise, all other kinds of errors just continue getting passed up the stack
        } else {
          throw(err);
        }
      }
      
    }

    return msgArray;

  }

  _handleLoginMsg(msg) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * This method handles the server response to a login message. It retrieves the login callback from the pending
  * requests table so that the login process can complete.
  */
  /// <summary>Handle the server response message to a login request</summary>  
  /// <param name="msg" type="Object">The JSONified msg received from the server</param>  

    // when a login response is received from the server, there should only be one request in the pending
    // request table and it should be for a login request
    if (this._pendingReq.length != 1 || this._pendingReq[0][this._reqType] != this._msgType[this._typLogin]) {
      log.logError(`Invalid pending request table on login: ${this._pendingReq}`);
      // if we can't complete the login, we just need to quit
      throw new Error(`Invalid pending request table on login: ${this._pendingReq}`);
    }

    // get the pending login request and complete the login
    let req = this._pendingReq[0][this._reqCallback];
    if (req != null) {
      req(null); // indicate no login error
    //otherwise if we can't complete the login, we just need to quit
    } else {
      log.logError(`No login callback found in pending request table`);
      throw new Error(`No login callback found in pending request table`);
    }

  }

  _handleHeartbeat(pulse) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * This method makes sure we have a valid logged in server before we try to make a request
  * to it. The main complexity is that if we are in the process of resetting the server connection
  * because of a heartbeat timer dropout, we retry the login check a few times so that the reset
  * operation doesn't unneccessarily cause main app requests to be rejected. Because we are only
  * checking our own internal logged in state, it is still possible for server connection errors
  * to occur even if this check succeeds. Those errors will be trapped in other locations.
  */
  /// <summary>Handle a timely heartbeat msg from the server</summary>  
  /// <param name="pulse" type="Object">The time the heartbeat msg was received from the server</param>  

    // if we don't have a heartbeat timer, we haven't logged in and started one so just return
    if (this._heartbeatTimer === null) return;

    // clear the existing heartbeat timer and set a new one
    clearTimeout(this._heartbeatTimer);
    this._heartbeatTimer = setTimeout(this._resetConnection.bind(this), 2000); // this gives a 2 second window before timeout reset

    // we also use the heartbeat to start up a check for timed-out individual server request messages
    this._chkPendingReq(pulse);

  }

  _handleCountMsg(msg) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * This method handles server responses to requests for the cumulative request count. It checks the 
  * msg id in the server response, searches for a corresponding request in the pending request table
  * and if one is found, executes the associated callback with the returned server data.
  */
  /// <summary>Handle server response message for the get cumulative request count request</summary>  
  /// <param name="msg" type="Object">The JSONified msg received from the server</param>  

    // get the msg id for the server message
    let msgId = this._getMsgId(msg);

    // if a valid msg id for this instance could not be determined, then log the error and ignore the message
    if (msgId === null) {
      log.logError(`Count message received with invalid or no message id: ${JSON.stringify(msg)}`);
      return;
    }

    // find the pending request info for this server response message
    let req = this._getPendingReq(msgId);

    // if the corresponding request was found then execute associated callback
    if (req != null) {
      log.logMsg(`Pending request found for count response with msgId: ${msgId}`);
      req(msg);
    //otherwise just log the error and ignore the message
    } else {
      log.logError(`No matching count request found for response with msgId: ${msgId}`);
    }

  }

  _handleTimeMsg(msg) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * This method handles server responses to requests for the server time and random number. It checks the 
  * msg id in the server response, searches for a corresponding request in the pending request table
  * and if one is found, executes the associated callback with the returned server data.
  */
  /// <summary>Handle server response message for the get server time and random number request</summary>  
  /// <param name="msg" type="Object">The JSONified msg received from the server</param>  

    // get the msg id for the server message
    let msgId = this._getMsgId(msg);

    // if a valid msg id for this instance could not be determined, then log the error and ignore the message
    if (msgId === null) {
      log.logError(`Time message received with invalid or no message id: ${JSON.stringify(msg)}`);
      return;
    }

    // find the pending request info for this server response message
    let req = this._getPendingReq(msgId);

    // if the corresponding request was found then execute associated callback
    if (req != null) {
      log.logMsg(`Pending request found for time response with msgId: ${msgId}`);
      req(msg);
    //otherwise just log the error and ignore the message
    } else {
      log.logError(`No matching time request found for response with msgId: ${msgId}`);
    }

  }

  _nextMsgId() {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Generates a unique id string which identifies a message by app, user and request time. While this mechanism
  * is suitable for the limited nature of the challenge app, it is not robust enough for most general purpose
  * usage and would need to be enhanced for a more generally releasable product.
  */
  /// <summary>Generate a unique msg id for an app server request</summary>  
  /// <returns type="String">Unique id for a server request from this app</returns>  

    return ('challenge' + this.loginName + Date.now().toString());

  }

  _getMsgId(msg) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Returns a validly formatted msg id if one exists in a server response message. 
  */
  /// <summary>Get the msg id from the provided server response message</summary>  
  /// <param name="msg" type="Object">The JSONified msg received from the server</param>  
  /// <returns type="String">Message id returned in a server response message</returns>  

    // if the msg doesn't have a valid id property or it doesn't match this app, then just ignore it
    if (typeof msg.reply === 'undefined' || typeof msg.reply !== 'string' || msg.reply.substr(0, 9) !== 'challenge') {
      log.logError(`Message received with invalid or no message id: ${JSON.stringify(msg)}`);
      return null;
    }

    return msg.reply;

  }

  _getPendingReq(id) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Returns info about the pending request matching the specified message id. The
  * matching request info if found is removed from the pending request table.
  */
  /// <summary>Get info for the request with the specified message id</summary>  
  /// <param name="id" type="String">The message id to match in the pending request table</param>  
  /// <returns type="Array">Contains info describing a pending server request</returns>  

    let req = null;

    // look for a pending request matching the specified msg id
    for (var i = 0; i < this._pendingReq.length; i++) {
      // if found, get the info from the table and remove it from the table
      if (this._pendingReq[i][this._reqId] == id) {
        req = this._pendingReq.splice(i, 1)[0][this._reqCallback];
        break;
      }
    }

    return req;

  }

  _chkPendingReq(timestamp) {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * Checks the pending request table to see if any pending requests have been in the table longer
  * than the request timeout value. If they have been, they are removed from the table and an
  * error is posted to their associated request callback.
  */
  /// <summary>Get info for the request with the specified message id</summary>  
  /// <param name="timestamp" type="Number">The timestamp to compare to the request submit time</param>  

    this._pendingReq.forEach((req, ndx) => {
      
      // for simplicity, the current timeout value is hardcoded to 5 seconds
      if ((timestamp - req[this._reqTime]) > 5000) {
        // remove the info for a timed out request from the table
        let reqInfo = this._pendingReq.splice(ndx, 1)[0];
        // and return an error on the associated callback
        reqInfo[this._reqCallback]({err: `Request timeout error - request type: ${reqInfo[this._reqType]}, request time: ${reqInfo[this._reqTime]}`});
      }

    });

  }

  _resetConnection() {
  /* 
  * Private Method by Convention (i.e. not enforced)
  * This method performs the steps to reset the connection to the server. It's intended
  * usage is to reset the connection when a heartbeat message has not been received from the
  * server by the end of the defined interval.
  */
  /// <summary>Reset the connection to the server</summary>  

    // Indicate we currently have no server connection
    log.logMsg(`Resetting Server Connection`);
    this.loggedIn = false;
    this.reset = true;

    // Clear any pending server requests since they will not be able to be completed now
    this._pendingReq.forEach((req, ndx) => {
      // notify any current requestors that their requests have failed so they can retry if desired but ignore any
      // pending login requests since we will try to login again on the reset anyway
      if (req[this._reqType] != this._msgType[this._typLogin]) {
        let type = req[this._reqType];
        let time = req[this._reqTime];
        req[this._reqCallback]({err: `Server reset error - request type: ${type}, request time: ${time}`});
      }
    });

    // destroy our current connection
    this._socket.destroy();
    this._socket = null;
    
    // then create a new one
    this.login().then(response => {
      if (response.err === null) {
        log.logMsg(`Server Reset Complete`);
      } else {
        log.logError(`Server Reset Error: ${response.err}`);
      }

    });

  }

}

module.exports = ChallengeConnection;