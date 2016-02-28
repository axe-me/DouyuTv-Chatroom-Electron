'use strict';

angular
	.module('app')
	.controller('RollController', RollController);

function RollController($scope, chatService, $interval) {

	var hasCandidates = false;

	angular.extend($scope, {
		rollKey: "ShaneX真帅",
		rollNum: 3,
		rollFunc: rollFunc,
		rollType: "keyWord",
		giftType: "luck",
		candidates: chatService.candidates,
		rollBtnText: "开始Roll",
		lockInput: false
	});

	function rollFunc () {
		if (hasCandidates) {
			// clean last time shit
			chatService.candidates = [];
			$scope.candidates = [];
			$scope.lockInput = false;
			hasCandidates = false;
			$scope.rollBtnText = "开始Roll";
		} else {
			if (!chatService.isStartRoll) {
				// start roll
				$scope.lockInput = true;
				$scope.rollBtnText = "停!";
				chatService.startRoll($scope.rollType, $scope.rollKey);
			} else {
				// stop roll
				hasCandidates = true;
				$scope.rollBtnText = "解锁再Roll";
				chatService.isStartRoll = false;
			}
		}
	}

	$scope.$on('newCandidateArrive', function () {
		console.log('newCandidateArrive');
        $scope.$apply();
	});

}	
