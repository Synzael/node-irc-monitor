var irc = require('irc');
var fs = require('fs');
var nodemailer = require('nodemailer');

/* Main configuration */

var mainConfig = {

  startHour: 16,
  startMinute: 30,

  mainChannel: ['#famous'],
  otherChannels: ['#angularjs', '#documentcloud', '#marionette', '#d3.js', '#emberjs', '#enyojs', '#reactjs', '#ionic', '#jquery', '#knockoutjs', '#meteor', '#polymer', '#three.js', '#titanium', '#twitter-bootstrap'],
  server: 'irc.freenode.net',
  botName: 'statsbot',

  mailOptions: {
    from: 'Outgoing Email <logs@somepla.ce>',
    to: 'Recipient <greg@somepla.ce>, Other Recipient <melody@somepla.ce>',
  },

  smtpOptions: {
    service: 'Zoho',
    auth: {
      user: process.env.LOGS_USERNAME,
      pass: process.env.LOGS_PASS
    }
  }
}

/* Variable init and helper functions */

var dailyUserList = {};
var mainCumulativeUsers = {};
var mainMessageLog = [];

var getDate = function() {
  var dateString = '';
  var todaysDate = new Date();

  dateString += todaysDate.getFullYear() + '-';
  dateString += (todaysDate.getMonth() + 1) + '-';
  dateString += todaysDate.getDate();

  return dateString;
};

var getTime = function() {
  var timeString = '';
  var todaysDate = new Date();

  timeString += todaysDate.getHours() + ':';
  if (todaysDate.getMinutes() < 10) {
    timeString += '0';
  };
  timeString += todaysDate.getMinutes();

  return timeString;
};

var fileName = function(prefix, divider) {
  return (prefix + divider + getDate());
};

var getCurrentUsers = function(nameList) {
  var names = [];
  for (var name in nameList) {
    names.push(name);
  }
  return names;
};

var getCurrentChannels = function() {
  var currentChannels = [];
  for (key in logbot.chans) {
    currentChannels.push(key);
  }
  return currentChannels;
};

var getUserCount = function(chanName, nameList) {
  dailyUserList[chanName] = nameList.length;
};

var getTopUsers = function() {
  var userArray = [];
  var output = [];

  for (key in mainCumulativeUsers) {
    userArray.push([mainCumulativeUsers[key], key]);
  }

  userArray = userArray.sort().reverse().slice(0,3);
  for (i = 1; i <= userArray.length; i++) {
    output.push(i + '. ' + userArray[i-1][1] + ' (' + userArray[i-1][0] + ' messages)');
  }

  return output.join(', ');
};

var objectSize = function(obj) {
  var size = 0, key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) size++;
  }
  return size;
};


/* Channel monitoring */

var logbot = new irc.Client(mainConfig.server, mainConfig.botName, {
  channels: mainConfig.mainChannel,
  floodProtection: true,
  floodProtectionDelay: 500
});

logbot.addListener('names', function(channel, nicks) {
  var currentUsers = getCurrentUsers(nicks);
  getUserCount(channel, currentUsers);
  if (channel === mainConfig.mainChannel[0]) {
    for (i = 0; i < currentUsers.length; i++) {
      var user = currentUsers[i]
      mainCumulativeUsers[user] = 0;
    }
  }
});

logbot.addListener('join#famous', function(nick) {
  var currentTime = getTime();
  mainMessageLog.push({time: currentTime, user: nick, type: 'j'});
  console.log('*(' + currentTime + ') ' + nick + ' joined the channel');
  if (mainCumulativeUsers[nick] === false) {
    mainCumulativeUsers[nick] = 0;
  };
});

logbot.addListener('nick', function(oldnick, newnick, channels) {
  if (mainCumulativeUsers[oldnick] !== false) {
    mainCumulativeUsers[newnick] = mainCumulativeUsers[oldnick];
    delete mainCumulativeUsers[oldnick];
  }
  console.log(mainCumulativeUsers);
});

logbot.addListener('part#famous', function(nick) {
  var currentTime = getTime();
  mainMessageLog.push({time: currentTime, user: nick, type: 'p'});
  console.log('*(' + currentTime + ') ' + nick + ' left the channel');
});

logbot.addListener('message#famous', function(nick, text, message) {
  var currentTime = getTime();
  mainMessageLog.push({time: currentTime, user: nick, type: 'm', text: text});
  if (mainCumulativeUsers[nick] !== false) {
    mainCumulativeUsers[nick] += 1;
  }
  console.log('*(' + currentTime + ') <' + nick + '>: ' + text);
});


/* Logbot behavior in channel */

// no fun interactions here YET.


/* Outputting data to log files */

var convertMessageLog = function() {
  var lines = [];
  var logName = fileName('MessageLog', '_') + '.txt';
  var topUsers = getTopUsers();

  console.log('New log created at ' + logName);

  lines.push('**Daily Log for ' + mainConfig.mainChannel[0] + '**\n');
  lines.push(objectSize(mainCumulativeUsers) + ' active users today\n');
  lines.push('Most active users:\n' + getTopUsers() + '\n');

  for (var i = 0; i < mainMessageLog.length; i++) {
    var msg = mainMessageLog[i];
    var type = msg.type;
    var id = ('(' + msg.time + ') ' + msg.user);

    if (type === 'j') {
      lines.push(id + ' joined the channel');
    } else if (type === 'p') {
      lines.push(id + ' left the channel');
    } else if (type === 'm') {
      lines.push(id + ': ' + msg.text);
    }
  }

  var stream = fs.createWriteStream(logName);
  stream.once('open', function(fd) {
    for (i = 0; i < lines.length; i++) {
      stream.write(lines[i] + '\n');
    }
    stream.end();
  })
}

var convertUserList = function () {
  var lines = [];
  var logName = fileName('UserCount', '_') + '.txt';

  console.log('New usercount created at ' + logName);

  var currentChannels = getCurrentChannels().sort();

  lines.push('**User counts for ' + getDate() + ' at ' + getTime() + '**\n');
  lines.push('Channels: ' + currentChannels.join(', ') + '\n');

  for (i = 0; i < currentChannels.length; i++) {
    var chan = currentChannels[i];
    if (dailyUserList[chan] > 1) {
      lines.push(dailyUserList[chan] + ' users on ' + chan);
    } else {
      lines.push(dailyUserList[chan] + ' user on ' + chan);
    }
  }

  var stream = fs.createWriteStream(logName);
  stream.once('open', function(fd) {
    for (i = 0; i < lines.length; i++) {
      stream.write(lines[i] + '\n');
    }
    stream.end();
  })
}


/* Event Scheduling */

var schedule = require('node-schedule');

var startTasks = new schedule.RecurrenceRule();
startTasks.hour = mainConfig.startHour;
startTasks.minute = mainConfig.startMinute;
startTasks.second = 0;

var dumpMessageLog = schedule.scheduleJob(startTasks, function() {
  convertMessageLog();
  mainMessageLog = [];
  mainCumulativeUsers = [];

  var chanArray = mainConfig.mainChannel.concat(mainConfig.otherChannels);

  logbot.part(chanArray[0], 'BRB', function(){});

  for (var i = 0; i < chanArray.length; i++) {
    logbot.join(chanArray[i], function(){});
  };

  chanArray.shift();

})


var midTasks = new schedule.RecurrenceRule();
midTasks.hour = mainConfig.startHour;
midTasks.minute = mainConfig.startMinute;
midTasks.second = 20;

var countAllUsers = schedule.scheduleJob(midTasks, function() {
  convertUserList();
  dailyUserList = {};

  var chanArray = mainConfig.otherChannels;

  for (var i = 0; i < chanArray.length; i++) {
    if (logbot.chans[chanArray[i]]) {
      logbot.part(chanArray[i], 'Bye!', function(){});
    };
  };

})

/* Mail configuration */

var endTasks = new schedule.RecurrenceRule();
endTasks.hour = mainConfig.startHour;
endTasks.minute = mainConfig.startMinute;
endTasks.second = 40;

var scheduleMail = schedule.scheduleJob(endTasks, function() {
  
  var smtpTransport = nodemailer.createTransport('SMTP', mainConfig.smtpOptions);

  var emailText = '';

  var userPath = (fileName('UserCount', '_') + '.txt');
  var logsPath = (fileName('MessageLog', '_') + '.txt');

  fs.readFile(userPath, 'utf8', function (err, data) {
    
    if (err) {
      return console.log(err);
    }

    emailText += data + '\n\n';

    fs.readFile(logsPath, 'utf8', function (err, data) {

      if (err) {
        return console.log(err);
      }

      emailText += data;
      mainConfig.mailOptions.text = emailText;

      mainConfig.mailOptions.subject = 'Captain\'s log, stardate ' + getDate() + ' - ' + getTime();

      smtpTransport.sendMail(mainConfig.mailOptions, function(err, res) {
        if (err) {
          console.log(err);
        } else {
          console.log('Message sent: ' + res.message);
          console.log(mainConfig.mailOptions.text);
        }
        smtpTransport.close();
      });
    })
  });

});


/* This is only here because I'm a nerd :D */

var starDate = ('\nCaptain\'s log, stardate ' + getDate() + ' - ' + getTime() + '\n');
console.log(starDate);

