import express from 'express';
import fs from 'fs';
import * as fsp from 'fs/promises';
import path from 'path';
import { marked } from './marked-custom';

import matter from 'gray-matter';
import { glob } from 'glob';
import dotenv from 'dotenv';
import { Liquid } from 'liquidjs';
import { Request } from 'express';

import { scanMarkdownFiles } from './file-helpers'
import { resolveMarkdownFilenameFromPath } from './route-helpers'

// Load .env config
dotenv.config();

const app = express();

const engine = new Liquid({
  root: path.resolve(process.cwd(), 'views'), // folder with .liquid files
  extname: '.liquid'
});
app.engine('liquid', engine.express()); // register Liquid with Express
//app.set('views', path.resolve(__dirname, 'views'));
//app.set('view engine', 'liquid');

const args = process.argv.slice(2); // skip 'node' and script path


const envIndex = args.indexOf('--env');
const RUNTIME_ENV = (envIndex !== -1 && args[envIndex + 1]) ? args[envIndex + 1].toUpperCase() : 'DEV'
console.log(`Running in environment: ${RUNTIME_ENV}`);

const portStr = process.env[`${RUNTIME_ENV}_PORT`];
const PORT = portStr ? parseInt(portStr, 10) : 3000;
const contentDirStr = process.env[`${RUNTIME_ENV}_CONTENT_DIR`];
const CONTENT_DIR = path.resolve(contentDirStr || './_test-posts');

app.set('CONTENT_DIR', CONTENT_DIR)


app.get('/', async (_req, res) => {
  try {
    const data = await scanMarkdownFiles(CONTENT_DIR);
    res.render('home.liquid', {
      posts: data 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to scan documents' });
  }
});

// serve images
app.get(/^\/(.*)\.(jpeg|jpg|gif|png)$/, async (req: Request, res) => {
    console.log('path: ' + req.path)
    const filePath = CONTENT_DIR + '/' + req.path
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error(err);
        res.status(404).send('Image not found');
      }
    });
});

app.get('/*path', async (req: Request, res) => {
  try {
    console.log('path: ' + req.path)
    const filePath = await resolveMarkdownFilenameFromPath(req.path.toString())
    console.log(`filePath: ${filePath}`)

    if(!filePath){
      throw new Error
    }
    // ensure the file ends in `.md`
    //const filePath = fullPath.endsWith('.md') ? fullPath : fullPath + '.md';

    // Read and parse the file
    const fileContent = await fsp.readFile(filePath, { encoding: 'utf8' as BufferEncoding });
    const { content, data: frontMatter } = matter(fileContent);
    const html = marked(content);

    const post = {
      ...frontMatter, 
      body: html,
      filePath: `/${filePath}`
    }

    res.render('post.liquid', {
      post: post
    });

  } catch (err) {
    console.error(err);
    res.status(404).send('Document not found');
  }
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Content Path: ${CONTENT_DIR}`)
});

export default app;