'use strict';

angular
	.module('app')
	.controller('ChatController', ChatController);

function ChatController($scope) {

	angular.extend($scope, {
		str: "App Start!"
	});
}	
