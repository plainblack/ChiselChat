'use strict';

var chiselApp = angular.module('chiselApp', ['firebase']);

chiselApp.config( function($httpProvider) {
    $httpProvider.defaults.withCredentials = true;
});

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

chiselApp.controller('chiselCtrl', function($scope, $firebase, chiselChatFactory) {
    //List of channels that the user is participating in
    var channels = []; //referenced by id
    $scope.channels = []; //actual channel content

    //Based on the filesystem, the message and user information is normalized.  That means that
    //for every message, we'll need to look up the the username, avatarUri, profileUri, etc.

    //During the initialization process, we need to push up the user information to firebase.
    //Do we do an API call to do this, or drop it into the initialization?

    $scope.user = ChiselChat.user;
});
