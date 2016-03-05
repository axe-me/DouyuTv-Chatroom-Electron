# Fishbone Douyu Chatroom Helper
## 鱼骨---斗鱼弹幕助手[跨平台版]

This application is built with Angular JS and Github Electron.

#Features
---
* 跨平台 Cross-platform, it's written using Github Electron.
* 抽奖 Roll
* 搜索弹幕 Searching
* 弹幕语音 Text To Speak
 
#Install
--- 

Install dependencies.

```
	npm install

	bower install
```


#Run 
---
Run dev application
```
	gulp dev
```

Run built application by entering following command

```
	gulp run
```

#Release
---
* Don't forget to disable devtool befor build!
Get the release version with following command:

```
gulp dist
```
Files will be generated int dist folder.

#TODO
---
* Send Message
	- Too lazy to implement this, lol. Well, the true reason is I didn't find this is necessary, why a streamer need text communication while streaming?? Another reason is sending messages requires user login which maybe cause security issues (eg. some bad ass copy my code and add some account steal code in it then re-publish it).
* Export messages

#Bugs
---
	While developing this app I found douyutv actually using two sets of message protacol. I do have some code to handle this shity protacol, but I'm not sure if I handled all of issues caused by this. So, if you find any bugs please create an Issue.


