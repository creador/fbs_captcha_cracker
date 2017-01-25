const convnetjs = require('convnetjs');
const math = require('mathjs');
const colorConvert = require('color-convert');
const jpeg = require('jpeg-js');
const fs = require('fs');

const cropImg = require('./cropImg.js');
const downloadImg = require('./downloadImg.js');

//                 0    1     2    3    4   5    6    7    8    9   10   11   12
const charList = [ 'b', 'c', 'd', 'e', 'f','g', 'h', 'k', 'r', 's', 't', 'y', 'x' ];
const colorName = [ 'r', 'g', 'br', 'bl', 'pi', 'pu' ];

// const trainMode = true;
const trainMode = false;

var ensureFolderExist = 
(path) =>
{
    try
    {
        fs.mkdirSync(path);
    }
    catch (e)
    {
        if (e.code != 'EEXIST')
            throw e;
    }
};

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
// layer_defs.push({type:'input', out_sx:24, out_sy:24, out_depth:1});
// layer_defs.push({type:'conv', sx:8, filters:96, stride:1, pad:4, activation:'relu'});
// layer_defs.push({type:'pool', sx:5, stride:1});
// layer_defs.push({type:'conv', sx:2, filters:256, stride:1, pad:1, activation:'relu'});
// layer_defs.push({type:'pool', sx:2, stride:1});
// layer_defs.push({type:'softmax', num_classes:13});

layer_defs.push({type:'input', out_sx:28, out_sy:28, out_depth:3});
layer_defs.push({type:'conv', sx:3, filters:24, stride:1, pad:1, activation:'relu'});
layer_defs.push({type:'pool', sx:2, stride:2});
layer_defs.push({type:'conv', sx:5, filters:36, stride:1, pad:2, activation:'relu'});
layer_defs.push({type:'pool', sx:2, stride:2});
layer_defs.push({type:'conv', sx:5, filters:36, stride:1, pad:2, activation:'relu'});
layer_defs.push({type:'pool', sx:2, stride:2});
layer_defs.push({type:'softmax', num_classes:charList.length});

var net = new convnetjs.Net();

if (fs.existsSync('nn.json'))
{
	net.fromJSON(JSON.parse(fs.readFileSync('nn.json', 'utf8')));
	console.log('Load from nn.json!!!');
}
else
{
	net.makeLayers(layer_defs);
	console.log('Make a new nn....');
}

var trainer = new convnetjs.SGDTrainer(net, {method:'adadelta', batch_size:5, l2_decay:0.001});
// var trainer = new convnetjs.SGDTrainer(net, {method:'adadelta', momentum:0.9, batch_size:1, l2_decay:0.001});
// var trainer = new convnetjs.Trainer(net, { method:'adadelta', learning_rate:0.02, momentum: 0.05, l2_decay:0.001 });


ensureFolderExist('training_set');
ensureFolderExist('training_set/all');

var fileList = [], lengthList = [];

var tempVol = new convnetjs.Vol(28, 28, 3, 0), testIndex = 0, errorCount = 0;
if (trainMode)
{
	for (var i in charList)
	{
		ensureFolderExist('training_set/all/' + i);
		fileList.push(fs.readdirSync('training_set/all/' + i));
		lengthList.push(fileList[i].length);
	}

	var maxLength = math.max(lengthList);
	var lastPercentage = -1, indexList = [];

	for (var i in charList)
		indexList[i] = parseInt(i);

	for (var i = 0; i < 10; i++)
	{
		console.log('\n\n-> Round ' + (i + 1) + '\n\n');

		for (var fileIndex = 0; fileIndex < maxLength; fileIndex++)
		{
			indexList.sort((a, b) => math.randomInt(-1, 2));
			for (var ilIndex in indexList)
			{
				if (fileIndex < fileList[indexList[ilIndex]].length)
				{
					tempVol.setConst(0);
					tempVol.addFrom({ w: imgBufToRgbArr(jpeg.decode(fs.readFileSync('training_set/all/' + indexList[ilIndex] + '/' + fileList[indexList[ilIndex]][fileIndex]))) });
					var stat = trainer.train(tempVol, indexList[ilIndex]);
					// console.log(stat.loss);
				}
			}
		}
		
		fs.writeFileSync('nn.json', JSON.stringify(net.toJSON()), 'utf8');
		console.log('Loss: ', math.round(stat.loss, 8), ', time: ', stat.fwd_time, '/', stat.bwd_time, ' ms');
	}

	const testCount = 3000;
	var result = null;
	for (var i = 0; i < testCount; i++)
	{
		testIndex = math.randomInt(0, charList.length);
		tempVol.setConst(0);
		tempVol.addFrom({ w: imgBufToRgbArr(jpeg.decode(fs.readFileSync('training_set/all/' + testIndex + '/' + fileList[testIndex][math.randomInt(0, fileList[testIndex].length)]))) });
		result = net.forward(tempVol).w;
		if (result[testIndex] != math.max.apply(null, result))
			errorCount++;
	}
	console.log('Correct rate: ' + (100.0 - errorCount / testCount * 100.0) + '%');
	console.log('Last result: \n', result);
}
else
{
	var timeout1 = 1, timeout2 = 1;
	if (fs.readdirSync('training_set').every((i) => { return !(/\./.test(i)); }))
	{
		downloadImg.download(1);
		timeout1 = 500;
	}

	setTimeout
	(
		() =>
		{
			var flag = true, order = null;
			if (fs.readdirSync('training_set/all').every((i) => { return !(/\./.test(i)); }))
			{
				order = cropImg.cropImage();
				flag = false;
				timeout2 = 500;
			}
			// flag = false;

			setTimeout
			(
				() =>
				{
					fileList.push(fs.readdirSync('training_set/all'));
					
					if (order)
					{
						var finalString = '';
						for (var i of order)
							for (var fileIndex in fileList[0])
								if (/\./.test(fileList[0][fileIndex]) && fileList[0][fileIndex].match('^' + i[1] + '_'))
								{
									tempVol.setConst(0);
									tempVol.addFrom({ w: imgBufToRgbArr(jpeg.decode(fs.readFileSync('training_set/all/' + fileList[0][fileIndex]))) });
									var result = net.forward(tempVol).w, charIndex = result.indexOf(math.max.apply(null, result));
									finalString += charList[charIndex];
									console.log('File: ' + fileList[0][fileIndex] + '\n Result: ' + charList[charIndex] + '(' + charIndex + ')');
									if (flag)
										fs.writeFileSync('training_set/all/' + charIndex + '/' + fileList[0][fileIndex], fs.readFileSync('training_set/all/' + fileList[0][fileIndex]), 'binary');
								}
						console.log('Final string: ', finalString);
					}
					else
					{
						for (var fileIndex in fileList[0])
								if (/\./.test(fileList[0][fileIndex]))
								{
									tempVol.setConst(0);
									tempVol.addFrom({ w: imgBufToRgbArr(jpeg.decode(fs.readFileSync('training_set/all/' + fileList[0][fileIndex]))) });
									var result = net.forward(tempVol).w, charIndex = result.indexOf(math.max.apply(null, result));
									console.log('File: ' + fileList[0][fileIndex] + '\n Result: ' + charList[charIndex] + '(' + charIndex + ')');
									if (flag)
										fs.writeFileSync('training_set/all/' + charIndex + '/' + fileList[0][fileIndex], fs.readFileSync('training_set/all/' + fileList[0][fileIndex]), 'binary');
								}
					}
					
					if (flag)
					{
						downloadImg.clearDownload();
						cropImg.clearImg();
					}
				},
				timeout2
			);
		},
		timeout1
	);
}
