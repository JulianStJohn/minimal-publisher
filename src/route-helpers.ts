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

import app from './app';

export async function resolveMarkdownFilenameFromPath(inputPath: string): Promise<string | null> {
  const cleanPath = inputPath.replace(/^\/+/, ''); // remove leading slashes
  const parts = cleanPath.split('/');
  const baseSlug = parts.pop(); // last part like "test-post-alpha"
  const subDir = parts.join('/'); // remaining directory like "tests"

  // Search pattern like "content/tests/*-test-post-alpha.md"
  const pattern = path.join(app.get('CONTENT_DIR'), subDir, `*-${baseSlug}.md`).replace(/\\/g, '/');
  const matches = await glob(pattern);

  return matches.length > 0 ? matches[0] : null;
}



//const file = await resolveMarkdownFilenameFromPath('/tests/test-post-alpha');
// returns: content/tests/20250405-test-post-alpha.md