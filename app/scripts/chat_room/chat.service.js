(function() {
  'use strict';

  var http = require('http');
  var net = require('net');
  var uuid = require('node-uuid');
  var md5 = require('md5');

  angular.module('app')
    .factory('chatService', chatService);

  function chatService(
    util
  ) {

    var service = {
      roomInfo: {},
      roomInfoStatus: { isReady: false },
      getRoomInfo: getRoomInfo
    };

    return service;

    function getRoomInfo (roomAddr, onlyUpdate) {
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
          var serverObj=angular.fromJson(unescape(authServerRegex.exec(html)[1]));;
          util.giftConfig=angular.fromJson(giftConfigRegex.exec(html)[1]);

          service.roomInfo.anchor = roomObj.owner_name;
          service.roomInfo.roomName = roomObj.room_name;
          service.roomInfo.roomID = roomObj.room_id;

          service.roomInfoStatus.isReady = true;

          if (!onlyUpdate)
            connAuthServ(serverObj[0], service.roomInfo.roomID);

          util.showMsg('获取房间信息成功!');
        });
      }).on('error', function (e) {
        util.showMsg('获取房间信息失败!');
      });
    }

  }
})();
