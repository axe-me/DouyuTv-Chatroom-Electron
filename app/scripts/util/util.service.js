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
