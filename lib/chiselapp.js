'use strict';

var chiselApp = angular.module('chiselApp', ['firebase']);

chiselApp.config( function($httpProvider) {
    $httpProvider.defaults.withCredentials = true;
});

//Need configuration information about this host.
//What is their base firebase URL?
//Current TGC user_id

//Need to be able to optionally pass in the name/id of a chat
chiselApp.factory("chiselChatFactory", ["$firebase", function ($firebase) {
    var channelFactory = {
        //Provide a way to get a chat, like PM's, or the default chat.
        getChannel : function (channelId) { },
        //Make a new, blank channel
        createChannel : function (name, userId, type) { },
        //How do I check for existance of a channel by name? Do I need this for anything other than
        //the main-default chat?  I can get around this by assigning it an ID.
        getChannelByName : function (channelName) {},
    }
    return channelFactory;
}]);

chiselApp.controller('chiselCtrl', function($scope, $firebase, chiselChatFactory) {
    //List of channels that the user is participating in
});
