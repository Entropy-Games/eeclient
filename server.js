const {request} = require('./request.js');
const fs = require('fs');
const https = require('https');
require('colors');
const watch = require("node-watch");
const path = require('path');

function download (url, path) {
	https.get(url, function(response) {
		if (response.statusCode === 200) {
			let file = fs.createWriteStream(path);
			response.pipe(file);
		}
	});
}

async function uploadAll (projectDir, token) {
	const paths = await fs.promises.readdir( projectDir );

	let files = {};

	// Loop them all with the new for...of
	for (const file of paths ) {
		// Get the full paths
		const fromPath = path.join(projectDir, file);
		console.log(`Uploading ${file}`);
		files[file] = fs.readFileSync(fromPath, 'utf8');
	}

	await request('/eeclient-upload', token, {files});
}

let changes = false;

exports.init = async (token, config) => {
	const name = (await request('/get-project-name', token)).name;
	const projectDir = `${config['projects-root']}${name}`;

	console.log('Project name: ', name.blue);

	if (!fs.existsSync(projectDir)) {
		fs.mkdirSync(projectDir);
		console.log('Created project folder'.green);
	}

	const assets = await request('/find-scripts', token);

	for (let file of assets) {
		file = file.split('/');
		for (let i = 0; i < 4; i++) file.shift();
		file = file.join('/');
		console.log(`downloading`, file.cyan, `to `, `${projectDir}/${file}`.cyan);
		download(
			`https://entropyengine.dev/projects/${token.project}/assets/${file}`,
			`${projectDir}/${file}`
		);
	}

	console.log('Downloaded project successfully\n'.green);

	watch(projectDir, { recursive: true }, async () => {
		console.log("\nNoticed changes".yellow);
		await uploadAll(projectDir, token);
		changes = true;
	});
	console.log('Started monitoring directory for changes...'.green);
};

function getHeaders (req, cb) {
	let data = '';
	// need to get the data one packet at a time, and then deal with the whole lot at once
	req.on('data', chunk => {
		data += chunk;
	});

	req.on('end', () => {

		let body = {};
		try {
			body = JSON.parse(data ?? '{}');
		} catch (E) {
			console.log(`Error parsing JSON data from URL ${req.url} with JSON ${data}: ${E}`)
			return;
		}

		cb(body);
	});
}

exports.start = (app, token, port) => {

	app.use((req,res,next) => {
		res.setHeader("Access-Control-Allow-Origin", "https://entropyengine.dev");
		next();
	});

	// when you click on the link, it takes you to the project
	app.get('/', (req, res) => {
		res.writeHead(302, {
			'Location': 'https://entropyengine.dev/editor?p=' + token.project
		});
		res.end();
	});

	app.post('/ping', (req, res) => {
		res.end("1");
	});

	app.post('/authenticate-connection', (req, res) => {
		getHeaders(req, body => {
			if (body.project != token.project || body.user != token.user) {
				res.end("0");
				return;
			}
			res.end("1");
		});
	});

	app.post('/changed', (req, res) => {
		res.end(changes ? "1" : "0");
		changes = false;
	});

	app.listen(port, () => {
		console.log(`Server started at`.green.bold, `http://localhost:${port}`.bold);
	});
};