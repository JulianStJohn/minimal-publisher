import express from 'express';
import fs from 'fs';
import * as fsp from 'fs/promises';
import path from 'path';

import matter from 'gray-matter';
import { glob } from 'glob';
import dotenv from 'dotenv';
import { Liquid } from 'liquidjs';
import { Request } from 'express';

import  * as contentfilehelpers from './content-file-helpers'
import { ParsedMarkdownFile } from './content-file-helpers' 
import * as resolverhelpers from './resolver-helpers'
import * as indexfilehelpers from './index-file-helpers'


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

const invalidPaths = ["_menu"]
const envIndex = args.indexOf('--env');
const RUNTIME_ENV = (envIndex !== -1 && args[envIndex + 1]) ? args[envIndex + 1].toUpperCase() : 'DEV'
console.log(`Running in environment: ${RUNTIME_ENV}`);

const portStr = process.env[`${RUNTIME_ENV}_PORT`];
const PORT = portStr ? parseInt(portStr, 10) : 3000;
const contentDirStr = process.env[`${RUNTIME_ENV}_CONTENT_DIR`];
const CONTENT_DIR = path.resolve(contentDirStr || './_test-posts');
const SITE_NAME = process.env[`SITE_NAME`]
const FEATURED_TAGS = (process.env['FEATURED_TAGS'] || '').replace(' ','').split(',')

app.locals.siteTitle = SITE_NAME


app.set('CONTENT_DIR', CONTENT_DIR)
app.set('ROOT_DIR', process.cwd())
app.locals.linkedIn = process.env['LINKEDIN_LINK']
app.locals.github = process.env['GITHUB_LINK']

// really should be middleware:
app.get(/\/.*/, async (req, res, next) => {
  console.log("Processing: " + req.path.toString() )
  return next();
})

// filter invalid paths
app.get('/*path', async (req, res, next) => {
  const path = req.path.toString()
  // ignore home
  if (path=='/') return next()

  // show error for paths to protected resources
  const invalidPath = invalidPaths.includes(path) 
  
  // show error for paths containing unsupported characters 
  const validCharsRegex = /^(?<subdirectories>[a-z\-_\/]*)\/(?<resource>[a-z\-_0-9A-Z\.]+)$/;
  const validCharsMatch = path.match(validCharsRegex);
  if(!validCharsMatch || !validCharsMatch.groups || invalidPath){
    console.error(`Invalid path: ${path}`);
    res.render('error.liquid', { error: "Not Found"});
    return
  }
  
  // proceed if this looks like a post
  const resource = validCharsMatch.groups.resource
  const isPost = resource.match(/^[a-z\-_]*$/)
  if(isPost) { next(); return; }
  
  // proceed if this looks like a supported resource
  const isResourceFile = resource.match(/^[A-Z0-9\.a-z\-_]*\.(css|js|png|jpg|jpeg|gif)$/)
  if(isResourceFile) { next(); return; } 

  // otherwise show the error page
  console.error(`Invalid path: ${path}`);
  res.render('error.liquid', { error: "Not Found"});
});

//  serve images
app.get(/^\/(.*)\.(jpeg|jpg|gif|png)$/, async (req: Request, res) => {
  const filePath = CONTENT_DIR + '/' + req.path
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Error returning image: ${req.path} - ${err.message}`);
      res.status(404).send('Image not found');
    }
  });
});

// serve CSS 
app.get(/^\/(css)\/(.*)\.(css)$/, async (req: Request, res) => {
const filePath = app.get('ROOT_DIR') + '/public/' + req.path
res.type('css')
res.sendFile(filePath, (err) => {
  if (err) {
    console.error(`Error returning css: ${req.path} - ${err.message}`);
    res.status(404).send('Not found');
  }
});
});

// serve JS
app.get(/^\/(js)\/(.*)\.(js)$/, async (req: Request, res) => {
const filePath = app.get('ROOT_DIR') + '/public/' + req.path
res.type('js')
res.sendFile(filePath, (err) => {
if (err) {
  console.error(err);
  console.error(`Error returning js: ${req.path} - ${err.message}`);
  res.status(404).send('Not found');
}
});
});

// read and store all site markdown 
app.get(/\/.*/, async (req, res, next) => {
  const allContentMarkdownFiles = (await contentfilehelpers.allContentMarkdownFiles(CONTENT_DIR))
  const allPublishedContentMarkdownFiles = allContentMarkdownFiles.filter((cmdf : ParsedMarkdownFile) => {
    return (!("published" in cmdf) || cmdf.published === undefined ||  String(cmdf.published).toLowerCase() != 'no')
  })
  console.log('all files')
  allContentMarkdownFiles.map((cmdf) => {
    console.log(cmdf.title)
  })
  app.set('ALL_CONTENT_FILES', allPublishedContentMarkdownFiles)
  app.set('ALL_INDEX_FILES', (await indexfilehelpers.allIndexFiles(CONTENT_DIR)))
  app.locals.menuContent = await contentfilehelpers.getSitePartialContent("_menu.md")
  app.locals.footerContent = await contentfilehelpers.getSitePartialContent("_footer.md")
  return next();
})

// root renders the home page
app.get('/', async (req, res) => {
  try {
    const parsedHomeFile = await contentfilehelpers.parseMarkDownFileFromUrlPath('/home')
    app.locals.featuredTagsData = FEATURED_TAGS.map((featuredTag) => {
      return {tag: featuredTag, posts: resolverhelpers.getMarkdowFilesForTag(featuredTag) }
    })
    res.render('home.liquid', {
      body: parsedHomeFile.body
    });
  } catch (err) {
    console.error(`Error processing home markdown: ${req.path}`);
    res.render('error.liquid', { error: "Error opening document"});
  }
});

// show all posts for a tag
// ... i have moved better logig into resolveMarkdownFilePathFromUrlPath
// ... i should use that and merge this and the next function
app.get('/*path', async (req, res, next) => {
  try {
    const possibleSelectedTag = req.path.toString().replace(/^\//, '');
    const markdownFilesWithMatchingTag = []
    
    for(const markdownFile of app.get('ALL_CONTENT_FILES')){
      const awaitedMarkdownFile = (await markdownFile)
      if (!awaitedMarkdownFile || !awaitedMarkdownFile.tags){ continue; }
      if(awaitedMarkdownFile.tags.includes(possibleSelectedTag)) markdownFilesWithMatchingTag.push(awaitedMarkdownFile)
    }
    if(markdownFilesWithMatchingTag.length == 0){
      console.log('Not a tag list')
      return next();
    }
    const parsedIndexFile = await contentfilehelpers.parseMarkDownFileFromUrlPath(`/${possibleSelectedTag}`)
    res.render('topic.liquid', {
      body: parsedIndexFile.body,
      posts: markdownFilesWithMatchingTag, 
      selected_tag: possibleSelectedTag
    });
  } catch (err) {
    console.error(`Invalid path: ${req.path}`);
    res.render('error.liquid', { error: "Not Found"});
  }
});

// serve a post
app.get('/*path', async (req: Request, res) => {
  const post = await contentfilehelpers.parseMarkDownFileFromUrlPath(req.path.toString())
  if(!post.fileParsed){
    console.error(`File not found: ${req.path} - ${post.error}`);
    res.render('error.liquid', { error: post.error });
    return
  }
    
  res.render('post.liquid', { post: post });

});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Content Path: ${CONTENT_DIR}`)
});

export default app;