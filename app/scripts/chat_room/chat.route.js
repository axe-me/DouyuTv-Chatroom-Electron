(function() {
  'use strict';

  angular
    .module('app')
    .config(chatRoomRoute);

  /** @ngInject */
  function chatRoomRoute($stateProvider, $urlRouterProvider) {
    $stateProvider
      .state('main', {
        url: '/main',
        templateUrl: './scripts/chat_room/chat-room.html',
        controller: 'ChatController',
      });

      $urlRouterProvider.otherwise('/');
  }

})();
