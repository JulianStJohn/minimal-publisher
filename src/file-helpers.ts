import express from 'express';
import fs from 'fs';
import * as fsp from 'fs/promises';
import path from 'path';
import { marked } from 'marked';

import matter from 'gray-matter';
import { glob } from 'glob';
import dotenv from 'dotenv';
import { Liquid } from 'liquidjs';
import { Request } from 'express';


// Utility: extract date from filename (e.g. post-23-04-2023.md)
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

// Scan and return markdown data
export async function scanMarkdownFiles(dir: string) {
  const pattern = path.join(dir, '**/*.md').replace(/\\/g, '/'); // Windows compatibility
  const files = await glob(pattern);
  
  return files.map(filePath => {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { data: frontMatter } = matter(content);
    const filename = path.basename(filePath);
    const date = extractDateFromFilename(filename);

    return {
      filename: filename,
      path: filePath,
      date: date,
      tst: "tst",
      ...frontMatter
    };
  });
}