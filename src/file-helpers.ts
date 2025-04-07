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


import app from './app';


type TokenisedUrlPath = {
  baseSlug: string;
  subDirs: string[];
}

export function tokeniseUrlPath(inputPath: string): TokenisedUrlPath {
  const cleanPath = inputPath.replace(/^\/+/, ''); // remove leading slashes
  const parts = cleanPath.split('/');
  const baseSlug = parts.pop() || ''; // last part like "test-post-alpha"
  console.log(`tokeniseUrlPath baseSlug: ${baseSlug} subDirs: ${parts.join(',')}`)
  const tokenisedUrlPath : TokenisedUrlPath = {
    baseSlug: baseSlug,
    subDirs: parts
  }
  return tokenisedUrlPath 
}

export async function resolveMarkdownFilePathFromUrlPath(inputPath: string): Promise<string | null> {
  const tokenisedUrlPath = tokeniseUrlPath(inputPath)

  if(tokenisedUrlPath.baseSlug.match(/[a-z\-]*/)){

     console.log('possible index file ' + tokenisedUrlPath.baseSlug)
     const possibleIndexFilePath = path.join(app.get('CONTENT_DIR'),'/',tokenisedUrlPath.baseSlug + '-index.md')
     console.log('index file: ' + possibleIndexFilePath)
     try { 
      await fsp.access(possibleIndexFilePath, fs.constants.F_OK)
      
      return possibleIndexFilePath.toString()
     }catch{ }
  }
  
  // Search pattern like "content/tests/*-test-post-alpha.md"
  const pattern = path.join(app.get('CONTENT_DIR'), 
    tokenisedUrlPath.subDirs.join('/'), 
    `*-${tokenisedUrlPath.baseSlug}.md`).replace(/\\/g, '/'
  );
  const matches = await glob(pattern);
  return matches.length > 0 ? matches[0] : null;
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

export async function allMarkdownFiles(dir: string) : Promise<ParsedMarkdownFile[]>  {
  const pattern = path.join(dir, '**/*.md').replace(/\\/g, '/'); // Windows compatibility
  const files = await glob(pattern);
  const parsedFiles : ParsedMarkdownFile[] = []
  for(const filePath of files) {
    const parsedFile = await parseMarkdownFile(filePath, false)
    const resourceName = filePath.split('/').pop() || ''
    if(!resourceName.includes('-index')) parsedFiles.push(parsedFile)
  } 
  return parsedFiles
}

type ParsedMarkdownFile = {
  filename: string,
  path: string,
  date: Date | null,
  fileParsed? : boolean,
  error? : string,
  body?: string,
  tags?: string[],
  author?: string,
  title?: string,
  urlPath? : string
}
export async function parseMarkdownFile(filePath: string, getContent: boolean = false) : Promise<ParsedMarkdownFile>{
  const fileContent = await fsp.readFile(filePath, { encoding: 'utf8' as BufferEncoding });
  const filename = path.basename(filePath);
  const date = extractDateFromFilename(filename);
  
  const { content, data: frontMatter } = matter(fileContent);
  const parsedFile : ParsedMarkdownFile = {
    filename: filename,
    path: filePath,
    date: date,
    ...frontMatter,
    urlPath: getLinkFromFilePath(filePath),
    fileParsed: true,
    body: 'no-content' 
  };
  if(getContent) parsedFile['body'] =  await marked(content);
  const parsedFileWithSubDirTags : ParsedMarkdownFile = addRelativeDirToParsedFileTags(parsedFile)
  return parsedFileWithSubDirTags 
}

export function getTokenisedRelativeFilePathFromFullFilePath (fullFilePath : string) : string[] {
  return (path.dirname(fullFilePath).toString().replace(app.get('CONTENT_DIR'),'')).split('/').filter(e => e !== '') 
}

export function addRelativeDirToParsedFileTags(parsedFile : ParsedMarkdownFile) : ParsedMarkdownFile{
  const tokenisedRelativePath = getTokenisedRelativeFilePathFromFullFilePath(parsedFile.path) 
  if(!('tags' in parsedFile)) { parsedFile['tags'] = [] }
  if((parsedFile.tags != undefined) && tokenisedRelativePath.length > 0){
    const clonedTagsArray = [...parsedFile.tags, ...tokenisedRelativePath]
    parsedFile.tags = clonedTagsArray
  }
  return parsedFile 
}
export function errorParsedMarkdownFile(error:string){
  return { fileParsed: false, error: error, filename: '', path: '', date: null } 
}

export async function parseMarkDownFileFromUrlPath(inputPath: string) : Promise<ParsedMarkdownFile>{
  console.log(`parseMarkDownFileFromUrlPath: ${inputPath} `) 
  const markdownFilePath = await resolveMarkdownFilePathFromUrlPath(inputPath)
  if(!markdownFilePath){ return errorParsedMarkdownFile('Invalid Path') }
  console.log(`filePath: ${markdownFilePath}`)
  const parsedMarkdownFile = await parseMarkdownFile(markdownFilePath, true)
  if(!parsedMarkdownFile){ return errorParsedMarkdownFile('Could not parse file') }
  return parsedMarkdownFile 
}

export function getLinkFromFilePath(inputPath: string){
  const filename = path.basename(inputPath)
  const filenameSlugMatch = filename.match(/^[0-9]{8}\-(?<filenameslug>[a-zA-Z0-9\-]+)\.md/)
  const filenameSlug = (filenameSlugMatch?.groups) ? filenameSlugMatch.groups.filenameslug : ''
  const tokenisedRelativePath = getTokenisedRelativeFilePathFromFullFilePath(inputPath)
  const generatedLink = tokenisedRelativePath.join('/') + '/' + filenameSlug
  return (generatedLink[0] == "/") ? generatedLink : "/" + generatedLink
}