// Regenerate the hardcoded dockerfile-template fixtures in file-generator.test.js
// from the actual .template files, with proper JS template-literal escaping.
import fs from 'node:fs';

const testPath = 'tests/lib/utils/file-generator.test.js';
let src = fs.readFileSync(testPath, 'utf8');

const fixtures = [
	['javaDockerfileTemplateContent', 'src/lib/templates/devcontainer-java-dockerfile.template'],
	['pythonDockerfileTemplateContent', 'src/lib/templates/devcontainer-python-dockerfile.template'],
	['nodeDockerfileTemplateContent', 'src/lib/templates/devcontainer-node-dockerfile.template']
];

function escapeForTemplateLiteral(s) {
	// Escape backslashes first (line-continuations etc.), then ${ so it stays literal
	return s.replace(/\\/g, '\\\\').replace(/\$\{/g, '\\${');
}

for (const [name, file] of fixtures) {
	const content = fs.readFileSync(file, 'utf8');
	// keep the full template content (including trailing newline) so it matches
	// what the TemplateEngine produces
	const escaped = escapeForTemplateLiteral(content);
	const re = new RegExp(`const ${name} = \`[\\s\\S]*?\`;`);
	if (!re.test(src)) {
		console.error(`Could not find fixture ${name}`);
		process.exit(1);
	}
	src = src.replace(re, `const ${name} = \`${escaped}\`;`);
	console.log(`Updated ${name} from ${file}`);
}

fs.writeFileSync(testPath, src);
console.log('Done.');
