const http = require('https');
const fs = require('fs');

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

var sendRequest = 
(iterationCount, cb) =>
{
    ensureFolderExist('training_set');
    
    if (typeof iterationCount === 'number' && iterationCount)
    {
        var request = 
        http.request
        (
            {
                hostname: 'w6.ab.ust.hk',
                path: '/fbs_user/Captcha.jpg?' + Math.random(),
                method: 'GET',
                headers: { 'Cookie': "jsessionid=2122221485440166406" }
            },
            (res) =>
            {
                if (res.statusCode == 200) // HTTP OK
                {
                    var data = '';

                    res.setEncoding('binary');

                    res.on
                    (
                        'data',
                        (chunk) =>
                        {
                            data += chunk;
                        }
                    );
                    res.on
                    (
                        'end',
                        () =>
                        {
                            // downloadCaptchaImg(data);
                            fs.writeFile('./training_set/' + Date.now() + '.jpg', data, 'binary', (err) => { if (err) console.error(err); else console.log('File saved!'); setTimeout(() => { sendRequest(iterationCount - 1); }, 5000); });
                            setTimeout(cb, 100);
                        }
                    )
                    res.on
                    (
                        'error',
                        (e) =>
                        {
                            throw e;
                        }
                    );
                }
                else
                    console.error("Request failed...");
            }
        );
        request.setHeader('content-type', 'image/ipg');
        request.end();
    }
};

var sendRequest2 = 
(cookie, cb) =>
{
    var request = 
    http.request
    (
        {
            hostname: 'w6.ab.ust.hk',
            path: '/fbs_user/Captcha.jpg?' + Math.random(),
            method: 'GET',
            headers: { 'Cookie': cookie }
        },
        (res) =>
        {
            if (res.statusCode == 200) // HTTP OK
            {
                var data = [];

                // res.setEncoding('binary');

                res.on
                (
                    'data',
                    (chunk) =>
                    {
                        data.push(chunk);
                    }
                );
                res.on
                (
                    'end',
                    () =>
                    {
                        // downloadCaptchaImg(data);
                        cb(Buffer.concat(data));
                    }
                )
                res.on
                (
                    'error',
                    (e) =>
                    {
                        console.error(e);
                    }
                );
            }
            else
                console.error("Request failed...");
        }
    );
    request.setHeader('content-type', 'image/ipg');
    request.end();
};

var clearFiles = 
function ()
{
    ensureFolderExist('training_set');

    var fl = fs.readdirSync('training_set');
    for (var i of fl)
        if (/\./.test(i) && fs.existsSync('training_set/' + i))
            fs.unlinkSync('training_set/' + i);
};

exports.downloadAndSave = sendRequest;
exports.download = sendRequest2;
exports.clearDownload = clearFiles;

// sendRequest(50,() => {});
