# minimal-publisher
A minimal framework to serve frontmatter markdown. There are many minimal blog apps like this, but this one is mine.

Stack: TypeScript, LiquidJS, Bootstrap

## To Run

Add a .env file  containing: 

* SITE_NAME
* <ENVIRONMENT>_CONTENT_DIR, <ENVIRONMENT>_PORT for each of TEST, DEV and PROD - e.g.
```
TEST_CONTENT_DIR=./_test-posts
TEST_PORT=3000
```
<ENVIRONMENT>_CONTENT_DIR should be a relative link to the folder containing the markdown to host

### Content Directory Structure

The root of CONTENT_DIR must contain: 
*  `home-index-md` 
* `images/hero.jpg`

### Markdown Metadata

```
title: Initial Post 
author: John Keats
tags: [tag1, tag2]
```
