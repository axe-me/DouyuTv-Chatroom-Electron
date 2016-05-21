
(function () {
    'use strict';
    
    var _templateBase = './scripts';
    
    angular.module('app', [
        'ui.router',
        'ngMaterial',
        'ngAnimate',
        'angular-md5',
        'ngLodash'
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

  angular
    .module('app')
    .config(rollRoute);

  /** @ngInject */
  function rollRoute($stateProvider) {
    $stateProvider
      .state('roll', {
        url: '/roll',
        templateUrl: './scripts/roll_gift/roll_gift.html',
        controller: 'RollController',
      });
  }

})();

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

    function deserialize (rawData) {
      var rawToString = rawData.substring(rawData.indexOf('type@=')).trim();
      var dataArr = rawToString.split('/');
      var dataObj = {}

      var kv = "";
      var v;
      for (var i = 0; i < dataArr.length-1; i++) {
        kv = dataArr[i].split('@=');
        v = kv[1];
        v = v.replace(/@S/g, '/');
        v = v.replace(/@A/g, '@');
        dataObj[kv[0]] = v;
      };

      if (dataObj.type === "bc_buy_deserve") {
        console.log(rawData);
        dataArr = dataObj.sui.split('/');
        dataObj.sui = {};
        for (var i = 0; i < dataArr.length-1; i++) {
          kv = dataArr[i].split('@=');
          v = kv[1];
          v = v.replace(/@S/g, '/');
          v = v.replace(/@A/g, '@');
          dataObj.sui[kv[0]] = v;
        };
      };
      console.log(dataObj);
      return dataObj;
    }

    function parseReadable (rawData) {
      var item = {};
      var dataObj = deserialize(rawData);

      if (dataObj.type === 'chatmsg') {
        item.type = 'msg';
        item.userName = dataObj.nn;
        item.content = dataObj.txt;
      } else if (dataObj.type === 'uenter') {
        item.type = 'userEnter';
        item.userName = dataObj.nn;
      } else if (dataObj.type === 'dgb') {
        item.type = 'gift';
        item.userName = dataObj.nn;
        item.hits = dataObj.hits;

        var giftInfo = {};

        for (var i = 0; i < service.giftConfig.length; i++) {
          if (service.giftConfig[i].id == dataObj.gfid) {
            giftInfo = service.giftConfig[i];
            break;
          } 
        };
        item.giftValue=giftInfo.gx;

        if (giftInfo.type==="1") {
          if (giftInfo.name!=='100鱼丸')
            item.giftName = giftInfo.name+'('+giftInfo.pc+' 鱼丸)';
          else
            item.giftName = giftInfo.pc+' 鱼丸';
        } else {
          item.giftName = giftInfo.name+'('+giftInfo.pc+' 鱼翅)';
        }

        item.icon = giftInfo.mimg;

      } else if (dataObj.type === 'bc_buy_deserve') {
        item.type = 'gift';
        console.log(dataObj);
        item.userName = dataObj.sui.nick;
        item.hits = dataObj.hits;

        var lvl = dataObj.lev;
        if (lvl==1) {
          item.giftName = "初级酬勤";
          item.giftValue = 150;
        };
        if (lvl==2) {
          item.giftName = "中级酬勤";
          item.giftValue = 300;
        };
        if (lvl==3) {
          item.giftName = "高级酬勤";
          item.giftValue = 500;
        };
      } else if (dataObj.type === 'blackres') {
        console.log(dataObj);
        item.type = 'blackList';
        item.managerName = dataObj.snick;
        item.userName = dataObj.dnick;
        item.time = parseInt(dataObj.limittime) / 3600;
      } else if (dataObj.type === 'keeplive') {
        //do nothing
        item.type = 'keeplive';
      } else {
        console.log(dataObj);
        item.type = 'unknown';
        item.str = 'unknown';
      };

      return item;
    }

    function toBytes(content) {
      var length = [content.length + 9, 0x00, 0x00, 0x00];
      var magic = [0xb1, 0x02, 0x00, 0x00];  //little ending hex number 689
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
		isOpenDial: false,
		roomAddr: "http://www.douyu.com/276506",
		startGetMsg: startGetMsg,
		roomInfoStatus: chatService.roomInfoStatus,
		roomInfo: chatService.roomInfo,
		messages: chatService.messages,
		toggleScroll: toggleScroll,
		toggleScrollFabStatus: {
			icon: 'assets/icon/ic_not_interested_black_24px.svg',
			tooltip: '禁止滚动'
		},
		toggleSpeak: toggleSpeak,
		toggleSpeakFabStatus: {
			icon: 'assets/icon/ic_volume_off_black_24px.svg',
			tooltip: '开启语音'
		},
		openSearchBar: false,
		disableScroll: disableScroll,
		clearFilter: clearFilter,
		getRoomStatusStr: getRoomStatusStr,
		getRoomStatusClass: getRoomStatusClass
	});

	$scope.$on('newMsgArrive', function () {
        $scope.$apply();
        if (util.enableScroll) { util.scrollChatRoom() };
	});

	function getRoomStatusStr () {
		return chatService.roomInfo.isLive===1?"直播中":"未直播";
	}
	function getRoomStatusClass () {
		return chatService.roomInfo.isLive===1?"online":"offline";
	}

	function clearFilter () {
		$scope.openSearchBar = false;
		$scope.danmuFilter = "";
	}

	function disableScroll() {
		util.enableScroll = false;
	}

	function toggleScroll() {
		util.enableScroll = !util.enableScroll;
		if (util.enableScroll) {
			$scope.toggleScrollFabStatus.icon = 'assets/icon/ic_not_interested_black_24px.svg';
			$scope.toggleScrollFabStatus.tooltip = '禁止滚动';
		} else {
			$scope.toggleScrollFabStatus.icon = 'assets/icon/ic_format_line_spacing_black_24px.svg';
			$scope.toggleScrollFabStatus.tooltip = '开启滚动';
		}
	}

	function toggleSpeak() {
		chatService.isSpeak = !chatService.isSpeak;
		if (chatService.isSpeak) {
			$scope.toggleSpeakFabStatus.icon = 'assets/icon/ic_volume_up_black_24px.svg';
			$scope.toggleSpeakFabStatus.tooltip = '禁用语音';
		} else {
			$scope.toggleSpeakFabStatus.icon = 'assets/icon/ic_volume_off_black_24px.svg';
			$scope.toggleSpeakFabStatus.tooltip = '开启语音';
		}
	}

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

'use strict';

angular
	.module('app')
	.controller('RollController', RollController);

function RollController($scope, chatService, $interval, util, lodash) {

	var hasCandidates = false;

	angular.extend($scope, {
		rollKey: "ShaneX真帅",
		rollNum: 3,
		rollFunc: rollFunc,
		rollType: "keyWord",
		giftType: "luck",
		candidates: chatService.candidates,
		rollBtnText: "开始",
		lockInput: false,
		enableScrollChat: enableScrollChat
	});

	function enableScrollChat () {
		util.enableScroll = true;
	}

	function selectRandCandi () {
		var uniArr = lodash.uniqBy($scope.candidates, 'userName');
		if (uniArr.length<=$scope.rollNum) {
			lodash.forEach($scope.candidates, function (o) {
				o.getLucky = true;
			});
		} else {
			var num=0;
			while (num<$scope.rollNum) {
				var randomIdx = Math.floor(Math.random()*$scope.candidates.length);
				var idx = lodash.findIndex($scope.candidates, function(o) {
	              return o.name === $scope.candidates[randomIdx].userName;
	            });
				if (idx===-1) {
					$scope.candidates[randomIdx].getLucky = true;
					num++;
				}
			}
		}
	}

	function rollFunc () {
		if (hasCandidates) {
			// clean last time shit
			chatService.candidates = [];
			$scope.candidates = [];
			$scope.lockInput = false;
			hasCandidates = false;
			$scope.rollBtnText = "开始";
		} else {
			if (!chatService.isStartRoll) {
				// start roll
				$scope.lockInput = true;
				$scope.rollBtnText = "Roll!";
				chatService.startRoll($scope.rollType, $scope.rollKey);
			} else {
				// stop roll
				hasCandidates = true;
				$scope.rollBtnText = "清空重Roll";
				chatService.isStartRoll = false;

				if ($scope.rollType==="gift"&&$scope.giftType==="amount") {
					util.showMsg("赠送礼物前"+$scope.rollNum+"名已在榜!");
				} else {
					selectRandCandi();
				}
			}
		}
	}

	$scope.$on('newCandidateArrive', function () {
		$scope.candidates = chatService.candidates;
        $scope.$apply();
	});

}	
