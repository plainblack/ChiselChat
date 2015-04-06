#!/usr/bin/env perl

package ChiselChat::Web;
use Dancer2;
use Template;

get '/' => sub {
    template 'chat' => {
    };
};

package ChiselChat::Rest;
use Dancer2;
use Firebase::Auth;

my $firebase = Firebase::Auth->new(secret => 'nvXmjpJQSiMnAaUVWiK9lGMcBZyRzwccG7mZPeN4');
set serializer => 'JSON';
get '/staff' => sub {
    { id => "1", name => 'Staff', isStaff => \1, isModerator => \1, token => $firebase->create_token({uid => "1", isStaff => \1, isModerator => \1}) };
};

get '/fakestaff' => sub {
    { id => "5", name => 'Fake Staff', isStaff => \1, isModerator => \1, token => $firebase->create_token({uid => "5", isModerator => \1}) };
};

get '/fakemoderator' => sub {
    { id => "4", name => 'Fake Moderator', isModerator => \1, token => $firebase->create_token({uid => "4"}) };
};

get '/moderator' => sub {
    { id => "2", name => 'Moderator', isModerator => \1, token => $firebase->create_token({uid => "2", isModerator => \1}) };
};

get '/user' => sub {
    { id => "3", name => 'User', token => $firebase->create_token({uid => "3"}) };
};

1;

use Plack::Builder;

 builder {
         mount '/api' => ChiselChat::Rest->to_app;
         mount '/'  => ChiselChat::Web->to_app;
 };


