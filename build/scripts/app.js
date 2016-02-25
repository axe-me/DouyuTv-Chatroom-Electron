
(function () {
    'use strict';
    
    var _templateBase = './scripts';
    
    angular.module('app', [
        'ui.router',
        'ngMaterial',
        'ngAnimate'
    ])

})();
(function() {
  'use strict';

  angular
    .module('app')
    .config(chatRoomRoute);

  /** @ngInject */
  function chatRoomRoute($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('main', {
        url: '/',
        templateUrl: './scripts/chat_room/chat-room.html',
        controller: 'ChatController',
      });

      $urlRouterProvider.otherwise('/');
  }

})();

(function() {
  'use strict';

  var http = require('http');
  var net = require('net');
  var uuid = require('node-uuid');
  var md5 = require('md5');

  angular.module('app')
    .factory('chatService', chatService);

  function chatService(
    util,
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
      var auth = md5("room/"+roomID+urlMid+time+"1231");
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
          var vk = md5(time+magicString+devID);
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

(function() {
  'use strict';

  angular.module('app')
    .factory('util', util);

  function util($mdToast) {

    var service = {
      giftConfig: {},
      toBytes: toBytes,
      parseReadable: parseReadable,
      showMsg: showMsg,
      scrollChatRoom: scrollChatRoom,
      enableScroll: true
    };

    return service;

    function showMsg (text) {
      $mdToast.show(
        $mdToast.simple()
          .textContent(text)
          .hideDelay(5000)
      );
    }

    function scrollChatRoom () {
      var element = document.getElementById("chat-room-id");
      element.scrollTop = element.scrollHeight + 20;
    }

    function parseReadable (rawData) {
      var item = {};

      if (rawData.indexOf('chatmessage') > -1) {          // chat message
        item.type = 'msg';
        item.userName = /\/snick@=(.+?)\//.exec(rawData)[1]; 
        item.content = /\/content@=(.+?)\//.exec(rawData)[1];

        item.str = item.userName + ': ' + item.content;
      } else if (rawData.indexOf('userenter') > -1) {       //user enter
        item.type = 'userEnter';
        item.userName = /nick@A=(.+?)@/.exec(rawData)[1];

        item.str = item.userName + ' 进入直播间';
      } else if (rawData.indexOf('dgn') > -1) {         // gift
        item.type = 'gift';
        item.userName = /\/src_ncnm@=(.+?)\//.exec(rawData)[1];
        item.hits = /\/hits@=(.+?)\//.exec(rawData)[1];
        var giftID = /gfid@=(\d+)/.exec(rawData)[1];
        var giftInfo = service.giftConfig[giftID];
        
        if (giftInfo.type===1) {
          if (giftInfo.name!=='100鱼丸')
            item.giftName = giftInfo.name+'('+giftInfo.pc+' 鱼丸)';
          else
            item.giftName = giftInfo.pc+' 鱼丸';
        } else {
          item.giftName = giftInfo.name+'('+giftInfo.pc/100+' 鱼翅)';
        }

        item.icon = giftInfo.cimg;

        item.str = item.userName + '赠送礼物 x' + item.hits;
      } else if (rawData.indexOf('blackres') > -1) {
        item.type = 'blackList'
        item.managerName = /snick@=(.*)\/dnick/.exec(rawData)[1];
        item.userName = /dnick@=(.*)\//.exec(rawData)[1];
        item.time = /limittime@=(.\d+)/.exec(rawData)[1] / 3600;
      } else {                                      //__________ other
        //console.log(rawData);
        /********************
        * Known unknown data
        * 别房间的火箭 type@=spbc/sn@=点赞哥/dn@=環妹你好/gn@=火箭/gc@=1/drid@=170587/gs@=6/gb@=1/es@=1/gfid@=59/eid@=7/rid@=20360/gid@=74/
        * 用户升级 type@=upgrade/uid@=34667344/rid@=52/gid@=262/nn@=小不懂之魑魅魍魉/level@=4/ douyuMsg.service.js:41
        * 房管封人 snick是房管 type@=blackres/rescode@=0/rid@=532152/gid@=80/blacktype@=2/userid@=21706780/limittime@=356400/snick@=周子建建建/dnick@=金色幻想/douyuMsg.service.js:41 
        * 获得在线酬勤鱼丸 type@=onlinegift/rid@=532152/uid@=5889567/gid@=89/sil@=251/if@=6/ct@=0/nn@=rafeenia/ur@=1/level@=6/
        */
        item.type = 'unknown';
        item.str = 'unknown';

      }

      return item;
    }

    function toBytes(content) {
      var length = [content.length + 9, 0x00, 0x00, 0x00];
      var magic = [0xb1, 0x02, 0x00, 0x00];
      var ending = [0x00];
      var contentArr = [];

      for (var i = 0; i < content.length; ++i) {
        contentArr.push(content.charCodeAt(i));
      }

      var msg = length.concat(length, magic, contentArr, ending);
      var buf = new Buffer(msg);

      return buf;
    }
  }
})();

'use strict';

angular
	.module('app')
	.controller('ChatController', ChatController);

function ChatController($scope, $rootScope, chatService, $interval, util) {

	var currentRoom;

	angular.extend($scope, {
		roomAddr: "http://www.douyutv.com/532152",
		startGetMsg: startGetMsg,
		roomInfoStatus: chatService.roomInfoStatus,
		roomInfo: chatService.roomInfo,
		messages: chatService.messages
	});

	// $interval(function function_name () {
	// 	console.log($scope.roomInfo);
	// }, 2000);

	$scope.$on('newMsgArrive', function () {
        if (util.enableScroll) { util.scrollChatRoom() };
        $scope.$apply();
	});

	function startGetMsg () {
		if (currentRoom !== $scope.roomAddr) {
			chatService.messages = [];
			$scope.messages = chatService.messages;
		}
		currentRoom = $scope.roomAddr;
		if (chatService.chatStatus.hasStartFetchMsg) {
			$rootScope.$broadcast('abortCurrConn');
			chatService.chatStatus.hasStartFetchMsg = false;
		};
		chatService.getRoomInfo(currentRoom, true);
	}
}	
