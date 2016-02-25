(function() {
  'use strict';

  var http = require('http');
  var net = require('net');

  angular.module('app')
    .factory('chatService', chatService);

  function chatService(
    util,
    uuid,
    md5,
    $http,
    $interval,
    $rootScope
  ) {

    var keepUpdateRoomInfo;
    var authServers;
    var danmuServer = {
      ip: 'danmu.douyutv.com',
      port: 8602
    }
    var authClient;
    var danmuClient;

    $rootScope.$on('abortCurrConn', function () {
        console.log('ending client...');
        authClient.end();
        danmuClient.end();
    });

    var service = {
      roomInfo: {},
      roomInfoStatus: { isReady: false },
      getRoomInfo: getRoomInfo,
      updateRoomInfo: updateRoomInfo,
      startUpdateRoomInfo: startUpdateRoomInfo,
      stopUpdateRoomInfo: stopUpdateRoomInfo,
      chatStatus: {
        hasStartFetchMsg: false,
        stopFetchMsg: false
      },
      messages: []
    };


    return service;

    function startUpdateRoomInfo () {
      keepUpdateRoomInfo = $interval(function () {
        if (service.chatStatus.hasStartFetchMsg)
          updateRoomInfo(service.roomInfo.roomID);
        if (service.chatStatus.stopFetchMsg)
          service.stopUpdateRoomInfo();
      }, 60000);
    }

    function stopUpdateRoomInfo () {
      if (angular.isDefined(keepUpdateRoomInfo)) {
        $interval.cancel(keepUpdateRoomInfo);
        keepUpdateRoomInfo = undefined;
      }
    }

    function updateRoomInfo (roomID) {
      var baseURL = "http://capi.douyucdn.cn/api/v1/room/" + roomID;
      var urlMid = "?aid=android&client_sys=android&time=";
      var time = Math.ceil(Date.now()/1000);
      var auth = md5.createHash("room/"+roomID+urlMid+time+"1231");
      var requestURL = baseURL + urlMid + time + "&auth=" + auth

      $http.get(requestURL)
        .then(function (response) {
          var rInfo = response.data.data;
          service.roomInfo.roomName = rInfo.room_name;
          service.roomInfo.spectator = rInfo.online;
        }, function (err) {
          console.log(err);
        })
    }

    function getRoomInfo (roomAddr) {
      var html;
      var roomRegex = /var\s\$ROOM\s=\s({.*})/;
      var authServerRegex = /server_config":"(.*)",/;
      var giftConfigRegex =/var giftBatterConfig = (.*);/;

      util.showMsg("开始获取房间信息");
      http.get(roomAddr, function (res) {
        var html = "";
        util.showMsg("获取房间信息中...");
        res.on("data", function(data) {
          html += data;
        });

        res.on('end', function () {
          var roomObj = angular.fromJson(roomRegex.exec(html)[1]);
          authServers=angular.fromJson(unescape(authServerRegex.exec(html)[1]));

          util.giftConfig=angular.fromJson(giftConfigRegex.exec(html)[1]);

          service.roomInfo.anchor = roomObj.owner_name;
          service.roomInfo.roomName = roomObj.room_name;
          service.roomInfo.roomID = roomObj.room_id;
          service.roomInfo.isLive = roomObj.show_status;  // live:1 offline:2

          //run one time here to get number of online 
          service.updateRoomInfo(service.roomInfo.roomID);
          // update room info every min after connect to charing server
          service.startUpdateRoomInfo();

          service.roomInfoStatus.isReady = true;
          
          connAuthServ(authServers[0], service.roomInfo.roomID);

          util.showMsg('获取房间信息成功!');
        });
      }).on('error', function (e) {
        util.showMsg('获取房间信息失败!');
      });
    }

    function connAuthServ (serv, roomID) {
      var authInfo = "";
      var userRegex = /\/username@=(.+)\/nickname/;
      var gidRegex = /\/gid@=(\d+)\//;
      var username;
      var gid;

      util.showMsg("连接弹幕认证服务器中...");
      authClient = net.connect({host:serv.ip, port:serv.port},
        function() {
          util.showMsg("弹幕服务器认证中...");
          var time = Math.floor(Date.now() / 1000);
          var magicString = '7oE9nPEG9xXV69phU31FYCLUagKeYtsF';
          var devID = uuid.v4().replace(/-/g, '');
          var vk = md5.createHash(time+magicString+devID);
          var dataInit = "type@=loginreq/username@=/ct@=0/password@=/roomid@="+
                      roomID+
                      "/devid@="+devID+
                      "/rt@="+Math.floor(Date.now() / 1000)+
                      "/vk@="+vk+"/ver@=20150929/";
          var dataTwo = "type@=qrl/rid@=" + roomID + "/";
          var dataThr = "type@=keeplive/tick@=" + Math.floor(Date.now() / 1000) +
                     "/vbw@=0/k@=19beba41da8ac2b4c7895a66cab81e23/"

          authClient.write(util.toBytes(dataThr));
          authClient.write(util.toBytes(dataInit));
          authClient.write(util.toBytes(dataTwo));
        });

      authClient.on('data', function (data) {
        authInfo+=data.toString();

        if (!username)
          username = userRegex.exec(authInfo);
        if (!gid)
          gid = gidRegex.exec(authInfo);
        
        if ((username!==null)&&(gid!== null)){
          console.log('Got Auth Response');
          authClient.end();
        }
      });

      authClient.on('end', function () {
        if (username&&gid){
          connDanmuServ(roomID, gid[1], username[1]);
          util.showMsg("弹幕服务器认证完成");
          console.log('Auth server sucess');
        } else {
          console.log('Auth server fail');
          util.showMsg("弹幕服务器认证失败");
          util.showMsg("尝试重新弹幕服务器认证");
          connAuthServ(serv, roomID);
        }
        console.log('Auth server Close');
      });

      authClient.on('error', function (error) {
        console.log('auth fail'+ error.toString());
        util.showMsg("弹幕服务器认证失败");
        util.showMsg("尝试重新弹幕服务器认证");
        connAuthServ(serv, roomID);
      });
    }

    function connDanmuServ (roomID, gid, username) {
      util.showMsg("连接弹幕服务器中...");
      danmuClient = net.connect({host:danmuServer.ip, port:danmuServer.port},
        function () {
        util.showMsg("弹幕服务器连接成功");
        var data = "type@=loginreq/username@="+username+
                    "/password@=1234567890123456/roomid@=" + roomID + "/";
        var dataTwo = "type@=joingroup/rid@=" + roomID + "/gid@="+gid+"/";

        danmuClient.write(util.toBytes(data));
        danmuClient.write(util.toBytes(dataTwo));
        console.log('Start recive data');
        service.chatStatus.hasStartFetchMsg = true; 
        //keep Alive!
        $interval(function () {
          danmuClient.write(util.toBytes("type@=keeplive/tick@=" + Math.floor(Date.now() / 1000) + "/"));
        }, 20000);
        setInterval
      });


      danmuClient.on('data', function (data) {
        var msg = data.toString();
        var qItem = util.parseReadable(msg);
        service.messages.push(qItem);
        $rootScope.$broadcast('newMsgArrive');
      });

      danmuClient.on('end', function () {
        console.error('Disconnect to Danmu server');
        util.showMsg("弹幕服务器连接断开");
      });

      danmuClient.on('error', function () {
        console.error('Error: Danmu server');
        util.showMsg("弹幕服务器连接错误");
      });
    }

  }
})();
