

// notice this refers to the local angular variable declared above, not window.angular
    chat.angular.module('MyWidget', ['ngSanitize']);

    // Manually boostrap so the old angular version doesn't encounter ng-app='MyWidget' and blow up
    chat.angular.element(document).ready(function() {
        chat.angular.bootstrap(document.getElementById('my-widget', ['MyWidget']));
        // restore the old angular version
        window.angular = existingWindowDotAngular;
    });

    return chat;
})();



dump_keys(chiselchat);
//dump_keys(jQuery);
//chiselchat.jquery('#hi'); //.html('hi');
console.log('hi');
