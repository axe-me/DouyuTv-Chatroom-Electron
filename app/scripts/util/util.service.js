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
