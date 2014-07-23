'use strict';

var chiselApp = angular.module('chiselApp', ['ngCookies', 'firebase']);

chiselApp.config( function($httpProvider) {
    $httpProvider.defaults.withCredentials = true;
});

chiselApp.constant("ccGuestNames", ['Chris', 'David', 'Thom', 'Ernest', 'Gertrude', 'Hazel', 'Oscar', 'Rupert', 'Burton', 'Cal', 'Donald', 'Esther', 'Fern', 'Isobel', 'Quentin', 'Dude', 'Dudette', 'Simon', 'Arnold', 'Kevin', 'Caroline']);

//Need configuration information about this host.
//What is their base firebase URL?
//Current TGC user_id

chiselApp.factory("chiselChatFactory", ["$firebase", function ($firebase) {
    var channelFactory = {
        //Provide a way to get a chat, like PM's, or the default chat.
        getChannel : function (channelId) { },
        //Make a new channel
        createChannel : function (name, userId, type) { },
        //How do I check for existance of a channel by name? Do I need this for anything other than
        //the main-default chat?  I can get around this by assigning it an ID.
        getChannelByName : function (channelName) {},
    }
    return channelFactory;
}]);

chiselApp.controller('chiselCtrl', function($scope, $firebase, $cookies, chiselChatFactory, ccGuestNames) {
    //List of channels that the user is participating in
    var channels = []; //referenced by id
    $scope.channels = []; //actual channel content

    $scope.getGuestName = function() {
        return ccGuestNames[Math.round(Math.random() * (ccGuestNames.length - 1))];
    };

    //Based on the filesystem, the message and user information is normalized.  That means that
    //for every message, we'll need to look up the the username, avatarUri, profileUri, etc.

    //During the initialization process, we need to push up the user information to firebase.
    //Do we do an API call to do this, or drop it into the initialization?

    if (ChiselChat.user) {
        $scope.user = ChiselChat.user;
        var fbUserUrl = new Firebase(ChiselChat.chat.firebaseUri+'/users/'+ChiselChat.user.id);
        fbUser.auth(ChiselChat.chat.authToken);
        fbUser.set(ChiselChat.user);
    }
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
