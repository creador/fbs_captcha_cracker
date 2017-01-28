const convnetjs = require('convnetjs');
const math = require('mathjs');
const jpeg = require('jpeg-js');
const fs = require('fs');
const http = require('http');

const cropImg = require('./cropImg.js');

const colorName = [ 'r', 'g', 'br', 'bl', 'pi', 'pu' ];

var imgBufToRgbArr = 
function (rawData)
{
	var retArr = [];
	for (var i = 0; i < rawData.width * rawData.height * 4; i++)
		if ((i + 1) % 4)
			retArr.push(rawData.data[i]);
	return retArr;
};

var layer_defs = [];
layer_defs.push({type:'input', out_sx:175, out_sy:50, out_depth:3});
layer_defs.push({type:'conv', sx:5, filters:6, stride:1, pad:2, activation:'relu'});
layer_defs.push({type:'pool', sx:5, stride:5});
// layer_defs.push({type:'conv', sx:5, filters:18, stride:1, pad:2, activation:'relu'});
// layer_defs.push({type:'pool', sx:3, stride:3});
// layer_defs.push({type:'fc', num_neurons:36, activation:'tanh'});
// layer_defs.push({type:'fc', num_neurons:128, activation:'tanh'});
layer_defs.push({type:'regression', num_neurons:4});

var net = new convnetjs.Net();

if (fs.existsSync('rnn.json'))
{
	net.fromJSON(JSON.parse(fs.readFileSync('rnn.json', 'utf8')));
	console.log('Load from nn.json!!!');
}
else
{
	net.makeLayers(layer_defs);
	console.log('Make a new nn....');
}

var trainer = new convnetjs.SGDTrainer(net, {method:'adadelta', batch_size:1, l2_decay:0.001});

var tempVol = new convnetjs.Vol(175, 50, 3, 0), targetVal = [];
var fileList = fs.readdirSync('training_set/cropping_test');
var regionList = [];
for (var file of fileList)
    regionList.push(cropImg.getRegion(fs.readFileSync('training_set/cropping_test/' + file)));

var stat = null;

var server = 
http.createServer
(
    (request, response) =>
    {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end('Loss: ' + stat.loss);
    }
);
server.listen(7070);
console.log('Start training...');

while (!stat || stat.loss > 0.01)
{
    for (var fileIndex in fileList)
    {
        var imgBuf = fs.readFileSync('training_set/cropping_test/' + fileList[fileIndex]);
        // targetVal = [];
        // for (var color of colorName)
        //     targetVal = targetVal.concat(region[color]);
        tempVol.setConst(0);
        tempVol.addFrom({ w: imgBufToRgbArr(jpeg.decode(imgBuf)) });
        stat = trainer.train(tempVol, regionList[fileIndex]['r']);
    }

    fs.writeFileSync('rnn.json', JSON.stringify(net.toJSON()), 'utf8');
}
console.log('Loss: ', math.round(stat.loss, 8), ', time: ', stat.fwd_time, '/', stat.bwd_time, ' ms');

var imgBuf = fs.readFileSync('training_set/cropping_test/' + fileList[1]);
tempVol.setConst(0);
tempVol.addFrom({ w: imgBufToRgbArr(jpeg.decode(imgBuf)) });
console.log(net.forward(tempVol).w);
console.log(regionList[1]['r']);
