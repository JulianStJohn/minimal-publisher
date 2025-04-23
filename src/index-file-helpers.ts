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



export type ParsedIndexFile = {
  filename: string
  path: string,
  body: string,
  tag: string
}

export async function allIndexFiles(dir: string = app.get('CONTENT_DIR')) : Promise<ParsedIndexFile[]>  {

  const pattern = path.join(dir, '**/*-index.md').replace(/\\/g, '/'); 
  const files = await glob(pattern);
  const parsedFiles : ParsedIndexFile[] = []
  for(const filePath of files) {
    const parsedFile = await parseIndexFile(filePath)
    if(parsedFile.filename != 'home-index'){
      parsedFiles.push(parsedFile)
    }
  } 
  return parsedFiles
}

export async function parseIndexFile(filePath: string) : Promise<ParsedIndexFile> {
  const fileContent = await fsp.readFile(filePath, { encoding: 'utf8' as BufferEncoding });
  const filename = path.basename(filePath);
  const body = await marked(fileContent);
  const parsedFile : ParsedIndexFile = {
    filename: filename,
    path: filePath,
    body: body,
    tag: (filename.replace('-index.md',''))
  }
  return parsedFile  
}

