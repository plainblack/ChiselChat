'use strict';

var chiselApp = angular.module('chiselApp', ['ngCookies', 'firebase']);

chiselApp.config( function($httpProvider) {
    $httpProvider.defaults.withCredentials = true;
});

chiselApp.constant("ccGuestNames", ['Chris', 'David', 'Thom', 'Ernest', 'Gertrude', 'Hazel', 'Oscar', 'Rupert', 'Burton', 'Cal', 'Donald', 'Esther', 'Fern', 'Isobel', 'Quentin', 'Dude', 'Dudette', 'Simon', 'Arnold', 'Kevin', 'Caroline']);

//Need configuration information about this host.
//What is their base firebase URL?
//Current TGC user_id

//Provide an authenticated Firebase object
chiselApp.factory("firebaseFactory", [function () {
    var factory = {
        get : function (uri) {
            var fb = new Firebase(ChiselChat.chat.firebaseUri+uri);
            fb.auth(ChiselChat.chat.authToken);
            return fb;
        },
    };
    return factory;
}]);

chiselApp.factory("chiselChatFactory", [function () {
    var channelFactory = {
        //Provide a way to get a chat, like PM's, or the default chat.
        getChannel : function (channelId) { },
        //Make a new channel
        createChannel : function (name, userId, type) { },
        //How do I check for existance of a channel by name? Do I need this for anything other than
        //the main-default chat?  I can get around this by assigning it an ID.
        getChannelByName : function (channelName) {},
    };
    return channelFactory;
}]);

chiselApp.controller('chiselCtrl', function($scope, $firebase, $cookies, chiselChatFactory, ccGuestNames, firebaseFactory) {
    //List of channels that the user is participating in
    var channels = []; //referenced by id
    $scope.channels = []; //actual channel content

    $scope.getGuestName = function() {
        return ccGuestNames[Math.round(Math.random() * (ccGuestNames.length - 1))];
    };

    //Based on the filesystem, the message and user information is normalized.  That means that
    //for every message, we'll need to look up the the username, avatarUri, profileUri, etc.

    //User is logged in
    if (ChiselChat.user) {
        $scope.user = ChiselChat.user;
        var fbUser = firebaseFactory.get('/users/'+ChiselChat.user.id);
        fbUser.set(ChiselChat.user);
    }
    //Guest, persist name in a cookie
    else {
        var username = $cookies.ccUserName ? $cookie.ccUsername : $scope.getGuestName();
        $cookies.ccUsername = username;
        $scope.user = {
            name : username,
            profileUri : null,
            avatarUri : null
            isModerator : null
            id : null
        };
    }
});
