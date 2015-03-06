angular.module('smokemeup', ['ngRoute', 'ngMessages','satellizer'])
  .config(function($routeProvider, $authProvider) {
   	$routeProvider
    .when('/', {
      templateUrl: 'client/views/home.html',
      controller: 'HomeCtrl'
    })
    .when('/login', {
      templateUrl: 'client/views/login.html',
      controller: 'LoginCtrl'
    })
    .when('/signup', {
      templateUrl: 'client/views/signup.html',
      controller: 'SignupCtrl'
    })
    .when('/photo/:id', {
      templateUrl: 'client/views/detail.html',
      controller: 'DetailCtrl'
    })
    .otherwise('/');

    $authProvider.loginUrl = 'http://localhost:3000/auth/login';
    $authProvider.signupUrl = 'http://localhost:3000/auth/signup';
    $authProvider.oauth2({
        url: '/auth/facebook',
        authorizationEndpoint: 'https://www.facebook.com/dialog/oauth',
        redirectUri: window.location.origin || window.location.protocol + '//' + window.location.host + '/',
        scope: 'email,user_likes,user_friends',
        scopeDelimiter: ',',
        requiredUrlParams: ['display', 'scope'],
        display: 'popup',
        type: '2.0',
        popupOptions: { width: 481, height: 269 }
       
    })

     $authProvider.facebook({
       clientId: '363318817185604'
    });

  })
  .run(function($rootScope, $window, $auth) {
      if ($auth.isAuthenticated()) {
        $rootScope.currentUser = JSON.parse($window.localStorage.currentUser);
      }
    })


