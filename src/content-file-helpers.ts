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
import { resolveMarkdownFilePathFromUrlPath } from './resolver-helpers'

import app from './app';



export type ParsedMarkdownFile = {
  // filename: file name yyyymmdd-filename.md, or indexname-index.md
  filename: string,
  // path: file path without filename
  path: string,
  date: Date | null,
  fileParsed? : boolean,
  error? : string,
  body: string,
  published? : string,
  tags?: Array<string>,
  author?: string,
  title?: string,
  urlPath? : string
}

function extractDateFromFilename(filename: string): Date | null {
  const dateRegex = /^(\d{8})[-].*\.md$/;
  const match = filename.match(dateRegex);
  if (!match) return null;
  const yyyymmdd = match[1];
  const year = parseInt(yyyymmdd.slice(0, 4), 10);
  const month = parseInt(yyyymmdd.slice(4, 6), 10);
  const day = parseInt(yyyymmdd.slice(6, 8), 10);

  return new Date(Number(year), Number(month) - 1, Number(day));
}

export async function allContentMarkdownFiles(dir: string = app.get('CONTENT_DIR')) : Promise<ParsedMarkdownFile[]>  {
  const pattern = path.join(dir, '**/*.md').replace(/\\/g, '/'); 
  const files = await glob(pattern);
  const parsedFiles : ParsedMarkdownFile[] = []
  for(const filePath of files) {
    const filename = filePath.split('/').pop() || ''
    if (/[0-9]{8}-[a-z0-9\-]+\.md/.test(filename)) parsedFiles.push(await parseMarkdownFile(filePath))
  } 
  // sort by date
  parsedFiles.sort((a : ParsedMarkdownFile, b : ParsedMarkdownFile )=> {
    if(a.date == null || b.date == null) return 0
    return b.date.getTime() - a.date.getTime()
  })

  return parsedFiles
}

export async function parseMarkdownFile(filePath: string) : Promise<ParsedMarkdownFile>{
  const fileContent = await fsp.readFile(filePath, { encoding: 'utf8' as BufferEncoding });
  const filename = path.basename(filePath);
  const date = extractDateFromFilename(filename);
  
  const { content, data: frontMatter } = matter(fileContent);
  
  if('tags' in frontMatter){
    frontMatter.tags = (()=>{
      if (frontMatter.tags == null) return []
      return (Array.isArray(frontMatter.tags)) ? frontMatter.tags : frontMatter.tags.toString().split(',')
    })()
  }
  if(!('image' in frontMatter)){
    frontMatter.image = 'none'
  }

  const parsedFile : ParsedMarkdownFile = {
    filename: filename,
    path: filePath,
    date: date,
    ...frontMatter,
    urlPath: getLinkFromFilePath(filePath),
    fileParsed: true, 
    body: ''
  };
  parsedFile['body'] =  await marked(content);
  // If the file is in /sf1/sf2/post.md, add sf1 and sf2 to its tags
  const parsedFileWithSubDirTags : ParsedMarkdownFile = addRelativeDirToParsedFileTags(parsedFile)
  return parsedFileWithSubDirTags 
}

export type ParsedIndexFile = {
  filename: string
  path: string,
  body: string,
  tag: string
}

export async function getSitePartialContent(filename : string){
  const fileContent = await fsp.readFile(`${app.get('CONTENT_DIR')}/${filename}`, { encoding: 'utf8' as BufferEncoding });
  const menuContent = (await marked(fileContent))
  return menuContent
}

export function getTokenisedRelativeFilePathFromFullFilePath (fullFilePath : string) : string[] {
  return (path.dirname(fullFilePath).toString().replace(app.get('CONTENT_DIR'),'')).split('/').filter(e => e !== '') 
}

export function addRelativeDirToParsedFileTags(parsedFile : ParsedMarkdownFile) : ParsedMarkdownFile{
  const tokenisedRelativePath = getTokenisedRelativeFilePathFromFullFilePath(parsedFile.path) 

  if(!('tags' in parsedFile) || parsedFile.tags == undefined ) { parsedFile['tags'] = [] }
  if( tokenisedRelativePath.length > 0){
    for (const pathToken of tokenisedRelativePath) {
      if(!parsedFile.tags.includes(pathToken)) parsedFile.tags.push(pathToken)
    } 
  }
  return parsedFile 
}
export function errorParsedMarkdownFile(error:string){
  return { fileParsed: false, error: error, filename: '', path: '', body: '', date: null } 
}

export async function parseMarkDownFileFromUrlPath(inputPath: string) : Promise<ParsedMarkdownFile>{
  console.log(`parseMarkDownFileFromUrlPath: ${inputPath} `) 
  const markdownFilePath = await resolveMarkdownFilePathFromUrlPath(inputPath)
  if(!markdownFilePath){ return errorParsedMarkdownFile('Invalid Path') }
  console.log(`filePath: ${markdownFilePath}`)
  const parsedMarkdownFile = await parseMarkdownFile(markdownFilePath )
  if(!parsedMarkdownFile){ return errorParsedMarkdownFile('Could not parse file') }
  return parsedMarkdownFile 
}

// this may need to be retired
export function getLinkFromFilePath(inputPath: string){
  const filename = path.basename(inputPath)
  const filenameSlugMatch = filename.match(/^[0-9]{8}\-(?<filenameslug>[a-zA-Z0-9\-]+)\.md/)
  const filenameSlug = (filenameSlugMatch?.groups) ? filenameSlugMatch.groups.filenameslug : ''
  const tokenisedRelativePath = getTokenisedRelativeFilePathFromFullFilePath(inputPath)
  const generatedLink = tokenisedRelativePath.join('/') + '/' + filenameSlug
  return (generatedLink[0] == "/") ? generatedLink : "/" + generatedLink
}