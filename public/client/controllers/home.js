angular.module('smokemeup')
  	.controller('HomeCtrl', function($scope, $window, $rootScope, $auth) {
	  	$scope.isAuthenticated = function() {
	 		return $auth.isAuthenticated();
		};
	 
		$scope.linkFacebook = function() {
	  		$auth.link('facebook')
	    	.then(function(response) {
			      $window.localStorage.currentUser = JSON.stringify(response.data.user);
			      $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
			      API.getFeed().success(function(data) {
			        $scope.photos = data;
			      });
			  });
		};
		if ($auth.isAuthenticated() && ($rootScope.currentUser && $rootScope.currentUser.username)) {
		  
		}
	});