# socketclientchallenge #
Small project to create a node.js socket i/o client for a coding challenge.

----------
## Overview ##
This project was created in response to a coding challenge (specific info withheld on request). The high level requirements were to build a node.js application to communicate with a server at a specific ip address and port using socket i/o. The application can login to the server, make requests and handle responses to those requests, and properly reset the connection in response to the periodic appearance or non-appearance of server created keepalive messages.

## Project Approach ##
Because my personal exposure to node.js has been using it with Express to build http servers, this was a great opportunity to do something a little different since I have general exposure to socket based interfaces, but not with node.js. Also because I had the time and inclination, I approached the project not really just as a one-off coding challenge but as a project base; something that is structured and documented in such a way that it could reasonably serve as the basis for implementing extensions and enhancements through mainly localized code changes with minimal required impact to already working code (depending on the scope of functionality desired of course). Lastly, although I would definitely be searching NPM for applicable packages I could use for future development, I wanted to build this base app for the challenge using only integrated node.js modules.

## App Design ##
The actual functional requirements of the app resulted in a pretty simple overall design. There is the root node app module which exists mainly to start everything up. The main work is handled by two classes: ChallengeUI and ChallengeConnection. Since it is usually a good idea to have some kind of extended logging capability and as explained earlier I didn't want to use an external package, there is also a ChallengeLog class for app logging which could easily be replaced with a more sophisticated logging package.

High-level program flow is likewise very simple. Once the main app starts everything up, the UI waits for user input. When a recognized command is entered the connection object is called to request the appropriate response from the server. Because it makes sense for this kind of app, UI calls to the connection object are blocking. When the connection object obtains the response from the server it returns that to the UI instance which displays it and then waits for another command.

The actual server interaction code in the ChallengeConnection class is somewhat more complex. This is because there are actually two separate messaging "threads" (for want of a better term). The first is the login - keepalive/heartbeat - reset "thread". Since the server cannot be considered to be open for business unless the app logs in, a login request starts this "thread". However in addition to being logged in, the server also can not be considered to be open for business unless the application continues to receive keepalive/heartbeat messages from the server within 2 second intervals. Should this sequence be disrupted, the connection has to be reset and restarted with a new login. Because this event happens randomly, that means that the other "thread" which is where command request -  response messaging happens, needs to be able to as gracefully as possible handle disruptions in server connectivity. Although there was no specific statement of server side recovery, the app makes the assumption that any pending requests it has sent are terminated unfilled should a reset occur before a response is received. This means that handling of that situation needs to resolve the error while allowing the app to continue future interactions.

The command request - response "thread" also has to handle the matching of server response messages to the related app request messages. This is because the server is documented to potentially send unknown different types of invalid messages at unknown times to the socket maintained by the app. One way the app accomplishes this is by assigning a message id to server requests which the server then attaches to its associated response. While this is sufficient to meet the linear command processing requirements of the challenge, this app also implements a pending request table so that it could also easily handle interleaved request - response messages. Because in any client - server interaction like this you can have server requests that go unanswered for whatever reason, there are two other important actions that are implemented. As described earlier, when the server connection is reset, any pending command requests are identified and terminated such that the app can continue processing future requests. In addition the pending request table is periodically checked for pending requests that have timed out without a corresponding response being received from the server. These timed out requests are then removed from the table and handled just like reset terminated requests.

## File Map ##
- .vscode - Visual Studio Code profile info
- challengeconnection.js - ChallengeConnection Class Module
- challengelog.js - ChallengeLog Class Module
- challengeui.js - ChallengeUI Class Module
- README.md - This file
- socketclientchallenge.js - Root node.js app
- testserver.js - Primitive test server for preliminary app testing



