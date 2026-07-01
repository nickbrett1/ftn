import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';

const templatesDir = './src/lib/templates';
const outputFilePath = './src/lib/server/precompiled-templates.js';

const templatesToCompile = [
	{ file: 'devcontainer-java-dockerfile.template', hbs: 'devcontainer-java-dockerfile.hbs' },
	{ file: 'devcontainer-node-dockerfile.template', hbs: 'devcontainer-node-dockerfile.hbs' },
	{ file: 'devcontainer-node-json.template', hbs: 'devcontainer-node-json.hbs' },
	{ file: 'devcontainer-p10k-zsh-full.template', hbs: 'devcontainer-p10k-zsh-full.hbs' },
	{ file: 'devcontainer-p10k-zsh.template', hbs: 'devcontainer-p10k-zsh.hbs' },
	{
		file: 'devcontainer-post-create-setup-sh.template',
		hbs: 'devcontainer-post-create-setup-sh.hbs'
	},
	{
		file: 'devcontainer-post-start-setup-sh.template',
		hbs: 'devcontainer-post-start-setup-sh.hbs'
	},
	{ file: 'devcontainer-python-dockerfile.template', hbs: 'devcontainer-python-dockerfile.hbs' },
	{ file: 'devcontainer-zshrc-full.template', hbs: 'devcontainer-zshrc-full.hbs' },
	{ file: 'devcontainer-zshrc.template', hbs: 'devcontainer-zshrc.hbs' },
	{ file: 'playwright-config.template', hbs: 'playwright-config.hbs' }
];

let output = `(() => {
	var e = Handlebars.template,
		n = (Handlebars.templates = Handlebars.templates || {});
`;

for (const t of templatesToCompile) {
	const filePath = path.join(templatesDir, t.file);
	const content = fs.readFileSync(filePath, 'utf8');
	const precompiled = Handlebars.precompile(content);
	output += `\t(n['${t.hbs}'] = e(${precompiled})),\n`;
}

// Remove trailing comma and properly close the function / wrapper
output = output.trim().replace(/,\s*$/, ';\n})();\n');

fs.writeFileSync(outputFilePath, output, 'utf8');
console.log('Templates precompiled successfully!');
