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
(cb) =>
{
    ensureFolderExist('training_set');
    
    return new Promise
    (
        (resolve, reject) =>
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
                                fs.writeFile('./training_set/' + Date.now() + '.jpg', data, 'binary', (err) => { if (err) reject(err); else resolve(); });
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
    );
};

var sendRequest2 = 
(cookie, cb) =>
{
    return new Promise
    (
        (resolve, reject) =>
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
                                resolve(Buffer.concat(data));
                            }
                        )
                        res.on
                        (
                            'error',
                            (e) =>
                            {
                                reject(e);
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
    );
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

// var di = 
// (i) =>
// {
//     if (i)
//     {
//         sendRequest()
//         .then
//         (
//             () => di(i - 1)
//         );
//     }
// }
// di(100);
