import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templatesDir = path.join(__dirname, 'templates');
const bucketName = 'genproj-templates';

function uploadFiles(wranglerPath, flag, target) {
	console.log(`Uploading templates to ${target} R2 bucket: ${bucketName}...`);
	const files = fs.readdirSync(templatesDir);
	for (const file of files) {
		const filePath = path.join(templatesDir, file);
		console.log(`Uploading ${file} to ${target}...`);
		const command = `${wranglerPath} r2 object put "${bucketName}/${file}" --file "${filePath}" ${flag}`;
		execSync(command);
	}
	console.log(`Templates successfully uploaded to ${target} bucket.`);
}

function handleLocalUpdate(wranglerPath) {
	try {
		uploadFiles(wranglerPath, '--local', 'local');
	} catch (error) {
		console.error(`An error occurred during the local update process:`);
		console.error(error.toString());
		process.exit(1);
	}
}

function handleRemoteUpdate(wranglerPath) {
	try {
		console.log(`Checking if remote bucket ${bucketName} exists...`);
		const buckets = execSync(`${wranglerPath} r2 bucket list`).toString();

		if (buckets.includes(bucketName)) {
			console.log(`Remote bucket ${bucketName} already exists.`);
		} else {
			console.log(`Remote bucket ${bucketName} does not exist, creating...`);
			execSync(`${wranglerPath} r2 bucket create ${bucketName}`);
			console.log(`Remote bucket ${bucketName} created.`);
		}

		uploadFiles(wranglerPath, '--remote', 'remote');
	} catch (error) {
		console.error(`An error occurred during the remote update process:`);
		console.error(error.toString());
		process.exit(1);
	}
}

function updateTemplates(target) {
	console.log(`🚀 Starting template update for target: ${target}`);
	const wranglerPath = './node_modules/.bin/wrangler';

	if (target === 'local') {
		handleLocalUpdate(wranglerPath);
	} else if (target === 'remote') {
		handleRemoteUpdate(wranglerPath);
	} else {
		console.error(`Invalid target: ${target}. Use 'local' or 'remote'.`);
		process.exit(1);
	}
}

const target = process.argv[2];

if (!target) {
	console.error("Error: Target parameter is required. Use 'local' or 'remote'.");
	process.exit(1);
}

updateTemplates(target);
