// const plotly = require('plotly')('PeterLau', 'gzocfwYnibdU1cYLAAcd')
const math = require('mathjs');
const jpeg = require('jpeg-js');
const colorConvert = require('color-convert');
const deltaE = require('delta-e');
const fs = require('fs');

const coreColor = { r: { L: 53, A: 80, B: 67 },
                    g: { L: 46, A: -52, B: 50 },
                    br: { L: 36, A: 40, B: 48 },
                    bl: { L: 27, A: 70, B: -96 },
                    pi: { L: 59, A: 97, B: -60 },
                    pu: { L: 47, A: 83, B: -82 } };
const colorName = [ 'r', 'g', 'br', 'bl', 'pi', 'pu' ];

const imgOffset = 2;

var traningSetList = fs.readdirSync('training_set');
if (!traningSetList)
{
    console.error('No traning set');
    process.exit();
}

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

var lastPercentage = -1;
for (var sampleFN in traningSetList)
{
    try
    {
        var jpegData = fs.readFileSync('training_set/' + traningSetList[sampleFN]);
        var rawImageData = jpeg.decode(jpegData);
        // console.log(rawImageData);
        // console.log(getColorDiff(rawImageData, 141, 13, 143, 31));

        var ltrb = {};
        for (var i in coreColor)
            ltrb[i] = [Infinity, Infinity, -Infinity, -Infinity];
        // TODO: crop it, move to another js file, prepare traning set
        for (var i = 0; i < rawImageData.width; i++)
        {
            for (var j = 0; j < rawImageData.height; j++)
            {
                for (var k in coreColor)
                {
                    if (getColDistToCC(rawImageData, i, j, k) <= 6)
                    {
                        ltrb[k][0] = math.min(ltrb[k][0], i);
                        ltrb[k][1] = math.min(ltrb[k][1], j);
                        ltrb[k][2] = math.max(ltrb[k][2], i);
                        ltrb[k][3] = math.max(ltrb[k][3], j);
                    }
                }
            }
        }
        

        var charBuffer = [];
        for (var k in ltrb)
            charBuffer[k] = { data: Buffer.alloc(0), width: (math.min(ltrb[k][2] + imgOffset, rawImageData.width - 1) - math.max(ltrb[k][0] - imgOffset, 0) + 1), height: (math.min(ltrb[k][3] + imgOffset, rawImageData.height - 1) - math.max(ltrb[k][1] - imgOffset, 0) + 1) };

        for (var i = 0; i < rawImageData.height; i++)
            for (var k in ltrb)
                if (i >= math.max(0, ltrb[k][1] - imgOffset) && i <= math.min(rawImageData.height - 1, ltrb[k][3] + imgOffset))
                    charBuffer[k].data = Buffer.concat([charBuffer[k].data, rawImageData.data.slice(4 * (i * rawImageData.width + math.max(ltrb[k][0] - imgOffset, 0)), 4 * (i * rawImageData.width + math.min(ltrb[k][2] + imgOffset, rawImageData.width - 1) + 1))]);

        for (var k in charBuffer)
            fs.writeFileSync('training_set/' + k + '/' + traningSetList[sampleFN], jpeg.encode(charBuffer[k], 100).data, { encoding: 'binary' });

        // console.log(ltrb);
    }
    catch (e) {}

    var newPercentage = math.floor(sampleFN / traningSetList.length * 100);
    if (newPercentage != lastPercentage)
        console.log((lastPercentage = newPercentage) + '% finish!');
}

// console.log(colorConvert.rgb.lab.apply(null, [5, 5, 215]));
console.log('All finish!');
