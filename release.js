const downloader = require('./training_tools/downloadImg.js');
const cropper = require('./training_tools/cropImg.js');
const nn = require('convnetjs');
const http = require('http');
const url = require('url');
const fs = require('fs');
const math = require('mathjs');

//                 0    1     2    3    4   5    6    7    8    9    10   11   12
const charList = [ 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'k', 'r', 's', 't', 'y', 'x' ];
const colorName = [ 'r', 'g', 'br', 'bl', 'pi', 'pu' ];

//-------------------------------------------------
// Config
const port = 8080;
//-------------------------------------------------

var bufToArr = 
function (rawData)
{
	var retArr = [];
	for (var i = 0; i < rawData.length; i++)
		retArr.push(rawData[i]);
	return retArr;
};

var server = 
http.createServer
(
    (request, response) =>
    {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        var qureyObj = url.parse(request.url, true).query;
        console.log(qureyObj['cookie']);

        var lastTimestamp = Date.now();

        var net = new nn.Net(),
            tempVol = new nn.Vol(28, 28, 3, 0);
        if (fs.existsSync('./training_tools/nn.json') && typeof qureyObj['cookie'] !== 'undefined')
        {
            net.fromJSON(JSON.parse(fs.readFileSync('./training_tools/nn.json', 'utf8')));
            // console.log('Load from nn.json!!!');

            new Promise
            (
                (resolve, reject) =>
                {
                    downloader.download
                    (
                        qureyObj['cookie'],
                        imgBuf => resolve(imgBuf)
                    );
                }
            ).then
            (
                (buf) =>
                {
                    var charImg = cropper.cropImage(buf);
                    charImg.then
                    (
                        (charInfo) =>
                        {
                            var finalString = '';
                            for (var color of charInfo['order'])
                            {
                                tempVol.setConst(0);
                                tempVol.addFrom({ w: bufToArr(charInfo[color[1]]) });
                                var result = net.forward(tempVol).w, charIndex = result.indexOf(math.max.apply(null, result));
                                finalString += charList[charIndex];
                            }
                            console.log(finalString);
                            console.log('Time: ' + (Date.now() - lastTimestamp) + 'ms');
                            response.end(finalString);
                        }
                    );
                    // console.log(charImg);
                }
            );
        }
        else
            response.end('Please give me your cookie :P');
            // throw new Error('Neural network not defined!');

        // response.end('OK');
    }
);

server.listen(port);
