const http = require('https');
const fs = require('fs');

// var server =
// http.createServer
// (
//     (req, res) =>
//     {
//         res.end();
//     }
// )
// server.listen(8000);

var sendRequest = 
(iterationCount) =>
{
    if (typeof iterationCount === 'number' && iterationCount)
    {
        var request = 
        http.request
        (
            {
                hostname: 'w6.ab.ust.hk',
                path: '/fbs_user/Captcha.jpg?' + Math.random(),
                method: 'GET'
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
    }
};

sendRequest(50);
