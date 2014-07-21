var dump_keys = function(object) {
    var keys = [];
    for(var k in object) keys.push(k);
    console.log(keys.join(' '));
};

var chiselchat = (function() {
    var chat = {};
    
    
    var existingWindowJquery;

    if (window.jQuery) {  
        existingWindowJquery = jQuery.noConflict(true);
    }
    
    // Save a copy of the existing angular for later restoration
    var existingWindowDotAngular = window.angular;
    // create a new window.angular and a closure variable for angular.js to load itself into
    chat.angular = (window.angular = {});
