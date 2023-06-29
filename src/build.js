import cheerio from 'cheerio';
import {glob} from 'glob';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import camelcase from 'camelcase';
import rimraf from 'rimraf';
import {fileURLToPath} from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const writeFile = promisify(fs.writeFile);

const rootDir = path.resolve(__dirname, '../');
const DIST = rootDir;

/**
 * @typedef {Object} Icon
 * @property {string} id 
 * @property {string} name
 * @property {Content[]} contents - Indicates whether the Wisdom component is present.
 */

/**
 * Description of the function
 * @name Formatter
 * @function
 * @param {string} name Description
 * @returns {string}
*/

/**
 * @typedef {Object} Content
 * @property {string} path 
 * @property {string} files
 * @property {Formatter} formatter - Indicates whether the Wisdom component is present.
 */


/**
 * 
 * @param {Icon[]} dir 
 * @returns 
 */
const icons = [
  {
    id: 'fa',
    name: 'Font Awesome',
    contents: [
      {
        path:"regular",
        files: path.resolve(rootDir, 'node_modules/@fortawesome/fontawesome-free/svgs/regular/*.svg'),
        formatter: name => name,
      },
      {
        path:"brands",
        files: path.resolve(rootDir, 'node_modules/@fortawesome/fontawesome-free/svgs/brands/*.svg'),
        formatter: name => name,
      },
      {
        path:"solid",
        files: path.resolve(rootDir, 'node_modules/@fortawesome/fontawesome-free/svgs/solid/*.svg'),
        formatter: name => name,
      },
    ],
  },
  {
    id: 'fi',
    name: 'Feather Icons',
    contents: [
      {
        path:".",
        files: path.resolve( rootDir,'node_modules/feather-icons/dist/icons/*.svg'),
        formatter: name => name,
      },
    ],
  },
  {
    id: 'io',
    name: 'Ionicons',
    contents: [
      {
        path:".",
        files: path.resolve( rootDir,'node_modules/ionicons/dist/collection/icon/svg/*.svg'),
        formatter: name => name,
      },
    ],
  },
  {
    id: 'oi',
    name: 'Octicons',
    contents: [
      {
        path:".",
        files: path.resolve( rootDir,'node_modules/octicons/build/svg/*.svg'),
        formatter: name => name,
      },
    ],
  },
  {
    id: 'md',
    name: 'Material Design icons',
    contents: [
      {
        path:"filled",
        files: path.resolve( rootDir, 'node_modules/@material-design-icons/svg/filled/*.svg'),
        formatter: name => name,
      },
      {
        path:"outlined",
        files: path.resolve( rootDir, 'node_modules/@material-design-icons/svg/outlined/*.svg'),
        formatter: name => name,
      },
      {
        path:"round",
        files: path.resolve( rootDir, 'node_modules/@material-design-icons/svg/round/*.svg'),
        formatter: name => name,
      },
      {
        path:"sharp",
        files: path.resolve( rootDir, 'node_modules/@material-design-icons/svg/sharp/*.svg'),
        formatter: name => name,
      },
    ],
  }
];

/**
 * 
 * @param {string} dir 
 * @returns 
 */
const mkdir = (dir) => {
  const exists = fs.existsSync(dir);
  if (exists) {
    rimraf.sync(dir);
  }
  return fs.mkdirSync(dir, { recursive: true });
};

/**
 * 
 * @param {string[]} filePath 
 * @param {string} content 
 * @returns 
 */
const write = (filePath, content) =>
  writeFile(path.resolve(DIST, ...filePath), content, 'utf8');

/**
 * 
 * @param {string} svg 
 * @returns 
 */
async function convertIconData(svg) {
  const $svg = cheerio.load(svg);

  $svg.root()
    .find('*')
    .contents()
    .filter((_,elemt) => elemt.type ==="comment")
    .remove();

  $svg("svg").removeAttr("class").removeAttr("style").removeAttr("width").removeAttr("height");
 
  return $svg('body').html();
}

async function dirInit() {
  for (const icon of icons) {
    await mkdir(path.resolve(DIST, icon.id));
    for(const content of icon.contents)
    {
      await mkdir(path.resolve(DIST, icon.id, content.path));
      await write([icon.id, content.path, 'all.js'], '// THIS FILE IS AUTO GENERATED\n \nexport default {\n');
      await write([icon.id, content.path, 'index.js'], '// THIS FILE IS AUTO GENERATED\n');
      await write([icon.id, content.path, 'index.d.ts'], '// THIS FILE IS AUTO GENERATED\n');
      await write([icon.id, content.path, 'package.json'],
        JSON.stringify(
          {
            sideEffects: false,
            module: './index.js',
            main: "./index.js",
            types: "./index.d.ts",
            type: "module"
          },
          null,
          2
        ) + '\n'
      );
   }
   // await mkdir(path.resolve(icon.id));
  }
}
/**
 * 
 * @param {string} string 
 * @returns 
 */

const startsWithNumber= (string) => /^\d/.test(string);


/**
 * 
 * @param {Icon} icon 
 * @returns 
 */
async function writeIconModule(icon) {
  const appendFile = promisify(fs.appendFile);
  const filenames = new Set(); // for remove duplicate

  for (const content of icon.contents) {
    const files = await glob(content.files.replace(/\\/g, '/'));
    for(const file of files)
    {
      const svgStr = await promisify(fs.readFile)(file, 'utf8');
      const iconPath = await convertIconData(svgStr);

      const rawName = path.basename(file, path.extname(file));

      const pascalName = camelcase(rawName, { pascalCase: true });
      const name_ =(content.formatter && content.formatter(pascalName)) || pascalName;
      const name = startsWithNumber(name_)? "_" + name_ : name_;

      if (filenames.has(name+content.path)) continue; 
      filenames.add(name+content.path);

      // write like: module/fa/index.esm.js
      await appendFile( path.resolve(DIST, icon.id, content.path, 'index.js'),`export { default as ${name} } from './${name}.js';\n`,'utf8');

      await appendFile( path.resolve(DIST, icon.id, content.path, 'index.d.ts'),`export const ${name}:string;\n`,'utf8');

      await appendFile( path.resolve(DIST, icon.id, content.path, 'all.js'),` "${name}" : \`${iconPath}\`,\n`,'utf8');

      await write([icon.id, content.path, `${name}.js`],`export default \`${iconPath}\`;`);
    }
  await appendFile( path.resolve(DIST, icon.id, content.path, 'all.js'),` }\n`,'utf8');
  }
}

async function main() {
  try {
    await dirInit();
    await Promise.all(icons.map(icon=>writeIconModule(icon)));

    console.log('build completed successfully')
  } catch (e) {
    console.error(e);
  }
}

main();
