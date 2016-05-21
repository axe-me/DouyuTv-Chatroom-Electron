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
