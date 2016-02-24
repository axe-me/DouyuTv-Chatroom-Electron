
(function () {
    'use strict';
    
    var _templateBase = './scripts';
    
    angular.module('app', [
        'ui.router',
        'ngMaterial',
        'ngAnimate'
    ])

})();
(function() {
  'use strict';

  angular
    .module('app')
    .config(chatRoomRoute);

  /** @ngInject */
  function chatRoomRoute($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('main', {
        url: '/',
        templateUrl: './scripts/chat_room/chat-room.html',
        controller: 'ChatController',
      });

      $urlRouterProvider.otherwise('/');
  }

})();

'use strict';

angular
	.module('app')
	.controller('ChatController', ChatController);

function ChatController($scope) {

	angular.extend($scope, {
		str: "App Start!"
	});
}	
