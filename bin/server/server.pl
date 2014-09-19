#!/usr/bin/env perl
use Dancer2;
use Firebase::Auth;
use Template;

my $firebase = Firebase::Auth->new(secret => 'nvXmjpJQSiMnAaUVWiK9lGMcBZyRzwccG7mZPeN4');
set serializer => 'JSON';
get '/' => sub {
    template 'chat' => {
    };
};

get '/staff' => sub {
    { id => "1", name => 'Staff', isStaff => \1, isModerator => \1, token => $firebase->create_token({uid => "1", isStaff => \1, isModerator => \1}) };
};

get '/moderator' => sub {
    { id => "2", name => 'Moderator', isModerator => \1, token => $firebase->create_token({uid => "2", isModerator => \1}) };
};

get '/user' => sub {
    { id => "3", name => 'User', token => $firebase->create_token({uid => "3"}) };
};

dance;
