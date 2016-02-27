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
		}
	});

	// $interval(function function_name () {
	// 	console.log($scope.roomInfo);
	// }, 2000);

	$scope.$on('newMsgArrive', function () {
        $scope.$apply();
        if (util.enableScroll) { util.scrollChatRoom() };
	});

	function toggleScroll() {
		util.enableScroll = !util.enableScroll;
		if (util.enableScroll) {
			$scope.toggleScrollFabStatus.icon = 'assets/icon/ic_not_interested_black_24px.svg';
			$scope.toggleScrollFabStatus.tooltip = '禁止滚动';
		} else {
			$scope.toggleScrollFabStatus.icon = 'assets/icon/ic_loop_black_24px.svg';
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
