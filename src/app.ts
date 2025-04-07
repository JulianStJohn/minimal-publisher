import express from 'express';
import fs from 'fs';
import * as fsp from 'fs/promises';
import path from 'path';


import matter from 'gray-matter';
import { glob } from 'glob';
import dotenv from 'dotenv';
import { Liquid } from 'liquidjs';
import { Request } from 'express';

import  * as filehelpers from './file-helpers'

// Load .env config
dotenv.config();

const app = express();

const engine = new Liquid({
  root: path.resolve(process.cwd(), 'views'), // folder with .liquid files
  extname: '.liquid'
});
app.engine('liquid', engine.express()); 

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
const SITE_NAME = process.env[`SITE_NAME`]
app.locals.siteTitle = SITE_NAME

app.set('CONTENT_DIR', CONTENT_DIR)
app.set('ROOT_DIR', process.cwd())

app.get('/', async (_req, res) => {
  try {
    const data = await filehelpers.allMarkdownFiles(CONTENT_DIR);
    const parsedHomeFile = await filehelpers.parseMarkDownFileFromUrlPath('/home')
    res.render('home.liquid', {
      body: parsedHomeFile.body, 
      posts: data 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to scan documents' });
  }
});

// show all posts for a tag
app.get('/*path', async (req, res, next) => {
  try {
    const possibleSelectedTag = req.path.toString().replace(/^\//, ''); 
    const allMarkdownFiles = (await filehelpers.allMarkdownFiles(CONTENT_DIR))
    const markdownFilesWithMatchingTag = []
    for(const markdownFile of allMarkdownFiles){
      const awaitedMarkdownFile = (await markdownFile)
      if (!awaitedMarkdownFile || !awaitedMarkdownFile.tags){ continue; }
      if(awaitedMarkdownFile.tags.includes(possibleSelectedTag)) markdownFilesWithMatchingTag.push(awaitedMarkdownFile)
    }
   
    if(markdownFilesWithMatchingTag.length == 0){
      console.log('Not a tag list')
      return next();
    }

    res.render('home.liquid', {
      posts: markdownFilesWithMatchingTag, 
      selected_tag: possibleSelectedTag
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error' });
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

app.get(/^\/(css)\/(.*)\.(css)$/, async (req: Request, res) => {
  console.log('path: ' + req.path)
  const filePath = app.get('ROOT_DIR') + '/public/' + req.path
  res.type('css')
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(err);
      res.status(404).send('Not found');
    }
  });
});

app.get(/^\/(js)\/(.*)\.(js)$/, async (req: Request, res) => {
  console.log('path: ' + req.path)
  const filePath = app.get('ROOT_DIR') + '/public/' + req.path
  res.type('js')
  res.sendFile(filePath, (err) => {
  if (err) {
    console.error(err);
    res.status(404).send('Not found');
  }
  });
});

app.get('/*path', async (req: Request, res) => {

  const post = filehelpers.parseMarkDownFileFromUrlPath(req.path.toString())
  // deal with errors here
  /*
  if(){
    console.error(err);
    res.status(404).send('...');
  }
  */
    
 res.render('post.liquid', {
    post: post
 });

});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Content Path: ${CONTENT_DIR}`)
});

export default app;