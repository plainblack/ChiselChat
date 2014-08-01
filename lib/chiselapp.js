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
chiselApp.factory("firebaseFactory", function ($firebase) {
    var factory = {
        //uri should be relative to chat, so /messages becomes /chat/messages
        get : function (uri) {
            var fb = new Firebase(ChiselChat.chat.firebaseUri+'/chat'+uri);
            fb.auth(ChiselChat.chat.authToken);
            return fb;
        },
    };
    return factory;
});

//Maintain an internal cache of user data, as well as access to and from Firebase for user data
chiselApp.factory("userFactory", function (firebaseFactory) {
    var user_factory = {
        users : {},
        get : function (id) {
            if (id in this.users) {
                return this.users[id];
            }
            var fbUser = firebaseFactory.get('/users/'+id);
            this.users[id] = fbUser;
            return fbUser;
        },
        put : function (user) {
            var fbUser = firebaseFactory.get('/users/'+user.id);
            this.users[user.id] = user;
            fbUser.set(user);
        },
    };
    return user_factory;
});

chiselApp.factory("chiselChatFactory", function (firebaseFactory, $firebase) {
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

chiselApp.controller('chiselCtrl', function($scope, $cookies, chiselChatFactory, ccGuestNames, firebaseFactory, $firebase, userFactory) {
    var channel = chiselChatFactory.getChannel('-JSzeecQWJKzPVPmt5i7');
    channel.once('value', function (snap) {
        $scope.channel = snap.val();
    });
    var sync = $firebase(firebaseFactory.get('/channels/-JSzeecQWJKzPVPmt5i7/messages'));
    $scope.messages = sync.$asArray();

    $scope.getGuestName = function() {
        return ccGuestNames[Math.round(Math.random() * (ccGuestNames.length - 1))];
    };

    $scope.addMessage = function(e) {
        if (e.keyCode != 13) return;
        var payload = {
            name : $scope.user.name,
            userId : $scope.user.id,
            message : $scope.message_body,
            timestamp : Firebase.ServerValue.TIMESTAMP
        };
        $scope.messages.$add(payload);
        $scope.message_body = '';
    };

    $scope.deleteMessage = function(messageIndex, channelId) {
        console.log("Want to delete "+messageIndex+" from "+channelId);
        $scope.messages.$remove(messageIndex);
    };

    //Based on the filesystem, the message and user information is normalized.  That means that
    //for every message, we'll need to look up the the username, avatarUri, profileUri, etc.

    //User is logged in
    if (ChiselChat.user) {
        $scope.user = ChiselChat.user;
        userFactory.put(ChiselChat.user);
    }
    //Guest, persist name in a cookie
    else {
        var username = $cookies.ccUserName ? $cookie.ccUsername : $scope.getGuestName();
        $cookies.ccUsername = username;
        $scope.user = {
            name : username,
            profileUri : null,
            avatarUri : null,
            isModerator : false,
            id : null
        };
    }
});

//Provide an authenticated Firebase object
chiselApp.filter("chiselAvatar", function (userFactory) {
    return function (userId) {
        if (userId) {
            var user = userFactory.get(userId);
            return user.avatarUri;
        }
        else {
            return '/public/guest_logo.png';
        }
    };
});


