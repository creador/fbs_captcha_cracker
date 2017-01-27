// const plotly = require('plotly')('PeterLau', 'gzocfwYnibdU1cYLAAcd')
const math = require('mathjs');
const jpeg = require('jpeg-js');
const colorConvert = require('color-convert');
const deltaE = require('delta-e');
const sharp = require('sharp');
const fs = require('fs');

const coreColor = { r: { L: 53, A: 80, B: 67 },
                    g: { L: 46, A: -52, B: 50 },
                    br: { L: 36, A: 40, B: 48 },
                    bl: { L: 27, A: 70, B: -96 },
                    pi: { L: 59, A: 97, B: -60 },
                    pu: { L: 47, A: 81, B: -81 } };
const colorName = [ 'r', 'g', 'br', 'bl', 'pi', 'pu' ];

const imgOffset = [ 2, 5 ];

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

var getPixelRgb = 
(rawData, x, y) =>
{
    if (x >= rawData.width || y >= rawData.height)
        throw new Error('Error: Trying to get pixel which is out of boundary');
    return rawData.data.slice(4 * (x + y * rawData.width), 4 * (x + y * rawData.width + 1) - 1);
};

var getColDistToCC = 
(rawData, x, y, coreColorKey) =>
{
    var p1 = colorConvert.rgb.lab.apply(null, getPixelRgb(rawData, x, y));
    p1.L = p1[0]; p1.A = p1[1]; p1.B = p1[2];
    return deltaE.getDeltaE00(p1, coreColor[coreColorKey]);
};

var getColorDiff = 
(rawData, x1, y1, x2, y2) =>
{
    var p1 = colorConvert.rgb.lab.apply(null, getPixelRgb(rawData, x1, y1)),
        p2 = colorConvert.rgb.lab.apply(null, getPixelRgb(rawData, x2, y2));
    p1.L = p1[0]; p1.A = p1[1]; p1.B = p1[2];
    p2.L = p2[0]; p2.A = p2[1]; p2.B = p2[2];
    return deltaE.getDeltaE00(p1, p2);
};

var rbgaToBow = 
(rawData, x, y) =>
{
    var rgbVal = getPixelRgb(rawData, x, y);
    rawData.data.writeUInt32BE((math.max.apply(null, rgbVal) - math.min.apply(null, rgbVal) <= 60)? 0xFFFFFFFF : 0x000000FF, 4 * (x + y * rawData.width));
};

var rbgaToBowByCC = 
(rawData, x, y, coreColorKey) =>
{
    var tempRgb = getPixelRgb(rawData, x, y);
    rawData.data.writeUInt32BE((getColDistToCC(rawData, x, y, coreColorKey) > 25 && (tempRgb[0] || tempRgb[1] || tempRgb[2]))? 0xFFFFFFFF : 0x000000FF, 4 * (x + y * rawData.width));
};

var cropImage = 
function (saveToTest)
{
    ensureFolderExist('training_set');

    var traningSetList = fs.readdirSync('training_set');
    if (!traningSetList)
    {
        console.error('No traning set');
        process.exit();
    }

    var lastPercentage = -1;
    for (var sampleFN in traningSetList)
    {
        if (/\./.test(traningSetList[sampleFN]))
        {
            // var matches = traningSetList[sampleFN].match(/(.+)\_(.+)/);

            try
            {
                ensureFolderExist('training_set/' + traningSetList[sampleFN]);
                // var jpegData = fs.readFileSync('training_set/' + matches[2]);
                var jpegData = fs.readFileSync('training_set/' + traningSetList[sampleFN]);
                var rawImageData = jpeg.decode(jpegData);
                // console.log(rawImageData);
                // console.log(getColorDiff(rawImageData, 141, 13, 143, 31));

                var ltrb = {};
                for (var i in coreColor)
                    ltrb[i] = [Infinity, Infinity, -Infinity, -Infinity];
                // TODO: crop it, move to another js file, prepare traning set
                for (var i = 0; i < rawImageData.width; i++)
                    for (var j = 0; j < rawImageData.height; j++)
                        for (var k in coreColor)
                            if (getColDistToCC(rawImageData, i, j, k) <= 6)
                            {
                                ltrb[k][0] = math.min(ltrb[k][0], i);
                                ltrb[k][1] = math.min(ltrb[k][1], j);
                                ltrb[k][2] = math.max(ltrb[k][2], i);
                                ltrb[k][3] = math.max(ltrb[k][3], j);
                            }

                var charBuffer = [];
                for (var k in ltrb)
                    charBuffer[k] = { data: Buffer.alloc(0), width: (math.min(ltrb[k][2] + imgOffset[0], rawImageData.width - 1) - math.max(ltrb[k][0] - imgOffset[0], 0) + 1), height: (math.min(ltrb[k][3] + imgOffset[1], rawImageData.height - 1) - math.max(ltrb[k][1] - imgOffset[1], 0) + 1) };

                for (var i = 0; i < rawImageData.height; i++)
                    for (var k in ltrb)
                        if (i >= math.max(0, ltrb[k][1] - imgOffset[1]) && i <= math.min(rawImageData.height - 1, ltrb[k][3] + imgOffset[1]))
                            charBuffer[k].data = Buffer.concat([charBuffer[k].data, rawImageData.data.slice(4 * (i * rawImageData.width + math.max(ltrb[k][0] - imgOffset[0], 0)), 4 * (i * rawImageData.width + math.min(ltrb[k][2] + imgOffset[0], rawImageData.width - 1) + 1))]);
                
                // for (var k in ltrb)
                //     for (var i = 0; i < charBuffer[k].height; i++)
                //         for (var j = 0; j < charBuffer[k].width; j++)
                //             rbgaToBowByCC(charBuffer[k], j, i, k);
                const saveLocation = 'training_set/' + ((saveToTest)? 'test' : 'all');
                ensureFolderExist(saveLocation);
                for (var k in charBuffer)
                    sharp(jpeg.encode(charBuffer[k], 100).data).resize(28, 28).png().ignoreAspectRatio().toFile(saveLocation + '/' + k + '_' + traningSetList[sampleFN], (err, info) => { if (err) console.error(err); });

                // console.log(ltrb);
            }
            catch (e)
            {
                throw e;
            }
        }

        var newPercentage = math.floor(sampleFN / traningSetList.length * 100);
        if (newPercentage != lastPercentage)
            console.log((lastPercentage = newPercentage) + '% finish!');
    }

    var ltList = [];
    for (var k in ltrb)
        ltList.push([ ltrb[k][0], k ]);
    ltList.sort((a, b) => (a[0] - b[0]));

    console.log('All finish!');
    return ltList;
};

var cropImage2 = 
function (buf)
{
    var lastPercentage = -1;
    try
    {
        var rawImageData = jpeg.decode(buf);
        var ltrb = {};
        for (var i in coreColor)
            ltrb[i] = [Infinity, Infinity, -Infinity, -Infinity];
        // TODO: crop it, move to another js file, prepare traning set
        for (var i = 0; i < rawImageData.width; i++)
            for (var j = 0; j < rawImageData.height; j++)
                for (var k in coreColor)
                    if (getColDistToCC(rawImageData, i, j, k) <= 6)
                    {
                        ltrb[k][0] = math.min(ltrb[k][0], i);
                        ltrb[k][1] = math.min(ltrb[k][1], j);
                        ltrb[k][2] = math.max(ltrb[k][2], i);
                        ltrb[k][3] = math.max(ltrb[k][3], j);
                    }

        var charBuffer = [];
        for (var k in ltrb)
            charBuffer[k] = { data: Buffer.alloc(0), width: (math.min(ltrb[k][2] + imgOffset[0], rawImageData.width - 1) - math.max(ltrb[k][0] - imgOffset[0], 0) + 1), height: (math.min(ltrb[k][3] + imgOffset[1], rawImageData.height - 1) - math.max(ltrb[k][1] - imgOffset[1], 0) + 1) };

        for (var i = 0; i < rawImageData.height; i++)
            for (var k in ltrb)
                if (i >= math.max(0, ltrb[k][1] - imgOffset[1]) && i <= math.min(rawImageData.height - 1, ltrb[k][3] + imgOffset[1]))
                    charBuffer[k].data = Buffer.concat([charBuffer[k].data, rawImageData.data.slice(4 * (i * rawImageData.width + math.max(ltrb[k][0] - imgOffset[0], 0)), 4 * (i * rawImageData.width + math.min(ltrb[k][2] + imgOffset[0], rawImageData.width - 1) + 1))]);
        
        return new Promise
        (
            (resolve, reject) =>
            {
                var lastPromise = null, allCharImg = [], k = 0;

                allCharImg['order'] = [];
                for (var k in ltrb)
                    allCharImg['order'].push([ ltrb[k][0], k ]);
                allCharImg['order'].sort((a, b) => (a[0] - b[0]));

                var resize =
                (i) =>
                {
                    if (i >= colorName.length)
                    {
                        resolve(allCharImg);
                        return ;
                    }
                    sharp(jpeg.encode(charBuffer[colorName[i]], 100).data).resize(28, 28).ignoreAspectRatio().raw().toBuffer()
                    .then
                    (
                        (charBuf) =>
                        {
                            allCharImg[colorName[i]] = charBuf;
                            resize(i + 1);
                        }
                    );
                };

                resize(0);
            }
        );

        // console.log(ltrb);
    }
    catch (e)
    {
        throw e;
    }
};

var clearFiles = 
function (saveToTest)
{
    const saveLocation = 'training_set/' + ((saveToTest)? 'test' : 'all');
    ensureFolderExist(saveLocation);
    var fl = fs.readdirSync(saveLocation);
    for (var i of fl)
        if (/\./.test(i) && fs.existsSync(saveLocation + '/' + i))
            fs.unlinkSync(saveLocation + '/' + i);
};

exports.cropImageAndSave = cropImage;
exports.cropImage = cropImage2;
exports.clearImg = clearFiles;

// cropImage();
