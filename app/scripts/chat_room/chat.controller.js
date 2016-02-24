'use strict';

angular
	.module('app')
	.controller('ChatController', ChatController);

function ChatController($scope, chatService, $interval) {

	angular.extend($scope, {
		roomAddr: "http://www.douyutv.com/73327",
		startGetMsg: startGetMsg,
		roomInfoStatus: chatService.roomInfoStatus,
		roomInfo: chatService.roomInfo
	});

	// $interval(function function_name () {
	// 	console.log($scope.roomInfo);
	// }, 2000);

	function startGetMsg () {
		chatService.getRoomInfo($scope.roomAddr, true);
	}
}	
