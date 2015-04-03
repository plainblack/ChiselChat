# ChiselChat
A cool chat service for TGC and Lacuna


GETTING STARTED

To get started you'll need to check out this repository. We check it out to /data/ChiselChat, but it should work at any location.

Then you'll need to get yourself a copy of grunt: http://gruntjs.com

Then you'll need to get Perl installed and install a few Perl modules, so that you can run the test server. Once you have Perl installed installing the moduels is pretty easy. First start by installing the module manager known as CPANminus. To do that you run this command:

perl -MCPAN -e shell App::cpanminus

After it installs, you can use cpanm to install the other modules:

cpanm Dancer2 Firebase::Auth Template

Now you're ready to run the test server:

cd bin/server
./server.pl

Connect your browser to http://0.0.0.0:3000 and you can start using the chat as is.


COMPILING CHISELCHAT

To compile your changes for ChiselChat you just go into your ChiselChat folder and type:

grunt


