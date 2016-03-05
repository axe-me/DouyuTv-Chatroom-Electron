
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
    md5,
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
      messages: []
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
          
          connDanmuServ(service.roomInfo.roomID);

          util.showMsg('获取房间信息成功!');
        });
      }).on('error', function (e) {
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

    function parseReadable (rawData) {
      var item = {};

      //console.log(rawData.substring(rawData.indexOf('type'),rawData.length-2));

      if (rawData.indexOf('chatmessage') > -1 || rawData.indexOf('chatmsg') > -1) {          // chat message
        item.type = 'msg';
        var nameRegexResult = /\/snick@=(.+?)\//.exec(rawData);
        var contentRegexResult = /\/content@=(.+?)\//.exec(rawData);

        if (nameRegexResult!==null) 
          item.userName = nameRegexResult[1];
        else{
          item.userName = /\/nn@=(.+?)\//.exec(rawData)[1]; 
        }
        if (contentRegexResult!==null) 
          item.content = contentRegexResult[1] || "[斗鱼服务器抽风发了不可识别数据]";
        else {
          item.content = /\/txt@=(.+?)\//.exec(rawData)[1] || "[斗鱼服务器抽风发了不可识别数据]";
        }
        item.str = item.userName + ': ' + item.content;
      } else if (rawData.indexOf('userenter') > -1 || rawData.indexOf('uenter') > -1) {       //user enter
        item.type = 'userEnter';
        if (rawData.indexOf('userenter') > -1) {
          item.userName = /nick@A=(.+?)@/.exec(rawData)[1];
        } else{
          item.userName = /nn@=(.+?)\//.exec(rawData)[1];
        }

        item.str = item.userName + ' 进入直播间';
      } else if (rawData.indexOf('dgn') > -1 || rawData.indexOf('dgb') > -1) {         // gift
        item.type = 'gift';
        if (rawData.indexOf('dgn') > -1) {
          item.userName = /\/src_ncnm@=(.+?)\//.exec(rawData)[1];
          item.hits = /\/hits@=(.+?)\//.exec(rawData)[1];
        } else{
          item.userName = /\/nn@=(.+?)\//.exec(rawData)[1];
          var hitRegexMatch = /hits@=(.+?)\//.exec(rawData);
          item.hits = hitRegexMatch===null?1:hitRegexMatch[1];
        }
        var giftID = /gfid@=(\d+)/.exec(rawData)[1];
        var giftInfo = service.giftConfig[giftID];
        
        item.giftValue=giftInfo.pc;

        if (giftInfo.type===1) {
          if (giftInfo.name!=='100鱼丸')
            item.giftName = giftInfo.name+'('+giftInfo.pc+' 鱼丸)';
          else
            item.giftName = giftInfo.pc+' 鱼丸';
        } else {
          if (giftInfo.pc === 10) {item.giftValue=100};
          item.giftName = giftInfo.name+'('+giftInfo.pc/100+' 鱼翅)';
        }

        item.icon = giftInfo.cimg;

        item.str = item.userName + '赠送礼物 x' + item.hits;
      } else if (rawData.indexOf('blackres') > -1) {
        item.type = 'blackList';
        item.managerName = /snick@=(.*)\/dnick/.exec(rawData)[1];
        item.userName = /dnick@=(.*)\//.exec(rawData)[1];
        item.time = /limittime@=(.\d+)/.exec(rawData)[1] / 3600;
      } else if (rawData.indexOf('keeplive') > -1) {
        //do nothing
        item.type = 'keeplive';
      } else if (rawData.indexOf('bc_buy_deserve') > -1) {
        item.type = 'gift';
        item.userName = /Snick@A=(.*)@Srg/.exec(rawData)[1];
        item.hits = /hits@=(\d)/.exec(rawData)[1];

        var lvl = /lev@=(\d)/.exec(rawData)[1];
        if (lvl==1) {
          item.giftName = "初级酬勤";
          item.giftValue = 15000;
        };
        if (lvl==2) {
          item.giftName = "中级酬勤";
          item.giftValue = 30000;
        };
        if (lvl==3) {
          item.giftName = "高级酬勤";
          item.giftValue = 50000;
        };
      } else {                                      //__________ other
        console.log(rawData);
        /********************
        * type@=bc_buy_deserve/level@=3/lev@=3/rid@=138286/gid@=80/cnt@=1/hits@=4/sid@=1895348/sui@=id@A=1895348@Sname@A=qq_GtBWGI1K@Snick@A=Leslie最爱雷同学@Srg@A=1@Spg@A=1@Srt@A=1408094829@Sbg@A=0@Sweight@A=500@Sstrength@A=12700@Scps_id@A=0@Sps@A=1@Ses@A=1@Sver@A=20150929@Sm_deserve_lev@A=3@Scq_cnt@A=1@Sbest_dlev@A=0@Sglobal_ban_lev@A=0@Sexp@A=12700@Slevel@A=3@Scurr_exp@A=7200@Sup_need@A=1800@Sgt@A=0@S/
        * type@=donateres/rid@=138286/gid@=88/ms@=100/sb@=208/src_strength@=10100/dst_weight@=439625822/hc@=1/r@=0/gfid@=1/gfcnt@=0/sui@=id@A=13782391@Srg@A=1@Snick@A=2860641930@Scur_lev@A=0@Scq_cnt@A=0@Sbest_dlev@A=0@Slevel@A=4@S/
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
		roomAddr: "http://www.douyutv.com/67554",
		startGetMsg: startGetMsg,
		roomInfoStatus: chatService.roomInfoStatus,
		roomInfo: chatService.roomInfo,
		messages: chatService.messages,
		toggleScroll: toggleScroll,
		toggleScrollFabStatus: {
			icon: 'assets/icon/ic_not_interested_black_24px.svg',
			tooltip: '禁止滚动'
		},
		openSearchBar: false,
		disableScroll: disableScroll,
		clearFilter: clearFilter,
		getRoomStatusStr: getRoomStatusStr
	});

	$scope.$on('newMsgArrive', function () {
        $scope.$apply();
        if (util.enableScroll) { util.scrollChatRoom() };
	});

	function getRoomStatusStr () {
		return chatService.roomInfo.isLive===1?["直播中","online"]:["未直播","offline"];
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
