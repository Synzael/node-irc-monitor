# Arabot
Simple logging and data analysis bot for IRC.

**Main configuration** at mainConfig variable at the top of app.js.

`startHour` and `startMinute` are the 24-hour format hour and minute to schedule the daily log dump and user numbers snapshot.

`mainChannel` only supports one channel value for full logging right now & must be manually entered into logging functions.

`mainChannel` and `otherChannels` must be in array format and have `#` in front of channel names.

`mailOptions` can take either a comma-separated string or an array of emails.

More detailed docs for `smtpOptions` at [Nodemailer](http://www.nodemailer.com/docs/smtp).


### Component Documentation:
* [Node-IRC](https://node-irc.readthedocs.org/en/latest/)
* [Node-schedule](https://www.npmjs.org/package/node-schedule)
* [Nodemailer](http://www.nodemailer.com/)
* [Forever](https://github.com/nodejitsu/forever)
