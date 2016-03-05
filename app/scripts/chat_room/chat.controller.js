'use strict';

angular
	.module('app')
	.controller('ChatController', ChatController);

function ChatController($scope, $rootScope, chatService, $interval, util) {

	var currentRoom;

	angular.extend($scope, {
		isOpenDial: false,
		roomAddr: "http://www.douyutv.com/498456",
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
