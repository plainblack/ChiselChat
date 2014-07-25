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
        //uri should be relative to chat, so /messages becomes /chat/messages
        get : function (uri) {
            var fb = new Firebase(ChiselChat.chat.firebaseUri+'/chat'+uri);
            fb.auth(ChiselChat.chat.authToken);
            return fb;
        },
    };
    return factory;
}]);

chiselApp.factory("chiselChatFactory", function (firebaseFactory) {
    var channelFactory = {
        //Provide a way to get a chat, like PM's, or the default chat.
        getChannel : function (channelId) {
            return firebaseFactory.get('/channels/'+channelId);
        },
        //Make a new channel
        //name: name of the channel
        //userId: who made the channel
        //type: "public", "private" or "official"
        createChannel : function (name, userId, type) {
            var fbChannel = firebaseFactory.get('/channels');
        }
    };
    return channelFactory;
});

chiselApp.controller('chiselCtrl', function($scope, $firebase, $cookies, chiselChatFactory, ccGuestNames, firebaseFactory) {
    $scope.channel = chiselChatFactory.getChannel('');

    $scope.getGuestName = function() {
        return ccGuestNames[Math.round(Math.random() * (ccGuestNames.length - 1))];
    };

    $scope.addMessage = function(e) {
        if (e.keyCode != 13) return;
        $scope.channel.messages.$add({
            type : "normal",
            userName : $scope.user.name,
            userId : $scope.user.id,
            message : $scope.message,
            dateStamp : Firebase.ServerValues.TIMESTAMP
        })
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
