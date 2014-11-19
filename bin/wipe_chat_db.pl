#!/bin/env perl

use strict;
use Firebase;
use Config::JSON;
use Getopt::Long;
use feature 'say';
use Data::Dumper;

GetOptions( 
    'config=s'  =>, \my $config_file,
);


unless ($config_file) {
    say "Usage: $0 --config=/path/to/config.json";
    exit;
}

say "Reading config.";
my $config = Config::JSON->new($config_file)->get('firebase');

say "Connecting to Firebase.";
my $firebase = Firebase->new(%{$config});

foreach my $node ('room-messages','room-metadata','room-users','users','user-names-online','moderators','suspensions') {
    say "deleteing $node";
    $firebase->delete($node);
}

