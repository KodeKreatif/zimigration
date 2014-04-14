var db = require("./db");
var fs = require("fs");
var config = require("./config");

var getZimbraVolumes = function(cb) {
  var zimbraVolumes = {};
  db.query("select id, path, mailbox_bits from zimbra.volume where type=1", function(err, rows, fields) {
    for (var i = 0; i < rows.length; i++) { 
      var path = rows[0].path;
      var bits = rows[0].mailbox_bits;
      var id = rows[0].id;
	  zimbraVolumes[id] = {
	    path: path,
		bits: bits
	  };
	}
	cb(zimbraVolumes);
  });
};

var getMailboxInfo = function(mailboxes, cb) {
  db.query("select id,comment from zimbra.mailbox", function(err, rows, fields) {
    if (err) throw err;

    for (var i = 0; i < rows.length; i ++) {
      var id = rows[i].id;
	  var address = rows[i].comment;
	  var group = id % 100;
	  if (group == 0) {
	    group = 100;
	  }
      var data = {
	    id: id,
		address: address,
	    group: group,
	  };
	  mailboxes.push(data);
	}
	cb();
  });
};

var getMailboxContents = function(volumes, info, cb) {
  console.log("Processing " + info.address);
  db.query("SELECT id, mod_content, unread from mboxgroup" + info.group + ".mail_item where mailbox_id=? and type=5", [info.id], function(err, rows, fields) {
    console.log("Number of mails: " + rows.length);
	var unreadMails = 0;
    for (var i = 0; i < rows.length; i ++) {
	  var volumeId = 1;
	  var bits = volumes[volumeId].bits;
	  var pathPrefix = volumes[volumeId].path + "/" + (info.id >> bits) + "/" + info.id + "/msg/" ;
	  var dir = rows[i].id >> bits;
	  var unread = rows[i].unread;
	  unreadMails = unreadMails + (unread ? 1 : 0);
	  var modContent = rows[i].mod_content;
	  var fileName = rows[i].id + '-' + modContent + '.msg';
	  var path = pathPrefix + dir + '/' + fileName;
	  try {
	    fs.mkdirSync(config.destDir + "/" + info.address);
	    fs.mkdirSync(config.destDir + "/" + info.address + '/cur');
	    fs.mkdirSync(config.destDir + "/" + info.address + '/tmp');
	    fs.mkdirSync(config.destDir + "/" + info.address + '/new');
	  } catch(e) {
	  }
	  var destPath;
	  if (unread) {
	    destPath = config.destDir + "/" + info.address + '/new/' + fileName;
	  } else {
	    destPath = config.destDir + "/" + info.address + '/cur/' + fileName;
	  }
	  console.log(path + " to " + destPath);
	  var contents = fs.readFileSync(path);
	  fs.writeFileSync(destPath, contents);
	}
    console.log("Number of unread mails: " + unreadMails);
    console.log("Number of read mails: " + (rows.length - unreadMails));
	cb(err);
  });
};


var iterate = function(i, max, volumes, mailboxes) {
  if (i == max) {
    return;
  }
  getMailboxContents(volumes, mailboxes[i], function(e) {
	iterate(i + 1, max, volumes, mailboxes);
  });
};

getZimbraVolumes(function(volumes) {
  var mailboxes = [];
  var l = 0;
  getMailboxInfo(mailboxes, function(x) {
    l = mailboxes.length;

    iterate(0, l, volumes, mailboxes);
  });
});

