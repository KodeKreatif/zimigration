var mysql      = require('mysql');
var config = require("./config");

var connection = mysql.createConnection({
	user: config.user,
	password: config.password,
	port: config.port 
});
connection.connect();

module.exports = connection;
