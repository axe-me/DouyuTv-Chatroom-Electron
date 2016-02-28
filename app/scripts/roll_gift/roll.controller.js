'use strict';

angular
	.module('app')
	.controller('RollController', RollController);

function RollController($scope, chatService, $interval, util, lodash) {

	var hasCandidates = false;

	angular.extend($scope, {
		rollKey: "ShaneX真帅",
		rollNum: 3,
		rollFunc: rollFunc,
		rollType: "keyWord",
		giftType: "luck",
		candidates: chatService.candidates,
		rollBtnText: "开始",
		lockInput: false,
		enableScrollChat: enableScrollChat
	});

	function enableScrollChat () {
		util.enableScroll = true;
	}

	function selectRandCandi () {
		var uniArr = lodash.uniqBy($scope.candidates, 'userName');
		if (uniArr.length<=$scope.rollNum) {
			lodash.forEach($scope.candidates, function (o) {
				o.getLucky = true;
			});
		} else {
			var num=0;
			while (num<$scope.rollNum) {
				var randomIdx = Math.floor(Math.random()*$scope.candidates.length);
				var idx = lodash.findIndex($scope.candidates, function(o) {
	              return o.name === $scope.candidates[randomIdx].userName;
	            });
				if (idx===-1) {
					$scope.candidates[randomIdx].getLucky = true;
					num++;
				}
			}
		}
	}

	function rollFunc () {
		if (hasCandidates) {
			// clean last time shit
			chatService.candidates = [];
			$scope.candidates = [];
			$scope.lockInput = false;
			hasCandidates = false;
			$scope.rollBtnText = "开始";
		} else {
			if (!chatService.isStartRoll) {
				// start roll
				$scope.lockInput = true;
				$scope.rollBtnText = "Roll!";
				chatService.startRoll($scope.rollType, $scope.rollKey);
			} else {
				// stop roll
				hasCandidates = true;
				$scope.rollBtnText = "清空重Roll";
				chatService.isStartRoll = false;

				if ($scope.rollType==="gift"&&$scope.giftType==="amount") {
					util.showMsg("赠送礼物前"+$scope.rollNum+"名已在榜!");
				} else {
					selectRandCandi();
				}
			}
		}
	}

	$scope.$on('newCandidateArrive', function () {
		$scope.candidates = chatService.candidates;
        $scope.$apply();
	});

}	
