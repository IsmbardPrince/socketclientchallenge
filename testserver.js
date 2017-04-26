'use strict'
/* 
* This is purely a one off test server for some preliminary brute force testing of the
* challenge app before actually connecting to the challenge server. Nothing in this file
* is intended to be of permanent or lasting importance to the app.
*/

const net = require('net');

var testSocket = null;
var timer = null;
var hbcount = 10;

const server = net.createServer(function(socket) {
    socket.on('error', err => {
        console.log(`socket error encountered ${err}`);
        socket.destroy();
        if (timer != null) {
            clearInterval(timer);
        }
    })
    socket.on('data', buffer => {
        let req = JSON.parse(buffer);
        console.log(req);
        if (typeof req.name !== 'undefined') {
            console.log(`"${req.name}" logged in`);
            testSocket = socket;
            hbcount = 10;
            timer = setInterval(() => {
                if (hbcount-- > 0) {
                    testSocket.write(JSON.stringify({
                        type: 'heartbeat'
                    }));
                    console.log(`heartbeat sent at ${Date.now().toString()}`)
                } else {
                    console.log(`heartbeat timer terminated`)
                    clearInterval(timer);
                }
            }, 1500);
            // testSocket.write(JSON.stringify({
            //     type: 'login',
            //     msg: `${req.name} logged in`
            // }));
        } else {
            if (typeof req.request !== 'undefined') {
                switch (req.request) {
                    case 'count':
                        testSocket.write(JSON.stringify({
                            type: 'count',
                            count: 23,
                            id: req.id
                        }));
                        console.log(`Count response sent with id: ${req.id}`);
                        break;
                    case 'time':
                        testSocket.write(JSON.stringify({
                            type: 'time',
                            time: Date.now(),
                            number: 52,
                            id: req.id
                        }));
                        console.log(`Time response sent with id: ${req.id}`);
                        break;
                
                    default:
                        console.log(`Unknown request type encountered: ${req.request}`);
                        break;
                }
            } else {
                console.log(`"${JSON.stringify(req)}" can't be processed yet`);
            }
        }
    });
});

server.listen(3001, '127.0.0.1');
console.log(`server listening on 127.0.0.1:3001`);
