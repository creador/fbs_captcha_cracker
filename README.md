# fbs_captcha_cracker
Only for HKUST FBS system

##Prerequisite
<ul>
<li>Nodejs (v7.x)</li>
<ul>
<li>mathjs</li>
<li>color-convert</li>
<li>jpeg-js</li>
<li>convnetjs</li>
<li>sharp</li>
<li>delta-e</li></ul>
</ul>

##Usage
```
nodejs release.js
```
You can change port number in release.js
```
//-------------------------------------------------
// Config
const port = 8080;
//-------------------------------------------------
```

After the server running, you can send http request to the server. </br>
For example, let IP address is 127.0.0.1， port is 8080 and cookie is 'jsessionid=123456789789'
```
http://127.0.0.1:8080?cookie=jsessionid=123456789789
```
And get the result
```
fffyxx
```
