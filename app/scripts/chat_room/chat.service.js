(function() {
  'use strict';

  var http = require('http');
  var net = require('net');

  angular.module('app')
    .factory('chatService', chatService);

  function chatService(
    util,
    lodash,
    $http,
    $interval,
    $rootScope
  ) {

    var keepUpdateRoomInfo;
    var danmuServer = {
      ip: 'openbarrage.douyutv.com',
      port: 8601
    }
    var danmuClient;
    var rollType;
    var rollKey;
    var roomInfoApiRoot = 'http://open.douyucdn.cn/api/RoomApi/room/';

    $rootScope.$on('abortCurrConn', function () {
        console.log('ending client...');
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
      isStartRoll: false,
      candidates: [],
      startRoll: startRoll,
      messages: [],
      isSpeak: false
    };


    return service;

    function startRoll (type, key) {
      service.isStartRoll = true;
      rollType = type;
      rollKey = key;
    }

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

      $http.get(roomInfoApiRoot+roomID)
        .then(function (response) {
          var rInfo = response.data.data;
          service.roomInfo.roomName = rInfo.room_name;
          service.roomInfo.spectator = rInfo.online;
          service.roomInfo.isLive = parseInt(rInfo.room_status);
        }, function (err) {
          console.log(err);
        })
    }

    function getRoomInfo (roomAddr) {
      var roomID = roomAddr.split('/')[3];

      util.showMsg("开始获取房间信息");

      $http.get(roomInfoApiRoot+roomID)
        .then(function (response) {
          var roomInfo = response.data.data;
          console.log(roomInfo);
          util.giftConfig=roomInfo.gift;

          service.roomInfo.anchor = roomInfo.owner_name;
          service.roomInfo.roomName = roomInfo.room_name;
          service.roomInfo.roomID = roomInfo.room_id;
          service.roomInfo.spectator = roomInfo.online;
          service.roomInfo.isLive = parseInt(roomInfo.room_status);  // live:1 offline:2

          console.log(service.roomInfo);

          //run one time here to get number of online 
          service.updateRoomInfo(service.roomInfo.roomID);
          // update room info every min after connect to charing server
          service.startUpdateRoomInfo();

          service.roomInfoStatus.isReady = true;
          
          connDanmuServ(service.roomInfo.roomID);
          util.showMsg('获取房间信息成功!');
        }, function (e) {
          util.showMsg('获取房间信息失败!');
        });
    }

    function connDanmuServ (roomID) {
      util.showMsg("寻找弹幕服务器中...");
      danmuClient = net.connect({host:danmuServer.ip, port:danmuServer.port},
        function () {
        util.showMsg("弹幕服务器找到 开始连接");

        var loginServer = "type@=loginreq/roomid@="+roomID+"/";
        var joinGroup = "type@=joingroup/rid@=" + roomID + "/gid@=-9999/";

        danmuClient.write(util.toBytes(loginServer));
        danmuClient.write(util.toBytes(joinGroup));
        console.log('login request sent');
        service.chatStatus.hasStartFetchMsg = true; 
        //keep Alive!
        $interval(function () {
          danmuClient.write(util.toBytes("type@=keeplive/tick@=" + Math.floor(Date.now() / 1000) + "/"));
        }, 45000);
      });


      danmuClient.on('data', function (data) {
        var msg = data.toString();
        var qItem = util.parseReadable(msg);
        service.messages.push(qItem);
        $rootScope.$broadcast('newMsgArrive');

        if (service.isSpeak && qItem.type === 'msg') {
          var msg = new SpeechSynthesisUtterance(qItem.content);
          msg.lang = 'zh-CN';
          window.speechSynthesis.speak(msg);
        }
        
        if (service.isStartRoll) {
          if (rollType==='keyWord' && qItem.type === 'msg' && qItem.content.indexOf(rollKey)>-1) {
            qItem.getLucky = false;
            service.candidates.push(qItem);
            $rootScope.$broadcast('newCandidateArrive');
          }
          if (rollType==='gift' && qItem.type==='gift') {
            var idx = lodash.findIndex(service.candidates, function(o) {
              return o.userName === qItem.userName; 
            });
            if (idx>-1) {
              service.candidates[idx].giftValue += qItem.giftValue
              $rootScope.$broadcast('newCandidateArrive');
            } else {
              var newCandi = {
                userName: qItem.userName,
                giftValue: qItem.giftValue,
                getLucky: false
              };
              service.candidates.push(newCandi);
              $rootScope.$broadcast('newCandidateArrive');
            }
          }

        }
      });

      danmuClient.on('end', function () {
        console.error('Disconnect to Danmu server');
        util.showMsg("弹幕服务器连接断开");
      });

      danmuClient.on('error', function () {
        console.error('Error: Danmu server');
        util.showMsg("弹幕服务器连接错误");
        connDanmuServ(roomID);
        util.showMsg("重连弹幕服务器...");
      });
    }

  }
})();
