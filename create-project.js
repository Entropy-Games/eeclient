const fs = require("fs");
const {request} = require('./request.js');

exports.create = async (name, config, token) => {
	const res = await request('/new-project', token, { name });

	console.log(res);

	let projectDir = config['projects-root']+name;

	if (fs.existsSync(projectDir)) {
		console.log(`Directory already exists: ${projectDir}`.red);
		return;
	}

	fs.mkdirSync(projectDir);
	fs.writeFileSync(projectDir+'/package.json', `
{
	  "name": "${name}",
	  "author": "",
	  "license": "ISC",
	  "scripts": {
	  		"start": "node ../node_modules/eeclient/ ${config.user ? '-u '+config.user : ''} -p ${res.projectID}"
	  }
}
`);
};