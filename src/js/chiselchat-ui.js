(function($) {


  if (!$ || (parseInt($().jquery.replace(/\./g, ""), 10) < 170)) {
    throw new Error("jQuery 1.7 or later required!");
  }

  var root = this,
      previousChiselchatUI = root.ChiselchatUI;

  root.ChiselchatUI = ChiselchatUI;

  if (!self.ChiselchatDefaultTemplates) {
    throw new Error("Unable to find chat templates!");
  }

  function ChiselchatUI(firebaseRef, el, options) {
    var self = this;

    if (!firebaseRef) {
      throw new Error('ChiselchatUI: Missing required argument `firebaseRef`');
    }

    if (!el) {
      throw new Error('ChiselchatUI: Missing required argument `el`');
    }

    options = options || {};
    this._options = options;

    this._el = el;
    this._user = null;
    this._chat = new Chiselchat(firebaseRef, options);

    // A list of rooms to enter once we've made room for them (once we've hit the max room limit).
    this._roomQueue = [];

    // A toggle so that in some circumstances a chat tab can focus automatically.
    this.autoFocusTab = false;
      
    // Define some constants regarding maximum lengths, client-enforced.
    this.maxLengthUsername = 15;
    this.maxLengthUsernameDisplay = 15;
    this.maxLengthRoomName = 16;
    this.maxLengthMessage = 1000;
    this.maxUserSearchResults = 100;

    // Define some useful regexes.
    this.urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;
    this.pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

    this._renderLayout();

    // Grab shortcuts to commonly used jQuery elements.
    this.$wrapper = $('#chiselchat');
    this.$roomList = $('#chiselchat-room-list');
    this.$tabList = $('#chiselchat-tab-list');
    this.$tabContent = $('#chiselchat-tab-content');
    this.$messages = {};

    // Rate limit messages from a given user with some defaults.
    this.$rateLimit = {
      limitCount: 10,         // max number of events
      limitInterval: 10000,   // max interval for above count in milliseconds
      limitWaitTime: 30000,   // wait time if a user hits the wait limit
      history: {}
    };

    // Setup UI bindings for chat controls.
    this._bindUIEvents();

    // Setup bindings to internal methods
    this._bindDataEvents();
  }

  // Run ChiselchatUI in *noConflict* mode, returning the `ChiselchatUI` variable to
  // its previous owner, and returning a reference to the ChiselchatUI object.
  ChiselchatUI.noConflict = function noConflict() {
    root.ChiselchatUI = previousChiselchatUI;
    return ChiselchatUI;
  };

  ChiselchatUI.prototype = {

    _bindUIEvents: function() {
      // Chat-specific custom interactions and functionality.
      this._bindForHeightChange();
      this._bindForTabControls();
      this._bindForRoomList();
      this._bindForUserRoomList();
      this._bindForUserSearch();
      this._bindForUserMuting();
      this._bindForChatInvites();
      this._bindForRoomListing();

      // Generic, non-chat-specific interactive elements.
      this._setupTabs();
      this._setupDropdowns();
      this._bindTextInputFieldLimits();
    },

    _bindDataEvents: function() {
      this._chat.on('user-update', this._onUpdateUser.bind(this));

      // Bind events for new messages, enter / leaving rooms, and user metadata.
      this._chat.on('room-enter', this._onEnterRoom.bind(this));
      this._chat.on('room-exit', this._onLeaveRoom.bind(this));
      this._chat.on('message-add', this._onNewMessage.bind(this));
      this._chat.on('message-remove', this._onRemoveMessage.bind(this));

      // Bind events related to chat invitations.
      this._chat.on('room-invite', this._onChatInvite.bind(this));
      this._chat.on('room-invite-response', this._onChatInviteResponse.bind(this));

      // Binds events related to admin or moderator notifications.
      this._chat.on('notification', this._onNotification.bind(this));
    },

    _renderLayout: function() {
      var template = ChiselchatDefaultTemplates["templates/layout-full.html"];
      $(this._el).html(template({
        maxLengthUsername: this.maxLengthUsername,
        maxLengthRoomName: this.maxLengthRoomName,
        isModerator: this._chat.userIsModerator()
      }));
    },

    _onUpdateUser: function(user) {
      // Update our current user state and render latest user name.
      this._user = user;

      // Update our interface to reflect which users are muted or not.
      var mutedUsers = this._user.muted || {};
      $('[data-event="chiselchat-user-mute-toggle"]').each(function(i, el) {
        var userId = $(this).closest('[data-user-id]').data('user-id');
        $(this).toggleClass('chiselchat-muted', !!mutedUsers[userId]);
      });

      // Ensure that all messages from muted users are removed.
      for (var userId in mutedUsers) {
        $('.message[data-user-id="' + userId + '"]').fadeOut();
      }
    },

    _onEnterRoom: function(room) {
      this.attachTab(room.id, room.name);
    },
    _onLeaveRoom: function(roomId) {
      this.removeTab(roomId);

      // Auto-enter rooms in the queue
      if ((this._roomQueue.length > 0)) {
        this._chat.enterRoom(this._roomQueue.shift(roomId));
      }
    },
    _onNewMessage: function(roomId, message) {
      var userId = message.userId;
      var self = this;
      if (!this._user || !this._user.muted || !this._user.muted[userId]) {
        //Lookup the user, then show the message
        self.showMessage(roomId, message);
        this._chat.lookupUser(userId, function (user) {
            var $message = $('div[data-message-id="'+message.id+'"]');

            var profile, avatar;
            if (user.profileUri) {
                $message.find('.chiselchat-avatar > a').attr('href', user.profileUri);
                $message.find('.chiselchat-user > a').attr('href', user.profileUri);
            }
            if (user.avatarUri) {
                $message.find('.chiselchat-avatar img').attr('src', user.avatarUri);
            }
            if (user.isModerator) {
                $message.find('.chiselchat-user > a').addClass('chiselchat-moderator');
            }
        });
      }
    },
    _onRemoveMessage: function(roomId, messageId) {
      this.removeMessage(roomId, messageId);
    },

    // Events related to chat invitations.
    _onChatInvite: function(invitation) {
      var self = this;
        self.confirm(invitation.fromUserName + ' invited you to join ' + invitation.toRoomName, 'Invitation', function(){
            self._chat.acceptInvite(invitation.id, function (obj) {
                if (!( obj instanceof Error)) {
                    //Expecting instance data
                    self.focusTab(obj.roomId);
                }
            });
            return false;
        }, function() {
            self._chat.declineInvite(invitation.id);
            return false;
        });
    },
    _onChatInviteResponse: function(invitation) {
      if (!invitation.status) return;

      var self = this;

      if (invitation.status && invitation.status === 'accepted') {
        self.success(invitation.toUserName + ' accepted your invite.','Invitation Accepted');
        this._chat.getRoom(invitation.roomId, function(room) {
          self.autoFocusTab = true;
          self.attachTab(invitation.roomId, room.name);
        });
      } else {
        self.error(invitation.toUserName + ' declined your invite.','Invitation Declined');
      }
        
    },

    // Events related to admin or moderator notifications.
    _onNotification: function(notification) {
      if (notification.notificationType === 'warning') {
          this.warn('You are being warned for inappropriate messaging. Further violation may result in temporary or permanent ban of service.');
      } else if (notification.notificationType === 'suspension') {
        var suspendedUntil = notification.data.suspendedUntil,
            secondsLeft = Math.round((suspendedUntil - new Date().getTime()) / 1000),
            timeLeft = '';

        if (secondsLeft > 0) {
          if (secondsLeft > 2*3600) {
            var hours = Math.floor(secondsLeft / 3600);
            timeLeft = hours + ' hours, ';
            secondsLeft -= 3600*hours;
          }
          timeLeft += Math.floor(secondsLeft / 60) + ' minutes';
          this.error('A moderator has suspended you for violating site rules. You cannot send messages for another ' + timeLeft + '.','Suspended');
        }
      }
    }
  };

  /**
   * Initialize an authenticated session with a user id and name.
   * This method assumes that the underlying Firebase reference has
   * already been authenticated.
   */
  ChiselchatUI.prototype.setUser = function(userObj) { //userId, userName, isModerator, avatarUri, profileUri
    var self = this;

    // Initialize data events
    self._chat.setUser(userObj, function(user) {
      self._user = user;

      if (self._chat.userIsModerator()) {
        self._bindSuperuserUIEvents();
      }

      self._chat.resumeSession();
    });
  };

  /**
   * Exposes internal chat bindings via this external interface.
   */
  ChiselchatUI.prototype.on = function(eventType, cb) {
    var self = this;

    this._chat.on(eventType, cb);
  };

  /**
   * Binds to messages for superusers to warn or ban
   * users for violating terms of service.
   */
  ChiselchatUI.prototype._bindSuperuserUIEvents = function() {
    var self = this,
        parseMessageVars = function(event) {
          var $this = $(this),
          messageId = $this.closest('[data-message-id]').data('message-id'),
          userId = $('[data-message-id="' + messageId + '"]').closest('[data-user-id]').data('user-id'),
          roomId = $('[data-message-id="' + messageId + '"]').closest('[data-room-id]').data('room-id');

          return { messageId: messageId, userId: userId, roomId: roomId };
        };

    // Handle click of the 'Warn User' moderation item.
    $(document).delegate('[data-event="chiselchat-user-warn"]', 'click', function(event) {
      var messageVars = parseMessageVars.call(this, event);
      self._chat.warnUser(messageVars.userId);
      self._chat.getUserNameById(messageVars.userId, function(snapshot) {
        self._chat.sendMessage(messageVars.roomId, 'warned '+snapshot.val()+'.', 'activity');
      });
    });

    // Handle click of the 'Suspend User (1 Hour)' moderation item.
    $(document).delegate('[data-event="chiselchat-user-suspend-hour"]', 'click', function(event) {
      var messageVars = parseMessageVars.call(this, event);
      self._chat.suspendUser(messageVars.userId, /* 1 Hour = 3600s */ 60*60);
      self._chat.getUserNameById(messageVars.userId, function(snapshot) {
        self._chat.sendMessage(messageVars.roomId, 'suspended '+snapshot.val()+' for 1 hour.', 'activity');
      });
    });

    // Handle click of the 'Suspend User (1 Day)' moderation item.
    $(document).delegate('[data-event="chiselchat-user-suspend-day"]', 'click', function(event) {
      var messageVars = parseMessageVars.call(this, event);
      self._chat.suspendUser(messageVars.userId, /* 1 Day = 86400s */ 24*60*60);
      self._chat.getUserNameById(messageVars.userId, function(snapshot) {
        self._chat.sendMessage(messageVars.roomId, 'suspended '+snapshot.val()+' for 1 day.', 'activity');
      });
    });

    // Handle click of the 'Delete Message' moderation item.
    $(document).delegate('[data-event="chiselchat-message-delete"]', 'click', function(event) {
      var messageVars = parseMessageVars.call(this, event);
      self._chat.deleteMessage(messageVars.roomId, messageVars.messageId);
    });
  };

  /**
   * Binds to height changes in the surrounding div.
   */
  ChiselchatUI.prototype._bindForHeightChange = function() {
    var self = this,
        $el = $(this._el),
        lastHeight = null;

    setInterval(function() {
      var height = $el.height();
      if (height != lastHeight) {
        lastHeight = height;
        $('.chat').each(function(i, el) {

        });
      }
    }, 500);
  };

  /**
   * Binds custom inner-tab events.
   */
  ChiselchatUI.prototype._bindForTabControls = function() {
    var self = this;

    // Handle click of tab close button.
    $(document).delegate('[data-event="chiselchat-close-tab"]', 'click', function(event) {
      var roomId = $(this).closest('[data-room-id]').data('room-id');
      self._chat.leaveRoom(roomId);
      return false;
    });
  };

  /**
   * Binds room list dropdown to populate room list on-demand.
   */
  ChiselchatUI.prototype._bindForRoomList = function() {
    var self = this;

    $('#chiselchat-room-tab').bind('click', function() {
   /*   if ($(this).hasClass('active')) {
        return;
      }*/

      var $this = $(this),
          template = ChiselchatDefaultTemplates["templates/room-list-item.html"],
          selectRoomListItem = function() {
            var parent = $(this).parent(),
                roomId = parent.data('room-id'),
                roomName = parent.data('room-name');

            if (self.$messages[roomId]) {
              self.focusTab(roomId);
            } else {
              self.autoFocusTab = true;
              self._chat.enterRoom(roomId, roomName);
            }
            return false;
          };
        
          deleteRoom = function() {
            var parent = $(this).parent(),
                roomId = parent.data('room-id');
            self._chat.removeRoom(roomId);
            parent.remove();
          };

      self._chat.getRoomList(function(rooms) {
        self.$roomList.empty();
        for (var roomId in rooms) {
          var room = rooms[roomId];
          if (room.type == "private") continue;
          room.isRoomOpen = !!self.$messages[room.id];
          room.userIsModerator = self._chat.userIsModerator();
          var $roomItem = $(template(room));
          $roomItem.children('.chiselchat-room-list-item').bind('click', selectRoomListItem);
          $roomItem.children('.chiselchat-delete-room').bind('click', deleteRoom);
          self.$roomList.append($roomItem.toggle(true));
        }
      });
    });
  };

  /**
   * Binds user list dropdown per room to populate user list on-demand.
   */
  ChiselchatUI.prototype._bindForUserRoomList = function() {
    var self = this;

    // Upon click of the dropdown, autofocus the input field and trigger list population.
    $(document).delegate('[data-event="chiselchat-user-room-list-btn"]', 'click', function(event) {
      event.stopPropagation();

      var $this = $(this),
          roomId = $this.closest('[data-room-id]').data('room-id'),
          template = ChiselchatDefaultTemplates["templates/room-user-list-item.html"],
          targetId = $this.data('target'),
          $target = $('#' + targetId);

      $target.empty();
      self._chat.getUsersByRoom(roomId, function(users) {
        for (var username in users) {
          user = users[username];
          user.disableActions = (!self._user || user.id === self._user.id);
          user.nameTrimmed = self.trimWithEllipsis(user.name, self.maxLengthUsernameDisplay);
          user.isMuted = (self._user && self._user.muted && self._user.muted[user.id]);
          $target.append($(template(user)));
        }
        self.sortListLexicographically('#' + targetId);
      });
    });
  };

  /**
   * Binds user search buttons, dropdowns, and input fields for searching all
   * active users currently in chat.
   */
  ChiselchatUI.prototype._bindForUserSearch = function() {
    var self = this,
        handleUserSearchSubmit = function(event) {
          var $this = $(this),
              targetId = $this.data('target'),
              controlsId = $this.data('controls'),
              templateId = $this.data('template'),
              prefix = $this.val() || $this.data('prefix') || '',
              startAt = $this.data('startAt') || null,
              endAt = $this.data('endAt') || null;

          event.preventDefault();

          userSearch(targetId, templateId, controlsId, prefix, startAt, endAt);
        },
        userSearch = function(targetId, templateId, controlsId, prefix, startAt, endAt) {
          var $target = $('#' + targetId),
              template = ChiselchatDefaultTemplates[templateId];

          // Query results, filtered by prefix, using the defined startAt and endAt markets.
          self._chat.getUsersByPrefix(prefix, startAt, endAt, self.maxUserSearchResults, function(users) {
            var numResults = 0,
                username, firstResult, lastResult;

            $target.empty();

            for (username in users) {
              var user = users[username];

              // Disable buttons for <me>.
              user.disableActions = (!self._user || user.id === self._user.id);

              numResults += 1;

              $target.append(template(user));

              // If we've hit our result limit, the additional value signifies we should paginate.
              if (numResults === 1) {
                firstResult = user.name.toLowerCase();
              } else if (numResults >= self.maxUserSearchResults) {
                lastResult = user.name.toLowerCase();
                break;
              }
            }


          });
        };

    $(document).delegate('[data-event="chiselchat-user-search"]', 'keyup', handleUserSearchSubmit);
    $(document).delegate('[data-event="chiselchat-user-search"]', 'click', handleUserSearchSubmit);
    $(document).delegate('#chiselchat-user-search-form', 'submit', handleUserSearchSubmit);

    // Upon click of the dropdown, autofocus the input field and trigger list population.
    $(document).delegate('#chiselchat-presence-tab', 'click', function(event) {
      event.stopPropagation();
      var $input = $('#chiselchat-user-search-form').find('input');
      $input.focus();
      $input.trigger(jQuery.Event('keyup'));
    });

  };

  /**
   * Binds user mute toggles and removes all messages for a given user upon mute.
   */
  ChiselchatUI.prototype._bindForUserMuting = function() {
    var self = this;
    $(document).delegate('[data-event="chiselchat-user-mute-toggle"]', 'click', function(event) {
      var $this = $(this),
          userId = $this.closest('[data-user-id]').data('user-id'),
          userName = $this.closest('[data-user-name]').data('user-name'),
          isMuted = $this.hasClass('chiselchat-muted');

      event.preventDefault();
        self._chat.toggleUserMute(userId, function() {
            if (isMuted) {
                self.success(userName + ' has been unmuted.','User Unmuted');
            }
            else {
                self.error(userName + ' has been muted.', 'User Muted');
            }
        });
    });
  };

  /**
   * Binds to elements with the data-event='chiselchat-user-(private)-invite' and
   * handles invitations as well as room creation and entering.
   */
  ChiselchatUI.prototype._bindForChatInvites = function() {
    var self = this,
        inviteUser = function(event) {
          var $this = $(this),
              userId = $this.closest('[data-user-id]').data('user-id'),
              roomId = $this.closest('[data-room-id]').data('room-id'),
              userName = $this.closest('[data-user-name]').data('user-name');
            
          self._chat.getRoom(roomId, function(room) {
                self._chat.inviteUser(userId, roomId, room.name);
                self.info(userName + ' invited.');
          });            
          return false;
        },
        privateInviteUser = function(event) {
          var $this = $(this),
              userId = $this.closest('[data-user-id]').data('user-id'),
              userName = $this.closest('[data-user-name]').data('user-name');

          if (userId && userName) {
              var roomName = 'Private Chat';
              self.autoFocusTab = true;
              self._chat.createRoom(roomName, 'private', function(roomId) {
                self._chat.inviteUser(userId, roomId, roomName);
                self.info(userName + ' invited.');
              });
          }
          return false;
        };

    $(document).delegate('[data-event="chiselchat-user-chat"]', 'click', privateInviteUser);
    $(document).delegate('[data-event="chiselchat-user-invite"]', 'click', inviteUser);
  };

  /**
   * Binds to room dropdown button, menu items, and create room button.
   */
  ChiselchatUI.prototype._bindForRoomListing = function() {
    var self = this,
        renderRoomList = function(event) {
          var type = $(this).data('room-type');
          self.sortListLexicographically('#chiselchat-room-list');
        };

    // Handle click of the create new room button.
    $('#chiselchat-create-room').bind('submit', function(event) {
      var roomName = $('#chiselchat-input-room-name').val();
      $('#chiselchat-input-room-name').val('');
      if (roomName.length) {
          self.autoFocusTab = true;
          self._chat.createRoom(roomName);
      }
      else {
          self.error('Room name must be specified.');
      }
      return false;
    });
  };

 /**
   * A stripped-down version of bootstrap-tab.js.
   *
   * Original bootstrap-tab.js Copyright 2012 Twitter, Inc.,licensed under the Apache v2.0
   */
  ChiselchatUI.prototype._setupTabs = function() {
    var self = this,
        hide = function($el) {
            $el.parent('li').removeClass('active');
            $('#chiselchat-tab-content .chiselchat-tab-pane').removeClass('active');
            self.resetNewMessageCount($el.parent('li').attr('data-room-id'));     
        },
        show = function($el) {
          var $this = $el,
              $ul = $this.closest('ul:not(.dropdown-menu)'),
              selector = $this.attr('data-target'),
              previous = $ul.find('.active:last a')[0],
              $target,
              e;

          if (!selector) {
            selector = $this.attr('href');
            selector = selector && selector.replace(/.*(?=#[^\s]*$)/, '');
          }

          self.resetNewMessageCount($(previous).parent('li').attr('data-room-id'));     
            
          if ($this.parent('li').hasClass('active')) return;

          e = $.Event('show', { relatedTarget: previous });

          $this.trigger(e);

          if (e.isDefaultPrevented()) return;

          $target = $(selector);

          activate($this.parent('li'), $ul);
          activate($target, $target.parent(), function () {
            $this.trigger({
              type: 'shown',
              relatedTarget: previous
            }); 
          });
        },
        activate = function (element, container, callback) {
          var $active = container.find('> .active');

            $active
              .removeClass('active')
              .find('> .dropdown-menu > .active')
              .removeClass('active');

            element.addClass('active');

            if (element.parent('.dropdown-menu')) {
              element.closest('li.dropdown').addClass('active');
            }

            if (callback) {
              callback();
            }
         
      };

    $(document).delegate('[data-toggle="tab"]', 'click', function(event) {
      event.preventDefault();
      var $el = $(this);
      if ($el.parent('li').hasClass('active')) {
          hide($el);
      }
       else {
           show($el);
       }
    });
  };

  /**
   * A stripped-down version of bootstrap-dropdown.js.
   *
   * Original bootstrap-dropdown.js Copyright 2012 Twitter, Inc., licensed under the Apache v2.0
   */
  ChiselchatUI.prototype._setupDropdowns = function() {
    var self = this,
        toggle = '[data-toggle=dropdown]',
        toggleDropdown = function(event) {
          var $this = $(this),
              $parent = getParent($this),
              isActive = $parent.hasClass('open');

          if ($this.is('.disabled, :disabled')) return;

          clearMenus();

          if (!isActive) {
            $parent.toggleClass('open');
          }

          $this.focus();

          return false;
        },
        clearMenus = function() {
          $('[data-toggle=dropdown]').each(function() {
            getParent($(this)).removeClass('open');
          });
        },
        getParent = function($this) {
          var selector = $this.attr('data-target'),
              $parent;

          if (!selector) {
            selector = $this.attr('href');
            selector = selector && /#/.test(selector) && selector.replace(/.*(?=#[^\s]*$)/, '');
          }

          $parent = selector && $(selector);

          if (!$parent || !$parent.length) $parent = $this.parent();

          return $parent;
        };

      $(document)
        .bind('click', clearMenus)
        .delegate('.dropdown-menu', 'click', function(event) { event.stopPropagation(); })
        .delegate('[data-toggle=dropdown]', 'click', toggleDropdown);
  };

  /**
   * Binds to any text input fields with data-provide='limit' and
   * data-counter='<selector>', and upon value change updates the selector
   * content to reflect the number of characters remaining, as the 'maxlength'
   * attribute less the current value length.
   */
  ChiselchatUI.prototype._bindTextInputFieldLimits = function() {
    $('body').delegate('input[data-provide="limit"], textarea[data-provide="limit"]', 'keyup', function(event) {
      var $this = $(this),
          $target = $($this.data('counter')),
          limit = $this.attr('maxlength'),
          count = $this.val().length;

      $target.html(Math.max(0, limit - count));
    });
  };

    
ChiselchatUI.prototype.confirm = function(message, title, confirm, cancel) {
    (new PNotify({
    title: title || 'Confirmation Needed',
    text: message,
    addclass: 'alert-info',
    type: 'info',
    icon: 'glyphicon glyphicon-question-sign',
    hide: false,
    confirm: {
        confirm: true
    },
    buttons: {
        closer: false,
        sticker: false
    },
    history: {
        history: false
    }
    })).get().on('pnotify.confirm', function() {
        confirm();
    }).on('pnotify.cancel', function() {
        cancel();
    });
}; 
    
    
    
ChiselchatUI.prototype.warn = function(message, title) {
    new PNotify({
        addclass: 'alert-warning',
        title: title || 'Warning',
        text: message,
        icon: 'glyphicon glyphicon-exclamation-sign',
        opacity: 0.95,
        history: false,
        sticker: false
    });
};    
    
ChiselchatUI.prototype.info = function(message, title) {
    new PNotify({
        addclass: 'alert-info',
        type: 'info',
        title: title || 'Info',
        text: message,
        icon: 'glyphicon glyphicon-info-sign',
        opacity: 0.95,
        history: false,
        sticker: false
    });
};
    
ChiselchatUI.prototype.error = function(message, title) {
    new PNotify({
        addclass: 'alert-danger',
        type: 'error',
        title: title || 'Error',
        text: message,
        icon: 'glyphicon glyphicon-warning-sign',
        opacity: 0.95,
        history: false,
        sticker: false
    });
};

ChiselchatUI.prototype.success = function(message, title) {
    new PNotify({
        addclass: 'alert-success',
        type: 'success',
        title: title || 'Success',
        text: message,
        icon: 'glyphicon glyphicon-ok-sign',
        opacity: 0.95,
        history: false,
        sticker: false
    });
};    
    
    
  /**
   * Reset's the new message count on a room.
   *
   * @param {string} roomId
   */
  ChiselchatUI.prototype.resetNewMessageCount = function(roomId) {
      var $tabLink = this.$tabList.find('[data-room-id=' + roomId + ']').find('a');
      if ($tabLink.length) {
          $tabLink.first().children('.chiselchat-new-count').html('0');
      }
  };

  /**
   * Toggle input field s if we want limit / unlimit input fields.
   */
  ChiselchatUI.prototype.toggleInputs = function(isEnabled) {
    $('#chiselchat-tab-content textarea').each(function() {
      var $this = $(this);
      if (isEnabled) {
        $(this).val('');
      } else {
        $(this).val('You have exceeded the message limit, please wait before sending.');
      }
      $this.prop('disabled', !isEnabled);
    });
    $('#chiselchat-input-name').prop('disabled', !isEnabled);
  };

  /**
   * Given a room id and name, attach the tab to the interface and setup events.
   *
   * @param    {string}    roomId
   * @param    {string}    roomName
   */
  ChiselchatUI.prototype.attachTab = function(roomId, roomName) {
    var self = this;

    // If this tab already exists, give it focus.
    if (this.$messages[roomId]) {
      this.focusTab(roomId);
      return;
    }

    var room = {
      id: roomId,
      name: roomName
    };

    // Populate and render the tab content template.
    var tabTemplate = ChiselchatDefaultTemplates["templates/tab-content.html"];
    var $tabContent = $(tabTemplate(room));
    this.$tabContent.prepend($tabContent);
    var $messages = $('#chiselchat-messages' + roomId);

    // Keep a reference to the message listing for later use.
    this.$messages[roomId] = $messages;

    // Attach on-enter event to textarea.
    var $textarea = $tabContent.find('textarea').first();
    $textarea.bind('keydown', function(e) {
      var message = self.trimWithEllipsis($textarea.val(), self.maxLengthMessage);
      if ((e.which === 13) && (message !== '')) {
        $textarea.val('');
        var messageType = 'default';
        if (message.match(/^\/me\s/)) {
            message = message.replace(/^\/me/,'');
            messageType = 'activity';
        } 
        self._chat.sendMessage(roomId, message, messageType, function(error) {
            if (error) {
                self.error('You are not allowed to post messages right now.');
            }
        });
        return false;
      }
    });

    // Populate and render the tab menu template.
    var tabListTemplate = ChiselchatDefaultTemplates["templates/tab-menu-item.html"];
    var $tab = $(tabListTemplate(room));
    this.$tabList.append($tab);
      
    $messages.css('height',  ($tabContent.height() - 75) + 'px');
      $(window).resize(function() {
          $messages.css('height',  ($tabContent.height() - 75) + 'px');
      });

    // Attach on-shown event to move tab to front and scroll to bottom.
    $tab.bind('shown', function(event) {
      $messages.scrollTop($messages[0].scrollHeight);
    });

    // Update the room listing to reflect that we're now in the room.
    this.$roomList.children('[data-room-id=' + roomId + ']').children('a').addClass('highlight');

    // Sort each item in the user list alphabetically on click of the dropdown.
    $('#chiselchat-btn-room-user-list-' + roomId).bind('click', function() {
      self.sortListLexicographically('#chiselchat-room-user-list-' + roomId);
      return false;
    });
      
    // set message count to 0
    self.resetNewMessageCount(roomId); 

    // Automatically select the new tab.
    if (self.autoFocusTab) {
        this.focusTab(roomId);
        self.autoFocusTab = false;
    }
  };

  /**
   * Given a room id, focus the given tab.
   *
   * @param    {string}    roomId
   */
  ChiselchatUI.prototype.focusTab = function(roomId) {
    if (this.$messages[roomId]) {
      var $tabLink = this.$tabList.find('[data-room-id=' + roomId + ']').find('a');
      if ($tabLink.length) {
        $tabLink.first().trigger('click');
          $tabLink.first().children('.chiselchat-new-count').html('0');
      }
    }
  };

  /**
   * Given a room id, remove the tab and all child elements from the interface.
   *
   * @param    {string}    roomId
   */
  ChiselchatUI.prototype.removeTab = function(roomId) {
    delete this.$messages[roomId];

    // Remove the inner tab content.
    this.$tabContent.find('[data-room-id=' + roomId + ']').remove();

    // Remove the tab from the navigation menu.
    this.$tabList.find('[data-room-id=' + roomId + ']').remove();

    // Automatically select the next tab if there is one.
    this.$tabList.find('[data-toggle=tab]').first().trigger('click');

    // Update the room listing to reflect that we're now in the room.
    this.$roomList.children('[data-room-id=' + roomId + ']').children('a').removeClass('highlight');
  };

  /**
   * Render a new message in the specified chat room.
   *
   * @param    {string}    roomId
   * @param    {string}    message
   */
  ChiselchatUI.prototype.showMessage = function(roomId, rawMessage) {
    var self = this;

    // Setup defaults
    var message = {
      id              : rawMessage.id,
      localtime       : self.formatTime(rawMessage.timestamp),
      message         : rawMessage.message || '',
      userId          : rawMessage.userId,
      name            : rawMessage.name,
      type            : rawMessage.type || 'default',
      isSelfMessage   : (self._user && rawMessage.userId == self._user.id),
      disableActions  : (!self._user || rawMessage.userId == self._user.id),
      userIsModerator : self._chat.userIsModerator(),
      //Placeholders for data that might come later
      avatarUri   : '',
      profileUri  : ''
    };

    // While other data is escaped in the Underscore.js templates, escape and
    // process the message content here to add additional functionality (add links).
    // Also trim the message length to some client-defined maximum.
    var messageConstructed = '';
    message.message = _.map(message.message.split(' '), function(token) {
      if (self.urlPattern.test(token) || self.pseudoUrlPattern.test(token)) {
        return self.linkify(encodeURI(token));
      } else {
        return _.escape(token);
      }
    }).join(' ');
    message.message = self.trimWithEllipsis(message.message, self.maxLengthMessage);

    // Populate and render the message template.
    var template = ChiselchatDefaultTemplates["templates/message.html"];
    var $message = $(template(message));
    var $messages = self.$messages[roomId];
    if ($messages) {

      var scrollToBottom = false;
      if ($messages.scrollTop() / ($messages[0].scrollHeight - $messages[0].offsetHeight) >= 0.95) {
        // Pinned to bottom
        scrollToBottom = true;
      } else if ($messages[0].scrollHeight <= $messages.height()) {
        // Haven't added the scrollbar yet
        scrollToBottom = true;
      }

      $messages.append($message);

        
        
        
      var $tabLink = this.$tabList.find('[data-room-id=' + roomId + ']').find('a');
      if ($tabLink.length) {
          $tabLink.first().children('.chiselchat-new-count').html(parseInt($tabLink.first().children('.chiselchat-new-count').html(),10) + 1);
      }        
        
        
      if (scrollToBottom) {
        $messages.scrollTop($messages[0].scrollHeight);
      }
    }
  };

  /**
   * Remove a message by id.
   *
   * @param    {string}    roomId
   * @param    {string}    messageId
   */
  ChiselchatUI.prototype.removeMessage = function(roomId, messageId) {
    $('.chiselchat-message[data-message-id="' + messageId + '"]').remove();
  };

  /**
   * Given a selector for a list element, sort the items alphabetically.
   *
   * @param    {string}    selector
   */
  ChiselchatUI.prototype.sortListLexicographically = function(selector) {
    $(selector).children("li").sort(function(a, b) {
        var upA = $(a).text().toUpperCase();
        var upB = $(b).text().toUpperCase();
        return (upA < upB) ? -1 : (upA > upB) ? 1 : 0;
    }).appendTo(selector);
  };

  /**
   * Remove leading and trailing whitespace from a string and shrink it, with
   * added ellipsis, if it exceeds a specified length.
   *
   * @param    {string}    str
   * @param    {number}    length
   * @return   {string}
   */
  ChiselchatUI.prototype.trimWithEllipsis = function(str, length) {
    str = str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
    return (length && str.length <= length) ? str : str.substring(0, length) + '...';
  };

  /**
   * Given a timestamp, format it in the form hh:mm am/pm. Defaults to now
   * if the timestamp is undefined.
   *
   * @param    {Number}    timestamp
   * @param    {string}    date
   */
  ChiselchatUI.prototype.formatTime = function(timestamp) {
    var date = (timestamp) ? new Date(timestamp) : new Date(),
        hours = date.getHours() || 12,
        minutes = '' + date.getMinutes(),
        ampm = (date.getHours() >= 12) ? 'pm' : 'am';

    hours = (hours > 12) ? hours - 12 : hours;
    minutes = (minutes.length < 2) ? '0' + minutes : minutes;
    return '' + hours + ':' + minutes + ampm;
  };


  // see http://stackoverflow.com/questions/37684/how-to-replace-plain-urls-with-links
  ChiselchatUI.prototype.linkify = function(str) {
    var self = this;
    return str
      .replace(self.urlPattern, '<a target="_blank" href="$&">$&</a>')
      .replace(self.pseudoUrlPattern, '$1<a target="_blank" href="http://$2">$2</a>');
  };

})(jQuery);
