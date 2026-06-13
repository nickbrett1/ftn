import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const dir = './src/lib/images';
const files = fs.readdirSync(dir);

console.log('Filename | Width | Height | Size (MB) | Format');
console.log('---|---|---|---|---');

for (const file of files) {
	const filePath = path.join(dir, file);
	if (fs.statSync(filePath).isFile()) {
		try {
			const metadata = await sharp(filePath).metadata();
			const sizeMB = (fs.statSync(filePath).size / (1024 * 1024)).toFixed(2);
			console.log(
				`${file} | ${metadata.width} | ${metadata.height} | ${sizeMB} MB | ${metadata.format}`
			);
		} catch (err) {
			console.error(`Error reading ${file}:`, err.message);
		}
	}
}
