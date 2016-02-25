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
