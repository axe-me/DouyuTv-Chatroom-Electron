'use strict';

angular
	.module('app')
	.controller('RollController', RollController);

function RollController($scope, chatService) {

	angular.extend($scope, {
		
	});

	$scope.$on('newMsgArrive', function () {
        $scope.$apply();
        if (util.enableScroll) { util.scrollChatRoom() };
	});

}	
