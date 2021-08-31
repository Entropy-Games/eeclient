const
	express = require('express'),
	{APIToken} = require('./request.js'),
	{start, init} = require('./server.js'),
	fs = require('fs');
const {create} = require("./create-project");

const argv = require('yargs/yargs')(process.argv.slice(2)).argv;

const app = express();
const port = 5501;

function findConfig () {
	let currentDir = 'eeconfig.json';
	for (let i = 0; i < 5; i++) {
		if (fs.existsSync(currentDir))
			break;

		currentDir = '../' + currentDir;

		if (i === 4)
			throw `Can't find eeconfig.js file...`;
	}
	return {
		config: JSON.parse(fs.readFileSync(currentDir)),
		path: currentDir,
		dirOfConfig: currentDir.substr(0, currentDir.length-13)
	};
}

const {config, path, dirOfConfig} = findConfig();

let user = argv.u ?? argv.user ?? argv.userID ?? config.user;
let project = argv.p ?? argv.project ?? argv.projectID;

const token = new APIToken({ project, user });

token.isValid().then (tokenValid => {

	if (!tokenValid) {
		console.error('Invalid token. Make sure to include -p projectID and -u userID');
		return;
	}

	// find path relative to here, so that the user thinks its relative to config file
	config['projects-root'] = dirOfConfig + config['projects-root'];

	if (argv.create) {
		create(argv.create || 'project', config, token);
		return;
	}
	init(token, config).then(() => {
		start(app, token, port, config);
	});
});